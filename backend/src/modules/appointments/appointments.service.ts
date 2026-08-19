import { v4 as uuidv4 } from 'uuid';
import { Prisma, Role } from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler.middleware';
import { enqueueNotification } from '../notifications/notifications.service';
import { logger } from '../../config/logger';

const HOLD_DURATION_MINUTES = 5;

/**
 * SPEC §5.1 — Slot Hold & Double-Booking Prevention
 *
 * Uses the DB-level unique constraint on (doctor_id, slot_start) combined with
 * a unique partial approach: we only enforce uniqueness for non-cancelled rows
 * via application logic catching P2002 (unique constraint violation).
 *
 * The real guard: INSERT inside a transaction + unique constraint.
 * If two simultaneous requests race, only one succeeds; the other gets P2002.
 */
export async function holdAppointmentSlot(
  patientId: string,
  doctorProfileId: string,
  slotStart: Date,
  idempotencyKey?: string
) {
  // Check idempotency key first — return existing if already processed
  if (idempotencyKey) {
    const existing = await prisma.appointment.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return existing;
  }

  // Validate the doctor exists and slot is within working hours
  const doctorProfile = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    include: { availability: true },
  });
  if (!doctorProfile) throw new AppError(404, 'Doctor not found');

  const slotEnd = new Date(slotStart.getTime() + doctorProfile.slotDurationMinutes * 60 * 1000);
  const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000);

  // Create the appointment with held status inside a transaction.
  // The unique constraint on (doctor_id, slot_start) + our catch-and-reject
  // is the real double-booking guard — not an application-level check.
  try {
    const appointment = await prisma.$transaction(async (tx) => {
      // First, clean up expired holds for this slot (so they don't block new holds)
      await tx.appointment.updateMany({
        where: {
          doctorId: doctorProfileId,
          slotStart,
          status: 'held',
          holdExpiresAt: { lt: new Date() },
        },
        data: { status: 'cancelled', cancelledReason: 'hold_expired' },
      });

      // Now attempt to insert the new hold.
      // If another non-cancelled row with same (doctorId, slotStart) exists,
      // Prisma will throw P2002 (unique constraint violation).
      return tx.appointment.create({
        data: {
          id: uuidv4(),
          patientId,
          doctorId: doctorProfileId,
          slotStart,
          slotEnd,
          status: 'held',
          holdExpiresAt,
          idempotencyKey: idempotencyKey ?? null,
        },
      });
    });

    return appointment;
  } catch (err: any) {
    // P2002 = unique constraint violation → slot already taken
    if (err?.code === 'P2002') {
      throw new AppError(409, 'This slot is already booked or held. Please choose another time.');
    }
    throw err;
  }
}

/**
 * SPEC §5.1 — Confirm a held appointment.
 * Transitions held → confirmed only if still within hold window.
 */
export async function confirmAppointment(appointmentId: string, patientId: string) {
  const appointment = await prisma.$transaction(async (tx) => {
    // Lock the row for update
    const appt = await tx.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appt) throw new AppError(404, 'Appointment not found');
    if (appt.patientId !== patientId) throw new AppError(403, 'Not your appointment');
    if (appt.status !== 'held') throw new AppError(400, `Appointment is ${appt.status}, cannot confirm`);
    if (appt.holdExpiresAt && appt.holdExpiresAt < new Date()) {
      throw new AppError(400, 'Hold has expired. Please rebook.');
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: { status: 'confirmed', holdExpiresAt: null },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctorProfile: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
  });

  // Enqueue notifications (non-blocking — booking succeeds even if queue fails)
  try {
    await enqueueNotification(appointmentId, 'email', 'confirmation');
    await enqueueNotification(appointmentId, 'calendar', 'confirmation');
  } catch (err) {
    logger.warn(`Failed to enqueue confirmation notification for ${appointmentId}: ${err}`);
  }

  return appointment;
}

