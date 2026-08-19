import { NotificationChannel, NotificationType } from '@prisma/client';
import prisma from '../../config/prisma';
import { logger } from '../../config/logger';
import { sendEmail, buildConfirmationEmail, buildCancellationEmail, buildReminderEmail } from './email.service';
import { createCalendarEvent, deleteCalendarEvent } from '../calendar/calendar.service';

const MAX_ATTEMPTS = 3;
// Backoff delays in milliseconds: 1min, 5min, 15min
const BACKOFF_DELAYS = [60_000, 5 * 60_000, 15 * 60_000];

/**
 * Creates a pending NotificationLog entry (or enqueues for immediate processing).
 * Actual sending is done by the background job worker.
 */
export async function enqueueNotification(
  appointmentId: string,
  channel: NotificationChannel,
  type: NotificationType
) {
  return prisma.notificationLog.create({
    data: {
      appointmentId,
      channel,
      type,
      status: 'pending',
      attempts: 0,
      nextRetryAt: new Date(), // ready to send immediately
    },
  });
}

/**
 * Processes a single pending notification.
 * SPEC §5.5: Retry with exponential backoff, max 3 attempts, then mark failed.
 */
export async function processNotification(notificationId: string): Promise<void> {
  const notification = await prisma.notificationLog.findUnique({
    where: { id: notificationId },
    include: {
      appointment: {
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctorProfile: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });

  if (!notification) return;
  if (notification.status === 'sent') return;

  const attempts = notification.attempts + 1;

  try {
    if (notification.channel === 'email') {
      await processEmailNotification(notification);
    } else if (notification.channel === 'calendar') {
      await processCalendarNotification(notification);
    }

    await prisma.notificationLog.update({
      where: { id: notificationId },
      data: { status: 'sent', attempts, lastError: null },
    });
  } catch (err: any) {
    logger.error(`Notification ${notificationId} failed (attempt ${attempts}): ${err.message}`);

    if (attempts >= MAX_ATTEMPTS) {
      await prisma.notificationLog.update({
        where: { id: notificationId },
        data: { status: 'failed', attempts, lastError: err.message },
      });
    } else {
      // Schedule next retry with exponential backoff
      const delay = BACKOFF_DELAYS[attempts - 1] ?? BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
      await prisma.notificationLog.update({
        where: { id: notificationId },
        data: {
          attempts,
          lastError: err.message,
          nextRetryAt: new Date(Date.now() + delay),
        },
      });
    }
  }
}

async function processEmailNotification(notification: any): Promise<void> {
  const { appointment } = notification;
  const patientEmail = appointment.patient.email;

  let emailPayload;

  if (notification.type === 'confirmation') {
    emailPayload = buildConfirmationEmail({
      patientName: appointment.patient.name,
      doctorName: appointment.doctorProfile.user.name,
      slotStart: appointment.slotStart,
      appointmentId: appointment.id,
    });
  } else if (notification.type === 'cancellation') {
    emailPayload = buildCancellationEmail({
      patientName: appointment.patient.name,
      doctorName: appointment.doctorProfile.user.name,
      slotStart: appointment.slotStart,
      reason: appointment.cancelledReason,
    });
  } else if (notification.type === 'reminder') {
    emailPayload = buildReminderEmail({
      patientName: appointment.patient.name,
      doctorName: appointment.doctorProfile.user.name,
      slotStart: appointment.slotStart,
    });
  } else {
    return; // no-op for unhandled types
  }

  emailPayload.to = patientEmail;
  await sendEmail(emailPayload);
}

async function processCalendarNotification(notification: any): Promise<void> {
  const { appointment } = notification;

  if (notification.type === 'confirmation') {
    // Create calendar events for both patient and doctor
    for (const user of [appointment.patient, appointment.doctorProfile.user]) {
      try {
        await createCalendarEvent(appointment.id, user.id, {
          summary: `Medical Appointment`,
          description: `Appointment ID: ${appointment.id}`,
          start: appointment.slotStart,
          end: appointment.slotEnd,
          attendees: [appointment.patient.email, appointment.doctorProfile.user.email],
        });
      } catch (err) {
        logger.warn(`Calendar event creation failed for user ${user.id}: ${err}`);
      }
    }
  } else if (notification.type === 'cancellation') {
    // Delete calendar events
    const events = await prisma.calendarEvent.findMany({
      where: { appointmentId: appointment.id },
    });
    for (const event of events) {
      if (event.googleEventId) {
        try {
          await deleteCalendarEvent(event.userId, event.googleEventId, appointment.id);
        } catch (err) {
          logger.warn(`Calendar event deletion failed: ${err}`);
        }
      }
    }
  }
}

/** Get all failed notifications (for admin view) */
export async function getFailedNotifications() {
  return prisma.notificationLog.findMany({
    where: { status: 'failed' },
    include: {
      appointment: {
        select: {
          id: true,
          slotStart: true,
          patient: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/** Get pending notifications due for processing */
export async function getPendingNotifications() {
  return prisma.notificationLog.findMany({
    where: {
      status: 'pending',
      nextRetryAt: { lte: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { nextRetryAt: 'asc' },
    take: 50, // Process in batches
  });
}
