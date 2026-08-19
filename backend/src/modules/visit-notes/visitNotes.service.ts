import prisma from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler.middleware';
import { generatePostVisitSummary } from '../../utils/llm';
import { parseMedicationReminders } from '../../utils/medicationParser';
import { logger } from '../../config/logger';

export async function submitVisitNote(
  appointmentId: string,
  doctorUserId: string,
  doctorNotes: string,
  prescriptionJson?: object
) {
  // Verify appointment belongs to this doctor
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctorProfile: { select: { userId: true } } },
  });
  if (!appt) throw new AppError(404, 'Appointment not found');
  if (appt.doctorProfile.userId !== doctorUserId) {
    throw new AppError(403, 'You can only submit notes for your own appointments');
  }
  if (appt.status !== 'completed') {
    throw new AppError(400, 'Appointment must be completed before submitting notes');
  }

  // SPEC §5.4: Generate AI summary with graceful failure
  const { summary: aiPatientSummary, aiGenerated } = await generatePostVisitSummary(doctorNotes);

  // SPEC §5.6: Parse prescription into medication reminders
  const reminders = parseMedicationReminders(prescriptionJson);

  const visitNote = await prisma.$transaction(async (tx) => {
    const note = await tx.visitNote.create({
      data: {
        appointmentId,
        doctorNotes,
        prescriptionJson: prescriptionJson ? (prescriptionJson as any) : undefined,
        aiPatientSummary,
        aiGenerated,
      },
    });

    // Create medication reminders
    if (reminders.length > 0) {
      await tx.medicationReminder.createMany({
        data: reminders.map((r) => ({
          visitNoteId: note.id,
          medicationName: r.medicationName,
          frequency: r.frequency,
          nextTriggerAt: r.nextTriggerAt,
        })),
      });
    }

    return note;
  });

  return visitNote;
}

export async function getVisitNoteForAppointment(
  appointmentId: string,
  requesterId: string,
  requesterRole: string
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctorProfile: { select: { userId: true } } },
  });
  if (!appt) throw new AppError(404, 'Appointment not found');

  // RBAC: patients can only see own; doctors can only see own patients
  if (requesterRole === 'patient' && appt.patientId !== requesterId) {
    throw new AppError(403, 'Forbidden');
  }
  if (requesterRole === 'doctor' && appt.doctorProfile.userId !== requesterId) {
    throw new AppError(403, 'Forbidden');
  }

  const note = await prisma.visitNote.findUnique({
    where: { appointmentId },
    include: { medicationReminders: true },
  });
  if (!note) throw new AppError(404, 'Visit note not found');

  return note;
}
