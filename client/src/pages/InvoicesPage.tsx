import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Search,
  Plus,
  Eye,
  Edit,
  Download,
  Printer,
  Mail,
  Copy,
  XCircle,
  Filter,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Box,
  Receipt,
  Truck,
  Ship,
  Calendar,
  RotateCcw,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Layers,
  ArrowUpDown,
  Building2,
  Save,
  X,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';
import { Invoice, BillType } from '../types/index';
import { Badge } from '../components/common/Badge';
import { EmailSendModal } from '../components/email/EmailSendModal';
import { formatCurrencyWithSymbol } from '../utils/currency';

interface InvoicesPageProps {
  onCreateInvoice: (billType?: BillType | 'STANDARD') => void;
  onViewInvoice: (id: string) => void;
  onPrintInvoice: (inv: Invoice) => void;
  refreshTrigger?: number;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({
  onCreateInvoice,
  onViewInvoice,
  onPrintInvoice,
  refreshTrigger = 0,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [financialYearFilter, setFinancialYearFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sorting State
  const [sortBy, setSortBy] = useState<string>('invoiceDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Active downloading invoice IDs to show spinner per row
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<Invoice | null>(null);

  // Edit Invoice Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editInvoiceDate, setEditInvoiceDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editConsigneeName, setEditConsigneeName] = useState('');
  const [editConsigneeAddress, setEditConsigneeAddress] = useState('');
  const [editSbNumbers, setEditSbNumbers] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTerms, setEditTerms] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Query Invoices from Database API with Server-Side Filters
  const fetchInvoices = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.getInvoices({
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        billType: typeFilter,
        financialYear: financialYearFilter,
        search: debouncedSearch,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: itemsPerPage,
        paginate: true,
      });

      if (res && res.invoices) {
        setInvoices(res.invoices);
        setTotalCount(res.totalCount || res.invoices.length);
        setTotalPages(res.totalPages || Math.ceil((res.totalCount || res.invoices.length) / itemsPerPage) || 1);
      } else if (Array.isArray(res)) {
        setInvoices(res);
        setTotalCount(res.length);
        setTotalPages(Math.ceil(res.length / itemsPerPage) || 1);
      } else {
        setInvoices([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (e) {
      console.error('Error fetching invoices from database:', e);
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    statusFilter,
    paymentStatusFilter,
    typeFilter,
    financialYearFilter,
    debouncedSearch,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    currentPage,
    itemsPerPage,
  ]);

  // Fetch when filters, sort, page, or external trigger changes
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices, refreshTrigger]);

  const handleOpenEmail = (inv: Invoice) => {
    setSelectedInvoiceForEmail(inv);
    setEmailModalOpen(true);
  };

  const handleOpenEdit = (inv: Invoice) => {
    if (inv.status === 'CANCELLED') {
      alert('Cancelled invoices cannot be edited.');
      return;
    }
    setEditingInvoice(inv);
    setEditInvoiceDate(inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '');
    setEditDueDate(inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '');
    setEditConsigneeName(inv.consigneeName || '');
    setEditConsigneeAddress(inv.consigneeAddress || '');
    setEditSbNumbers(inv.sbNumbers || '');
    setEditNotes(inv.notes || '');
    setEditTerms(inv.terms || '');
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setSavingEdit(true);
    setEditError(null);

    try {
      await api.updateInvoice(editingInvoice.id, {
        invoiceDate: editInvoiceDate ? new Date(editInvoiceDate).toISOString() : undefined,
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined,
        consigneeName: editConsigneeName.trim() || null,
        consigneeAddress: editConsigneeAddress.trim() || null,
        sbNumbers: editSbNumbers.trim() || null,
        notes: editNotes.trim() || null,
        terms: editTerms.trim() || null,
      });

      setEditModalOpen(false);
      setEditingInvoice(null);
      await fetchInvoices(true);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update invoice.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelInvoice = async (id: string, num: string) => {
    const reason = window.prompt(`Enter mandatory reason to cancel invoice ${num}:`);
    if (!reason || !reason.trim()) return;
    try {
      await api.cancelInvoice(id, reason.trim());
      await fetchInvoices(true);
      alert(`Invoice ${num} cancelled successfully.`);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice');
    }
  };

  const handleDeleteInvoice = async (id: string, num: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete invoice ${num}? Invoices with recorded payments cannot be deleted.`
    );
    if (!confirmDelete) return;

    try {
      await api.deleteInvoice(id);
      await fetchInvoices(true);
      alert(`Invoice ${num} was successfully deleted.`);
    } catch (err: any) {
      alert(err.message || 'Failed to delete invoice');
    }
  };

  const handleDownloadPdf = async (inv: Invoice) => {
    if (downloadingId) return;
    setDownloadingId(inv.id);
    try {
      await api.downloadInvoicePdf(inv.id, inv.invoiceNumber);
    } catch (err: any) {
      alert(err.message || 'Failed to download invoice PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDuplicateInvoice = async (inv: Invoice) => {
    try {
      const full = await api.getInvoice(inv.id);
      const payload = {
        partyId: full.partyId,
        exporterId: full.exporterId,
        jobId: full.jobId,
        billType: full.billType,
        sbNumbers: full.sbNumbers,
        consigneeName: full.consigneeName,
        consigneeAddress: full.consigneeAddress,
        items: full.items?.map((item) => ({
          description: item.description,
          hsnSacCode: item.hsnSacCode,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          discount: item.discount,
        })),
        containers: full.containers?.map((c) => ({
          containerNumber: c.containerNumber,
          size: c.size,
          type: c.type,
          emptyGroundDays: c.emptyGroundDays,
          loadedGroundDays: c.loadedGroundDays,
        })),
        currency: full.currency || 'INR',
        status: 'DRAFT',
      };
      await api.createInvoice(payload);
      await fetchInvoices(true);
      alert('Invoice duplicated successfully as a new DRAFT!');
    } catch (e: any) {
      alert(e.message || 'Failed to duplicate invoice');
    }
  };

  const handleResetFilters = () => {
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setPaymentStatusFilter('ALL');
    setFinancialYearFilter('ALL');
    setSearch('');
    setDebouncedSearch('');
    setDateFrom('');
    setDateTo('');
    setSortBy('invoiceDate');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Summary Metrics of Currently Loaded Invoices
  const totalBilled = useMemo(
    () => invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
    [invoices]
  );
  const totalOutstanding = useMemo(
    () => invoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0),
    [invoices]
  );
  const totalPaid = Math.max(0, totalBilled - totalOutstanding);

  const billFormats = [
    {
      id: 'STANDARD' as const,
      name: 'Standard Tax Invoice',
      tag: 'Format 1',
      description: '9-column container table, GST breakdown, dual logo & bank credentials',
      icon: FileText,
      accent: 'border-l-red-600 hover:border-red-600',
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
    },
    {
      id: 'EMPTY_CONTAINER' as const,
      name: 'Empty Container Bill',
      tag: 'Format 2',
      description: 'Container movement, yard positioning, lift-on/off & equipment drayage',
      icon: Box,
      accent: 'border-l-teal-600 hover:border-teal-600',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    {
      id: 'CREDIT_NOTE' as const,
      name: 'Credit Note Bill',
      tag: 'Format 3',
      description: 'Rate adjustments, discount allowances, billing revisions & tax credits',
      icon: Receipt,
      accent: 'border-l-purple-600 hover:border-purple-600',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      id: 'HT_BILL' as const,
      name: 'H & T Bill',
      tag: 'Format 4',
      description: 'Haulage, local transport carting, stuffed trailer freight & road dispatch',
      icon: Truck,
      accent: 'border-l-amber-600 hover:border-amber-600',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      id: 'FORWARDING' as const,
      name: 'Forwarding Bill',
      tag: 'Format 5',
      description: 'Freight forwarding, liner charges, ocean BL documentation & agency handling',
      icon: Ship,
      accent: 'border-l-blue-600 hover:border-blue-600',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  ];

  const getFormatBadge = (billType?: string) => {
    switch (billType) {
      case 'EMPTY_CONTAINER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-800 border border-teal-200">
            <Box className="w-2.5 h-2.5" /> Empty Container
          </span>
        );
      case 'CREDIT_NOTE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
            <Receipt className="w-2.5 h-2.5" /> Credit Note
          </span>
        );
      case 'HT_BILL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
            <Truck className="w-2.5 h-2.5" /> H & T Bill
          </span>
        );
      case 'FORWARDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
            <Ship className="w-2.5 h-2.5" /> Forwarding Bill
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-200">
            <FileText className="w-2.5 h-2.5" /> Tax Invoice
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (inv: Invoice) => {
    if (inv.status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-500 border border-slate-200 line-through">
          VOID
        </span>
      );
    }
    const balance = inv.balanceAmount || 0;
    const paid = inv.paidAmount || 0;
    const total = inv.grandTotal || 0;
    const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && balance > 0.01;

    if (balance <= 0.01 && total > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PAID
        </span>
      );
    }
    if (paid > 0 && balance > 0.01) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" /> PARTIAL
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" /> OVERDUE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-red-50 text-red-700 border border-red-200">
        UNPAID
      </span>
    );
  };

  return (
    <div className="space-y-5 max-w-full">
      {/* ========================================================
          1. PAGE HEADER
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-900/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Invoice & Billing Master
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-red-50 text-red-600 border border-red-200">
                  {totalCount} Total Bills
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized register for Tax Invoices, Empty Container, Credit Notes, H&T, and Forwarding Bills.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchInvoices(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => onCreateInvoice('STANDARD')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-900/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. BILL FORMAT SELECTION CARDS
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {billFormats.map((fmt) => {
          const Icon = fmt.icon;
          const isCurrentFilter = typeFilter === fmt.id;
          return (
            <div
              key={fmt.id}
              className={`bg-white rounded-xl border p-3.5 shadow-2xs transition-all flex flex-col justify-between border-l-4 ${fmt.accent} ${
                isCurrentFilter ? 'ring-2 ring-red-500/20 bg-slate-50/60' : 'hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-slate-700" />
                    <span className="font-bold text-xs text-slate-900 tracking-tight">{fmt.name}</span>
                  </div>
                  <span className={`text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded border ${fmt.badgeBg}`}>
                    {fmt.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {fmt.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setTypeFilter(typeFilter === fmt.id ? 'ALL' : fmt.id);
                    setCurrentPage(1);
                  }}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {isCurrentFilter ? 'Show All' : 'Filter View'}
                </button>
                <button
                  onClick={() => onCreateInvoice(fmt.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-red-600 text-white font-bold text-[10.5px] transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3 h-3" /> Create
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================
          3. SUMMARY METRIC STRIP
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Invoiced (Page)</span>
          <p className="text-xl font-black text-slate-900 mt-0.5">{formatCurrencyWithSymbol(totalBilled, 'INR')}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Total Received</span>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{formatCurrencyWithSymbol(totalPaid, 'INR')}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Outstanding Balance</span>
          <p className="text-xl font-black text-rose-600 mt-0.5">{formatCurrencyWithSymbol(totalOutstanding, 'INR')}</p>
        </div>
      </div>

      {/* ========================================================
          4. SEARCH & FILTER CONTROLS TOOLBAR
          ======================================================== */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
        {/* Bill Type Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-bold text-[11px] uppercase mr-1 shrink-0">Format:</span>
          {[
            { id: 'ALL', label: 'All Formats' },
            { id: 'STANDARD', label: 'Tax Invoices' },
            { id: 'EMPTY_CONTAINER', label: 'Empty Container' },
            { id: 'CREDIT_NOTE', label: 'Credit Notes' },
            { id: 'HT_BILL', label: 'H & T Bills' },
            { id: 'FORWARDING', label: 'Forwarding' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setTypeFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                typeFilter === tab.id
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Status, Financial Year & Date Range Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100 items-center">
          {/* Global Search Input */}
          <div className="relative lg:col-span-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Invoice #, Party, Exporter, Container, Job #..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:bg-white text-slate-900 placeholder-slate-400 font-medium"
            />
          </div>

          {/* Invoice Document Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by invoice status"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-slate-700"
            >
              <option value="ALL">Status: All</option>
              <option value="DRAFT">Draft</option>
              <option value="FINALIZED">Finalized</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by payment status"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-slate-700"
            >
              <option value="ALL">Payment: All</option>
              <option value="PAID">Paid in Full</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          {/* Financial Year Filter */}
          <div className="lg:col-span-2">
            <select
              value={financialYearFilter}
              onChange={(e) => {
                setFinancialYearFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by financial year"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-slate-700"
            >
              <option value="ALL">Financial Year: All</option>
              <option value="2026-27">FY 2026-27</option>
              <option value="2025-26">FY 2025-26</option>
              <option value="2024-25">FY 2024-25</option>
            </select>
          </div>

          {/* Sorting Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split(':');
                setSortBy(f);
                setSortOrder(o as 'asc' | 'desc');
                setCurrentPage(1);
              }}
              aria-label="Sort invoices by"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-slate-700"
            >
              <option value="invoiceDate:desc">Date: Newest First</option>
              <option value="invoiceDate:asc">Date: Oldest First</option>
              <option value="grandTotal:desc">Total: Highest First</option>
              <option value="grandTotal:asc">Total: Lowest First</option>
              <option value="balanceAmount:desc">Balance: Highest First</option>
              <option value="invoiceNumber:asc">Invoice No: A to Z</option>
            </select>
          </div>
        </div>

        {/* Date Pickers Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-semibold text-[11px]">Date Range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter from invoice date"
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter to invoice date"
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none text-slate-700"
            />
          </div>

          {(typeFilter !== 'ALL' ||
            statusFilter !== 'ALL' ||
            paymentStatusFilter !== 'ALL' ||
            financialYearFilter !== 'ALL' ||
            search !== '' ||
            dateFrom !== '' ||
            dateTo !== '') && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          5. COMPREHENSIVE INVOICE LISTING TABLE
          ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/80">
              <tr>
                <th className="p-3 whitespace-nowrap">Invoice/Bill No</th>
                <th className="p-3 whitespace-nowrap">Bill Type</th>
                <th className="p-3 whitespace-nowrap">Date</th>
                <th className="p-3 whitespace-nowrap">Party (Bill To)</th>
                <th className="p-3 whitespace-nowrap">Exporter</th>
                <th className="p-3 whitespace-nowrap">Job #</th>
                <th className="p-3 whitespace-nowrap">Containers</th>
                <th className="p-3 text-right whitespace-nowrap">Taxable Amt</th>
                <th className="p-3 text-right whitespace-nowrap">GST Amt</th>
                <th className="p-3 text-right whitespace-nowrap">Total Amount</th>
                <th className="p-3 text-right whitespace-nowrap">Paid</th>
                <th className="p-3 text-right whitespace-nowrap">Outstanding</th>
                <th className="p-3 text-center whitespace-nowrap">Payment</th>
                <th className="p-3 text-center whitespace-nowrap">Status</th>
                <th className="p-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={15} className="text-center py-16 text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-red-600" />
                    <span className="font-medium text-xs">Loading official invoices from database...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-16 text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700 text-sm">No Invoices Found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      No invoices matched your current search and filter criteria. You can create a new invoice or reset filters.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                    </button>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const paid = inv.paidAmount || 0;
                  const balance = inv.balanceAmount || 0;
                  const isDownloading = downloadingId === inv.id;
                  const partyName = inv.party?.legalName || inv.billToName || 'Direct Customer';
                  const gstin = inv.party?.gstin || inv.billToGstin || 'URP';
                  const exporterName = inv.exporter?.name || '—';
                  const jobNumber = inv.job?.jobNumber || '—';
                  const containersList = inv.containers || [];

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Invoice Number */}
                      <td className="p-3 font-medium whitespace-nowrap">
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="font-mono font-bold text-red-700 hover:text-red-800 hover:underline text-left block cursor-pointer"
                          title="Open Invoice Details"
                        >
                          {inv.invoiceNumber}
                        </button>
                        {inv.originalInvoiceNumber && (
                          <p className="text-[10px] text-purple-700 font-normal mt-0.5">
                            Adj: <span className="font-mono font-bold">{inv.originalInvoiceNumber}</span>
                          </p>
                        )}
                      </td>

                      {/* 2. Bill Type */}
                      <td className="p-3 whitespace-nowrap">
                        {getFormatBadge(inv.billType)}
                      </td>

                      {/* 3. Date & Due */}
                      <td className="p-3 whitespace-nowrap text-slate-600">
                        <p className="font-medium text-slate-900">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</p>
                        {inv.dueDate && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Due: {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </td>

                      {/* 4. Party (Bill To) */}
                      <td className="p-3 max-w-[190px]">
                        <p className="font-bold text-slate-900 truncate" title={partyName}>
                          {partyName}
                        </p>
                        <p className="text-[10.5px] font-mono text-slate-500 mt-0.5">
                          {gstin}
                        </p>
                      </td>

                      {/* 5. Exporter */}
                      <td className="p-3 max-w-[140px] whitespace-nowrap">
                        <span className="font-medium text-slate-700 truncate block" title={exporterName}>
                          {exporterName}
                        </span>
                      </td>

                      {/* 6. Job Number */}
                      <td className="p-3 whitespace-nowrap font-mono text-slate-700">
                        {jobNumber !== '—' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">
                            <Ship className="w-2.5 h-2.5 text-slate-500" />
                            {jobNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 7. Containers */}
                      <td className="p-3 max-w-[160px]">
                        {containersList.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {containersList.slice(0, 2).map((c, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-0.5 font-mono text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200"
                                title={`${c.containerNumber} (${c.size || '20 FT'})`}
                              >
                                {c.containerNumber}
                              </span>
                            ))}
                            {containersList.length > 2 && (
                              <span className="text-[10px] font-bold text-slate-500 self-center">
                                +{containersList.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 8. Taxable Amount */}
                      <td className="p-3 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatCurrencyWithSymbol(inv.taxableAmount || 0, inv.currency)}
                      </td>

                      {/* 9. GST Amount */}
                      <td className="p-3 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatCurrencyWithSymbol(inv.totalGst || 0, inv.currency)}
                      </td>

                      {/* 10. Total Invoice Amount */}
                      <td className="p-3 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatCurrencyWithSymbol(inv.grandTotal, inv.currency)}
                      </td>

                      {/* 11. Paid Amount */}
                      <td className="p-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {formatCurrencyWithSymbol(paid, inv.currency)}
                      </td>

                      {/* 12. Outstanding Balance */}
                      <td className="p-3 text-right font-black whitespace-nowrap">
                        <span className={balance > 0.01 ? 'text-rose-600' : 'text-slate-400'}>
                          {formatCurrencyWithSymbol(balance, inv.currency)}
                        </span>
                      </td>

                      {/* 13. Payment Status */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {getPaymentStatusBadge(inv)}
                      </td>

                      {/* 14. Document Status */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            inv.status === 'FINALIZED'
                              ? 'blue'
                              : inv.status === 'DRAFT'
                              ? 'slate'
                              : inv.status === 'CANCELLED'
                              ? 'red'
                              : 'slate'
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>

                      {/* 15. Actions */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* View */}
                          <button
                            onClick={() => onViewInvoice(inv.id)}
                            title="View Exact Saved Invoice"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Print */}
                          <button
                            onClick={() => onPrintInvoice(inv)}
                            title="Print Official A4 Invoice"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => handleDownloadPdf(inv)}
                            disabled={isDownloading}
                            title="Download Official PDF"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(inv)}
                            title="Edit Invoice Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Email PDF */}
                          <button
                            onClick={() => handleOpenEmail(inv)}
                            title="Email Invoice PDF"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicateInvoice(inv)}
                            title="Duplicate as new Draft"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-purple-600 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Cancel Invoice */}
                          {inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleCancelInvoice(inv.id, inv.invoiceNumber)}
                              title="Cancel / Void Invoice"
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Invoice */}
                          <button
                            onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                            title="Delete Invoice"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50/80 border-t border-slate-200 text-xs gap-3">
          <div className="flex items-center gap-3 text-slate-600">
            <span>
              Showing Page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong> ({totalCount} Total Invoices in DB)
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Rows:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label="Invoices per page"
                className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded font-medium text-slate-700"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>

            <span className="px-2 font-bold text-slate-900">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer font-medium"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          6. EDIT INVOICE MODAL
          ======================================================== */}
      {editModalOpen && editingInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <Edit className="w-4 h-4 text-red-500" />
                <div>
                  <h3 className="font-bold text-sm">Edit Invoice {editingInvoice.invoiceNumber}</h3>
                  <p className="text-[10.5px] text-slate-400">
                    Recipient: {editingInvoice.party?.legalName || editingInvoice.billToName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{editError}</span>
                </div>
              )}

              {editingInvoice.status === 'FINALIZED' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    This invoice is finalized. General details can be updated; tax values and financial lines remain protected.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={editInvoiceDate}
                    onChange={(e) => setEditInvoiceDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Shipping Bill (SB) Numbers</label>
                <input
                  type="text"
                  value={editSbNumbers}
                  onChange={(e) => setEditSbNumbers(e.target.value)}
                  placeholder="e.g. 1234567, 7654321"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Consignee Name</label>
                  <input
                    type="text"
                    value={editConsigneeName}
                    onChange={(e) => setEditConsigneeName(e.target.value)}
                    placeholder="Overseas Buyer / Consignee"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Consignee Address</label>
                  <input
                    type="text"
                    value={editConsigneeAddress}
                    onChange={(e) => setEditConsigneeAddress(e.target.value)}
                    placeholder="Buyer destination address"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={editTerms}
                  onChange={(e) => setEditTerms(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50 shadow-sm"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Update Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          7. EMAIL SEND MODAL INTEGRATION
          ======================================================== */}
      {emailModalOpen && selectedInvoiceForEmail && (
        <EmailSendModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          invoice={selectedInvoiceForEmail}
        />
      )}
    </div>
  );
};
