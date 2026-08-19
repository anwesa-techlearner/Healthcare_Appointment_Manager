import { UrgencyLevel } from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler.middleware';
import { generatePreVisitSummary } from '../../utils/llm';
import { logger } from '../../config/logger';

export async function submitSymptoms(
  appointmentId: string,
  patientId: string,
  rawText: string
) {
  // Verify appointment belongs to this patient
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) throw new AppError(404, 'Appointment not found');
  if (appt.patientId !== patientId) throw new AppError(403, 'Not your appointment');
  if (!['held', 'confirmed'].includes(appt.status)) {
    throw new AppError(400, 'Cannot submit symptoms for this appointment status');
  }

  // SPEC §5.3: Call LLM — never block on failure
  const { summary, aiGenerated } = await generatePreVisitSummary(rawText);

  const symptom = await prisma.symptom.create({
    data: {
      appointmentId,
      rawText,
      aiSummaryJson: summary as any,
      urgencyLevel: summary.urgency_level as UrgencyLevel,
      aiGenerated,
    },
  });

  // SPEC §8.2: If High urgency, flag for triage (we add a log entry here;
  // in the frontend this surfaces as an urgency badge)
  if (summary.urgency_level === 'High') {
    logger.warn(`HIGH URGENCY symptom for appointment ${appointmentId}: ${summary.chief_complaint}`);
  }

  return symptom;
}

export async function getSymptomsForAppointment(
  appointmentId: string,
  requesterId: string,
  requesterRole: string
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctorProfile: { select: { userId: true } } },
  });
  if (!appt) throw new AppError(404, 'Appointment not found');

  // SPEC §3: Patients cannot view AI summaries; doctors/admins can
  if (requesterRole === 'patient') {
    throw new AppError(403, 'Patients cannot view AI triage summaries');
  }
  if (
    requesterRole === 'doctor' &&
    appt.doctorProfile.userId !== requesterId
  ) {
    throw new AppError(403, 'You can only view symptoms for your own patients');
  }

  return prisma.symptom.findMany({
    where: { appointmentId },
    orderBy: { createdAt: 'desc' },
  });
}
