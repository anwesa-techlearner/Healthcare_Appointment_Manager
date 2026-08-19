import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { processNotification } from '../notifications/notifications.service';

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  SLOT_EXPIRY: 'slot-expiry',
  MEDICATION_REMINDERS: 'medication-reminders',
  NO_SHOW: 'no-show-followup',
} as const;

/**
 * BullMQ requires ConnectionOptions (host/port/password) not an ioredis instance.
 * We parse the REDIS_URL into a plain ConnectionOptions object so BullMQ's
 * Queue and Worker accept it without a type error.
 */
function getConnectionOptions(): ConnectionOptions {
  const url = env.redisUrl;
  try {
    // Handles both redis:// and rediss:// (TLS) URLs
    const parsed = new URL(url);
    const opts: ConnectionOptions = {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
      ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
      // Enable TLS for rediss:// (Upstash requires this)
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    };
    return opts;
  } catch {
    // Fallback: treat the value as a plain host string
    return { host: url, port: 6379 };
  }
}

let notificationQueue: Queue | null = null;

export function getNotificationQueue(): Queue | null {
  if (env.useCronFallback) return null;

  if (!notificationQueue) {
    notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
      connection: getConnectionOptions(),
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
  if (env.useCronFallback) return;

  // Notification worker
  new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job: Job) => {
      const { notificationId } = job.data as { notificationId: string };
      await processNotification(notificationId);
    },
    { connection: getConnectionOptions(), concurrency: 5 }
  );

  logger.info('BullMQ workers started');
}
