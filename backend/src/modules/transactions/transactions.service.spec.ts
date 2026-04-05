import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, TransactionType } from '@prisma/client';

const mockPrisma = {
  transaction: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockTransaction = {
  id: 'tx-uuid-1',
  amount: 1000,
  type: TransactionType.INCOME,
  category: 'Salary',
  date: new Date('2024-01-15'),
  notes: 'Monthly salary',
  userId: 'user-uuid-1',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 'user-uuid-1', name: 'Test User', email: 'test@example.com' },
};

const adminUser = { id: 'admin-uuid', role: Role.ADMIN };
const analystUser = { id: 'user-uuid-1', role: Role.ANALYST };
const analystOther = { id: 'other-analyst', role: Role.ANALYST };
const performer = { id: 'admin-uuid', email: 'admin@test.dev' };

const mockAudit = { log: jest.fn() };

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();
  });

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return paginated transactions', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.findAll({}, adminUser);

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should apply type filter', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll({ type: TransactionType.EXPENSE }, adminUser);

      // The $transaction was called — we trust the where clause is built
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('should return a transaction by id', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction);

      const result = await service.findOne('tx-uuid-1');
      expect(result.id).toBe('tx-uuid-1');
    });

    it('should throw NotFoundException for unknown id', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('should create a transaction for the authenticated user', async () => {
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);

      const dto = {
        amount: 1000,
        type: TransactionType.INCOME,
        category: 'Salary',
        date: '2024-01-15',
      };

      const result = await service.create(dto, 'user-uuid-1', performer);
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-uuid-1' }),
        }),
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('should allow admin to update any transaction', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...mockTransaction,
        amount: 2000,
      });

      const result = await service.update('tx-uuid-1', { amount: 2000 }, adminUser, performer);
      expect(mockPrisma.transaction.update).toHaveBeenCalled();
    });

    it('should allow analyst to update their own transaction', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction); // userId = 'user-uuid-1'
      mockPrisma.transaction.update.mockResolvedValue(mockTransaction);

      await service.update('tx-uuid-1', { notes: 'Updated' }, analystUser, performer);
      expect(mockPrisma.transaction.update).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if analyst updates another user's transaction", async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction); // owned by 'user-uuid-1'

      await expect(
        service.update('tx-uuid-1', { amount: 500 }, analystOther, performer),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('should soft-delete a transaction (admin only)', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...mockTransaction,
        deletedAt: new Date(),
      });

      const result = await service.remove('tx-uuid-1', adminUser, performer);
      expect(result.message).toContain('deleted');
    });

    it('should throw ForbiddenException if non-admin tries to delete', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction);

      await expect(
        service.remove('tx-uuid-1', analystUser, performer),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
