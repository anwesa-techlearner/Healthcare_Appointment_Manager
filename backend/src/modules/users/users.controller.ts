import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as usersService from './users.service';
import { Role } from '@prisma/client';

const createDoctorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
  specialization: z.string().min(1),
  bio: z.string().optional(),
  slotDurationMinutes: z.number().int().min(10).max(120).optional(),
  timezone: z.string().optional(),
});

export async function createDoctor(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createDoctorSchema.parse(req.body);
    const doctor = await usersService.createDoctorUser(data);
    res.status(201).json(doctor);
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.query.role as Role | undefined;
    const users = await usersService.listAllUsers(role);
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    // Non-admin users can only get their own profile
    if (req.user!.role !== 'admin' && req.user!.userId !== id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const user = await usersService.findUserById(id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = z.object({ name: z.string().optional(), phone: z.string().optional() }).parse(req.body);
    const updated = await usersService.updateUserById(id, req.user!.userId, req.user!.role, data);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function getPatientTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const timeline = await usersService.getPatientHealthTimeline(id, req.user!.userId, req.user!.role);
    res.json(timeline);
  } catch (err) {
    next(err);
  }
}
