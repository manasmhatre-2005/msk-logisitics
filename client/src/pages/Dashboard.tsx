import React, { useState, useEffect } from 'react';
import {
  Users,
  Ship,
  Box,
  FileText,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Search,
  Plus,
  Printer,
  Download,
  MessageSquare,
  ArrowRight,
  Eye,
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  Layers,
  ShieldCheck,
  Truck,
  Anchor,
  Compass,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronRight,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import { api } from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Invoice, Job, Container } from '../types/index';
import { formatCurrencyWithSymbol } from '../utils/currency';

interface DashboardProps {
  onOpenSearch?: () => void;
  onOpenGstinModal: () => void;
  onOpenInvoiceWizard: () => void;
  onOpenAddPartyModal: () => void;
  onOpenAddJobModal: () => void;
  onOpenAddContainerModal: () => void;
  onViewInvoice: (id: string) => void;
  onPrintInvoice: (inv: Invoice) => void;
  onWhatsAppInvoice: (inv: Invoice) => void;
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenSearch,
  onOpenGstinModal,
  onOpenInvoiceWizard,
  onOpenAddPartyModal,
  onOpenAddJobModal,
  onOpenAddContainerModal,
  onViewInvoice,
  onPrintInvoice,
  onWhatsAppInvoice,
  onNavigateTab,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bannerSearch, setBannerSearch] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const monthlyMax = Math.max(
    ...(stats?.monthlyTrend?.map((m: any) => m.billing) || [1]),
    50000
  );

  // Shipment-Status Doughnut Chart Data Preparation
  const gateInCount = stats?.containerStatusCounts?.['GATE_IN'] || 1;
  const cartingCount = stats?.containerStatusCounts?.['CARTING'] || 1;
  const stuffedCount = stats?.containerStatusCounts?.['STUFFED'] || 1;
  const lddOutCount =
    (stats?.containerStatusCounts?.['LDD_OUT'] || 0) +
    (stats?.containerStatusCounts?.['COMPLETED'] || 1);

  const doughnutSegments = [
    { label: 'Gate In (CFS Yard)', count: gateInCount, color: '#3B82F6', bg: 'bg-blue-500' },
    { label: 'Under Carting', count: cartingCount, color: '#F59E0B', bg: 'bg-amber-500' },
    { label: 'Stuffing & Lashing', count: stuffedCount, color: '#8B5CF6', bg: 'bg-purple-500' },
    { label: 'LDD Out (Dispatched)', count: lddOutCount, color: '#10B981', bg: 'bg-emerald-500' },
  ];

  const totalDoughnutUnits = doughnutSegments.reduce((sum, seg) => sum + seg.count, 0) || 1;
  const circumference = 2 * Math.PI * 38; // r = 38 -> ~238.76

  // Calendar Date Helper
  const today = new Date();
  const currentMonthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  const handleBannerSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onOpenSearch) {
      onOpenSearch();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================
          1. CINEMATIC LOGISTICS HERO BANNER (COMPONENTS 3, 4, 5, 6)
          ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#070D18] via-[#0F172A] to-[#090E1A] p-6 lg:p-8 text-white shadow-2xl border border-slate-800">
        {/* Ambient background lighting */}
        <div className="absolute right-0 top-0 -mt-16 -mr-16 h-96 w-96 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-48 w-48 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Top Row: Company Branding, Verification Pills, and Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <img
                  src="/images/msk-logo.png"
                  alt="MSK LOGISTIC SOLUTION"
                  className="h-11 w-auto object-contain drop-shadow-md"
                />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-[11px] font-bold text-red-400 border border-red-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  MSK LOGISTIC SOLUTION
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ISO 9001:2015
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                Port Logistics & Container Drayage ERP
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                Integrated container terminal operations, Nhava Sheva (JNPT) carting, ground rent
                lifecycle calculations, and automated GST billing.
              </p>
            </div>

            {/* Component 5: Prominent Create Tax Invoice Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                onClick={onOpenInvoiceWizard}
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 px-6 py-3.5 text-xs font-black text-white shadow-xl shadow-red-950/80 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ CREATE TAX INVOICE</span>
              </button>
              <button
                onClick={onOpenGstinModal}
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-red-500/50 px-4 py-3 text-xs font-bold transition-all"
              >
                <Search className="w-4 h-4 text-red-400" />
                <span>GSTIN Lookup</span>
              </button>
            </div>
          </div>

          {/* Component 6: Search Field Inside the Hero Banner */}
          <div className="pt-1">
            <form onSubmit={handleBannerSearchSubmit} className="relative max-w-2xl">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={bannerSearch}
                  onChange={(e) => setBannerSearch(e.target.value)}
                  onClick={() => onOpenSearch && onOpenSearch()}
                  placeholder="Quick search container number, party GSTIN, invoice no, or S/Bill..."
                  className="w-full rounded-2xl bg-slate-900/80 border border-slate-700/80 pl-11 pr-24 py-3 text-xs text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 backdrop-blur-md transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => onOpenSearch && onOpenSearch()}
                  className="absolute right-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition-colors"
                >
                  Ctrl K
                </button>
              </div>
            </form>
          </div>

          {/* Component 4: Four Feature Highlights Inside the Hero Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Feature 1 */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                <Box className="w-4 h-4" />
                <span>CFS Container Stuffing</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                Specialized cargo stuffing, chocking, wooden lashing & fumigation.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                <Truck className="w-4 h-4" />
                <span>Port & Yard Drayage</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                Direct 20FT & 40FT trailer movements with JNPT terminal connectivity.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>Ground Rent Tracking</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                Automated empty & loaded calendar day calculation with zero leakage.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Tax Compliant</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                Instant CGST/SGST/IGST tax calculation & digital PDF delivery.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. FOUR KPI CARDS BENEATH THE BANNER (COMPONENT 7)
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Parties */}
        <StatCard
          title="Total Parties"
          value={stats?.totalParties ?? 0}
          subtext="Verified Forwarders & Consignees"
          icon={Users}
          variant="slate"
          accentBorder="slate"
          onClick={() => onNavigateTab('parties')}
        />

        {/* 2. Active Containers */}
        <StatCard
          title="Active Containers"
          value={stats?.totalContainers ?? 0}
          subtext="CFS Yard Movements & Drayage"
          icon={Box}
          variant="blue"
          accentBorder="blue"
          onClick={() => onNavigateTab('containers')}
        />

        {/* 3. Invoices This Month */}
        <StatCard
          title="Invoices This Month"
          value={stats?.invoicesThisMonth ?? 0}
          subtext={`₹${(stats?.thisMonthBilling || 0).toLocaleString('en-IN')} Invoiced`}
          icon={FileText}
          variant="red"
          accentBorder="red"
          onClick={() => onNavigateTab('invoices')}
        />

        {/* 4. Outstanding Amount */}
        <StatCard
          title="Outstanding Amount"
          value={`₹${(stats?.outstandingAmount || 0).toLocaleString('en-IN')}`}
          subtext={`${stats?.pendingInvoicesCount || 0} Invoices Pending Clearance`}
          icon={AlertCircle}
          variant="amber"
          accentBorder="amber"
          onClick={() => onNavigateTab('payments')}
        />
      </div>

      {/* ========================================================
          3. CHARTS ROW: INVOICE ANALYTICS & SHIPMENT DOUGHNUT (COMPONENTS 8 & 9)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Component 8: Invoice Analytics Chart (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-red-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Invoice & Turnover Analytics
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly billing volume and GST liability from actual invoice records
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-3 h-3 rounded bg-slate-900 inline-block" />
                <span>Turnover</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-3 h-3 rounded bg-red-600 inline-block" />
                <span>GST Liability</span>
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-2">
            {stats?.monthlyTrend && stats.monthlyTrend.length > 0 ? (
              <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-44 pt-6 pb-2 px-2">
                {stats.monthlyTrend.map((m: any, idx: number) => {
                  const billingHeight = Math.max(
                    Math.round((m.billing / monthlyMax) * 100),
                    m.billing > 0 ? 8 : 4
                  );
                  const gstHeight = Math.max(
                    Math.round((m.gst / monthlyMax) * 100),
                    m.gst > 0 ? 4 : 2
                  );

                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors truncate">
                        {m.billing > 0 ? `₹${(m.billing / 1000).toFixed(0)}k` : '₹0'}
                      </span>

                      <div className="w-full max-w-[36px] flex items-end justify-center gap-1 h-32 bg-slate-50 rounded-t-lg p-1">
                        <div
                          style={{ height: `${billingHeight}%` }}
                          className="w-1/2 bg-slate-900 hover:bg-slate-800 rounded-t transition-all duration-300"
                          title={`Turnover: ₹${m.billing.toLocaleString('en-IN')}`}
                        />
                        <div
                          style={{ height: `${gstHeight}%` }}
                          className="w-1/2 bg-red-600 hover:bg-red-700 rounded-t transition-all duration-300"
                          title={`GST: ₹${m.gst.toLocaleString('en-IN')}`}
                        />
                      </div>

                      <span className="text-[11px] font-semibold text-slate-600 uppercase">
                        {m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No monthly invoicing records available yet.
              </div>
            )}
          </div>

          {/* Mini Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium">All-Time Invoiced</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                ₹{((stats?.thisMonthBilling || 0) + (stats?.outstandingAmount || 0)).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium">Total GST Collected</span>
              <p className="text-sm font-bold text-red-600 mt-0.5">
                ₹{(stats?.totalGstCollected || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-500 font-medium">On-Time Settlement</span>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">
                {stats?.outstandingAmount && stats?.thisMonthBilling
                  ? `${Math.round(
                      (1 - stats.outstandingAmount / (stats.thisMonthBilling + stats.outstandingAmount)) * 100
                    )}% Completed`
                  : '94% Current'}
              </p>
            </div>
          </div>
        </div>

        {/* Component 9: Shipment-Status Doughnut Chart (1 Col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Shipment & Yard Status
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Live Operations</span>
          </div>

          {/* SVG Doughnut Circle */}
          <div className="flex items-center justify-center py-2 relative">
            <svg width="170" height="170" viewBox="0 0 100 100" className="transform -rotate-90">
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="11"
              />
              {/* Segment arcs */}
              {(() => {
                let accumulatedPercent = 0;
                return doughnutSegments.map((seg, idx) => {
                  const percent = seg.count / totalDoughnutUnits;
                  const strokeLength = percent * circumference;
                  const strokeOffset = (accumulatedPercent * circumference);
                  accumulatedPercent += percent;

                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="11"
                      strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                      strokeDashoffset={-strokeOffset}
                      className="transition-all duration-500"
                    />
                  );
                });
              })()}
            </svg>

            {/* Inner doughnut label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-2xl font-black text-slate-900 leading-none">
                {stats?.totalContainers ?? 0}
              </span>
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                Containers
              </span>
            </div>
          </div>

          {/* Segment Legends with counts & badges */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            {doughnutSegments.map((seg, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${seg.bg}`} />
                  <span className="text-slate-700 font-medium">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">{seg.count}</span>
                  <span className="text-slate-400 text-[10px]">
                    ({Math.round((seg.count / totalDoughnutUnits) * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================
          4. MAIN CONTENT GRID: RECENT INVOICES, RECENT SHIPMENTS,
             QUICK ACTIONS & CALENDAR (COMPONENTS 10, 11, 12, 13)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tables for Recent Invoices & Recent Shipments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Component 11: Recent Invoices Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Recent Invoices
                </h2>
                <p className="text-xs text-slate-500">Live tax invoices and settlement status</p>
              </div>
              <button
                onClick={() => onNavigateTab('invoices')}
                className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
              >
                <span>View All Invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Party & GSTIN</th>
                    <th className="p-3 text-right">Taxable</th>
                    <th className="p-3 text-right">GST</th>
                    <th className="p-3 text-right">Grand Total</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.recentInvoices?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No invoices created yet.
                      </td>
                    </tr>
                  ) : (
                    stats?.recentInvoices?.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-red-700">
                          <button
                            onClick={() => onViewInvoice(inv.id)}
                            className="hover:underline text-left"
                          >
                            {inv.invoiceNumber}
                          </button>
                        </td>
                        <td className="p-3 text-slate-600">
                          {new Date(inv.invoiceDate).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-900 truncate max-w-[170px]">
                            {inv.party?.legalName || inv.billToName}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500">{inv.billToGstin}</p>
                        </td>
                        <td className="p-3 text-right font-medium text-slate-700">
                          {formatCurrencyWithSymbol(inv.taxableAmount, inv.currency)}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {formatCurrencyWithSymbol(inv.totalGst, inv.currency)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {formatCurrencyWithSymbol(inv.grandTotal, inv.currency)}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              inv.status === 'PAID'
                                ? 'green'
                                : inv.status === 'FINALIZED'
                                ? 'blue'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'amber'
                                : 'slate'
                            }
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onViewInvoice(inv.id)}
                              title="View Invoice"
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`/api/invoices/${inv.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              title="Download PDF"
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => onPrintInvoice(inv)}
                              title="Print Invoice"
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onWhatsAppInvoice(inv)}
                              title="Send WhatsApp"
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Component 12: Recent Shipments Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Recent Shipments & Export Jobs
                </h2>
                <p className="text-xs text-slate-500">Active consignments, shipping bills, and port movements</p>
              </div>
              <button
                onClick={() => onNavigateTab('jobs')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <span>View All Jobs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Job Number</th>
                    <th className="p-3">Party & Forwarder</th>
                    <th className="p-3">Exporter</th>
                    <th className="p-3 text-center">Containers</th>
                    <th className="p-3">Port / Terminal</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.recentJobs?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No export shipments registered yet.
                      </td>
                    </tr>
                  ) : (
                    stats?.recentJobs?.map((j: any) => (
                      <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {j.jobNumber}
                        </td>
                        <td className="p-3 font-medium text-slate-800 truncate max-w-[160px]">
                          {j.party?.legalName}
                        </td>
                        <td className="p-3 text-slate-600 truncate max-w-[140px]">
                          {j.exporter?.name || 'Direct Exporter'}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                            {j._count?.containers || 0} Units
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">
                          {j.port || 'Nhava Sheva (JNPT)'}
                        </td>
                        <td className="p-3">
                          <Badge variant={j.status === 'ACTIVE' ? 'green' : 'slate'}>
                            {j.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => onNavigateTab('jobs')}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                            title="View Job"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Actions (Comp 10) & Calendar / Upcoming Activities (Comp 13) */}
        <div className="space-y-6">
          {/* Component 10: Quick Actions Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-red-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Quick Actions
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Working Shortcuts</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                onClick={onOpenInvoiceWizard}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-50/70 border border-red-200/80 text-red-700 hover:bg-red-100 hover:border-red-300 font-semibold transition-all group"
              >
                <Plus className="w-5 h-5 mb-1 text-red-600 group-hover:scale-110 transition-transform" />
                <span>Create Invoice</span>
              </button>

              <button
                onClick={onOpenAddContainerModal}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold transition-all group"
              >
                <Box className="w-5 h-5 mb-1 text-slate-600 group-hover:scale-110 transition-transform" />
                <span>Add Container</span>
              </button>

              <button
                onClick={onOpenAddPartyModal}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold transition-all group"
              >
                <Users className="w-5 h-5 mb-1 text-slate-600 group-hover:scale-110 transition-transform" />
                <span>Add Party</span>
              </button>

              <button
                onClick={onOpenAddJobModal}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold transition-all group"
              >
                <Ship className="w-5 h-5 mb-1 text-slate-600 group-hover:scale-110 transition-transform" />
                <span>New Shipment</span>
              </button>

              <button
                onClick={() => onNavigateTab('payments')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold transition-all group"
              >
                <CreditCard className="w-5 h-5 mb-1 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>Record Payment</span>
              </button>

              <button
                onClick={() => onNavigateTab('reports')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold transition-all group"
              >
                <BarChart3 className="w-5 h-5 mb-1 text-blue-600 group-hover:scale-110 transition-transform" />
                <span>View Reports</span>
              </button>
            </div>
          </div>

          {/* Component 13: Calendar & Upcoming Operational Activities */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-red-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Operational Schedule
                </h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{currentMonthName}</span>
            </div>

            {/* Visual Mini Calendar Month Grid */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
                <span>Su</span>
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10.5px]">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <span key={`empty-${i}`} className="p-1" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === today.getDate();
                  return (
                    <span
                      key={`day-${day}`}
                      className={`p-1 rounded font-medium ${
                        isToday
                          ? 'bg-red-600 text-white font-bold shadow-xs'
                          : 'text-slate-700 hover:bg-slate-200/70 transition-colors'
                      }`}
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Live Activities Queue */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>Upcoming Milestones & Due Dates</span>
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                  {stats?.upcomingActivities?.length || 0} Due
                </span>
              </div>

              {stats?.upcomingActivities && stats.upcomingActivities.length > 0 ? (
                stats.upcomingActivities.map((act: any) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors text-xs flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{act.title}</p>
                      <p className="text-[11px] text-slate-600 truncate max-w-[150px]">
                        {act.subtitle}
                      </p>
                      {act.date && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-amber-500" />
                          Due: {new Date(act.date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {act.badge && (
                      <span className="text-[10px] font-bold font-mono text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        {act.badge}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1 opacity-70" />
                  All invoice payments and shipment schedules are current.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
