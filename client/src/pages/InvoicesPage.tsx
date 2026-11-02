import React, { useState, useEffect, useMemo } from 'react';
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
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({
  onCreateInvoice,
  onViewInvoice,
  onPrintInvoice,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'STANDARD' | 'EMPTY_CONTAINER' | 'CREDIT_NOTE' | 'HT_BILL' | 'FORWARDING'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Active downloading invoice IDs to show spinner per row
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Email Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<Invoice | null>(null);

  const fetchInvoices = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (e) {
      console.error('Error fetching invoices:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleOpenEmail = (inv: Invoice) => {
    setSelectedInvoiceForEmail(inv);
    setEmailModalOpen(true);
  };

  const handleCancelInvoice = async (id: string, num: string) => {
    const reason = window.prompt(`Enter reason to cancel invoice ${num}:`);
    if (!reason || !reason.trim()) return;
    try {
      await api.cancelInvoice(id, reason.trim());
      await fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice');
    }
  };

  const handleDeleteInvoice = async (id: string, num: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete invoice ${num}? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await api.deleteInvoice(id);
      await fetchInvoices();
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
      await fetchInvoices();
      alert('Invoice duplicated as a new DRAFT!');
    } catch (e: any) {
      alert(e.message || 'Failed to duplicate invoice');
    }
  };

  const handleResetFilters = () => {
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  // Filtered and searched invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Invoice Type Filter
      if (typeFilter !== 'ALL') {
        const invType = inv.billType || 'STANDARD';
        if (typeFilter === 'STANDARD' && invType !== 'STANDARD') return false;
        if (typeFilter !== 'STANDARD' && invType !== typeFilter) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) {
        return false;
      }

      // 3. Search Query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const num = (inv.invoiceNumber || '').toLowerCase();
        const partyName = (inv.party?.legalName || inv.billToName || '').toLowerCase();
        const gstin = (inv.party?.gstin || inv.billToGstin || '').toLowerCase();
        const job = (inv.job?.jobNumber || '').toLowerCase();
        const containers = (inv.containers || []).map((c) => c.containerNumber.toLowerCase()).join(' ');

        const matches =
          num.includes(q) ||
          partyName.includes(q) ||
          gstin.includes(q) ||
          job.includes(q) ||
          containers.includes(q);

        if (!matches) return false;
      }

      // 4. Date Range Filter
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        const invDate = new Date(inv.invoiceDate);
        if (invDate < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        const invDate = new Date(inv.invoiceDate);
        if (invDate > toDate) return false;
      }

      return true;
    });
  }, [invoices, typeFilter, statusFilter, search, dateFrom, dateTo]);

  // Aggregate Metrics for Header
  const totalBilled = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
    [filteredInvoices]
  );
  const totalOutstanding = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0),
    [filteredInvoices]
  );
  const totalPaid = totalBilled - totalOutstanding;

  // Pagination calculation
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-200">
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

  return (
    <div className="space-y-6 pb-12 select-none font-sans">
      {/* ========================================================
          1. HEADER & ACTIONS BAR
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoices & Billing</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete billing lifecycle, multi-format invoicing, authenticated PDF downloads & payment tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => fetchInvoices(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Invoices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-red-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => onCreateInvoice()}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Invoice</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. FIVE INVOICE FORMAT SELECTION CARDS
          ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-red-600" />
            Available Invoice & Billing Formats
          </span>
          <span className="text-[11px] text-slate-500">Click any format to generate an invoice directly</span>
        </div>

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
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${fmt.badgeBg}`}>
                      {fmt.tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs text-slate-900 leading-snug">{fmt.name}</h3>
                  <p className="text-[10.5px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {fmt.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setTypeFilter(typeFilter === fmt.id ? 'ALL' : fmt.id)}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {isCurrentFilter ? 'Show All' : 'Filter View'}
                  </button>
                  <button
                    onClick={() => onCreateInvoice(fmt.id === 'STANDARD' ? 'STANDARD' : fmt.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900 text-white hover:bg-red-600 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          3. REVENUE SUMMARY STRIP
          ======================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Invoices</span>
          <p className="text-xl font-black text-slate-900 mt-0.5">{filteredInvoices.length}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Billed</span>
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
          4. SEARCH & FILTER TOOLBAR
          ======================================================== */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
        {/* Format Selection Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-bold text-[11px] uppercase mr-1 shrink-0">Type:</span>
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
                setTypeFilter(tab.id as any);
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

        {/* Status, Date Range & Search Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100 items-center">
          {/* Search Box */}
          <div className="relative lg:col-span-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search invoice #, party, GSTIN, container, job..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          {/* Status Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="FINALIZED">Finalized</option>
              <option value="DRAFT">Draft</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Date From */}
          <div className="lg:col-span-2 relative">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              title="From Date"
            />
          </div>

          {/* Date To */}
          <div className="lg:col-span-2 relative">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              title="To Date"
            />
          </div>

          {/* Reset Filters */}
          <div className="lg:col-span-2 flex items-center gap-2 justify-end">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Reset all search and filter conditions"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
              {filteredInvoices.length} Found
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          5. COMPLETE INVOICE HISTORY TABLE
          ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="p-3.5 whitespace-nowrap">Invoice No & Ref</th>
                <th className="p-3.5 whitespace-nowrap">Date & Due</th>
                <th className="p-3.5">Party & GSTIN</th>
                <th className="p-3.5 whitespace-nowrap">Invoice Type</th>
                <th className="p-3.5 text-right whitespace-nowrap">Grand Total</th>
                <th className="p-3.5 text-right whitespace-nowrap">Paid Amount</th>
                <th className="p-3.5 text-right whitespace-nowrap">Balance</th>
                <th className="p-3.5 whitespace-nowrap">Status</th>
                <th className="p-3.5 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
                    <span>Loading invoice history...</span>
                  </td>
                </tr>
              ) : paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting your search query or filters.</p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      Reset All Filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const paidAmount = Math.max(0, (inv.grandTotal || 0) - (inv.balanceAmount || 0));
                  const isDownloading = downloadingId === inv.id;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Invoice No */}
                      <td className="p-3.5">
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="font-mono font-bold text-red-700 hover:underline text-left block"
                        >
                          {inv.invoiceNumber}
                        </button>
                        {inv.originalInvoiceNumber && (
                          <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                            Adj: <span className="font-mono text-slate-700 font-semibold">{inv.originalInvoiceNumber}</span>
                          </p>
                        )}
                      </td>

                      {/* Date & Due */}
                      <td className="p-3.5 text-slate-600 whitespace-nowrap">
                        <p className="font-medium">{new Date(inv.invoiceDate).toLocaleDateString()}</p>
                        {inv.dueDate && (
                          <p className="text-[10px] text-slate-400">
                            Due: {new Date(inv.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </td>

                      {/* Party & GSTIN */}
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-900 truncate max-w-[200px]" title={inv.party?.legalName || inv.billToName}>
                          {inv.party?.legalName || inv.billToName || 'Direct Cash Customer'}
                        </p>
                        <p className="text-[10.5px] font-mono text-slate-500">
                          {inv.party?.gstin || inv.billToGstin || 'URP / Non-GST'}
                        </p>
                      </td>

                      {/* Invoice Type */}
                      <td className="p-3.5 whitespace-nowrap">
                        {getFormatBadge(inv.billType)}
                      </td>

                      {/* Grand Total */}
                      <td className="p-3.5 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatCurrencyWithSymbol(inv.grandTotal, inv.currency)}
                      </td>

                      {/* Paid Amount */}
                      <td className="p-3.5 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {formatCurrencyWithSymbol(paidAmount, inv.currency)}
                      </td>

                      {/* Balance / Outstanding */}
                      <td className="p-3.5 text-right font-black whitespace-nowrap">
                        <span className={inv.balanceAmount > 0 ? 'text-rose-600' : 'text-slate-400'}>
                          {formatCurrencyWithSymbol(inv.balanceAmount, inv.currency)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 whitespace-nowrap">
                        <Badge
                          variant={
                            inv.status === 'PAID'
                              ? 'green'
                              : inv.status === 'FINALIZED'
                              ? 'blue'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'amber'
                              : inv.status === 'CANCELLED'
                              ? 'red'
                              : 'slate'
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Details */}
                          <button
                            onClick={() => onViewInvoice(inv.id)}
                            title="View Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Print Invoice */}
                          <button
                            onClick={() => onPrintInvoice(inv)}
                            title="Print Official A4 Invoice"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Download PDF (Authenticated Blob Download) */}
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

                          {/* Send Email */}
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
                              title="Cancel Invoice"
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/70 border-t border-slate-200 text-xs">
            <span className="text-slate-500">
              Showing Page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong> ({filteredInvoices.length} Total Invoices)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      <EmailSendModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        invoice={selectedInvoiceForEmail}
        onSuccess={() => fetchInvoices()}
      />
    </div>
  );
};
