const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const indexStatements = [
  // Party Indexes
  'CREATE INDEX IF NOT EXISTS "Party_legalName_idx" ON "Party"("legalName");',
  'CREATE INDEX IF NOT EXISTS "Party_createdAt_idx" ON "Party"("createdAt");',
  'CREATE INDEX IF NOT EXISTS "Party_gstStatus_idx" ON "Party"("gstStatus");',

  // Exporter Indexes
  'CREATE INDEX IF NOT EXISTS "Exporter_name_idx" ON "Exporter"("name");',
  'CREATE INDEX IF NOT EXISTS "Exporter_createdAt_idx" ON "Exporter"("createdAt");',

  // Container Indexes
  'CREATE INDEX IF NOT EXISTS "Container_createdAt_idx" ON "Container"("createdAt");',
  'CREATE INDEX IF NOT EXISTS "Container_updatedAt_idx" ON "Container"("updatedAt");',
  'CREATE INDEX IF NOT EXISTS "Container_status_createdAt_idx" ON "Container"("status", "createdAt");',

  // Invoice Indexes
  'CREATE INDEX IF NOT EXISTS "Invoice_jobId_idx" ON "Invoice"("jobId");',
  'CREATE INDEX IF NOT EXISTS "Invoice_exporterId_idx" ON "Invoice"("exporterId");',
  'CREATE INDEX IF NOT EXISTS "Invoice_billToName_idx" ON "Invoice"("billToName");',
  'CREATE INDEX IF NOT EXISTS "Invoice_originalInvoiceNumber_idx" ON "Invoice"("originalInvoiceNumber");',
  'CREATE INDEX IF NOT EXISTS "Invoice_status_invoiceDate_idx" ON "Invoice"("status", "invoiceDate");',
  'CREATE INDEX IF NOT EXISTS "Invoice_status_balanceAmount_idx" ON "Invoice"("status", "balanceAmount");',

  // Payment Indexes
  'CREATE INDEX IF NOT EXISTS "Payment_referenceNumber_idx" ON "Payment"("referenceNumber");',
  'CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");',
];

async function applyIndexes() {
  console.log('Connecting to PostgreSQL to apply performance indexes...');
  try {
    for (const sql of indexStatements) {
      const t0 = performance.now();
      await prisma.$executeRawUnsafe(sql);
      const t1 = performance.now();
      const match = sql.match(/CREATE INDEX IF NOT EXISTS "([^"]+)"/);
      const idxName = match ? match[1] : sql;
      console.log(`✔ Created index: ${idxName} (${(t1 - t0).toFixed(1)}ms)`);
    }
    console.log('\nAll performance indexes applied successfully!');
  } catch (err) {
    console.error('Error applying indexes:', err);
  } finally {
    await prisma.$disconnect();
  }
}

applyIndexes();
