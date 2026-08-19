import { Role } from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler.middleware';
import { enqueueNotification } from '../notifications/notifications.service';
import { logger } from '../../config/logger';

/** Search doctors by name, specialization */
export async function searchDoctors(query?: string, specialization?: string) {
  return prisma.doctorProfile.findMany({
    where: {
      AND: [
        query
          ? { user: { name: { contains: query, mode: 'insensitive' } } }
          : {},
        specialization
          ? { specialization: { contains: specialization, mode: 'insensitive' } }
          : {},
      ],
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      availability: true,
    },
  });
}

export async function getDoctorProfile(doctorProfileId: string) {
  const profile = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      availability: true,
    },
  });
  if (!profile) throw new AppError(404, 'Doctor not found');
  return profile;
}

export async function updateDoctorProfile(
  doctorProfileId: string,
  requesterId: string,
  requesterRole: Role,
  data: {
    specialization?: string;
    bio?: string;
    slotDurationMinutes?: number;
    timezone?: string;
  }
) {
  const profile = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    select: { userId: true },
  });
  if (!profile) throw new AppError(404, 'Doctor not found');

  if (requesterRole !== 'admin' && profile.userId !== requesterId) {
    throw new AppError(403, 'You can only update your own profile');
  }

  return prisma.doctorProfile.update({ where: { id: doctorProfileId }, data });
}

/** Replace all availability slots for a doctor */
export async function setDoctorAvailability(
  doctorProfileId: string,
  requesterId: string,
  requesterRole: Role,
  slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
) {
  const profile = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    select: { userId: true },
  });
  if (!profile) throw new AppError(404, 'Doctor not found');

  if (requesterRole !== 'admin' && profile.userId !== requesterId) {
    throw new AppError(403, 'You can only update your own availability');
  }

  // Atomically replace all availability
  await prisma.$transaction([
    prisma.doctorAvailability.deleteMany({ where: { doctorId: doctorProfileId } }),
    prisma.doctorAvailability.createMany({
      data: slots.map((s) => ({
        doctorId: doctorProfileId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    }),
  ]);

  return prisma.doctorAvailability.findMany({ where: { doctorId: doctorProfileId } });
}

/**
 * Add a leave day.
 * SPEC §5.2: Cancels all confirmed/held appointments for that date atomically.
 */
export async function addDoctorLeave(
  doctorProfileId: string,
  requesterId: string,
  requesterRole: Role,
  date: Date,
  reason?: string
) {
  const profile = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    select: { userId: true },
  });
  if (!profile) throw new AppError(404, 'Doctor not found');

  if (requesterRole !== 'admin' && profile.userId !== requesterId) {
    throw new AppError(403, 'You can only manage your own leaves');
  }

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  // SPEC §5.2: Leave creation + appointment cancellations must be atomic
  const [leave, affectedAppointments] = await prisma.$transaction(async (tx) => {
    // Create the leave record
    const leave = await tx.doctorLeave.create({
      data: { doctorId: doctorProfileId, date, reason },
    });

    // Find all confirmed/held appointments for this doctor on this date
    const appointments = await tx.appointment.findMany({
      where: {
        doctorId: doctorProfileId,
        slotStart: { gte: dayStart, lte: dayEnd },
        status: { in: ['confirmed', 'held'] },
      },
      select: { id: true, patientId: true },
    });

    // Cancel them all
    if (appointments.length > 0) {
      await tx.appointment.updateMany({
        where: { id: { in: appointments.map((a) => a.id) } },
        data: { status: 'cancelled', cancelledReason: 'doctor_leave' },
      });
    }

    return [leave, appointments];
  });

  // Enqueue notifications outside the transaction (non-blocking)
  for (const appt of affectedAppointments) {
    try {
      await enqueueNotification(appt.id, 'email', 'cancellation');
      await enqueueNotification(appt.id, 'calendar', 'cancellation');
    } catch (err) {
      logger.error(`Failed to enqueue cancellation notification for appointment ${appt.id}: ${err}`);
    }
  }

  return { leave, cancelledAppointments: affectedAppointments.length };
}

export async function removeDoctorLeave(
  leaveId: string,
  requesterId: string,
  requesterRole: Role
) {
  const leave = await prisma.doctorLeave.findUnique({
    where: { id: leaveId },
    include: { doctor: { select: { userId: true } } },
  });
  if (!leave) throw new AppError(404, 'Leave not found');

  if (requesterRole !== 'admin' && leave.doctor.userId !== requesterId) {
    throw new AppError(403, 'You can only remove your own leaves');
  }

  await prisma.doctorLeave.delete({ where: { id: leaveId } });
}

export async function getDoctorLeaves(doctorProfileId: string) {
  return prisma.doctorLeave.findMany({
    where: { doctorId: doctorProfileId },
    orderBy: { date: 'asc' },
  });
}

/**
 * Generates available booking slots for a doctor on a given date range.
 * Returns slots that are NOT already booked (held or confirmed).
 */
export async function getAvailableSlots(doctorProfileId: string, date: Date) {
  const profile = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    include: { availability: true },
  });
  if (!profile) throw new AppError(404, 'Doctor not found');

  const dayOfWeek = date.getDay(); // 0=Sun
  const availability = profile.availability.find((a) => a.dayOfWeek === dayOfWeek);

  if (!availability) return []; // Doctor doesn't work on this day

  // Check if doctor is on leave
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const isOnLeave = await prisma.doctorLeave.findFirst({
    where: { doctorId: doctorProfileId, date: { gte: dayStart, lte: dayEnd } },
  });
  if (isOnLeave) return [];

  // Find existing booked slots (held + confirmed)
  const bookedSlots = await prisma.appointment.findMany({
    where: {
      doctorId: doctorProfileId,
      slotStart: { gte: dayStart, lte: dayEnd },
      status: { in: ['held', 'confirmed'] },
    },
    select: { slotStart: true },
  });

  const bookedTimes = new Set(bookedSlots.map((s) => s.slotStart.toISOString()));

  // Generate all slots for the day
  const slots: Array<{ start: Date; end: Date; available: boolean }> = [];
  const [startH, startM] = availability.startTime.split(':').map(Number);
  const [endH, endM] = availability.endTime.split(':').map(Number);

  const slotDuration = profile.slotDurationMinutes;
  const current = new Date(date);
  current.setUTCHours(startH, startM, 0, 0);
  const end = new Date(date);
  end.setUTCHours(endH, endM, 0, 0);

  while (current < end) {
    const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);
    if (slotEnd > end) break;

    slots.push({
      start: new Date(current),
      end: new Date(slotEnd),
      available: !bookedTimes.has(current.toISOString()),
    });

    current.setTime(current.getTime() + slotDuration * 60 * 1000);
  }

  return slots;
}

export async function getDoctorAppointmentList(
  doctorProfileId: string,
  requesterId: string,
  requesterRole: Role
) {
  const profile = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    select: { userId: true },
  });
  if (!profile) throw new AppError(404, 'Doctor not found');

  if (requesterRole !== 'admin' && profile.userId !== requesterId) {
    throw new AppError(403, 'Forbidden');
  }

  return prisma.appointment.findMany({
    where: { doctorId: doctorProfileId },
    include: {
      patient: { select: { id: true, name: true, email: true, phone: true } },
      symptoms: { select: { urgencyLevel: true, aiSummaryJson: true, createdAt: true } },
      visitNote: { select: { id: true, aiPatientSummary: true, createdAt: true } },
    },
    orderBy: { slotStart: 'desc' },
  });
}
