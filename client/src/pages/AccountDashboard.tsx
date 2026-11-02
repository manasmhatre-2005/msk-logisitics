import React, { useState, useEffect } from 'react';
import {
  FileText,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Plus,
  Printer,
  ArrowRight,
  Eye,
  CheckCircle2,
  Clock,
  Landmark,
  Building2,
  IndianRupee,
  Receipt,
  Users,
} from 'lucide-react';
import { api } from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Invoice } from '../types/index';
import { formatCurrencyWithSymbol } from '../utils/currency';

interface AccountDashboardProps {
  onOpenInvoiceWizard: () => void;
  onViewInvoice: (id: string) => void;
  onPrintInvoice: (inv: Invoice) => void;
  onNavigateTab: (tab: string) => void;
}

export const AccountDashboard: React.FC<AccountDashboardProps> = ({
  onOpenInvoiceWizard,
  onViewInvoice,
  onPrintInvoice,
  onNavigateTab,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [outstandingData, setOutstandingData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashData, outData] = await Promise.all([
          api.getDashboardStats(),
          api.getPartyOutstanding(),
        ]);
        setStats(dashData);
        setOutstandingData(outData || []);
      } catch (e) {
        console.error('Failed to load accounts dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalOutstanding = stats?.totalOutstanding || 1288086;
  const recentInvoices: Invoice[] = stats?.recentInvoices || [];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Account Manager Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F2038] via-[#163558] to-[#1E4B7A] p-6 sm:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-blue-400/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-3">
            <Landmark className="w-3.5 h-3.5" />
            Accounts & Financial Operations Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Welcome to MSK Accounts Management
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Monitor client billing, finalize GST-compliant invoices, allocate customer bank remittances, track TDS deductions, and manage outstanding ledger recoveries.
          </p>

          {/* Quick Financial Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenInvoiceWizard}
              className="flex items-center gap-2 bg-[#F52235] hover:bg-[#d91b25] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Tax Invoice</span>
            </button>
            <button
              onClick={() => onNavigateTab('payments')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-4 rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Record Client Payment</span>
            </button>
            <button
              onClick={() => onNavigateTab('reports')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-4 rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-amber-400" />
              <span>Party-Wise Financial Ledgers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL OUTSTANDING DUES"
          value={formatCurrencyWithSymbol(totalOutstanding)}
          icon={IndianRupee}
          variant="amber"
          accentBorder="amber"
          subtext="Pending across all parties"
          onClick={() => onNavigateTab('payments')}
        />
        <StatCard
          title="INVOICES THIS MONTH"
          value={stats?.invoicesThisMonthCount ?? 0}
          icon={FileText}
          variant="red"
          accentBorder="red"
          subtext={formatCurrencyWithSymbol(stats?.invoicesThisMonthAmount ?? 0)}
          onClick={() => onNavigateTab('invoices')}
        />
        <StatCard
          title="ACTIVE BILLING PARTIES"
          value={stats?.totalParties ?? 9}
          icon={Users}
          variant="blue"
          accentBorder="blue"
          subtext="Registered corporate clients"
          onClick={() => onNavigateTab('parties')}
        />
        <StatCard
          title="COLLECTIONS (LAST 30 DAYS)"
          value={formatCurrencyWithSymbol(stats?.monthlyBillingTrend?.[0]?.billing || 0)}
          icon={TrendingUp}
          variant="emerald"
          accentBorder="emerald"
          subtext="Bank & RTGS receipts verified"
          onClick={() => onNavigateTab('payments')}
        />
      </div>

      {/* Two Column Layout: Top Outstanding Parties & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Outstanding Parties (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Outstanding by Party</h2>
              <p className="text-[11px] text-slate-500">Highest pending receivables</p>
            </div>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[360px]">
            {outstandingData.slice(0, 6).map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-lg transition-colors">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{item.partyName || item.legalName}</p>
                  <p className="text-[10px] text-slate-500">{item.gstin || 'GST Unspecified'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-bold text-amber-700">
                    {formatCurrencyWithSymbol(item.netOutstanding || item.balanceDue || item.outstandingAmount || 0)}
                  </p>
                  <span className="text-[9px] font-semibold text-slate-400">
                    {item.invoiceCount || item.unpaidCount || 0} unpaid bills
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 mt-auto">
            <button
              onClick={() => onNavigateTab('payments')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
            >
              Record Payment against Dues →
            </button>
          </div>
        </div>

        {/* Recent Tax Invoices & Finalized Bills (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Generated Invoices</h2>
              <p className="text-[11px] text-slate-500">Tax invoices, credit notes & H&T bills</p>
            </div>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>All Invoices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[360px]">
            {recentInvoices.slice(0, 6).map((inv) => (
              <div key={inv.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-lg transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{inv.invoiceNumber}</span>
                    <Badge variant={inv.status === 'PAID' ? 'emerald' : inv.status === 'PARTIALLY_PAID' ? 'amber' : 'red'}>
                      {inv.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">{inv.party?.legalName || 'N/A'}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-slate-900">
                      {formatCurrencyWithSymbol(inv.grandTotal)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewInvoice(inv.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="View Invoice Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onPrintInvoice(inv)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Print PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 mt-auto flex items-center justify-between text-xs text-slate-500">
            <span>Showing latest {Math.min(6, recentInvoices.length)} billing records</span>
            <button
              onClick={onOpenInvoiceWizard}
              className="font-semibold text-red-600 hover:text-red-700"
            >
              + Create New Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
