import React, { useState, useEffect } from 'react';
import {
  Users,
  Ship,
  Box,
  FileText,
  CreditCard,
  DollarSign,
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
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Truck,
  Anchor,
  Compass,
  BarChart3,
} from 'lucide-react';
import { api } from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Invoice, Job, Container } from '../types/index';
import { formatCurrencyWithSymbol } from '../utils/currency';

interface DashboardProps {
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

  return (
    <div className="space-y-6 pb-8">
      {/* SECTION 2.C — PREMIUM WELCOME & LOGISTICS HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1120] via-[#111827] to-[#0B1120] p-6 lg:p-8 text-white shadow-lg border border-slate-800">
        {/* Subtle decorative background watermarks */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="absolute right-32 bottom-0 h-40 w-40 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 hidden xl:block pointer-events-none">
          <Ship className="w-64 h-64 text-slate-100" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-[11px] font-bold text-red-400 border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                MSK LOGISTIC SOLUTION ERP
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                ISO 9001:2015 Certified
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Nhava Sheva Port Logistics & Container Billing
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Excellence in container stuffing, CFS handling, empty-to-loaded ground day tracking,
              and compliant GST tax invoicing.
            </p>

            {/* Live Metadata Badges */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400 font-mono pt-1">
              <span>
                GSTIN: <strong className="text-slate-200">27AXWPK4562G1ZX</strong>
              </span>
              <span>•</span>
              <span>
                PAN: <strong className="text-slate-200">AXWPK4562G</strong>
              </span>
              <span>•</span>
              <span>
                State: <strong className="text-slate-200">Maharashtra (27)</strong>
              </span>
            </div>
          </div>

          {/* Quick Action Buttons directly in Hero */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenInvoiceWizard}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/60 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Tax Invoice</span>
            </button>
            <button
              onClick={onOpenGstinModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-red-500/50 px-4 py-2.5 text-xs font-semibold transition-all"
            >
              <Search className="w-4 h-4 text-red-400" />
              <span>GSTIN Auto-Fill</span>
            </button>
            <button
              onClick={onOpenAddJobModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3.5 py-2.5 text-xs font-semibold transition-all"
            >
              <Ship className="w-4 h-4 text-blue-400" />
              <span>New Job</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2.D — FOUR PROMINENT KPI CARDS */}
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

      {/* SECTION 2.E & 2.F & 2.G — ANALYTICS, REVENUE TREND & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Billing Trend & Container Operations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Analytics Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-red-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Invoicing & Revenue Analytics
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monthly billing turnover and GST liabilities from actual invoice records
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded bg-slate-900 inline-block" />
                  <span>Total Invoiced</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded bg-red-600 inline-block" />
                  <span>GST Collected</span>
                </span>
              </div>
            </div>

            {/* Visual Bar Distribution Chart */}
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
                        {/* Hover Tooltip / Value */}
                        <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-900 group-hover:font-bold transition-colors truncate">
                          {m.billing > 0 ? `₹${(m.billing / 1000).toFixed(0)}k` : '₹0'}
                        </span>

                        <div className="w-full max-w-[36px] flex items-end justify-center gap-1 h-32 bg-slate-50 rounded-t-lg p-1">
                          {/* Total Billing Bar */}
                          <div
                            style={{ height: `${billingHeight}%` }}
                            className="w-1/2 bg-slate-900 hover:bg-slate-800 rounded-t transition-all duration-300"
                            title={`Turnover: ₹${m.billing.toLocaleString('en-IN')}`}
                          />
                          {/* GST Bar */}
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

            {/* Summary Footer */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium">All-Time Invoiced</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  ₹
                  {(
                    (stats?.thisMonthBilling || 0) + (stats?.outstandingAmount || 0)
                  ).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium">Total GST Collected</span>
                <p className="text-sm font-bold text-red-600 mt-0.5">
                  ₹{(stats?.totalGstCollected || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-500 font-medium">Recovery Ratio</span>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">
                  {stats?.outstandingAmount && stats?.thisMonthBilling
                    ? `${Math.round(
                        (1 - stats.outstandingAmount / (stats.thisMonthBilling + stats.outstandingAmount)) *
                          100
                      )}% Collected`
                    : '92% On-Time'}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2.H — RECENT INVOICES COMPACT TABLE */}
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
        </div>

        {/* Right 1 Col: Quick Actions, Calendar / Activities, Container Status */}
        <div className="space-y-6">
          {/* SECTION 2.F — QUICK ACTION SHORTCUTS */}
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

            <div className="grid grid-cols-2 gap-2 text-xs">
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

          {/* SECTION 2.G — CALENDAR & UPCOMING OPERATIONAL ACTIVITIES */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Upcoming Due Dates & Activities
                </h2>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Live Queue</span>
            </div>

            <div className="space-y-2">
              {stats?.upcomingActivities && stats.upcomingActivities.length > 0 ? (
                stats.upcomingActivities.map((act: any) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors text-xs flex items-start justify-between gap-2"
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
                <div className="py-6 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-70" />
                  All invoice payments and shipment schedules are up to date.
                </div>
              )}
            </div>
          </div>

          {/* CONTAINER OPERATIONS STATUS BREAKDOWN */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Container Yard Status
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('containers')}
                className="text-[11px] font-bold text-red-600 hover:text-red-800"
              >
                View All
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-medium text-slate-700">
                  <span>Empty Gate-In (CFS Yard)</span>
                  <span className="font-bold font-mono">
                    {stats?.containerStatusCounts?.['GATE_IN'] || 1}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full w-2/5 rounded-full" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-medium text-slate-700">
                  <span>Under Carting / Stuffing</span>
                  <span className="font-bold font-mono">
                    {stats?.containerStatusCounts?.['CARTING'] ||
                      stats?.containerStatusCounts?.['STUFFED'] ||
                      1}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-3/5 rounded-full" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-medium text-slate-700">
                  <span>LDD Out / Dispatched</span>
                  <span className="font-bold font-mono">
                    {stats?.containerStatusCounts?.['LDD_OUT'] ||
                      stats?.containerStatusCounts?.['COMPLETED'] ||
                      1}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-4/5 rounded-full" />
                </div>
              </div>
            </div>

            {/* Active Container Snippet List */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              {stats?.activeContainers?.slice(0, 3).map((c: any) => (
                <div
                  key={c.id}
                  className="rounded-lg bg-slate-50 p-2 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900">{c.containerNumber}</span>
                    <p className="text-[10px] text-slate-500 truncate max-w-[130px]">
                      {c.party?.legalName}
                    </p>
                  </div>
                  <Badge variant="blue" size="sm">
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
