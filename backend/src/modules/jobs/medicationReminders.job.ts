import prisma from '../../config/prisma';
import { logger } from '../../config/logger';
import { sendEmail, buildMedicationReminderEmail } from '../notifications/email.service';

/**
 * SPEC §5.6 — Background job: send due medication reminders.
 * Runs every 5 minutes.
 */
export async function processMedicationReminders(): Promise<void> {
  const dueReminders = await prisma.medicationReminder.findMany({
    where: {
      status: 'pending',
      nextTriggerAt: { lte: new Date() },
    },
    include: {
      visitNote: {
        include: {
          appointment: {
            include: {
              patient: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
    take: 50,
  });

  for (const reminder of dueReminders) {
    try {
      const patient = reminder.visitNote.appointment.patient;

      const emailPayload = buildMedicationReminderEmail({
        patientName: patient.name,
        medicationName: reminder.medicationName,
        frequency: reminder.frequency,
      });
      emailPayload.to = patient.email;

      await sendEmail(emailPayload);

      await prisma.medicationReminder.update({
        where: { id: reminder.id },
        data: { status: 'sent' },
      });

      logger.debug(`Medication reminder sent to ${patient.email} for ${reminder.medicationName}`);
    } catch (err: any) {
      logger.error(`Medication reminder ${reminder.id} failed: ${err.message}`);
      await prisma.medicationReminder.update({
        where: { id: reminder.id },
        data: { status: 'failed' },
      });
    }
  }
}
