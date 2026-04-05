import { PrismaClient, Role, TransactionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

/** Calendar months to seed: Jan 2025 – Dec 2025, then Jan 2026 – Apr 2026 */
const MONTHS: { y: number; m: number }[] = [
  ...Array.from({ length: 12 }, (_, i) => ({ y: 2025, m: i + 1 })),
  ...Array.from({ length: 4 }, (_, i) => ({ y: 2026, m: i + 1 })),
];

type TxRow = {
  amount: number;
  type: TransactionType;
  category: string;
  date: Date;
  notes: string | null;
  userId: string;
};

const QUARTER_START_MONTHS = [1, 4, 7, 10];

function utcDate(y: number, month: number, day: number, h = 12) {
  return new Date(Date.UTC(y, month - 1, day, h, 0, 0));
}

function lastDayOfMonth(y: number, month: number) {
  return new Date(y, month, 0).getDate();
}

/** Inclusive random float with up to 2 decimals */
function rand(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

/** Inclusive random integer */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Pick `count` distinct months from 1..maxMonth */
function pickRandomMonths(maxMonth: number, count: number): Set<number> {
  const pool = Array.from({ length: maxMonth }, (_, i) => i + 1);
  const out = new Set<number>();
  const n = Math.min(count, pool.length);
  while (out.size < n) {
    out.add(pool[Math.floor(Math.random() * pool.length)]);
  }
  return out;
}

function randomDaysInMonth(y: number, m: number, n: number, avoid: Set<number> = new Set()) {
  const last = lastDayOfMonth(y, m);
  const days: number[] = [];
  const used = new Set(avoid);
  let guard = 0;
  while (days.length < n && guard < 200) {
    guard++;
    const d = randInt(1, last);
    if (!used.has(d)) {
      used.add(d);
      days.push(d);
    }
  }
  return days.sort((a, b) => a - b);
}

function push(list: TxRow[], userId: string, row: Omit<TxRow, 'userId'>) {
  list.push({ ...row, userId });
}

function buildTransactions(
  users: {
    admin: { id: string };
    analyst: { id: string };
    viewer: { id: string };
    sarah: { id: string };
    mike: { id: string };
    priya: { id: string };
  },
): TxRow[] {
  const list: TxRow[] = [];

  // Per-year freelance / consulting picks (recomputed per calendar year segment)
  const adminFreelance2025 = pickRandomMonths(12, 3 + Math.floor(Math.random() * 2));
  const adminFreelance2026 = pickRandomMonths(4, Math.random() < 0.6 ? 1 : 0);

  const analystFreelance2025 = pickRandomMonths(12, 5 + Math.floor(Math.random() * 2));
  const analystFreelance2026 = pickRandomMonths(4, randInt(0, 2));

  const sarahConsult2025 = pickRandomMonths(12, 4 + Math.floor(Math.random() * 2));
  const sarahConsult2026 = pickRandomMonths(4, randInt(0, 2));

  const adminTravel2025 = pickRandomMonths(12, 2 + Math.floor(Math.random() * 2));
  let adminTravel2026 = new Set<number>();
  if (Math.random() < 0.45) adminTravel2026 = pickRandomMonths(4, 1);

  for (const { y, m } of MONTHS) {
    const is2025 = y === 2025;

    // ── admin@finance.dev ─────────────────────────────────────────────
    {
      const u = users.admin.id;
      const ld = lastDayOfMonth(y, m);
      push(list, u, {
        amount: 5000,
        type: TransactionType.INCOME,
        category: 'Salary',
        date: utcDate(y, m, ld),
        notes: `${m}/${y} salary deposit`,
      });
      push(list, u, {
        amount: 1200,
        type: TransactionType.EXPENSE,
        category: 'Rent',
        date: utcDate(y, m, 1),
        notes: 'Monthly rent payment',
      });
      const gCount = randInt(2, 3);
      for (const d of randomDaysInMonth(y, m, gCount, new Set([1, ld]))) {
        push(list, u, {
          amount: randInt(80, 200),
          type: TransactionType.EXPENSE,
          category: 'Groceries',
          date: utcDate(y, m, d),
          notes: Math.random() < 0.4 ? 'Grocery run' : null,
        });
      }
      push(list, u, {
        amount: rand(120, 180),
        type: TransactionType.EXPENSE,
        category: 'Utilities',
        date: utcDate(y, m, randInt(5, 22)),
        notes: Math.random() < 0.5 ? 'Electric + water' : null,
      });
      const entN = randInt(1, 2);
      for (const d of randomDaysInMonth(y, m, entN)) {
        push(list, u, {
          amount: randInt(50, 300),
          type: TransactionType.EXPENSE,
          category: 'Entertainment',
          date: utcDate(y, m, d),
          notes: Math.random() < 0.35 ? 'Movies / streaming' : null,
        });
      }
      const dinN = randInt(3, 4);
      for (const d of randomDaysInMonth(y, m, dinN)) {
        push(list, u, {
          amount: randInt(30, 100),
          type: TransactionType.EXPENSE,
          category: 'Dining',
          date: utcDate(y, m, d),
          notes: Math.random() < 0.3 ? 'Dinner out' : null,
        });
      }
      const frSet = is2025 ? adminFreelance2025 : adminFreelance2026;
      if (frSet.has(m)) {
        push(list, u, {
          amount: randInt(500, 2000),
          type: TransactionType.INCOME,
          category: 'Freelance',
          date: utcDate(y, m, randInt(8, 25)),
          notes: 'Client project payment',
        });
      }
      const adminInvestQuarter =
        (y === 2025 && QUARTER_START_MONTHS.includes(m)) || (y === 2026 && (m === 1 || m === 4));
      if (adminInvestQuarter) {
        push(list, u, {
          amount: randInt(200, 800),
          type: TransactionType.INCOME,
          category: 'Investments',
          date: utcDate(y, m, 15),
          notes: 'Quarterly dividend / returns',
        });
      }
      if (Math.random() < 0.28) {
        push(list, u, {
          amount: randInt(100, 400),
          type: TransactionType.EXPENSE,
          category: 'Healthcare',
          date: utcDate(y, m, randInt(3, 28)),
          notes: Math.random() < 0.5 ? 'Pharmacy / copay' : null,
        });
      }
      const trSet = is2025 ? adminTravel2025 : adminTravel2026;
      if (trSet.has(m)) {
        push(list, u, {
          amount: randInt(400, 1500),
          type: TransactionType.EXPENSE,
          category: 'Travel',
          date: utcDate(y, m, randInt(10, 26)),
          notes: 'Trip — flights / hotel',
        });
      }
    }

    // ── analyst@finance.dev ───────────────────────────────────────────
    {
      const u = users.analyst.id;
      const ld = lastDayOfMonth(y, m);
      push(list, u, {
        amount: 3500,
        type: TransactionType.INCOME,
        category: 'Salary',
        date: utcDate(y, m, ld),
        notes: `${m}/${y} paycheck`,
      });
      push(list, u, {
        amount: 900,
        type: TransactionType.EXPENSE,
        category: 'Rent',
        date: utcDate(y, m, 1),
        notes: null,
      });
      const gCount = randInt(2, 3);
      for (const d of randomDaysInMonth(y, m, gCount, new Set([1, ld]))) {
        push(list, u, {
          amount: randInt(70, 160),
          type: TransactionType.EXPENSE,
          category: 'Groceries',
          date: utcDate(y, m, d),
          notes: null,
        });
      }
      push(list, u, {
        amount: rand(100, 160),
        type: TransactionType.EXPENSE,
        category: 'Utilities',
        date: utcDate(y, m, randInt(4, 20)),
        notes: null,
      });
      const entN = randInt(1, 2);
      for (const d of randomDaysInMonth(y, m, entN)) {
        push(list, u, {
          amount: randInt(40, 220),
          type: TransactionType.EXPENSE,
          category: 'Entertainment',
          date: utcDate(y, m, d),
          notes: null,
        });
      }
      const dinN = randInt(2, 3);
      for (const d of randomDaysInMonth(y, m, dinN)) {
        push(list, u, {
          amount: randInt(25, 90),
          type: TransactionType.EXPENSE,
          category: 'Dining',
          date: utcDate(y, m, d),
          notes: null,
        });
      }
      const afr = is2025 ? analystFreelance2025 : analystFreelance2026;
      if (afr.has(m)) {
        push(list, u, {
          amount: randInt(300, 1200),
          type: TransactionType.INCOME,
          category: 'Freelance',
          date: utcDate(y, m, randInt(6, 24)),
          notes: 'Contract work',
        });
      }
      const analystSideBizQuarter =
        (y === 2025 && QUARTER_START_MONTHS.includes(m)) || (y === 2026 && (m === 1 || m === 4));
      if (analystSideBizQuarter) {
        push(list, u, {
          amount: randInt(400, 900),
          type: TransactionType.INCOME,
          category: 'Side Business',
          date: utcDate(y, m, 18),
          notes: 'Quarterly side business payout',
        });
      }
      push(list, u, {
        amount: 50,
        type: TransactionType.EXPENSE,
        category: 'Subscriptions',
        date: utcDate(y, m, 5),
        notes: 'Software & media subscriptions',
      });
      push(list, u, {
        amount: 40,
        type: TransactionType.EXPENSE,
        category: 'Healthcare',
        date: utcDate(y, m, 10),
        notes: 'Gym membership',
      });
    }

    // ── viewer@finance.dev ─────────────────────────────────────────────
    {
      const u = users.viewer.id;
      const ld = lastDayOfMonth(y, m);
      push(list, u, {
        amount: 2800,
        type: TransactionType.INCOME,
        category: 'Salary',
        date: utcDate(y, m, ld),
        notes: null,
      });
      push(list, u, {
        amount: 800,
        type: TransactionType.EXPENSE,
        category: 'Rent',
        date: utcDate(y, m, 1),
        notes: null,
      });
      for (const d of randomDaysInMonth(y, m, 2, new Set([1, ld]))) {
        push(list, u, {
          amount: randInt(55, 130),
          type: TransactionType.EXPENSE,
          category: 'Groceries',
          date: utcDate(y, m, d),
          notes: null,
        });
      }
      push(list, u, {
        amount: rand(85, 140),
        type: TransactionType.EXPENSE,
        category: 'Utilities',
        date: utcDate(y, m, randInt(5, 18)),
        notes: null,
      });
      for (const d of randomDaysInMonth(y, m, 2)) {
        push(list, u, {
          amount: randInt(18, 55),
          type: TransactionType.EXPENSE,
          category: 'Dining',
          date: utcDate(y, m, d),
          notes: null,
        });
      }
      if (Math.random() < 0.45) {
        push(list, u, {
          amount: randInt(40, 120),
          type: TransactionType.EXPENSE,
          category: 'Entertainment',
          date: utcDate(y, m, randInt(7, 25)),
          notes: null,
        });
      }
      if (is2025 && Math.random() < 0.12) {
        push(list, u, {
          amount: randInt(200, 700),
          type: TransactionType.EXPENSE,
          category: 'Travel',
          date: utcDate(y, m, randInt(12, 27)),
          notes: 'Weekend getaway',
        });
      }
      if (!is2025 && Math.random() < 0.08) {
        push(list, u, {
          amount: randInt(150, 500),
          type: TransactionType.EXPENSE,
          category: 'Travel',
          date: utcDate(y, m, randInt(8, 22)),
          notes: null,
        });
      }
    }

    // ── sarah@finance.dev ────────────────────────────────────────────
    {
      const u = users.sarah.id;
      const ld = lastDayOfMonth(y, m);
      push(list, u, {
        amount: 4200,
        type: TransactionType.INCOME,
        category: 'Salary',
        date: utcDate(y, m, ld),
        notes: `${m}/${y} salary`,
      });
      push(list, u, {
        amount: 1100,
        type: TransactionType.EXPENSE,
        category: 'Rent',
        date: utcDate(y, m, 1),
        notes: null,
      });
      const sc = is2025 ? sarahConsult2025 : sarahConsult2026;
      if (sc.has(m)) {
        push(list, u, {
          amount: randInt(600, 1500),
          type: TransactionType.INCOME,
          category: 'Consulting',
          date: utcDate(y, m, randInt(10, 24)),
          notes: 'Consulting engagement invoice',
        });
      }
      const shopN = randInt(2, 3);
      for (const d of randomDaysInMonth(y, m, shopN)) {
        push(list, u, {
          amount: randInt(100, 400),
          type: TransactionType.EXPENSE,
          category: 'Shopping',
          date: utcDate(y, m, d),
          notes: Math.random() < 0.4 ? 'Clothing / home' : null,
        });
      }
      for (const d of randomDaysInMonth(y, m, randInt(2, 3))) {
        push(list, u, {
          amount: randInt(65, 170),
          type: TransactionType.EXPENSE,
          category: 'Groceries',
          date: utcDate(y, m, d),
          notes: null,
        });
      }
      push(list, u, {
        amount: rand(115, 175),
        type: TransactionType.EXPENSE,
        category: 'Utilities',
        date: utcDate(y, m, randInt(4, 21)),
        notes: null,
      });
      for (const d of randomDaysInMonth(y, m, randInt(1, 2))) {
        push(list, u, {
          amount: randInt(45, 250),
          type: TransactionType.EXPENSE,
          category: 'Entertainment',
          date: utcDate(y, m, d),
          notes: null,
        });
      }
      for (const d of randomDaysInMonth(y, m, randInt(2, 4))) {
        push(list, u, {
          amount: randInt(28, 95),
          type: TransactionType.EXPENSE,
          category: 'Dining',
          date: utcDate(y, m, d),
          notes: null,
        });
      }
    }

    // ── mike@finance.dev ─────────────────────────────────────────────
    {
      const u = users.mike.id;
      const ld = lastDayOfMonth(y, m);
      push(list, u, {
        amount: 1500,
        type: TransactionType.INCOME,
        category: 'Part Time',
        date: utcDate(y, m, ld),
        notes: 'Part-time campus job',
      });
      if (Math.random() < 0.28) {
        push(list, u, {
          amount: randInt(200, 600),
          type: TransactionType.INCOME,
          category: 'Freelance',
          date: utcDate(y, m, randInt(5, 20)),
          notes: 'Small freelance gig',
        });
      }
      push(list, u, {
        amount: randInt(450, 650),
        type: TransactionType.EXPENSE,
        category: 'Rent',
        date: utcDate(y, m, 1),
        notes: 'Shared apartment',
      });
      push(list, u, {
        amount: randInt(40, 95),
        type: TransactionType.EXPENSE,
        category: 'Groceries',
        date: utcDate(y, m, randInt(4, 14)),
        notes: null,
      });
      push(list, u, {
        amount: randInt(40, 95),
        type: TransactionType.EXPENSE,
        category: 'Groceries',
        date: utcDate(y, m, randInt(16, 26)),
        notes: null,
      });
      push(list, u, {
        amount: rand(55, 95),
        type: TransactionType.EXPENSE,
        category: 'Utilities',
        date: utcDate(y, m, randInt(6, 18)),
        notes: null,
      });
      if (Math.random() < 0.55) {
        push(list, u, {
          amount: randInt(12, 35),
          type: TransactionType.EXPENSE,
          category: 'Dining',
          date: utcDate(y, m, randInt(8, 24)),
          notes: 'Campus food',
        });
      }
      push(list, u, {
        amount: randInt(30, 80),
        type: TransactionType.EXPENSE,
        category: 'Education',
        date: utcDate(y, m, randInt(3, 25)),
        notes: Math.random() < 0.5 ? 'Books / online course' : null,
      });
    }

    // ── priya@finance.dev ────────────────────────────────────────────
    {
      const u = users.priya.id;
      const ld = lastDayOfMonth(y, m);
      push(list, u, {
        amount: 4800,
        type: TransactionType.INCOME,
        category: 'Salary',
        date: utcDate(y, m, ld),
        notes: `${m}/${y} salary`,
      });
      push(list, u, {
        amount: 600,
        type: TransactionType.INCOME,
        category: 'Rental Income',
        date: utcDate(y, m, 2),
        notes: 'Tenant rent — parking unit',
      });
      push(list, u, {
        amount: 1350,
        type: TransactionType.EXPENSE,
        category: 'Rent',
        date: utcDate(y, m, 1),
        notes: 'Primary residence',
      });
      push(list, u, {
        amount: 200,
        type: TransactionType.EXPENSE,
        category: 'Insurance',
        date: utcDate(y, m, 7),
        notes: 'Health + renters bundle',
      });
      push(list, u, {
        amount: 350,
        type: TransactionType.EXPENSE,
        category: 'Car Payment',
        date: utcDate(y, m, 12),
        notes: 'Auto loan',
      });
      push(list, u, {
        amount: rand(85, 115),
        type: TransactionType.EXPENSE,
        category: 'Fuel',
        date: utcDate(y, m, randInt(8, 22)),
        notes: Math.random() < 0.4 ? 'Gas fill-ups' : null,
      });
      for (const d of randomDaysInMonth(y, m, randInt(3, 4))) {
        push(list, u, {
          amount: randInt(90, 220),
          type: TransactionType.EXPENSE,
          category: 'Groceries',
          date: utcDate(y, m, d),
          notes: null,
        });
      }
      push(list, u, {
        amount: rand(125, 195),
        type: TransactionType.EXPENSE,
        category: 'Utilities',
        date: utcDate(y, m, randInt(4, 19)),
        notes: null,
      });
      for (const d of randomDaysInMonth(y, m, randInt(2, 3))) {
        push(list, u, {
          amount: randInt(55, 320),
          type: TransactionType.EXPENSE,
          category: 'Entertainment',
          date: utcDate(y, m, d),
          notes: null,
        });
      }
      for (const d of randomDaysInMonth(y, m, randInt(3, 5))) {
        push(list, u, {
          amount: randInt(35, 120),
          type: TransactionType.EXPENSE,
          category: 'Dining',
          date: utcDate(y, m, d),
          notes: null,
        });
      }
      if (Math.random() < 0.25) {
        push(list, u, {
          amount: randInt(120, 350),
          type: TransactionType.EXPENSE,
          category: 'Shopping',
          date: utcDate(y, m, randInt(6, 26)),
          notes: null,
        });
      }
    }

  }

  return list;
}

async function main() {
  console.log('🌱 Seeding database...\n');

  const hashedPassword = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@finance.dev' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@finance.dev',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@finance.dev' },
    update: {},
    create: {
      name: 'Analyst User',
      email: 'analyst@finance.dev',
      password: hashedPassword,
      role: Role.ANALYST,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@finance.dev' },
    update: {},
    create: {
      name: 'Viewer User',
      email: 'viewer@finance.dev',
      password: hashedPassword,
      role: Role.VIEWER,
    },
  });

  const sarah = await prisma.user.upsert({
    where: { email: 'sarah@finance.dev' },
    update: { name: 'Sarah Johnson', role: Role.ANALYST },
    create: {
      name: 'Sarah Johnson',
      email: 'sarah@finance.dev',
      password: hashedPassword,
      role: Role.ANALYST,
    },
  });

  const mike = await prisma.user.upsert({
    where: { email: 'mike@finance.dev' },
    update: { name: 'Mike Chen', role: Role.VIEWER },
    create: {
      name: 'Mike Chen',
      email: 'mike@finance.dev',
      password: hashedPassword,
      role: Role.VIEWER,
    },
  });

  const priya = await prisma.user.upsert({
    where: { email: 'priya@finance.dev' },
    update: { name: 'Priya Patel', role: Role.ANALYST },
    create: {
      name: 'Priya Patel',
      email: 'priya@finance.dev',
      password: hashedPassword,
      role: Role.ANALYST,
    },
  });

  console.log('✅ Users upserted (password: password123):');
  console.log('   admin@finance.dev    (ADMIN)     — Admin User');
  console.log('   analyst@finance.dev  (ANALYST)   — Analyst User');
  console.log('   viewer@finance.dev   (VIEWER)    — Viewer User');
  console.log('   sarah@finance.dev    (ANALYST)   — Sarah Johnson');
  console.log('   mike@finance.dev     (VIEWER)    — Mike Chen');
  console.log('   priya@finance.dev    (ANALYST)   — Priya Patel\n');

  if (process.env.NODE_ENV !== 'production') {
    const deleted = await prisma.transaction.deleteMany({});
    console.log(`🗑️ Cleared ${deleted.count} existing transaction(s)\n`);
  }
  const rows = buildTransactions({ admin, analyst, viewer, sarah, mike, priya });

  const BATCH = 250;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await prisma.transaction.createMany({ data: chunk });
  }
  
  const byUser = await prisma.transaction.groupBy({
    by: ['userId'],
    _count: { _all: true },
  });

  const idToEmail = new Map<string, string>([
    [admin.id, 'admin@finance.dev'],
    [analyst.id, 'analyst@finance.dev'],
    [viewer.id, 'viewer@finance.dev'],
    [sarah.id, 'sarah@finance.dev'],
    [mike.id, 'mike@finance.dev'],
    [priya.id, 'priya@finance.dev'],
  ]);

  console.log('📊 Transactions created per user:');
  const sorted = [...byUser].sort((a, b) =>
    (idToEmail.get(a.userId) ?? '').localeCompare(idToEmail.get(b.userId) ?? ''),
  );
  let total = 0;
  for (const row of sorted) {
    const email = idToEmail.get(row.userId) ?? row.userId;
    const c = row._count._all;
    total += c;
    console.log(`   ${email.padEnd(22)} ${c}`);
  }
  console.log(`   ${'TOTAL'.padEnd(22)} ${total}`);
  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
