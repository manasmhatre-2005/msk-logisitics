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

const router = Router();

// Public Auth routes
router.post('/auth/login', AuthController.login);

// GSTIN Lookup (Public Search & Verification)
router.post('/gst/lookup', GSTController.lookup);
router.get('/gst/lookup', GSTController.lookup);

// Calculation Engines (Public for live wizard calculations)
router.post('/containers/calculate-dates', ContainerController.calculateDates);
router.post('/invoices/calculate', InvoiceController.calculate);

// WhatsApp Webhook (Meta verified)
router.get('/whatsapp/webhook', WhatsAppController.webhookGet);
router.post('/whatsapp/webhook', WhatsAppController.webhookPost);

// Public Credit Note Verification (Scan QR to verify)
router.get('/credit-notes/verify/:token', InvoiceController.verifyCreditNote);

// Authenticated Routes
router.use(authenticate);

// Current User & User list
router.get('/auth/me', AuthController.getMe);
router.get('/auth/users', AuthController.listUsers);

// Parties
router.get('/parties', PartyController.getAll);
router.get('/parties/:id', PartyController.getById);
router.post('/parties', requireRole(['ADMIN', 'BILLING', 'OPERATIONS']), PartyController.create);
router.put('/parties/:id', requireRole(['ADMIN', 'BILLING', 'OPERATIONS']), PartyController.update);
router.delete('/parties/:id', requireRole(['ADMIN']), PartyController.delete);

// Exporters
router.get('/exporters', ExporterController.getAll);
router.post('/exporters', requireRole(['ADMIN', 'BILLING', 'OPERATIONS']), ExporterController.create);
router.put('/exporters/:id', requireRole(['ADMIN', 'BILLING', 'OPERATIONS']), ExporterController.update);
router.delete('/exporters/:id', requireRole(['ADMIN']), ExporterController.delete);

// Jobs & Shipments
router.get('/jobs', JobController.getAll);
router.get('/jobs/:id', JobController.getById);
router.post('/jobs', requireRole(['ADMIN', 'BILLING', 'OPERATIONS']), JobController.create);
router.put('/jobs/:id', requireRole(['ADMIN', 'BILLING', 'OPERATIONS']), JobController.update);
router.delete('/jobs/:id', requireRole(['ADMIN']), JobController.delete);

// Containers
router.get('/containers', ContainerController.getAll);
router.get('/containers/:id', ContainerController.getById);
router.post('/containers', requireRole(['ADMIN', 'BILLING', 'OPERATIONS']), ContainerController.create);
router.put('/containers/:id', requireRole(['ADMIN', 'BILLING', 'OPERATIONS']), ContainerController.update);
router.delete('/containers/:id', requireRole(['ADMIN']), ContainerController.delete);
router.post('/containers/calculate-dates', ContainerController.calculateDates);

// Charges & Rates
router.get('/charges', ChargeController.getAll);
router.post('/charges', requireRole(['ADMIN', 'BILLING']), ChargeController.create);
router.put('/charges/:id', requireRole(['ADMIN', 'BILLING']), ChargeController.update);
router.delete('/charges/:id', requireRole(['ADMIN']), ChargeController.delete);

// Invoices
router.get('/invoices', InvoiceController.getAll);
router.get('/invoices/:id', InvoiceController.getById);
router.post('/invoices/calculate', InvoiceController.calculate);
router.post('/invoices', requireRole(['ADMIN', 'BILLING']), InvoiceController.create);
router.put('/invoices/:id', requireRole(['ADMIN', 'BILLING']), InvoiceController.update);
router.post('/invoices/:id/finalize', requireRole(['ADMIN', 'BILLING']), InvoiceController.finalize);
router.post('/invoices/:id/cancel', requireRole(['ADMIN']), InvoiceController.cancel);
router.get('/invoices/:id/pdf', InvoiceController.getPdf);
router.post('/invoices/:id/email', requireRole(['ADMIN', 'BILLING', 'OPERATIONS']), InvoiceController.sendEmail);

// Payments
router.get('/payments', PaymentController.getAll);
router.post('/payments', requireRole(['ADMIN', 'ACCOUNTANT', 'BILLING']), PaymentController.record);

// Reports & Dashboard
router.get('/reports/dashboard', ReportController.getDashboardStats);
router.get('/reports/party-billing', ReportController.getPartyBillingReport);
router.get('/reports/gst', ReportController.getGstReport);

// WhatsApp Integration
router.post('/whatsapp/send', requireRole(['ADMIN', 'BILLING', 'OPERATIONS']), WhatsAppController.sendMessage);
router.get('/whatsapp/messages', WhatsAppController.listMessages);
router.get('/whatsapp/templates', WhatsAppController.listTemplates);
router.get('/whatsapp/test-connection', WhatsAppController.testConnection);

// AI Chatbot
router.post('/chat', ChatController.message);

// Company & Billing Settings
router.get('/settings', SettingsController.getSettings);
router.put('/settings', requireRole(['ADMIN']), SettingsController.updateSettings);

// Global Search
router.get('/search', SearchController.globalSearch);

// Audit Logs
router.get('/audit', requireRole(['ADMIN', 'VIEWER']), AuditController.list);

export default router;
