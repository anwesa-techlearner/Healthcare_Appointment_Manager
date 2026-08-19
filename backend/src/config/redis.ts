import IORedis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let redisClient: IORedis | null = null;

export function getRedisClient(): IORedis | null {
  if (env.useCronFallback) return null;

  if (!redisClient) {
    redisClient = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('error', (err) => {
      logger.error(`Redis error: ${err.message}`);
    });
  }

  return redisClient;
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return false;
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
