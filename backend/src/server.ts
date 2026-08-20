import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler.middleware';
import { generalLimiter } from './middleware/rateLimiter.middleware';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import doctorsRoutes from './modules/doctors/doctors.routes';
import appointmentsRoutes from './modules/appointments/appointments.routes';
import symptomsRoutes from './modules/symptoms/symptoms.routes';
import visitNotesRoutes from './modules/visit-notes/visitNotes.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import calendarRoutes from './modules/calendar/calendar.routes';

// Background jobs
import { startScheduler } from './modules/jobs/scheduler';

// Health checks
import { checkRedisHealth } from './config/redis';
import { checkEmailHealth } from './modules/notifications/email.service';
import { checkCalendarHealth } from './modules/calendar/calendar.service';
import prisma from './config/prisma';

import { getAuditLogs } from './modules/jobs/auditLog.service';
import { authenticate, authorize } from './middleware/auth.middleware';

const app = express();
const server = http.createServer(app);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (env.allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(generalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/appointments', symptomsRoutes);
app.use('/api/appointments', visitNotesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/calendar', calendarRoutes);

// Admin: audit logs
app.get(
  '/api/admin/audit-logs',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await getAuditLogs(undefined, 200);
      res.json(logs);
    } catch (err) { next(err); }
  }
);

// SPEC §8.10 — Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const [dbOk, redisOk, emailOk, calendarOk] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    checkRedisHealth(),
    checkEmailHealth(),
    checkCalendarHealth(),
  ]);

  const allOk = dbOk; // DB is the only hard dependency
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'ok' : 'down',
      redis: redisOk ? 'ok' : 'unavailable',
      email: emailOk ? 'ok' : 'unavailable',
      calendar: calendarOk ? 'configured' : 'not_configured',
    },
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// ─── WebSocket — Real-time slot availability (SPEC §8.1) ─────────────────────

const wss = new WebSocketServer({ server, path: '/ws' });
const slotSubscribers = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws) => {
  let subscribedDoctorId: string | null = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'subscribe_slots' && msg.doctorId) {
        subscribedDoctorId = msg.doctorId;
        if (!slotSubscribers.has(msg.doctorId)) {
          slotSubscribers.set(msg.doctorId, new Set());
        }
        slotSubscribers.get(msg.doctorId)!.add(ws);
        ws.send(JSON.stringify({ type: 'subscribed', doctorId: msg.doctorId }));
      }
    } catch {}
  });

  ws.on('close', () => {
    if (subscribedDoctorId) {
      slotSubscribers.get(subscribedDoctorId)?.delete(ws);
    }
  });
});

/**
 * Broadcast slot availability change to all subscribers for a doctor.
 * Called whenever a slot is held, confirmed, or released.
 */
export function broadcastSlotUpdate(doctorId: string, payload: object): void {
  const subscribers = slotSubscribers.get(doctorId);
  if (!subscribers) return;

  const message = JSON.stringify({ type: 'slot_update', doctorId, ...payload });
  for (const ws of subscribers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

async function bootstrap() {
  try {
    // Verify DB connection
    await prisma.$connect();
    logger.info('Database connected');

    // Start background job scheduler
    startScheduler();

    server.listen(env.port, () => {
      logger.info(`Server running on port ${env.port} (${env.nodeEnv})`);
      logger.info(`Allowed CORS origins: ${env.allowedOrigins.join(', ')}`);
      logger.info(`WebSocket server ready at ws://localhost:${env.port}/ws`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err}`);
    process.exit(1);
  }
}

bootstrap();

export { app, server };
