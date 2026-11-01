import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  TrendingDown,
  Calendar,
  Loader2,
  Save,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
  Percent,
  Receipt,
  CheckSquare,
  Square,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { Payment, Invoice, Party, PartyOutstandingSummary } from '../types/index';
import { Modal } from '../components/common/Modal';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { formatCurrencyWithSymbol, getCurrencySymbol } from '../utils/currency';

interface PaymentsPageProps {
  onViewInvoice?: (id: string) => void;
  onPrintInvoice?: (inv: Invoice) => void;
}

interface InvoiceAllocationRow {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  billType?: string;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  selected: boolean;
  allocAmount: number;
  tdsRate: number; // 0, 1, 2
  tdsAmount: number;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({ onViewInvoice }) => {
  const [activeTab, setActiveTab] = useState<'outstanding' | 'history'>('outstanding');
  const [partiesSummary, setPartiesSummary] = useState<PartyOutstandingSummary[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Party Outstanding View
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID'>('ALL');
  const [expandedPartyId, setExpandedPartyId] = useState<string | null>(null);

  // Modal State for Recording Payment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('NEFT/RTGS');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [globalTdsRate, setGlobalTdsRate] = useState<number>(0);
  const [totalRemittanceInput, setTotalRemittanceInput] = useState<string>('');
  const [allocations, setAllocations] = useState<InvoiceAllocationRow[]>([]);
  const [loadingPartyInvoices, setLoadingPartyInvoices] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [outList, pList, partyList] = await Promise.all([
        api.getPartyOutstanding(),
        api.getPayments(),
        api.getParties(),
      ]);
      setPartiesSummary(outList);
      setPayments(pList);
      setAllParties(partyList);
    } catch (e) {
      console.error('Failed to load payments data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Parties for Outstanding View
  const filteredParties = useMemo(() => {
    return partiesSummary.filter((p) => {
      const matchesSearch =
        p.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tradeName && p.tradeName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'PENDING') {
        return p.netOutstanding > 0;
      }
      if (statusFilter === 'PARTIALLY_PAID') {
        return p.totalPaid > 0 && p.netOutstanding > 0;
      }
      if (statusFilter === 'PAID') {
        return p.netOutstanding === 0 && p.totalInvoiced > 0;
      }

      return true;
    });
  }, [partiesSummary, searchQuery, statusFilter]);

  // Overall Statistics Calculation
  const totalInvoicedOverall = partiesSummary.reduce((sum, p) => sum + p.totalInvoiced, 0);
  const totalCreditNotesOverall = partiesSummary.reduce((sum, p) => sum + p.totalCreditNotes, 0);
  const totalCollectionsOverall = partiesSummary.reduce((sum, p) => sum + p.totalPaid, 0);
  const totalTdsOverall = partiesSummary.reduce((sum, p) => sum + p.totalTds, 0);
  const totalOutstandingOverall = partiesSummary.reduce((sum, p) => sum + p.netOutstanding, 0);

  // When selected party changes in modal, load their unpaid invoices
  const handleSelectPartyForPayment = async (partyId: string, preselectedInvoiceId?: string) => {
    setSelectedPartyId(partyId);
    setLoadingPartyInvoices(true);
    try {
      const partyData = await api.getParty(partyId);
      const invoices = partyData.invoices || [];
      const pendingInvs = invoices.filter(
        (inv: any) => inv.status !== 'CANCELLED' && inv.balanceAmount > 0
      );

      const mappedAllocations: InvoiceAllocationRow[] = pendingInvs.map((inv: any) => {
        const isPreselected = preselectedInvoiceId ? inv.id === preselectedInvoiceId : false;
        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          billType: inv.billType,
          grandTotal: inv.grandTotal,
          paidAmount: inv.paidAmount,
          balanceAmount: inv.balanceAmount,
          selected: isPreselected,
          allocAmount: isPreselected ? inv.balanceAmount : 0,
          tdsRate: globalTdsRate,
          tdsAmount: 0,
        };
      });

      setAllocations(mappedAllocations);
    } catch (e) {
      console.error('Error fetching party invoices:', e);
    } finally {
      setLoadingPartyInvoices(false);
    }
  };

  const handleOpenRecordPaymentModal = (partyId?: string, invoiceId?: string) => {
    setIsModalOpen(true);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('NEFT/RTGS');
    setReferenceNumber('');
    setNotes('');
    setGlobalTdsRate(0);
    setTotalRemittanceInput('');

    if (partyId) {
      handleSelectPartyForPayment(partyId, invoiceId);
    } else {
      setSelectedPartyId('');
      setAllocations([]);
    }
  };

  // Toggle selection for an invoice row in the modal
  const handleToggleInvoiceSelection = (invId: string) => {
    setAllocations((prev) =>
      prev.map((row) => {
        if (row.invoiceId !== invId) return row;
        const newSelected = !row.selected;
        let newAlloc = 0;
        let newTds = 0;
        if (newSelected) {
          const rate = row.tdsRate || globalTdsRate || 0;
          if (rate > 0) {
            newTds = Math.round(((row.balanceAmount * rate) / 100) * 100) / 100;
            newAlloc = Math.max(0, row.balanceAmount - newTds);
          } else {
            newAlloc = row.balanceAmount;
          }
        }
        return {
          ...row,
          selected: newSelected,
          allocAmount: newAlloc,
          tdsAmount: newTds,
        };
      })
    );
  };

  // Update allocation amount for a row
  const handleAllocAmountChange = (invId: string, val: string) => {
    const amt = parseFloat(val) || 0;
    setAllocations((prev) =>
      prev.map((row) => {
        if (row.invoiceId !== invId) return row;
        return {
          ...row,
          selected: amt > 0 || row.tdsAmount > 0,
          allocAmount: Math.min(row.balanceAmount, Math.max(0, amt)),
        };
      })
    );
  };

  // Update TDS amount for a row
  const handleTdsAmountChange = (invId: string, val: string) => {
    const tds = parseFloat(val) || 0;
    setAllocations((prev) =>
      prev.map((row) => {
        if (row.invoiceId !== invId) return row;
        return {
          ...row,
          selected: row.allocAmount > 0 || tds > 0,
          tdsAmount: Math.max(0, tds),
        };
      })
    );
  };

  // Apply global TDS rate to all selected invoices
  const handleApplyGlobalTdsRate = (rate: number) => {
    setGlobalTdsRate(rate);
    setAllocations((prev) =>
      prev.map((row) => {
        if (!row.selected) return { ...row, tdsRate: rate };
        const newTds = rate > 0 ? Math.round(((row.balanceAmount * rate) / 100) * 100) / 100 : 0;
        const newAlloc = Math.max(0, row.balanceAmount - newTds);
        return {
          ...row,
          tdsRate: rate,
          tdsAmount: newTds,
          allocAmount: newAlloc,
        };
      })
    );
  };

  // Auto-distribute a total remittance input across pending invoices (oldest first)
  const handleAutoDistribute = () => {
    let remainingToDistribute = parseFloat(totalRemittanceInput) || 0;
    if (remainingToDistribute <= 0) return;

    setAllocations((prev) => {
      return prev.map((row) => {
        if (remainingToDistribute <= 0) {
          return {
            ...row,
            selected: false,
            allocAmount: 0,
            tdsAmount: 0,
          };
        }

        const rate = globalTdsRate || 0;
        // Total settlement needed for this invoice
        const invoiceSettlement = Math.min(row.balanceAmount, remainingToDistribute);
        let tdsAmt = 0;
        let payAmt = invoiceSettlement;

        if (rate > 0) {
          tdsAmt = Math.round(((invoiceSettlement * rate) / 100) * 100) / 100;
          payAmt = Math.max(0, invoiceSettlement - tdsAmt);
        }

        remainingToDistribute -= invoiceSettlement;

        return {
          ...row,
          selected: true,
          allocAmount: payAmt,
          tdsAmount: tdsAmt,
          tdsRate: rate,
        };
      });
    });
  };

  // Select / Deselect All Invoices
  const handleSelectAllInvoices = (select: boolean) => {
    setAllocations((prev) =>
      prev.map((row) => {
        const rate = globalTdsRate || 0;
        let tdsAmt = 0;
        let payAmt = 0;
        if (select) {
          if (rate > 0) {
            tdsAmt = Math.round(((row.balanceAmount * rate) / 100) * 100) / 100;
            payAmt = Math.max(0, row.balanceAmount - tdsAmt);
          } else {
            payAmt = row.balanceAmount;
          }
        }
        return {
          ...row,
          selected: select,
          allocAmount: payAmt,
          tdsAmount: tdsAmt,
        };
      })
    );
  };

  // Calculations for modal footer
  const selectedRows = allocations.filter((r) => r.selected && (r.allocAmount > 0 || r.tdsAmount > 0));
  const totalAllocatedRemittance = selectedRows.reduce((sum, r) => sum + r.allocAmount, 0);
  const totalTdsWithheld = selectedRows.reduce((sum, r) => sum + r.tdsAmount, 0);
  const totalCustomerCredit = totalAllocatedRemittance + totalTdsWithheld;

  // Submit payment allocation
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId) {
      alert('Please select a customer / party');
      return;
    }
    if (selectedRows.length === 0) {
      alert('Please select at least one invoice and enter a payment or TDS amount');
      return;
    }

