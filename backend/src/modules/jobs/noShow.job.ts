import prisma from '../../config/prisma';
import { logger } from '../../config/logger';
import { sendEmail, buildNoShowEmail } from '../notifications/email.service';
import { env } from '../../config/env';

/**
 * SPEC §8.4 — Bonus: Detect no-shows and send rebooking follow-ups.
 * A "no-show" is a confirmed appointment that passed its end time
 * without being marked completed, with no visit note submitted.
 * Runs every 30 minutes.
 */
export async function processNoShowFollowUps(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes past end time

  const noShows = await prisma.appointment.findMany({
    where: {
      status: 'confirmed',
      slotEnd: { lt: cutoff },
      visitNote: null,
      noShowFollowUp: null,
    },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      doctorProfile: {
        include: { user: { select: { name: true } } },
      },
    },
    take: 20,
  });

  for (const appt of noShows) {
    try {
      // Mark as no-show
      await prisma.$transaction(async (tx) => {
        await tx.appointment.update({
          where: { id: appt.id },
          data: { status: 'cancelled', cancelledReason: 'no_show' },
        });

        await tx.noShowFollowUp.create({
          data: {
            appointmentId: appt.id,
            userId: appt.patientId,
            emailSent: false,
          },
        });
      });

      // Send rebooking email
      const rebookUrl = `${env.frontendUrl}/book?doctorId=${appt.doctorId}`;
      const emailPayload = buildNoShowEmail({
        name: appt.patient.name,
        doctorName: appt.doctorProfile.user.name,
        slotStart: appt.slotStart,
        rebookUrl,
      });
      emailPayload.to = appt.patient.email;

      await sendEmail(emailPayload);

      await prisma.noShowFollowUp.update({
        where: { appointmentId: appt.id },
        data: { emailSent: true, rebookingOffered: true },
      });

      logger.info(`No-show follow-up sent for appointment ${appt.id}`);
    } catch (err: any) {
      logger.error(`No-show follow-up failed for ${appt.id}: ${err.message}`);
    }
  }
}
