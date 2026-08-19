import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as doctorsService from './doctors.service';

export async function searchDoctors(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query.q as string | undefined;
    const specialization = req.query.specialization as string | undefined;
    const doctors = await doctorsService.searchDoctors(query, specialization);
    res.json(doctors);
  } catch (err) { next(err); }
}

export async function getDoctorById(req: Request, res: Response, next: NextFunction) {
  try {
    const doctor = await doctorsService.getDoctorProfile(req.params.id);
    res.json(doctor);
  } catch (err) { next(err); }
}

export async function updateDoctorProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      specialization: z.string().optional(),
      bio: z.string().optional(),
      slotDurationMinutes: z.number().int().min(10).max(120).optional(),
      timezone: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const updated = await doctorsService.updateDoctorProfile(
      req.params.id, req.user!.userId, req.user!.role, data
    );
    res.json(updated);
  } catch (err) { next(err); }
}

export async function setAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      slots: z.array(z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
      })),
    });
    const { slots } = schema.parse(req.body);
    const result = await doctorsService.setDoctorAvailability(
      req.params.id, req.user!.userId, req.user!.role, slots
    );
    res.json(result);
  } catch (err) { next(err); }
}

export async function getAvailableSlots(req: Request, res: Response, next: NextFunction) {
  try {
    const dateStr = req.query.date as string;
    if (!dateStr) { res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' }); return; }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) { res.status(400).json({ error: 'Invalid date' }); return; }
    const slots = await doctorsService.getAvailableSlots(req.params.id, date);
    res.json(slots);
  } catch (err) { next(err); }
}

export async function addLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({ date: z.string(), reason: z.string().optional() });
    const { date, reason } = schema.parse(req.body);
    const result = await doctorsService.addDoctorLeave(
      req.params.id, req.user!.userId, req.user!.role, new Date(date), reason
    );
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function removeLeave(req: Request, res: Response, next: NextFunction) {
  try {
    await doctorsService.removeDoctorLeave(req.params.leaveId, req.user!.userId, req.user!.role);
    res.json({ message: 'Leave removed' });
  } catch (err) { next(err); }
}

export async function getDoctorLeaves(req: Request, res: Response, next: NextFunction) {
  try {
    const leaves = await doctorsService.getDoctorLeaves(req.params.id);
    res.json(leaves);
  } catch (err) { next(err); }
}

export async function getDoctorAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const appts = await doctorsService.getDoctorAppointmentList(
      req.params.id, req.user!.userId, req.user!.role
    );
    res.json(appts);
  } catch (err) { next(err); }
}
