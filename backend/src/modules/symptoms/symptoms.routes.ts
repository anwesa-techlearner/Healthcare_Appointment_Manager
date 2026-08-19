import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { submitSymptoms, getSymptoms } from './symptoms.controller';

const router = Router();

// Patient submits symptoms for their appointment
router.post('/:appointmentId/symptoms', authenticate, authorize('patient'), submitSymptoms);

// Doctor or admin views pre-visit AI summary
router.get('/:appointmentId/symptoms', authenticate, getSymptoms);

export default router;
