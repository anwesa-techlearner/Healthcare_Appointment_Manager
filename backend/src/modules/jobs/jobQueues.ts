import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../../config/redis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { processNotification } from '../notifications/notifications.service';
import { expireHeldSlots } from './slotExpiry.job';
import { processMedicationReminders } from './medicationReminders.job';
import { processNoShowFollowUps } from './noShow.job';

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  SLOT_EXPIRY: 'slot-expiry',
  MEDICATION_REMINDERS: 'medication-reminders',
  NO_SHOW: 'no-show-followup',
} as const;

let notificationQueue: Queue | null = null;

export function getNotificationQueue(): Queue | null {
  if (env.useCronFallback) return null;

  const redis = getRedisClient();
  if (!redis) return null;

  if (!notificationQueue) {
    notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
      },
    });
  }
  return notificationQueue;
}

/** Start all BullMQ workers */
export function startBullMQWorkers(): void {
  const redis = getRedisClient();
  if (!redis) return;

  // Notification worker
  new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job: Job) => {
      const { notificationId } = job.data as { notificationId: string };
      await processNotification(notificationId);
    },
    { connection: redis, concurrency: 5 }
  );

  logger.info('BullMQ workers started');
}
