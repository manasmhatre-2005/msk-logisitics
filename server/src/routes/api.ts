import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AuthController } from '../controllers/authController.js';
import { GSTController } from '../controllers/gstController.js';
import { PartyController } from '../controllers/partyController.js';
import { ExporterController } from '../controllers/exporterController.js';
import { JobController } from '../controllers/jobController.js';
import { ContainerController } from '../controllers/containerController.js';
import { ChargeController } from '../controllers/chargeController.js';
import { InvoiceController } from '../controllers/invoiceController.js';
import { PaymentController } from '../controllers/paymentController.js';
import { ReportController } from '../controllers/reportController.js';
import { WhatsAppController } from '../controllers/whatsAppController.js';
import { ChatController } from '../controllers/chatController.js';
import { SettingsController } from '../controllers/settingsController.js';
import { SearchController } from '../controllers/searchController.js';
import { AuditController } from '../controllers/auditController.js';
import { DataEntryController } from '../controllers/dataEntryController.js';

const router = Router();

// Public Auth routes
router.post('/auth/login', AuthController.login);
router.post('/auth/logout', AuthController.logout);

// GSTIN Lookup (Public Search & Verification)
router.post('/gst/lookup', GSTController.lookup);
router.get('/gst/lookup', GSTController.lookup);

// Calculation Engines (Public for live wizard calculations)
router.post('/containers/calculate-dates', ContainerController.calculateDates);
router.post('/invoices/calculate', InvoiceController.calculate);

// WhatsApp Webhook (Meta verified)
router.get('/whatsapp/webhook', WhatsAppController.webhookGet);
router.post('/whatsapp/webhook', WhatsAppController.webhookPost);

// Public Credit Note & Invoice QR Verification (Scan QR to verify)
router.get('/credit-notes/verify/:token', InvoiceController.verifyCreditNote);
router.get('/invoices/verify/:token', InvoiceController.verifyInvoice);
router.get('/ht-bills/verify/:token', InvoiceController.verifyInvoice);
router.get('/empty-containers/verify/:token', InvoiceController.verifyInvoice);

// Authenticated Routes
router.use(authenticate);

// Current User & Admin User Management
router.get('/auth/me', AuthController.getMe);
router.get('/auth/users', requireRole(['ADMIN']), AuthController.listUsers);
router.post('/auth/change-password', AuthController.changePassword);

// Dedicated Operational Data Entry Module (Data Entry Operators & Admin Only)
router.get('/data-entry/reference-data', requireRole(['ADMIN', 'DATA_ENTRY']), DataEntryController.getReferenceData);
router.get('/data-entry/export/csv', requireRole(['ADMIN', 'DATA_ENTRY']), DataEntryController.exportCsv);
router.post('/data-entry', requireRole(['ADMIN', 'DATA_ENTRY']), DataEntryController.create);
router.get('/data-entry', requireRole(['ADMIN', 'DATA_ENTRY']), DataEntryController.getAll);
router.get('/data-entry/:id', requireRole(['ADMIN', 'DATA_ENTRY']), DataEntryController.getById);
router.put('/data-entry/:id', requireRole(['ADMIN', 'DATA_ENTRY']), DataEntryController.update);
router.delete('/data-entry/:id', requireRole(['ADMIN', 'DATA_ENTRY']), DataEntryController.delete);
router.post('/data-entry/:id/email', requireRole(['ADMIN', 'DATA_ENTRY']), DataEntryController.sendEmail);

// Parties (Strictly restricted to Admin and Account/Billing)
router.get('/parties', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), PartyController.getAll);
router.get('/parties/:id', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), PartyController.getById);
router.post('/parties', requireRole(['ADMIN', 'BILLING', 'OPERATIONS', 'ACCOUNT_MANAGER']), PartyController.create);
router.put('/parties/:id', requireRole(['ADMIN', 'BILLING', 'OPERATIONS', 'ACCOUNT_MANAGER']), PartyController.update);
router.delete('/parties/:id', requireRole(['ADMIN']), PartyController.delete);

