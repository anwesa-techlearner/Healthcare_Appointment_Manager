import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { submitVisitNote, getVisitNote } from './visitNotes.controller';

const router = Router();

// Doctor submits post-visit notes
router.post('/:appointmentId/notes', authenticate, authorize('doctor'), submitVisitNote);

// Patient/doctor/admin views post-visit summary
router.get('/:appointmentId/notes', authenticate, getVisitNote);

export default router;