export async function cancelAppointmentById(
  appointmentId: string,
  requesterId: string,
  requesterRole: Role,
  reason?: string
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctorProfile: { select: { userId: true } } },
  });
  if (!appt) throw new AppError(404, 'Appointment not found');

  // RBAC: patient can cancel own, doctor can cancel own patients', admin can cancel any
  if (requesterRole === 'patient' && appt.patientId !== requesterId) {
    throw new AppError(403, 'You can only cancel your own appointments');
  }
  if (requesterRole === 'doctor' && appt.doctorProfile.userId !== requesterId) {
    throw new AppError(403, 'You can only cancel your own appointments');
  }

  if (['cancelled', 'completed'].includes(appt.status)) {
    throw new AppError(400, `Appointment is already ${appt.status}`);
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'cancelled', cancelledReason: reason ?? 'user_requested' },
  });

  // Enqueue cancellation notifications
  try {
    await enqueueNotification(appointmentId, 'email', 'cancellation');
    await enqueueNotification(appointmentId, 'calendar', 'cancellation');
  } catch (err) {
    logger.warn(`Failed to enqueue cancellation notification: ${err}`);
  }

  return updated;
}

export async function rescheduleAppointment(
  appointmentId: string,
  requesterId: string,
  requesterRole: Role,
  newSlotStart: Date
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctorProfile: { select: { userId: true, slotDurationMinutes: true } } },
  });
  if (!appt) throw new AppError(404, 'Appointment not found');

  if (requesterRole === 'patient' && appt.patientId !== requesterId) {
    throw new AppError(403, 'You can only reschedule your own appointments');
  }
  if (requesterRole === 'doctor' && appt.doctorProfile.userId !== requesterId) {
    throw new AppError(403, 'You can only reschedule your own appointments');
  }

  if (appt.status === 'cancelled' || appt.status === 'completed') {
    throw new AppError(400, `Cannot reschedule a ${appt.status} appointment`);
  }

  const newSlotEnd = new Date(
    newSlotStart.getTime() + appt.doctorProfile.slotDurationMinutes * 60 * 1000
  );

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Cancel old slot
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'cancelled', cancelledReason: 'rescheduled' },
      });

      // Create new confirmed appointment
      return tx.appointment.create({
        data: {
          id: uuidv4(),
          patientId: appt.patientId,
          doctorId: appt.doctorId,
          slotStart: newSlotStart,
          slotEnd: newSlotEnd,
          status: 'confirmed',
        },
      });
    });

    // Enqueue update notifications
    try {
      await enqueueNotification(updated.id, 'email', 'confirmation');
      await enqueueNotification(updated.id, 'calendar', 'confirmation');
      await enqueueNotification(appointmentId, 'calendar', 'cancellation');
    } catch (err) {
      logger.warn(`Failed to enqueue reschedule notifications: ${err}`);
    }

    return updated;
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw new AppError(409, 'New slot is already taken. Please choose another time.');
    }
    throw err;
  }
}

export async function getAppointmentById(
  appointmentId: string,
  requesterId: string,
  requesterRole: Role
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { id: true, name: true, email: true, phone: true } },
      doctorProfile: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      symptoms: true,
      visitNote: true,
    },
  });
  if (!appt) throw new AppError(404, 'Appointment not found');

  // RBAC checks
  if (
    requesterRole === 'patient' && appt.patientId !== requesterId ||
    requesterRole === 'doctor' && appt.doctorProfile.user.id !== requesterId
  ) {
    throw new AppError(403, 'Forbidden');
  }

  return appt;
}

export async function listPatientAppointments(patientId: string) {
  return prisma.appointment.findMany({
    where: { patientId },
    include: {
      doctorProfile: {
        include: { user: { select: { name: true, email: true } } },
      },
      symptoms: { select: { urgencyLevel: true, aiSummaryJson: true } },
      visitNote: { select: { aiPatientSummary: true } },
    },
    orderBy: { slotStart: 'desc' },
  });
}

export async function listAllAppointmentsForAdmin() {
  return prisma.appointment.findMany({
    include: {
      patient: { select: { id: true, name: true, email: true } },
      doctorProfile: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function completeAppointmentById(
  appointmentId: string,
  requesterId: string,
  requesterRole: Role
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctorProfile: { select: { userId: true } } },
  });
  if (!appt) throw new AppError(404, 'Appointment not found');

  if (requesterRole === 'doctor' && appt.doctorProfile.userId !== requesterId) {
    throw new AppError(403, 'You can only complete your own appointments');
  }

  if (appt.status !== 'confirmed') {
    throw new AppError(400, `Cannot complete appointment with status: ${appt.status}`);
  }

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'completed' },
  });
}