// Exporters
router.get('/exporters', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING', 'OPERATIONS']), ExporterController.getAll);
router.post('/exporters', requireRole(['ADMIN', 'BILLING', 'OPERATIONS', 'ACCOUNT_MANAGER']), ExporterController.create);
router.put('/exporters/:id', requireRole(['ADMIN', 'BILLING', 'OPERATIONS', 'ACCOUNT_MANAGER']), ExporterController.update);
router.delete('/exporters/:id', requireRole(['ADMIN']), ExporterController.delete);

// Jobs & Shipments
router.get('/jobs', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING', 'OPERATIONS']), JobController.getAll);
router.get('/jobs/next-number', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING', 'OPERATIONS']), JobController.getNextNumber);
router.get('/jobs/:id', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING', 'OPERATIONS']), JobController.getById);
router.post('/jobs', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING', 'OPERATIONS']), JobController.create);
router.put('/jobs/:id', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING', 'OPERATIONS']), JobController.update);
router.delete('/jobs/:id', requireRole(['ADMIN']), JobController.delete);

// Containers
router.get('/containers', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING', 'OPERATIONS']), ContainerController.getAll);
router.get('/containers/:id', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING', 'OPERATIONS']), ContainerController.getById);
router.post('/containers', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING', 'OPERATIONS']), ContainerController.create);
router.put('/containers/:id', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING', 'OPERATIONS']), ContainerController.update);
router.delete('/containers/:id', requireRole(['ADMIN']), ContainerController.delete);
router.post('/containers/calculate-dates', ContainerController.calculateDates);

// Charges & Rates
router.get('/charges', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), ChargeController.getAll);
router.post('/charges', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), ChargeController.create);
router.put('/charges/:id', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), ChargeController.update);
router.delete('/charges/:id', requireRole(['ADMIN']), ChargeController.delete);

// Invoices (Strictly restricted from Data Entry Operators)
router.get('/invoices', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), InvoiceController.getAll);
router.get('/invoices/next-number', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), InvoiceController.getNextInvoiceNumber);
router.get('/invoices/:id', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), InvoiceController.getById);
router.post('/invoices/calculate', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), InvoiceController.calculate);
router.post('/invoices', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), InvoiceController.create);
router.put('/invoices/:id', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), InvoiceController.update);
router.post('/invoices/:id/finalize', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), InvoiceController.finalize);
router.post('/invoices/:id/cancel', requireRole(['ADMIN', 'ACCOUNT_MANAGER']), InvoiceController.cancel);
router.delete('/invoices/:id', requireRole(['ADMIN']), InvoiceController.delete);
router.get('/invoices/:id/pdf', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), InvoiceController.getPdf);
router.post('/invoices/:id/email', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING', 'OPERATIONS']), InvoiceController.sendEmail);

// Payments (Strictly restricted from Data Entry Operators)
router.get('/payments/outstanding', requireRole(['ADMIN', 'ACCOUNTANT', 'ACCOUNT_MANAGER', 'BILLING']), PaymentController.getPartyOutstanding);
router.get('/payments', requireRole(['ADMIN', 'ACCOUNTANT', 'ACCOUNT_MANAGER', 'BILLING']), PaymentController.getAll);
router.post('/payments', requireRole(['ADMIN', 'ACCOUNTANT', 'ACCOUNT_MANAGER', 'BILLING']), PaymentController.record);

// Reports & Dashboard (Strictly restricted from Data Entry Operators)
router.get('/reports/dashboard', requireRole(['ADMIN', 'BILLING', 'ACCOUNT_MANAGER']), ReportController.getDashboardStats);
router.get('/reports/party-billing', requireRole(['ADMIN', 'BILLING', 'ACCOUNT_MANAGER']), ReportController.getPartyBillingReport);
router.get('/reports/gst', requireRole(['ADMIN', 'BILLING', 'ACCOUNT_MANAGER']), ReportController.getGstReport);

// WhatsApp Integration
router.post('/whatsapp/send', requireRole(['ADMIN', 'BILLING', 'OPERATIONS']), WhatsAppController.sendMessage);
router.get('/whatsapp/messages', requireRole(['ADMIN', 'BILLING']), WhatsAppController.listMessages);
router.get('/whatsapp/templates', requireRole(['ADMIN', 'BILLING']), WhatsAppController.listTemplates);
router.get('/whatsapp/test-connection', requireRole(['ADMIN']), WhatsAppController.testConnection);

// AI Chatbot
router.post('/chat', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), ChatController.message);

// Company & Billing Settings (Admin Only for Updates)
router.get('/settings', requireRole(['ADMIN', 'ACCOUNT_MANAGER']), SettingsController.getSettings);
router.put('/settings', requireRole(['ADMIN']), SettingsController.updateSettings);

// Global Search (Admin & Account Manager)
router.get('/search', requireRole(['ADMIN', 'ACCOUNT_MANAGER', 'BILLING']), SearchController.globalSearch);

// Audit Logs (Admin Only)
router.get('/audit', requireRole(['ADMIN', 'VIEWER']), AuditController.list);

export default router;
