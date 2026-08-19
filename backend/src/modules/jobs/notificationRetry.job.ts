import { getPendingNotifications, processNotification } from '../notifications/notifications.service';
import { logger } from '../../config/logger';

/**
 * SPEC §5.5 — Background job: retry pending/failed notifications.
 * Runs every 2 minutes (cron fallback) or is handled by BullMQ workers.
 */
export async function retryPendingNotifications(): Promise<void> {
  const pending = await getPendingNotifications();

  if (pending.length === 0) return;

  logger.debug(`Notification retry job: processing ${pending.length} pending notification(s)`);

  for (const notification of pending) {
    try {
      await processNotification(notification.id);
    } catch (err: any) {
      logger.error(`Notification retry failed for ${notification.id}: ${err.message}`);
    }
  }
}
