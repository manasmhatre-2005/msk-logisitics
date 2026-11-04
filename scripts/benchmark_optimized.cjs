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
  console.log(`[BENCHMARK] ${name.padEnd(52)} | avg: ${avg.toFixed(1).padStart(6)}ms | p50: ${p50.toFixed(1).padStart(6)}ms | p95: ${p95.toFixed(1).padStart(6)}ms`);
  return { name, avg, p50, p95, result };
}

async function run() {
  console.log('========================================================================================');
  console.log('         MSK LOGISTIC SOLUTION ERP — OPTIMIZED COMPONENT BENCHMARKS             ');
  console.log('========================================================================================\n');

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // 1. OLD Dashboard Logic (Unbounded findMany in memory)
    await measure('1. OLD Dashboard (Unbounded findMany In-Memory)', async () => {
      const [allInvoices, allContainers] = await Promise.all([
        prisma.invoice.findMany({ select: { id: true, grandTotal: true, totalGst: true, balanceAmount: true, status: true, invoiceDate: true } }),
        prisma.container.findMany({ select: { id: true, size: true, status: true, createdAt: true } }),
      ]);
      return { invoices: allInvoices.length, containers: allContainers.length };
    }, 3);

    // 2. NEW Dashboard Logic (Native DB Aggregates & GroupBy)
    await measure('2. NEW Dashboard (Native PostgreSQL Aggregates)', async () => {
      const [
        totalParties,
        activeJobs,
        totalContainers,
        validInvoiceAgg,
        thisMonthInvoiceAgg,
        containerStatusGroups,
        invoiceStatusGroups,
      ] = await Promise.all([
        prisma.party.count(),
        prisma.job.count({ where: { status: 'ACTIVE' } }),
        prisma.container.count(),
        prisma.invoice.aggregate({
          where: { status: { not: 'CANCELLED' } },
          _sum: { totalGst: true, balanceAmount: true },
        }),
        prisma.invoice.aggregate({
          where: { status: { not: 'CANCELLED' }, invoiceDate: { gte: startOfMonth } },
          _sum: { grandTotal: true },
          _count: { _all: true },
        }),
        prisma.container.groupBy({ by: ['status'], _count: { id: true } }),
        prisma.invoice.groupBy({ by: ['status'], _count: { id: true } }),
      ]);
      return { totalParties, totalContainers };
    }, 3);

    // 3. NEW Global Search with Field Projections & Insensitive
    await measure('3. NEW Global Search (Projected + Case-Insensitive)', async () => {
      const q = 'MSK';
      return Promise.all([
        prisma.party.findMany({
          where: { OR: [{ legalName: { contains: q, mode: 'insensitive' } }, { gstin: { contains: q, mode: 'insensitive' } }] },
          select: { id: true, legalName: true, gstin: true, mobile: true, city: true },
          take: 5,
        }),
        prisma.invoice.findMany({
          where: { OR: [{ invoiceNumber: { contains: q, mode: 'insensitive' } }, { billToName: { contains: q, mode: 'insensitive' } }] },
          select: { id: true, invoiceNumber: true, billToName: true, grandTotal: true, status: true },
          take: 5,
        }),
        prisma.container.findMany({
          where: { containerNumber: { contains: q, mode: 'insensitive' } },
          select: { id: true, containerNumber: true, size: true, status: true },
          take: 5,
        }),
        prisma.job.findMany({
          where: { OR: [{ jobNumber: { contains: q, mode: 'insensitive' } }, { sbNumber: { contains: q, mode: 'insensitive' } }] },
          select: { id: true, jobNumber: true, sbNumber: true, status: true },
          take: 5,
        }),
      ]);
    }, 3);

    // 4. Stored Document Fast-Path vs Full PDF Generation
    const anyInvoice = await prisma.invoice.findFirst({ select: { id: true } });
    if (anyInvoice) {
      await measure('4. Document Store Lookup (Instant Stream Check)', async () => {
        return prisma.document.findFirst({
          where: { entityType: 'INVOICE', entityId: anyInvoice.id, documentType: 'INVOICE_PDF' },
          select: { id: true, filePath: true, checksum: true },
        });
      }, 3);
    }

  } catch (err) {
    console.error('Optimized benchmark error:', err);
  } finally {
    await prisma.$disconnect();
    console.log('\n========================================================================================');
  }
}

run();
