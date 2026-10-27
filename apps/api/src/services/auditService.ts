import { prisma, Prisma } from '@dms/database';
import { logger } from '../utils/logger';

export interface AuditLogParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  /**
   * Log an event into the append-only audit trail.
   * Can accept an existing Prisma transaction client for atomic execution.
   */
  async log(params: AuditLogParams, tx?: Prisma.TransactionClient): Promise<void> {
    try {
      const client = tx || prisma;
      await client.auditLog.create({
        data: {
          actorId: params.actorId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          beforeState: params.beforeState ? (params.beforeState as Prisma.InputJsonValue) : Prisma.JsonNull,
          afterState: params.afterState ? (params.afterState as Prisma.InputJsonValue) : Prisma.JsonNull,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      // Never let audit logging failure bring down an active business process, but log the failure
      logger.error('Failed to write to audit log:', { error, params });
    }
  }

  async list(filters: { entityType?: string; entityId?: string; actorId?: string; limit?: number; offset?: number }) {
    const where: Prisma.AuditLogWhereInput = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.actorId) where.actorId = filters.actorId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: filters.limit || 50,
        skip: filters.offset || 0,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}

export const auditService = new AuditService();
