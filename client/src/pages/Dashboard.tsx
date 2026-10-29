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

  return (
    <div className="space-y-6">
      {/* Top Welcome Section & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/iso-logo.png"
              alt="ISO 9001:2015"
              className="h-12 w-auto object-contain hidden md:block"
            />
            <img
              src="/images/msk-logo.png"
              alt="MSK LOGISTIC SOLUTION"
              className="h-16 w-auto object-contain hidden sm:block drop-shadow-xs"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">MSK LOGISTIC SOLUTION</h1>
              <Badge variant="red" size="sm">
                ERP Production
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              JNPT Township Colony, Sector - 3, Navi Mumbai • GSTIN: <span className="font-mono font-medium text-slate-700">27AXWPK4562G1ZX</span> • PAN: <span className="font-mono font-medium text-slate-700">AXWPK4562G</span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenGstinModal}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors shadow-2xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>GSTIN Lookup</span>
          </button>
          <button
            onClick={onOpenInvoiceWizard}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
          <button
            onClick={onOpenAddPartyModal}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Party</span>
          </button>
          <button
            onClick={onOpenAddJobModal}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Ship className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Job</span>
          </button>
          <button
            onClick={onOpenAddContainerModal}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Box className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Container</span>
          </button>
        </div>
      </div>

      {/* 8 Primary Dashboard KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Parties"
          value={stats?.totalParties ?? '3'}
          subtext="Verified Forwarders & Consignees"
          icon={Users}
          variant="red"
          onClick={() => onNavigateTab('parties')}
        />
        <StatCard
          title="Active Jobs"
          value={stats?.activeJobs ?? '2'}
          subtext="Nhava Sheva export consignments"
          icon={Ship}
          variant="slate"
          onClick={() => onNavigateTab('jobs')}
        />
        <StatCard
          title="Total Containers"
          value={stats?.totalContainers ?? '3'}
          subtext="20FT & 40FT yard movements"
          icon={Box}
          variant="slate"
          onClick={() => onNavigateTab('containers')}
        />
        <StatCard
          title="Invoices This Month"
          value={stats?.invoicesThisMonth ?? '2'}
          subtext="Generated tax invoices"
          icon={FileText}
          variant="red"
          onClick={() => onNavigateTab('invoices')}
        />
        <StatCard
          title="Pending Payments"
          value={`${stats?.pendingInvoicesCount ?? '1'} Invoices`}
          subtext="Awaiting remittance"
          icon={Clock}
          variant="amber"
          onClick={() => onNavigateTab('payments')}
        />
        <StatCard
          title="This Month Billing"
          value={`₹${(stats?.thisMonthBilling || 204848).toLocaleString('en-IN')}`}
          subtext="Total invoiced value"
          icon={TrendingUp}
          variant="emerald"
          onClick={() => onNavigateTab('reports')}
        />
        <StatCard
          title="GST Collected"
          value={`₹${(stats?.totalGstCollected || 31248).toLocaleString('en-IN')}`}
          subtext="CGST + SGST + IGST liability"
          icon={CreditCard}
          variant="red"
          onClick={() => onNavigateTab('reports')}
        />
        <StatCard
          title="Outstanding Amount"
          value={`₹${(stats?.outstandingAmount || 45848).toLocaleString('en-IN')}`}
          subtext="Receivables overdue"
          icon={AlertCircle}
          variant="amber"
          onClick={() => onNavigateTab('payments')}
        />
      </div>

      {/* Main Content Grid: Recent Invoices & Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Invoices Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recent Invoices
              </h2>
              <p className="text-xs text-slate-500">Live logistics invoices and payment statuses</p>
            </div>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
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
                {stats?.recentInvoices?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono font-bold text-red-700">
                      {inv.invoiceNumber}
                    </td>
                    <td className="p-3 text-slate-600">
                      {new Date(inv.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-slate-900 truncate max-w-[180px]">
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
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          title="Download PDF"
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => onPrintInvoice(inv)}
                          title="Print Invoice"
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onWhatsAppInvoice(inv)}
                          title="Send WhatsApp"
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-emerald-600"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Operations & Recent Jobs */}
        <div className="space-y-6">
          {/* Active Container Operations */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Active Container Operations
              </h2>
              <button
                onClick={() => onNavigateTab('containers')}
                className="text-[11px] font-semibold text-red-600 hover:text-red-800"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              {stats?.activeContainers?.map((c: any) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{c.containerNumber}</span>
                    <Badge variant="blue" size="sm">
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {c.party?.legalName} • {c.size} {c.type}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-600 font-medium">
                    <span>Empty Ground: {c.emptyGroundRentDays}d</span>
                    <span>Loaded Ground: {c.loadedGroundDays}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Shipments & Jobs
              </h2>
              <button
                onClick={() => onNavigateTab('jobs')}
                className="text-[11px] font-semibold text-red-600 hover:text-red-800"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              {stats?.recentJobs?.map((j: any) => (
                <div key={j.id} className="p-2.5 rounded-lg border border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{j.jobNumber}</span>
                    <Badge variant="green" size="sm">
                      {j._count?.containers || 0} Containers
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 truncate">{j.party?.legalName}</p>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    Exporter: {j.exporter?.name || 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
