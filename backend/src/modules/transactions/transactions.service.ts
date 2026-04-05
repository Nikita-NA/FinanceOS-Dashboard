import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
  ExportTransactionsQueryDto,
} from './transactions.dto';
import { paginate } from '../../common/dto/pagination.dto';
import { Role } from '@prisma/client';
import { AuditService, type AuditPerformer } from '../audit/audit.service';

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private buildListWhere(
    query: Pick<TransactionQueryDto, 'type' | 'category' | 'dateFrom' | 'dateTo' | 'search'>,
    opts?: { includeDeleted?: boolean },
  ) {
    const { type, category, dateFrom, dateTo, search } = query;
    const where: Record<string, unknown> = {};

    if (!opts?.includeDeleted) {
      where.deletedAt = null;
    }

    if (type) where.type = type;
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo)
        (where.date as Record<string, Date>).lte = new Date(dateTo + 'T23:59:59.999Z');
    }
    if (search) {
      where.OR = [
        { notes: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findAll(query: TransactionQueryDto, requestingUser: { id: string; role: Role }) {
    const {
      type,
      category,
      dateFrom,
      dateTo,
      search,
      includeDeleted,
      page = 1,
      limit = 20,
      sortBy = 'date',
      order = 'desc',
    } = query;

    const showDeleted =
      includeDeleted === true && requestingUser.role === Role.ADMIN;

    const skip = (Number(page) - 1) * Number(limit);
    const where = this.buildListWhere(
      { type, category, dateFrom, dateTo, search },
      { includeDeleted: showDeleted },
    );

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: order },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return paginate(transactions, total, Number(page), Number(limit));
  }

  async exportForDownload(query: ExportTransactionsQueryDto) {
    const { format = 'csv', type, category, dateFrom, dateTo } = query;
    const where = this.buildListWhere({ type, category, dateFrom, dateTo });

    const rows = await this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'asc' },
      include: { user: { select: { name: true } } },
    });

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      const data = rows.map((t) => ({
        id: t.id,
        date: t.date.toISOString().slice(0, 10),
        type: t.type,
        category: t.category,
        amount: Number(t.amount),
        notes: t.notes ?? '',
        createdBy: t.user?.name ?? '',
      }));
      return {
        contentType: 'application/json',
        filename: `transactions-${dateStr}.json`,
        body: JSON.stringify(data),
      };
    }

    const header = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Notes', 'Created By'];
    const lines = [header.join(',')];
    for (const t of rows) {
      const cells = [
        t.id,
        t.date.toISOString().slice(0, 10),
        t.type,
        escapeCsvCell(t.category),
        String(Number(t.amount)),
        escapeCsvCell(t.notes ?? ''),
        escapeCsvCell(t.user?.name ?? ''),
      ];
      lines.push(cells.join(','));
    }

    return {
      contentType: 'text/csv',
      filename: `transactions-${dateStr}.csv`,
      body: lines.join('\n'),
    };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID "${id}" not found`);
    }

    return transaction;
  }

  async create(dto: CreateTransactionDto, userId: string, performer: AuditPerformer) {
    const created = await this.prisma.transaction.create({
      data: {
        amount: dto.amount,
        type: dto.type,
        category: dto.category,
        date: new Date(dto.date),
        notes: dto.notes,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    this.auditService.log('CREATE', 'transaction', created.id, performer, {
      category: dto.category,
      amount: dto.amount,
      type: dto.type,
    });

    return created;
  }

  async update(
    id: string,
    dto: UpdateTransactionDto,
    requestingUser: { id: string; role: Role },
    performer: AuditPerformer,
  ) {
    const transaction = await this.findOne(id);

    if (
      requestingUser.role === Role.ANALYST &&
      transaction.userId !== requestingUser.id
    ) {
      throw new ForbiddenException('Analysts can only update their own transactions');
    }

    const changes: Record<string, unknown> = {};
    if (dto.amount !== undefined && dto.amount !== Number(transaction.amount)) {
      changes.amount = dto.amount;
    }
    if (dto.type !== undefined && dto.type !== transaction.type) {
      changes.type = dto.type;
    }
    if (dto.category !== undefined && dto.category !== transaction.category) {
      changes.category = dto.category;
    }
    if (dto.date !== undefined) {
      const next = new Date(dto.date).toISOString().slice(0, 10);
      const cur = transaction.date.toISOString().slice(0, 10);
      if (next !== cur) changes.date = dto.date;
    }
    if (dto.notes !== undefined && dto.notes !== (transaction.notes ?? '')) {
      changes.notes = dto.notes;
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.type && { type: dto.type }),
        ...(dto.category && { category: dto.category }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (Object.keys(changes).length > 0) {
      this.auditService.log(
        'UPDATE',
        'transaction',
        id,
        performer,
        changes as Prisma.InputJsonValue,
      );
    }

    return updated;
  }

  async remove(id: string, requestingUser: { id: string; role: Role }, performer: AuditPerformer) {
    const transaction = await this.findOne(id);

    if (requestingUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can delete transactions');
    }

    await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.auditService.log('DELETE', 'transaction', id, performer, {
      category: transaction.category,
      amount: Number(transaction.amount),
    });

    return { message: 'Transaction deleted successfully' };
  }

  async restore(id: string, performer: AuditPerformer) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!transaction) {
      throw new NotFoundException('Deleted transaction not found');
    }

    const restored = await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: null },
    });

    this.auditService.log('RESTORE', 'transaction', id, performer, {
      category: transaction.category,
      amount: Number(transaction.amount),
    });

    return restored;
  }
}
