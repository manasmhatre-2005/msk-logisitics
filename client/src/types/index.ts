export type UserRole = 'ADMIN' | 'ACCOUNT_MANAGER' | 'DATA_ENTRY' | 'BILLING' | 'OPERATIONS' | 'ACCOUNTANT' | 'VIEWER';

export interface DataEntryRecord {
  id: string;
  entryNumber: string;
  operationType: 'CARTING' | 'STUFFING' | 'CARTING_AND_STUFFING';
  operationDate: string;
  containerType: string;
  containerSize: '20 FT' | '40 FT';
  containerNumber: string;
  sealNumber: string;
  movementType: 'IN' | 'OUT';
  shippingLine: string;
  exporterName: string;
  exporterId?: string | null;
  remarks?: string | null;
  status: string;
  createdById: string;
  createdByName: string;
  updatedById?: string | null;
  updatedByName?: string | null;
  emailSentCount: number;
  lastEmailSentAt?: string | null;
  lastEmailRecipient?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DataEntryReferenceData {
  containerSizes: string[];
  containerTypes: string[];
  movementTypes: string[];
  operationTypes: string[];
  shippingLines: string[];
  exporters: { id: string; name: string }[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export type Currency = 'INR' | 'USD';

export type BillType = 'EMPTY_CONTAINER' | 'CREDIT_NOTE' | 'HT_BILL' | 'FORWARDING';

export interface BillTypeOption {
  id: BillType;
  label: string;
  subtitle: string;
  orderNumber: number;
  badge?: string;
}

export const BILL_TYPE_LIST: BillTypeOption[] = [
  {
    id: 'EMPTY_CONTAINER',
    label: 'Empty Container Bill',
    subtitle: 'Container movement, positioning, lift-on/off & yard operations',
    orderNumber: 1,
    badge: 'Bill 1',
  },
  {
    id: 'CREDIT_NOTE',
    label: 'Credit Note Bill',
    subtitle: 'Billing adjustments, rate credits, allowances & invoice revisions',
    orderNumber: 2,
    badge: 'Bill 2',
  },
  {
    id: 'HT_BILL',
    label: 'H & T Bill',
    subtitle: 'Haulage, local transport carting, stuffing & trailer movements',
    orderNumber: 3,
    badge: 'Bill 3',
  },
  {
    id: 'FORWARDING',
    label: 'Forwarding Bill',
    subtitle: 'Freight forwarding, shipping line charges & terminal documentation',
    orderNumber: 4,
    badge: 'Bill 4',
  },
];

export type BillFormatId = 'format-1' | 'format-2' | 'format-3' | 'format-4' | 'format-5';

export interface BillFormatOption {
  id: BillFormatId;
  name: string;
  description: string;
  isReady: boolean;
  referenceTag: string;
}

export const BILL_FORMAT_SLOTS: BillFormatOption[] = [
  {
    id: 'format-1',
    name: 'Bill Format 1 (Standard MSK Tax Invoice)',
    description: 'Exact company reference format: 9-column container table, 7-column charges, dual logo header, itemized tax summary & banking block.',
    isReady: true,
    referenceTag: 'Official Image 3 Design',
  },
  {
    id: 'format-2',
    name: 'Bill Format 2 (Template Slot 2)',
    description: 'Reserved template slot — ready for second custom invoice layout reference.',
    isReady: false,
    referenceTag: 'Slot 2 (Ready for Reference)',
  },
  {
    id: 'format-3',
    name: 'Bill Format 3 (Template Slot 3)',
    description: 'Reserved template slot — ready for third custom invoice layout reference.',
    isReady: false,
    referenceTag: 'Slot 3 (Ready for Reference)',
  },
  {
    id: 'format-4',
    name: 'Bill Format 4 (Template Slot 4)',
    description: 'Reserved template slot — ready for fourth custom invoice layout reference.',
    isReady: false,
    referenceTag: 'Slot 4 (Ready for Reference)',
  },
  {
    id: 'format-5',
    name: 'Bill Format 5 (Template Slot 5)',
    description: 'Reserved template slot — ready for fifth custom invoice layout reference.',
    isReady: false,
    referenceTag: 'Slot 5 (Ready for Reference)',
  },
];

export interface CompanySettings {
  id: string;
  companyName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string;
  invoicePrefix: string;
  nextInvoiceSeq: number;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankBranch: string;
  termsAndConditions: string;
  invoiceNotes: string;
  freeEmptyGroundDays: number;
  freeLoadedGroundDays: number;
  cgstDefaultRate: number;
  sgstDefaultRate: number;
  igstDefaultRate: number;
  defaultCurrency?: Currency;
  tan?: string;
  isoLogoUrl?: string;
  signatureUrl?: string;
  bankAccountName?: string;
  invoiceTitle?: string;
  isWhatsappMock: boolean;
  isGstMock: boolean;
}

export interface Party {
  id: string;
  legalName: string;
  tradeName?: string;
  gstin: string;
  pan?: string;
  gstStatus: string;
  registeredAddress: string;
  address?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  vendorCode?: string;
  notes?: string;
  isGstVerified: boolean;
  gstVerifiedAt?: string;
  hasManualOverride: boolean;
  createdAt: string;
  updatedAt: string;
  invoicesCount?: number;
  jobsCount?: number;
  containersCount?: number;
  totalBilled?: number;
  outstanding?: number;
  contacts?: PartyContact[];
  addresses?: PartyAddress[];
  invoices?: Invoice[];
  jobs?: Job[];
  containers?: Container[];
  payments?: Payment[];
}

export interface PartyContact {
  id: string;
  partyId: string;
  name: string;
  designation?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  isPrimary: boolean;
}

export interface PartyAddress {
  id: string;
  partyId: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  isDefault: boolean;
}

export interface Exporter {
  id: string;
  name: string;
  gstin?: string;
  iecCode?: string;
  address?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt?: string;
  _count?: { jobs: number; containers: number; invoices: number };
}

export type JobFormatType = 'FORMAT_1' | 'FORMAT_2' | 'FORMAT_3';

export interface Job {
  id: string;
  jobNumber: string;
  formatType?: JobFormatType | string;
  partyId: string;
  party: Party;
  exporterId?: string;
  exporter?: Exporter;
  sbNumber?: string;
  bookingDetails?: string;
  shipmentRef?: string;
  shipmentDate?: string;
  port?: string;
  destination?: string;
  remarks?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  containers?: Container[];
  _count?: { containers: number; invoices: number };
}

export const CONTAINER_SIZES = ['20 FT', '40 FT'] as const;
export type ContainerSizeType = (typeof CONTAINER_SIZES)[number];

export const CONTAINER_TYPES = [
  'HAZ',
  'HC',
  'DV',
  'Open Top',
  'ING/OT',
  'OG',
  'RF',
  'FR',
  'BBK',
  'Hard Top',
] as const;
export type ContainerSpecType = (typeof CONTAINER_TYPES)[number];

export interface Container {
  id: string;
  containerNumber: string;
  size: string;
  type: string;
  partyId: string;
  party?: Party;
  jobId?: string;
  job?: Job;
  exporterId?: string;
  exporter?: Exporter;
  cartingDate?: string;
  emptyGateInDate?: string;
  stuffingDate?: string;
  lddOutDate?: string;
  emptyGroundRentDays: number;
  daysAfterCarting: number;
  loadedGroundDays: number;
  isOverride: boolean;
  overrideReason?: string;
  htCharges: number;
  logisticsCharges: number;
  emptyTransportCharges: number;
  otherCharges: number;
  status: string;
  remarks?: string;
  createdAt: string;
}

export interface ChargeMaster {
  id: string;
  code: string;
  name: string;
  category: string;
  hsnSacCode: string;
  unit: string;
  defaultRate: number;
  gstRate: number;
  isActive: boolean;
  description?: string;
}

export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  containerId?: string | null;
  containerNumber?: string | null;
  containerSize?: string | null;
  chargeMasterId?: string | null;
  srNo: number;
  description: string;
  hsnSacCode: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  discount: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalAmount: number;
}

export interface InvoiceContainer {
  id?: string;
  invoiceId?: string;
  containerId?: string | null;
  containerNumber: string;
  size: string;
  containerSize?: string;
  type: string;
  cartingDate?: string;
  emptyGateInDate?: string;
  stuffingDate?: string;
  lddOutDate?: string;
  emptyGroundDays: number;
  daysAfterCarting?: number;
  loadedGroundDays: number;
  htCharges?: number;
  logisticsCharges?: number;
  emptyTransportCharges?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  issueDate?: string;
  dueDate?: string;
  partyId: string;
  party?: Party;
  exporterId?: string;
  exporter?: Exporter;
  jobId?: string;
  job?: Job;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'FINALIZED' | 'FINAL' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
  currency?: Currency;
  templateId?: BillFormatId;
  billType?: BillType | 'STANDARD';
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  originalInvoiceDate?: string;
  reasonForCredit?: string;
  verificationToken?: string;
  vesselVoyage?: string;
  mblHbl?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  placeOfSupply?: string;
  billToName: string;
  billToGstin: string;
  billToPan?: string;
  billToAddress: string;
  billToState: string;
  billToStateCode: string;
  consigneeName?: string;
  consigneeAddress?: string;
  sbNumbers?: string;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  isInterState: boolean;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalGst: number;
  roundOff: number;
  grandTotal: number;
  amountInWords?: string;
  paidAmount: number;
  tdsAmount?: number;
  balanceAmount: number;
  balance?: number;
  terms?: string;
  notes?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  createdAt: string;
  updatedAt?: string;
  items?: InvoiceItem[];
  containers?: InvoiceContainer[];
  payments?: Payment[];
  whatsAppMessages?: WhatsAppMessage[];
  _count?: { items: number; payments: number };
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoice?: { invoiceNumber: string; grandTotal: number; balanceAmount: number; currency?: Currency };
  partyId: string;
  party?: { legalName: string; gstin: string };
  amount: number;
  tdsRate?: number;
  tdsAmount?: number;
  batchId?: string;
  currency?: Currency;
  paymentDate: string;
  paymentMode: string;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface PartyOutstandingSummary {
  partyId: string;
  legalName: string;
  tradeName?: string;
  gstin: string;
  state?: string;
  totalInvoiced: number;
  totalCreditNotes: number;
  totalPaid: number;
  totalTds: number;
  netOutstanding: number;
  invoiceCount: number;
  invoices: Invoice[];
}

export interface WhatsAppMessage {
  id: string;
  recipientPhone: string;
  recipientName?: string;
  invoiceId?: string;
  invoice?: { invoiceNumber: string; grandTotal: number };
  messageType: string;
  templateName?: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  payloadJson?: string;
  responseJson?: string;
  externalMessageId?: string;
  sentAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  templateName: string;
  category: string;
  language: string;
  bodyText: string;
  headerText?: string;
  footerText?: string;
  parameters?: string;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  oldValuesJson?: string;
  newValuesJson?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface GSTVerificationResult {
  isValid: boolean;
  gstin: string;
  legalName: string;
  tradeName: string;
  registeredAddress: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  gstStatus: string;
  taxpayerType: string;
  dateOfRegistration?: string;
  partyExists: boolean;
  existingParty?: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    gstin: string;
    invoicesCount: number;
    jobsCount: number;
    containersCount: number;
    outstandingAmount: number;
    billingAddress?: string | null;
  };
  isLiveApi: boolean;
  verificationSource: 'LIVE_GSP' | 'VERIFIED_MOCK_SANDBOX';
  verifiedAt: string;
}

export interface EmailSendParams {
  recipientEmail: string;
  recipientName?: string;
  ccEmail?: string;
  subject?: string;
  customMessage?: string;
  templateId?: BillFormatId;
}

export interface EmailSendResult {
  success: boolean;
  messageId: string;
  recipient: string;
  cc?: string;
  subject: string;
  invoiceNumber: string;
  pdfFilename: string;
  attachmentSizeBytes: number;
  status: 'DELIVERED' | 'QUEUED' | 'SENT' | 'FAILED';
  isMock: boolean;
  error?: string;
}
