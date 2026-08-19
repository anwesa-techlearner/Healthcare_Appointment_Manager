import cron from 'node-cron';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { expireHeldSlots } from './slotExpiry.job';
import { processMedicationReminders } from './medicationReminders.job';
import { retryPendingNotifications } from './notificationRetry.job';
import { processNoShowFollowUps } from './noShow.job';
import { startBullMQWorkers } from './jobQueues';

/**
 * Starts all background jobs.
 * If BullMQ + Redis is available, uses BullMQ workers for notification processing.
 * Falls back to node-cron for all jobs when USE_CRON_FALLBACK=true or Redis unavailable.
 *
 * Implementation choice: node-cron for slot expiry, medication reminders, and
 * no-show checks (these are low-frequency and don't need queue semantics).
 * BullMQ for notification delivery (needs retry queue + backoff).
 */
export function startScheduler(): void {
  logger.info('Starting background job scheduler...');

  if (!env.useCronFallback) {
    try {
      startBullMQWorkers();
      logger.info('BullMQ workers started for notification processing');
    } catch (err) {
      logger.warn(`BullMQ startup failed, falling back to cron for notifications: ${err}`);
    }
  }

  // SPEC §5.1: Expire stale holds every minute
  cron.schedule('* * * * *', async () => {
    try { await expireHeldSlots(); }
    catch (err) { logger.error(`Slot expiry job error: ${err}`); }
  });

  // SPEC §5.5: Retry pending notifications every 2 minutes (cron fallback)
  cron.schedule('*/2 * * * *', async () => {
    try { await retryPendingNotifications(); }
    catch (err) { logger.error(`Notification retry job error: ${err}`); }
  });

  // SPEC §5.6: Process medication reminders every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try { await processMedicationReminders(); }
    catch (err) { logger.error(`Medication reminder job error: ${err}`); }
  });

  // SPEC §8.4: No-show follow-up every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try { await processNoShowFollowUps(); }
    catch (err) { logger.error(`No-show follow-up job error: ${err}`); }
  });

  logger.info('Background scheduler active: slot-expiry(1m), notification-retry(2m), medication-reminders(5m), no-show(30m)');
}
