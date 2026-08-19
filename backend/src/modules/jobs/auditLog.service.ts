import { AuditAction } from '@prisma/client';
import prisma from '../../config/prisma';

export async function logAuditAction(
  adminId: string,
  action: AuditAction,
  targetId?: string,
  details?: object,
  appointmentId?: string
) {
  return prisma.auditLog.create({
    data: {
      adminId,
      action,
      targetId,
      details: details as any,
      appointmentId,
    },
  });
}

export async function getAuditLogs(adminId?: string, limit = 100) {
  return prisma.auditLog.findMany({
    where: adminId ? { adminId } : undefined,
    include: {
      admin: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
