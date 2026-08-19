import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler.middleware';

const SALT_ROUNDS = 12;

export async function createDoctorUser(data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  specialization: string;
  bio?: string;
  slotDurationMinutes?: number;
  timezone?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: Role.doctor,
      name: data.name,
      phone: data.phone,
      doctorProfile: {
        create: {
          specialization: data.specialization,
          bio: data.bio,
          slotDurationMinutes: data.slotDurationMinutes ?? 30,
          timezone: data.timezone ?? 'UTC',
        },
      },
    },
    include: {
      doctorProfile: true,
    },
  });

  const { passwordHash: _, ...safeUser } = user as any;
  return safeUser;
}

export async function listAllUsers(role?: Role) {
  return prisma.user.findMany({
    where: role ? { role } : undefined,
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      phone: true,
      createdAt: true,
      doctorProfile: {
        select: { specialization: true, slotDurationMinutes: true, timezone: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      phone: true,
      createdAt: true,
      doctorProfile: {
        include: { availability: true },
      },
    },
  });
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

export async function updateUserById(
  id: string,
  requesterId: string,
  requesterRole: Role,
  data: { name?: string; phone?: string }
) {
  if (requesterRole !== Role.admin && requesterId !== id) {
    throw new AppError(403, 'You can only update your own profile');
  }
  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, phone: true, role: true },
  });
}

/**
 * Patient health timeline — chronological view of all appointments,
 * visit notes, and prescriptions for a patient.
 */
export async function getPatientHealthTimeline(patientId: string, requesterId: string, requesterRole: Role) {
  if (requesterRole === 'patient' && requesterId !== patientId) {
    throw new AppError(403, 'Patients can only view their own timeline');
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      patientId,
      status: { in: ['confirmed', 'completed'] },
    },
    include: {
      doctorProfile: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
      symptoms: { select: { rawText: true, aiSummaryJson: true, urgencyLevel: true, createdAt: true } },
      visitNote: {
        select: {
          doctorNotes: true,
          prescriptionJson: true,
          aiPatientSummary: true,
          aiGenerated: true,
          createdAt: true,
        },
      },
    },
    orderBy: { slotStart: 'desc' },
  });

  return appointments;
}