    setSaving(true);
    try {
      await api.recordPayment({
        partyId: selectedPartyId,
        paymentDate,
        paymentMode,
        referenceNumber,
        notes,
        allocations: selectedRows.map((r) => ({
          invoiceId: r.invoiceId,
          amount: r.allocAmount,
          tdsRate: r.tdsRate,
          tdsAmount: r.tdsAmount,
        })),
      });

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(`Payment recording failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Party-Wise Outstanding & Payment Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time balance tracking: Net Outstanding = Invoiced − Credit Notes − Payments − TDS deductions.
          </p>
        </div>
        <button
          onClick={() => handleOpenRecordPaymentModal()}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-red-600/20 hover:bg-red-700 transition-all hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Record Customer Payment</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced Value"
          value={`₹${totalInvoicedOverall.toLocaleString('en-IN')}`}
          subtext={`Credit Notes: ₹${totalCreditNotesOverall.toLocaleString('en-IN')}`}
          icon={Receipt}
          variant="blue"
          accentBorder="blue"
        />
        <StatCard
          title="Collections Received"
          value={`₹${totalCollectionsOverall.toLocaleString('en-IN')}`}
          subtext="Cleared bank remittances"
          icon={CheckCircle2}
          variant="emerald"
          accentBorder="emerald"
        />
        <StatCard
          title="TDS Deductions Credited"
          value={`₹${totalTdsOverall.toLocaleString('en-IN')}`}
          subtext="Tax withholding recognized"
          icon={Percent}
          variant="indigo"
          accentBorder="indigo"
        />
        <StatCard
          title="Net Outstanding Balance"
          value={`₹${totalOutstandingOverall.toLocaleString('en-IN')}`}
          subtext="Total pending customer balance"
          icon={TrendingDown}
          variant="amber"
          accentBorder="amber"
        />
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('outstanding')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'outstanding'
              ? 'border-red-600 text-red-600 bg-red-50/30'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Party-Wise Outstanding Receivables</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-mono text-slate-700">
            {partiesSummary.length} Parties
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-red-600 text-red-600 bg-red-50/30'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Remittance Ledger & Transaction History</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-mono text-slate-700">
            {payments.length} Transactions
          </span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: PARTY-WISE OUTSTANDING RECEIVABLES
          ======================================================== */}
      {activeTab === 'outstanding' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search party by party name, exporter name or GSTIN..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-500 uppercase mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {(['ALL', 'PENDING', 'PARTIALLY_PAID', 'PAID'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL'
                    ? 'All Parties'
                    : st === 'PENDING'
                    ? 'Pending Balance'
                    : st === 'PARTIALLY_PAID'
                    ? 'Partially Paid'
                    : 'Fully Paid'}
                </button>
              ))}
            </div>
          </div>

          {/* Parties List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 w-8"></th>
                    <th className="p-3.5">Customer / Party Name</th>
                    <th className="p-3.5">GSTIN & State</th>
                    <th className="p-3.5 text-right">Total Invoiced</th>
                    <th className="p-3.5 text-right">Credit Notes</th>
                    <th className="p-3.5 text-right">Payments Credited</th>
                    <th className="p-3.5 text-right">TDS Credited</th>
                    <th className="p-3.5 text-right font-black">Net Outstanding</th>
                    <th className="p-3.5 text-center">Invoices</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading party balances...
                      </td>
                    </tr>
                  ) : filteredParties.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">
                        No party records match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredParties.map((p) => {
                      const isExpanded = expandedPartyId === p.partyId;
                      return (
                        <React.Fragment key={p.partyId}>
                          <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => setExpandedPartyId(isExpanded ? null : p.partyId)}
                                className="p-1 rounded text-slate-500 hover:bg-slate-200 transition-colors"
                                title={isExpanded ? 'Hide Invoices' : 'View Invoices'}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                            <td className="p-3.5">
                              <p className="font-bold text-slate-900 text-sm">{p.legalName}</p>
                              {p.tradeName && p.tradeName !== p.legalName && (
                                <p className="text-[10px] text-slate-500">{p.tradeName}</p>
                              )}
                            </td>
                            <td className="p-3.5">
                              <p className="font-mono font-bold text-red-700">{p.gstin}</p>
                              <p className="text-[10px] text-slate-500">{p.state || 'Maharashtra'}</p>
                            </td>
                            <td className="p-3.5 text-right font-medium text-slate-800">
                              ₹{p.totalInvoiced.toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-right font-medium text-emerald-700">
                              {p.totalCreditNotes > 0 ? `− ₹${p.totalCreditNotes.toLocaleString('en-IN')}` : '₹0'}
                            </td>
                            <td className="p-3.5 text-right font-medium text-emerald-800">
                              {p.totalPaid > 0 ? `₹${p.totalPaid.toLocaleString('en-IN')}` : '₹0'}
                            </td>
                            <td className="p-3.5 text-right font-medium text-indigo-700">
                              {p.totalTds > 0 ? `₹${p.totalTds.toLocaleString('en-IN')}` : '₹0'}
                            </td>
                            <td className="p-3.5 text-right">
                              <span
                                className={`text-sm font-black font-mono ${
                                  p.netOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'
                                }`}
                              >
                                ₹{p.netOutstanding.toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => setExpandedPartyId(isExpanded ? null : p.partyId)}
                                className="inline-block px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] font-mono transition-colors"
                              >
                                {p.invoiceCount} Bills
                              </button>
                            </td>
                            <td className="p-3.5 text-center">
                              {p.netOutstanding > 0 ? (
                                <button
                                  onClick={() => handleOpenRecordPaymentModal(p.partyId)}
                                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] shadow-xs transition-all hover:scale-105"
                                >
                                  Receive Payment
                                </button>
                              ) : (
                                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                  ✓ Cleared
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Invoices Sub-Table */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={10} className="p-4 bg-slate-50/90 border-y border-slate-200">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between pb-1">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                      <Receipt className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Invoices & Operational Bills for {p.legalName}</span>
                                    </h4>
                                    <span className="text-[11px] text-slate-500">
                                      {p.invoices.length} Registered Billing Documents
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 text-[10px] uppercase">
                                        <tr>
                                          <th className="p-2.5">Invoice Number</th>
                                          <th className="p-2.5">Date</th>
                                          <th className="p-2.5">Bill Type</th>
                                          <th className="p-2.5 text-right">Grand Total</th>
                                          <th className="p-2.5 text-right">Paid</th>
                                          <th className="p-2.5 text-right">TDS Credited</th>
                                          <th className="p-2.5 text-right">Balance Due</th>
                                          <th className="p-2.5 text-center">Status</th>
                                          <th className="p-2.5 text-center">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {p.invoices.map((inv) => (
                                          <tr key={inv.id} className="hover:bg-slate-50">
                                            <td className="p-2.5 font-mono font-bold text-red-600">
                                              {inv.invoiceNumber}
                                            </td>
                                            <td className="p-2.5 text-slate-600">
                                              {new Date(inv.invoiceDate).toLocaleDateString()}
                                            </td>
                                            <td className="p-2.5">
                                              <Badge variant={inv.billType === 'CREDIT_NOTE' ? 'amber' : 'blue'} size="sm">
                                                {inv.billType?.replace('_', ' ') || 'STANDARD'}
                                              </Badge>
                                            </td>
                                            <td className="p-2.5 text-right font-medium">
                                              {formatCurrencyWithSymbol(inv.grandTotal, inv.currency)}
                                            </td>
                                            <td className="p-2.5 text-right text-emerald-700 font-medium">
                                              {formatCurrencyWithSymbol(inv.paidAmount, inv.currency)}
                                            </td>
                                            <td className="p-2.5 text-right text-indigo-700 font-medium">
                                              {inv.tdsAmount ? formatCurrencyWithSymbol(inv.tdsAmount, inv.currency) : '—'}
                                            </td>
                                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                              {formatCurrencyWithSymbol(inv.balanceAmount, inv.currency)}
                                            </td>
                                            <td className="p-2.5 text-center">
                                              <Badge
                                                variant={
                                                  inv.status === 'PAID'
                                                    ? 'green'
                                                    : inv.status === 'PARTIALLY_PAID'
                                                    ? 'amber'
                                                    : 'slate'
                                                }
                                                size="sm"
                                              >
                                                {inv.status}
                                              </Badge>
                                            </td>
                                            <td className="p-2.5 text-center">
                                              <div className="flex items-center justify-center gap-1.5">
                                                {onViewInvoice && (
                                                  <button
                                                    onClick={() => onViewInvoice(inv.id)}
                                                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors"
                                                    title="View Original Invoice"
                                                  >
                                                    <Eye className="w-3 h-3 text-blue-600" />
                                                    <span>View</span>
                                                  </button>
                                                )}
                                                {inv.balanceAmount > 0 && (
                                                  <button
                                                    onClick={() => handleOpenRecordPaymentModal(p.partyId, inv.id)}
                                                    className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors"
                                                    title="Allocate Payment to this Invoice"
                                                  >
                                                    <span>Pay</span>
                                                  </button>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: REMITTANCE TRANSACTION HISTORY
          ======================================================== */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Customer Remittance & Collection Ledger
            </h2>
            <span className="text-xs text-slate-500">
              Showing <strong className="text-slate-900">{payments.length}</strong> Completed Transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Payment Date</th>
                  <th className="p-3.5">Invoice No</th>
                  <th className="p-3.5">Party / Customer</th>
                  <th className="p-3.5 text-right">Amount Received</th>
                  <th className="p-3.5 text-right">TDS Credited</th>
                  <th className="p-3.5">Payment Mode</th>
                  <th className="p-3.5">Reference / UTR</th>
                  <th className="p-3.5">Recorded By</th>
                  <th className="p-3.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                      Loading payment transactions...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 text-slate-600">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-red-600">
                        {p.invoice?.invoiceNumber ? (
                          onViewInvoice ? (
                            <button
                              onClick={() => onViewInvoice(p.invoiceId)}
                              className="hover:underline text-left"
                            >
                              {p.invoice.invoiceNumber}
                            </button>
                          ) : (
                            p.invoice.invoiceNumber
                          )
                        ) : (
                          'Multi-Allocation'
                        )}
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-900">{p.party?.legalName}</p>
                        <p className="text-[10px] font-mono text-slate-500">{p.party?.gstin}</p>
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-700 text-sm">
                        {formatCurrencyWithSymbol(p.amount, p.currency || p.invoice?.currency || 'INR')}
                      </td>
                      <td className="p-3.5 text-right font-medium text-indigo-700">
                        {p.tdsAmount && p.tdsAmount > 0 ? (
                          <span>
                            {formatCurrencyWithSymbol(p.tdsAmount, p.currency || p.invoice?.currency || 'INR')}
                            {p.tdsRate ? ` (${p.tdsRate}%)` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">{p.paymentMode}</td>
                      <td className="p-3.5 font-mono text-slate-600">{p.referenceNumber || '—'}</td>
                      <td className="p-3.5 text-slate-500">{p.recordedBy || 'System'}</td>
                      <td className="p-3.5 text-slate-500 truncate max-w-xs">{p.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          RECORD CUSTOMER PAYMENT MODAL (MULTI-INVOICE WITH TDS)
          ======================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Customer Payment & Invoice Allocation"
        subtitle="Allocate remittance across multiple pending invoices with optional TDS withholding"
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
          {/* Top Bar: Select Party & Global Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Select Customer / Party <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedPartyId}
                onChange={(e) => handleSelectPartyForPayment(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 bg-white text-xs font-semibold text-slate-900"
              >
                <option value="">-- Choose Customer / Party --</option>
                {allParties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.legalName} ({p.gstin})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                TDS Withholding Rate (Sec 194C / 194J)
              </label>
              <select
                value={globalTdsRate}
                onChange={(e) => handleApplyGlobalTdsRate(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2 bg-white text-xs font-medium text-slate-900"
              >
                <option value={0}>None (0% TDS)</option>
                <option value={1}>1% — Sec 194C (Individual / HUF Contractor)</option>
                <option value={2}>2% — Sec 194C (Company / Partnership Firm Contractor)</option>
              </select>
            </div>
          </div>

          {/* Quick Auto-Distribute Helper */}
          {selectedPartyId && allocations.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Auto-Allocate Remittance:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter Received Amount"
                    value={totalRemittanceInput}
                    onChange={(e) => setTotalRemittanceInput(e.target.value)}
                    className="w-40 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold font-mono bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAutoDistribute}
                    className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors"
                  >
                    Auto-Distribute
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllInvoices(true)}
                  className="text-[11px] font-bold text-blue-700 hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => handleSelectAllInvoices(false)}
                  className="text-[11px] font-bold text-slate-500 hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Invoices Allocation Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider">
                Pending Invoices for Allocation
              </span>
              <span className="text-[11px] text-slate-300">
                {selectedRows.length} of {allocations.length} Invoices Selected
              </span>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[10.5px] uppercase sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 text-center w-8">
                      <CheckSquare className="w-3.5 h-3.5 mx-auto text-slate-500" />
                    </th>
                    <th className="p-2.5">Invoice No & Date</th>
                    <th className="p-2.5">Bill Type</th>
                    <th className="p-2.5 text-right">Grand Total</th>
                    <th className="p-2.5 text-right">Current Balance</th>
                    <th className="p-2.5 text-right w-28">Payment Received</th>
                    <th className="p-2.5 text-right w-24">TDS Credited</th>
                    <th className="p-2.5 text-right">New Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingPartyInvoices ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-blue-600" />
                        Fetching customer pending invoices...
                      </td>
                    </tr>
                  ) : !selectedPartyId ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        Please select a customer above to view their pending invoices.
                      </td>
                    </tr>
                  ) : allocations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        This customer currently has no pending or unpaid invoices.
                      </td>
                    </tr>
                  ) : (
                    allocations.map((row) => {
                      const newBalance = Math.max(0, row.balanceAmount - row.allocAmount - row.tdsAmount);
                      return (
                        <tr
                          key={row.invoiceId}
                          className={`hover:bg-slate-50 transition-colors ${row.selected ? 'bg-red-50/20' : ''}`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => handleToggleInvoiceSelection(row.invoiceId)}
                              className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5">
                            <p className="font-mono font-bold text-red-600">{row.invoiceNumber}</p>
                            <p className="text-[10px] text-slate-500">{new Date(row.invoiceDate).toLocaleDateString()}</p>
                          </td>
                          <td className="p-2.5">
                            <Badge variant="blue" size="sm">
                              {row.billType?.replace('_', ' ') || 'STANDARD'}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-right text-slate-600">
                            ₹{row.grandTotal.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900">
                            ₹{row.balanceAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              max={row.balanceAmount}
                              step="0.01"
                              value={row.allocAmount || ''}
                              placeholder="0.00"
                              onChange={(e) => handleAllocAmountChange(row.invoiceId, e.target.value)}
                              className="w-full text-right rounded border border-slate-300 px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-white"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              max={row.balanceAmount}
                              step="0.01"
                              value={row.tdsAmount || ''}
                              placeholder="0.00"
                              onChange={(e) => handleTdsAmountChange(row.invoiceId, e.target.value)}
                              className="w-full text-right rounded border border-slate-300 px-2 py-1 text-xs font-mono font-semibold text-indigo-700 bg-white"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <span
                              className={`font-mono font-bold ${
                                newBalance === 0 ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                            >
                              ₹{newBalance.toLocaleString('en-IN')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transaction Metadata: Date, Mode, Reference, Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded border border-slate-300 p-1.5 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full rounded border border-slate-300 p-1.5 bg-white text-xs font-semibold"
              >
                <option value="NEFT/RTGS">NEFT / RTGS</option>
                <option value="UPI">UPI (Unified Payments)</option>
                <option value="Net Banking">Net Banking / IMPS</option>
                <option value="Cheque">Bank Cheque / DD</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Bank UTR / Cheque Ref</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. HDFCR98231049281"
                className="w-full rounded border border-slate-300 p-1.5 font-mono text-xs"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block font-medium text-slate-700 mb-1">Remittance Remarks / Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarks regarding this settlement..."
                className="w-full rounded border border-slate-300 p-1.5 text-xs"
              />
            </div>
          </div>

          {/* Allocation Financial Summary Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="grid grid-cols-3 gap-6 text-center sm:text-left">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Remittance Received
                </span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  ₹{totalAllocatedRemittance.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  TDS Deduction
                </span>
                <span className="text-base font-black text-indigo-400 font-mono">
                  ₹{totalTdsWithheld.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Total Customer Credit
                </span>
                <span className="text-base font-black text-white font-mono">
                  ₹{totalCustomerCredit.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || selectedRows.length === 0}
                className="flex items-center gap-1.5 px-6 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 shadow-md shadow-red-600/30 transition-all hover:scale-105"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Confirm & Post Payment</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
