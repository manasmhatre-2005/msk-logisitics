const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.invoice.count();
    const invs = await prisma.invoice.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        party: { select: { legalName: true } },
        job: { select: { jobNumber: true } },
        containers: { select: { containerNumber: true } },
      },
    });
    console.log('Total invoices in DB:', count);
    console.log('Recent 10 invoices:');
    invs.forEach(i => {
      console.log(`- ${i.invoiceNumber} | Type: ${i.billType} | Party: ${i.party?.legalName} | Total: ${i.grandTotal} | Status: ${i.status} | CreatedAt: ${i.createdAt}`);
    });

    const parties = await prisma.party.count();
    const containers = await prisma.container.count();
    const jobs = await prisma.job.count();
    console.log(`Summary: ${parties} parties, ${jobs} jobs, ${containers} containers`);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
