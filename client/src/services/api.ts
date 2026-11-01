import {
  User,
  Party,
  Exporter,
  Job,
  Container,
  ChargeMaster,
  Invoice,
  Payment,
  WhatsAppMessage,
  WhatsAppTemplate,
  AuditLog,
  CompanySettings,
  GSTVerificationResult,
  PartyOutstandingSummary,
} from '../types/index';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('logibill_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('logibill_token');
    }
    let errMsg = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      errMsg = errData.error || errData.message || errMsg;
    } catch {
      // not json
    }
    throw new Error(errMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request<{ user: User }>('/auth/me'),
  getUsers: () => request<User[]>('/auth/users'),

  // GST
  lookupGSTIN: (gstin: string) =>
    request<GSTVerificationResult>('/gst/lookup', {
      method: 'POST',
      body: JSON.stringify({ gstin }),
    }),

  // Parties
  getParties: (search?: string) =>
    request<Party[]>(`/parties${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getParty: (id: string) => request<Party>(`/parties/${id}`),
  createParty: (data: Partial<Party>) =>
    request<Party>('/parties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateParty: (id: string, data: Partial<Party>) =>
    request<Party>(`/parties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteParty: (id: string) =>
    request<{ message: string }>(`/parties/${id}`, { method: 'DELETE' }),

  // Exporters
  getExporters: () => request<Exporter[]>('/exporters'),
  createExporter: (data: Partial<Exporter>) =>
    request<Exporter>('/exporters', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateExporter: (id: string, data: Partial<Exporter>) =>
    request<Exporter>(`/exporters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteExporter: (id: string) =>
    request<{ message: string }>(`/exporters/${id}`, { method: 'DELETE' }),

  // Jobs
  getJobs: (status?: string, partyId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (partyId) params.append('partyId', partyId);
    return request<Job[]>(`/jobs?${params.toString()}`);
  },
  getJob: (id: string) => request<Job>(`/jobs/${id}`),
  createJob: (data: Partial<Job>) =>
    request<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateJob: (id: string, data: Partial<Job>) =>
    request<Job>(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteJob: (id: string) =>
    request<{ message: string }>(`/jobs/${id}`, { method: 'DELETE' }),

  // Containers
  getContainers: (search?: string, partyId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (partyId) params.append('partyId', partyId);
    if (status) params.append('status', status);
    return request<Container[]>(`/containers?${params.toString()}`);
  },
  getContainer: (id: string) => request<Container>(`/containers/${id}`),
  calculateContainerDates: (data: any) =>
    request<any>('/containers/calculate-dates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createContainer: (data: Partial<Container>) =>
    request<Container>('/containers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateContainer: (id: string, data: Partial<Container>) =>
    request<Container>(`/containers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteContainer: (id: string) =>
    request<{ message: string }>(`/containers/${id}`, { method: 'DELETE' }),

  // Charges
  getCharges: (activeOnly = false) =>
    request<ChargeMaster[]>(`/charges${activeOnly ? '?activeOnly=true' : ''}`),
  createCharge: (data: Partial<ChargeMaster>) =>
    request<ChargeMaster>('/charges', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCharge: (id: string, data: Partial<ChargeMaster>) =>
    request<ChargeMaster>(`/charges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCharge: (id: string) =>
    request<{ message: string }>(`/charges/${id}`, { method: 'DELETE' }),

  // Invoices
  getNextInvoiceNumber: (billType: string, invoiceDate?: string) => {
    const params = new URLSearchParams();
    if (billType) params.append('billType', billType);
    if (invoiceDate) params.append('invoiceDate', invoiceDate);
    return request<{ nextInvoiceNumber: string }>(`/invoices/next-number?${params.toString()}`);
  },
  getInvoices: (status?: string, partyId?: string, search?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (partyId) params.append('partyId', partyId);
    if (search) params.append('search', search);
    return request<Invoice[]>(`/invoices?${params.toString()}`);
  },
  getInvoice: (id: string) => request<Invoice>(`/invoices/${id}`),
  calculateInvoice: (data: any) =>
    request<any>('/invoices/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createInvoice: (data: any) => {
    const idempotencyKey =
      data.idempotencyKey || `ik_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    return request<Invoice>('/invoices', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ ...data, idempotencyKey }),
    });
  },
  updateInvoice: (id: string, data: any) =>
    request<Invoice>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  finalizeInvoice: (id: string) =>
    request<Invoice>(`/invoices/${id}/finalize`, {
      method: 'POST',
    }),
  cancelInvoice: (id: string, reason?: string) =>
    request<Invoice>(`/invoices/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getInvoicePdfUrl: (id: string, templateId?: string) =>
    `/api/invoices/${id}/pdf${templateId ? `?templateId=${encodeURIComponent(templateId)}` : ''}`,
  verifyCreditNote: (token: string) => request<any>(`/credit-notes/verify/${token}`),
  verifyInvoice: (token: string) => request<any>(`/invoices/verify/${token}`),
  verifyHtBill: (token: string) => request<any>(`/invoices/verify/${token}`),
  sendInvoiceEmail: (id: string, data: { recipientEmail: string; recipientName?: string; ccEmail?: string; subject?: string; customMessage?: string; templateId?: string }) =>
    request<any>(`/invoices/${id}/email`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Payments & Party Outstanding
  getPartyOutstanding: (partyId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (partyId) params.append('partyId', partyId);
    if (status) params.append('status', status);
    return request<PartyOutstandingSummary[]>(`/payments/outstanding?${params.toString()}`);
  },
  getPayments: (partyId?: string, invoiceId?: string) => {
    const params = new URLSearchParams();
    if (partyId) params.append('partyId', partyId);
    if (invoiceId) params.append('invoiceId', invoiceId);
    return request<Payment[]>(`/payments?${params.toString()}`);
  },
  recordPayment: (data: {
    partyId?: string;
    invoiceId?: string;
    amount?: number;
    tdsRate?: number;
    tdsAmount?: number;
    paymentDate?: string;
    paymentMode?: string;
    referenceNumber?: string;
    notes?: string;
    allocations?: Array<{
      invoiceId: string;
      amount: number;
      tdsRate?: number;
      tdsAmount?: number;
    }>;
  }) =>
    request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Reports & Dashboard
  getDashboardStats: () => request<any>('/reports/dashboard'),
  getPartyBillingReport: () => request<any[]>('/reports/party-billing'),
  getGstReport: () => request<any[]>('/reports/gst'),

  // WhatsApp
  sendWhatsApp: (data: any) =>
    request<any>('/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getWhatsAppMessages: () => request<WhatsAppMessage[]>('/whatsapp/messages'),
  getWhatsAppTemplates: () => request<WhatsAppTemplate[]>('/whatsapp/templates'),
  testWhatsAppConnection: () => request<any>('/whatsapp/test-connection'),

  // AI Chatbot
  sendChatMessage: (message: string, history: any[] = []) =>
    request<any>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),

  // Settings
  getSettings: () => request<CompanySettings>('/settings'),
  updateSettings: (data: Partial<CompanySettings>) =>
    request<CompanySettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Global Search
  search: (query: string) =>
    request<{ parties: Party[]; invoices: Invoice[]; containers: Container[]; jobs: Job[] }>(
      `/search?q=${encodeURIComponent(query)}`
    ),

  // Audit Logs
  getAuditLogs: (entityType?: string, entityId?: string) => {
    const params = new URLSearchParams();
    if (entityType) params.append('entityType', entityType);
    if (entityId) params.append('entityId', entityId);
    return request<AuditLog[]>(`/audit?${params.toString()}`);
  },
};
