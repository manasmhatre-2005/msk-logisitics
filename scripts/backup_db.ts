import prisma from '../server/src/prisma.ts';
import fs from 'fs';
import path from 'path';

async function runBackup() {
  console.log("Starting full database export from Neon PostgreSQL...");

  const users = await prisma.user.findMany();
  console.log(`Fetched ${users.length} users`);

  const settings = await prisma.companySettings.findMany();
  console.log(`Fetched ${settings.length} company settings`);

  const parties = await prisma.party.findMany();
  console.log(`Fetched ${parties.length} parties`);

  const addresses = await prisma.partyAddress.findMany();
  console.log(`Fetched ${addresses.length} party addresses`);

  const contacts = await prisma.partyContact.findMany();
  console.log(`Fetched ${contacts.length} party contacts`);

  const exporters = await prisma.exporter.findMany();
  console.log(`Fetched ${exporters.length} exporters`);

  const jobs = await prisma.job.findMany();
  console.log(`Fetched ${jobs.length} jobs`);

  const containers = await prisma.container.findMany();
  console.log(`Fetched ${containers.length} containers`);

  const charges = await prisma.chargeMaster.findMany();
  console.log(`Fetched ${charges.length} charges`);

  const invoices = await prisma.invoice.findMany();
  console.log(`Fetched ${invoices.length} invoices`);

  const invoiceContainers = await prisma.invoiceContainer.findMany();
  console.log(`Fetched ${invoiceContainers.length} invoice containers`);

  const invoiceItems = await prisma.invoiceItem.findMany();
  console.log(`Fetched ${invoiceItems.length} invoice items`);

  const payments = await prisma.payment.findMany();
  console.log(`Fetched ${payments.length} payments`);

  const whatsappMessages = await prisma.whatsAppMessage.findMany();
  console.log(`Fetched ${whatsappMessages.length} whatsapp messages`);

  const auditLogs = await prisma.auditLog.findMany();
  console.log(`Fetched ${auditLogs.length} audit logs`);

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `db_backup_${timestamp}.json`);

  const backupData = {
    backupTimestamp: new Date().toISOString(),
    databaseHost: "ep-orange-mouse-b51ilmon.c-7.us-east-2.aws.neon.tech",
    counts: {
      users: users.length,
      settings: settings.length,
      parties: parties.length,
      addresses: addresses.length,
      contacts: contacts.length,
      exporters: exporters.length,
      jobs: jobs.length,
      containers: containers.length,
      charges: charges.length,
      invoices: invoices.length,
      invoiceContainers: invoiceContainers.length,
      invoiceItems: invoiceItems.length,
      payments: payments.length,
      whatsappMessages: whatsappMessages.length,
      auditLogs: auditLogs.length,
    },
    tables: {
      users,
      settings,
      parties,
      addresses,
      contacts,
      exporters,
      jobs,
      containers,
      charges,
      invoices,
      invoiceContainers,
      invoiceItems,
      payments,
      whatsappMessages,
      auditLogs,
    }
  };

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\n🎉 SUCCESS: All records backed up safely to: ${backupFile}`);
  console.log("Summary of records:\n", JSON.stringify(backupData.counts, null, 2));

  await prisma.$disconnect();
}

runBackup().catch((err) => {
  console.error("FATAL: Backup failed:", err);
  process.exit(1);
});
