import prisma from '../../config/prisma';
import { logger } from '../../config/logger';

/**
 * SPEC §5.1 — Background job: expire stale held slots.
 * Runs every 1 minute. Transitions held appointments past their
 * hold_expires_at to cancelled status.
 */
export async function expireHeldSlots(): Promise<void> {
  const expired = await prisma.appointment.updateMany({
    where: {
      status: 'held',
      holdExpiresAt: { lt: new Date() },
    },
    data: {
      status: 'cancelled',
      cancelledReason: 'hold_expired',
    },
  });

  if (expired.count > 0) {
    logger.info(`Slot expiry job: expired ${expired.count} held appointment(s)`);
  }
}
