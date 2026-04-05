import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { AuditLogQueryDto } from './audit-query.dto';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
export type AuditEntity = 'transaction' | 'user';

export interface AuditPerformer {
  id: string;
  email: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Fire-and-forget audit write. Never throws to callers; failures are logged only.
   */
  log(
    action: AuditAction,
    entity: AuditEntity,
    entityId: string,
    performer: AuditPerformer,
    details?: Prisma.InputJsonValue,
  ): void {
    void this.prisma.auditLog
      .create({
        data: {
          action,
          entity,
          entityId,
          performedBy: performer.id,
          performedByEmail: performer.email,
          details: details ?? Prisma.JsonNull,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });
  }

  async findAll(query: AuditLogQueryDto) {
    const { action, entity, dateFrom, dateTo, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.AuditLogWhereInput = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(items, total, Number(page), Number(limit));
  }
}
