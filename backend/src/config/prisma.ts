import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Single shared Prisma instance (prevents connection pool exhaustion)
const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

prisma.$on('warn', (e: { message: string }) => logger.warn(`Prisma: ${e.message}`));
prisma.$on('error', (e: { message: string }) => logger.error(`Prisma: ${e.message}`));

export default prisma;
