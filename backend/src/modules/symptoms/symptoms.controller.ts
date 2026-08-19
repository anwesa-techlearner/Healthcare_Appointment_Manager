import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as symptomsService from './symptoms.service';

export async function submitSymptoms(req: Request, res: Response, next: NextFunction) {
  try {
    const { rawText } = z.object({ rawText: z.string().min(10, 'Please describe symptoms in at least 10 characters') }).parse(req.body);
    const symptom = await symptomsService.submitSymptoms(
      req.params.appointmentId,
      req.user!.userId,
      rawText
    );
    res.status(201).json(symptom);
  } catch (err) { next(err); }
}

export async function getSymptoms(req: Request, res: Response, next: NextFunction) {
  try {
    const symptoms = await symptomsService.getSymptomsForAppointment(
      req.params.appointmentId,
      req.user!.userId,
      req.user!.role
    );
    res.json(symptoms);
  } catch (err) { next(err); }
}
