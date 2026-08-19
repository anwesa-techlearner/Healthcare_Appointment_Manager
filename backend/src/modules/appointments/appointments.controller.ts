import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as appointmentsService from './appointments.service';

export async function holdSlot(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      doctorProfileId: z.string().uuid(),
      slotStart: z.string().datetime(),
      idempotencyKey: z.string().optional(),
    });
    const { doctorProfileId, slotStart, idempotencyKey } = schema.parse(req.body);
    // Allow idempotency key from header as well
    const iKey = idempotencyKey ?? (req.headers['idempotency-key'] as string | undefined);

    const appointment = await appointmentsService.holdAppointmentSlot(
      req.user!.userId,
      doctorProfileId,
      new Date(slotStart),
      iKey
    );
    res.status(201).json(appointment);
  } catch (err) { next(err); }
}

export async function confirmAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const appointment = await appointmentsService.confirmAppointment(
      req.params.id,
      req.user!.userId
    );
    res.json(appointment);
  } catch (err) { next(err); }
}

export async function cancelAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
    const result = await appointmentsService.cancelAppointmentById(
      req.params.id, req.user!.userId, req.user!.role, reason
    );
    res.json(result);
  } catch (err) { next(err); }
}

export async function rescheduleAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const { newSlotStart } = z.object({ newSlotStart: z.string().datetime() }).parse(req.body);
    const result = await appointmentsService.rescheduleAppointment(
      req.params.id, req.user!.userId, req.user!.role, new Date(newSlotStart)
    );
    res.json(result);
  } catch (err) { next(err); }
}

export async function getAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const appt = await appointmentsService.getAppointmentById(
      req.params.id, req.user!.userId, req.user!.role
    );
    res.json(appt);
  } catch (err) { next(err); }
}

export async function listPatientAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const appts = await appointmentsService.listPatientAppointments(req.user!.userId);
    res.json(appts);
  } catch (err) { next(err); }
}

export async function listAllAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const appts = await appointmentsService.listAllAppointmentsForAdmin();
    res.json(appts);
  } catch (err) { next(err); }
}

export async function completeAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await appointmentsService.completeAppointmentById(
      req.params.id, req.user!.userId, req.user!.role
    );
    res.json(result);
  } catch (err) { next(err); }
}
