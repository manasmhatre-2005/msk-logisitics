const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function measure(name, fn, iterations = 3) {
  const times = [];
  let result;
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    result = await fn();
    const t1 = performance.now();
    times.push(t1 - t0);
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((s, t) => s + t, 0) / times.length;
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[times.length - 1];
  console.log(`[BENCHMARK] ${name.padEnd(46)} | avg: ${avg.toFixed(1).padStart(6)}ms | p50: ${p50.toFixed(1).padStart(6)}ms | p95: ${p95.toFixed(1).padStart(6)}ms`);
  return { name, avg, p50, p95, result };
}

async function run() {
  console.log('================================================================================');
  console.log('              MSK LOGISTIC SOLUTION ERP — PERFORMANCE BENCHMARK                 ');
  console.log('================================================================================\n');

  try {
    // 1. Auth lookup
    await measure('1. Auth User Lookup (Email)', async () => {
      return prisma.user.findUnique({
        where: { email: 'admin@login' },
        select: { id: true, email: true, name: true, role: true, active: true },
      });
    });

    // 2. Dashboard Stats (Current findMany logic)
    await measure('2. Dashboard Stats (findMany Aggregations)', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [
        totalParties,
        activeJobs,
        totalContainers,
        allInvoices,
        allRegisteredContainers,
        recentInvoices,
        recentJobs,
        activeContainers,
        upcomingInvoices,
      ] = await Promise.all([
        prisma.party.count(),
        prisma.job.count({ where: { status: 'ACTIVE' } }),
        prisma.container.count(),
        prisma.invoice.findMany({
          select: {
            id: true,
            grandTotal: true,
            taxableAmount: true,
            totalGst: true,
            balanceAmount: true,
            paidAmount: true,
            tdsAmount: true,
            billType: true,
            status: true,
            invoiceDate: true,
          },
        }),
        prisma.container.findMany({
          select: {
            id: true,
            size: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.invoice.findMany({
          take: 8,
          orderBy: { invoiceDate: 'desc' },
          include: {
            party: { select: { legalName: true, gstin: true } },
            containers: { select: { containerNumber: true } },
          },
        }),
        prisma.job.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            party: { select: { legalName: true } },
            exporter: { select: { name: true } },
            _count: { select: { containers: true } },
          },
        }),
        prisma.container.findMany({
          where: { status: { not: 'COMPLETED' } },
          take: 6,
          orderBy: { updatedAt: 'desc' },
          include: {
            party: { select: { legalName: true } },
            job: { select: { jobNumber: true } },
          },
        }),
        prisma.invoice.findMany({
          where: {
            dueDate: { not: null },
            balanceAmount: { gt: 0 },
          },
          take: 5,
          orderBy: { dueDate: 'asc' },
          include: { party: { select: { legalName: true } } },
        }),
      ]);
      return { totalParties, allInvoicesCount: allInvoices.length };
    });

    // 3. Invoice List query
    await measure('3. Invoice List (with full relations)', async () => {
      return prisma.invoice.findMany({
        include: {
          party: { select: { id: true, legalName: true, gstin: true } },
          job: { select: { id: true, jobNumber: true } },
          containers: { select: { containerNumber: true, size: true } },
          _count: { select: { items: true, payments: true } },
        },
        orderBy: { invoiceDate: 'desc' },
      });
    });

    // 4. Container List query
    await measure('4. Container List (with Party & Job)', async () => {
      return prisma.container.findMany({
        include: {
          party: { select: { id: true, legalName: true, gstin: true } },
          job: { select: { id: true, jobNumber: true } },
          exporter: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    // 5. Parties List query
    await measure('5. Parties List (with 3-way count)', async () => {
      return prisma.party.findMany({
        include: {
          _count: {
            select: { jobs: true, containers: true, invoices: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    // 6. Global Search query
    await measure('6. Global Search (4-way parallel)', async () => {
      const q = 'MSK';
      return Promise.all([
        prisma.party.findMany({
          where: {
            OR: [
              { legalName: { contains: q } },
              { gstin: { contains: q } },
            ],
          },
          take: 5,
        }),
        prisma.invoice.findMany({
          where: {
            OR: [
              { invoiceNumber: { contains: q } },
              { billToName: { contains: q } },
            ],
          },
          take: 5,
        }),
        prisma.container.findMany({
          where: { containerNumber: { contains: q } },
          take: 5,
        }),
        prisma.job.findMany({
          where: { jobNumber: { contains: q } },
          take: 5,
        }),
      ]);
    });

    // 7. Payments Outstanding query
    await measure('7. Party Outstanding Summary', async () => {
      const parties = await prisma.party.findMany({
        include: {
          invoices: {
            where: { status: { not: 'CANCELLED' }, balanceAmount: { gt: 0 } },
            select: { id: true, grandTotal: true, balanceAmount: true, dueDate: true },
          },
        },
      });
      return parties.length;
    });

  } catch (err) {
    console.error('Benchmark execution error:', err);
  } finally {
    await prisma.$disconnect();
    console.log('\n================================================================================');
  }
}

run();
