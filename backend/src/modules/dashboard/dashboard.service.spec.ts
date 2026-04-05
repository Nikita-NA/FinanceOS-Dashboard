import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma.service';
import { TransactionType } from '@prisma/client';

const mockPrisma = {
  transaction: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  // ── getSummary ────────────────────────────────────────────────────────────
  describe('getSummary()', () => {
    it('should return correct totals, net balance and savings rate', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        { _sum: { amount: 10000 }, _count: 5 },  // income
        { _sum: { amount: 4000 }, _count: 8 },   // expense
        13,                                        // total count
      ]);

      const result = await service.getSummary();

      expect(result.totalIncome).toBe(10000);
      expect(result.totalExpenses).toBe(4000);
      expect(result.netBalance).toBe(6000);
      expect(result.savingsRate).toBe(60);
      expect(result.transactionCount).toBe(13);
    });

    it('should return 0 savingsRate when totalIncome is 0', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        { _sum: { amount: null }, _count: 0 },
        { _sum: { amount: 500 }, _count: 2 },
        2,
      ]);

      const result = await service.getSummary();
      expect(result.savingsRate).toBe(0);
      expect(result.netBalance).toBe(-500);
    });
  });

  // ── getCategoryBreakdown ──────────────────────────────────────────────────
  describe('getCategoryBreakdown()', () => {
    it('should return categories with correct percentages', async () => {
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { category: 'Salary', type: TransactionType.INCOME, _sum: { amount: 8000 }, _count: 2 },
        { category: 'Rent',   type: TransactionType.EXPENSE, _sum: { amount: 2000 }, _count: 1 },
      ]);

      const result = await service.getCategoryBreakdown();

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('Salary');
      expect(result[0].percentage).toBe(80);
      expect(result[1].percentage).toBe(20);
    });
  });

  // ── getMonthlyTrends ──────────────────────────────────────────────────────
  describe('getMonthlyTrends()', () => {
    it('should return 12 months for the given year', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: 5000, type: TransactionType.INCOME,  date: new Date('2024-01-15') },
        { amount: 1200, type: TransactionType.EXPENSE, date: new Date('2024-01-10') },
        { amount: 5000, type: TransactionType.INCOME,  date: new Date('2024-03-31') },
      ]);

      const result = await service.getMonthlyTrends(2024);

      expect(result).toHaveLength(12);
      const jan = result.find((r) => r.month === '2024-01');
      expect(jan?.income).toBe(5000);
      expect(jan?.expense).toBe(1200);
      expect(jan?.net).toBe(3800);
    });
  });

  // ── getRecentActivity ─────────────────────────────────────────────────────
  describe('getRecentActivity()', () => {
    it('should return at most the requested number of records', async () => {
      const fakeTransactions = Array.from({ length: 5 }, (_, i) => ({
        id: `tx-${i}`,
        amount: 100 * (i + 1),
        type: TransactionType.INCOME,
        category: 'Test',
        date: new Date(),
        user: { id: 'u1', name: 'Test' },
      }));

      mockPrisma.transaction.findMany.mockResolvedValue(fakeTransactions);

      const result = await service.getRecentActivity(5);
      expect(result).toHaveLength(5);
    });
  });
});
