import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as visitNotesService from './visitNotes.service';

export async function submitVisitNote(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      doctorNotes: z.string().min(10),
      prescriptionJson: z.array(z.object({
        medication: z.string(),
        dosage: z.string().optional(),
        frequency: z.string(),
        duration: z.string().optional(),
      })).optional(),
    });
    const { doctorNotes, prescriptionJson } = schema.parse(req.body);

    const note = await visitNotesService.submitVisitNote(
      req.params.appointmentId,
      req.user!.userId,
      doctorNotes,
      prescriptionJson
    );
    res.status(201).json(note);
  } catch (err) { next(err); }
}

export async function getVisitNote(req: Request, res: Response, next: NextFunction) {
  try {
    const note = await visitNotesService.getVisitNoteForAppointment(
      req.params.appointmentId,
      req.user!.userId,
      req.user!.role
    );
    res.json(note);
  } catch (err) { next(err); }
}
