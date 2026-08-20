import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler.middleware';
import { Role } from '@prisma/client';
import { env } from '../../config/env';

const SALT_ROUNDS = 12;

export async function registerPatient(data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  dateOfBirth?: string; // ISO date string e.g. "1990-05-15"
  gender?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: Role.patient,
      name: data.name,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      gender: data.gender || undefined,
    },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      createdAt: true,
    },
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  return issueTokenPair(user.id, user.email, user.role);
}

export async function refreshTokens(token: string) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  // Validate token exists in DB (allows revocation)
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token expired or revoked');
  }

  // Rotate: delete old, issue new
  await prisma.refreshToken.delete({ where: { token } });
  return issueTokenPair(payload.userId, payload.email, payload.role);
}

export async function revokeRefreshToken(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function issueTokenPair(userId: string, email: string, role: Role) {
  const payload = { userId, email, role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Persist refresh token for revocation support
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({
    data: { id: uuidv4(), userId, token: refreshToken, expiresAt },
  });

  return { accessToken, refreshToken };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      createdAt: true,
      doctorProfile: {
        select: {
          id: true,
          specialization: true,
          bio: true,
          slotDurationMinutes: true,
          timezone: true,
        },
      },
    },
  });
  if (!user) throw new AppError(404, 'User not found');
  return user;
}
