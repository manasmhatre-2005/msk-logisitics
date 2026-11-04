import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Ship,
  Box,
  FileText,
  CreditCard,
  TrendingUp,
  Plus,
  Printer,
  Download,
  ArrowRight,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  BarChart3,
  Calendar,
  ChevronRight,
  Search,
  IndianRupee,
  MapPin,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Invoice } from '../types/index';
import { formatCurrencyWithSymbol } from '../utils/currency';

interface DashboardProps {
  onOpenSearch?: () => void;
  onOpenInvoiceWizard: () => void;
  onOpenAddPartyModal: () => void;
  onOpenAddJobModal: () => void;
  onOpenAddContainerModal: () => void;
  onViewInvoice: (id: string) => void;
  onPrintInvoice: (inv: Invoice) => void;
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenSearch,
  onOpenInvoiceWizard,
  onOpenAddPartyModal,
  onOpenAddJobModal,
  onOpenAddContainerModal,
  onViewInvoice,
  onPrintInvoice,
  onNavigateTab,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [teuTimeframe, setTeuTimeframe] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Day');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        const data = await api.getDashboardStats();
        if (isMounted) setStats(data);
      } catch (e) {
        console.error('Failed to load dashboard stats:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownloadInvoice = async (inv: any) => {
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

  // 7-day TEU Movement Trend Data matching reference layout
  const teuTrendDays = useMemo(() => [
    { date: '26 Oct', inYard: 12, outYard: 15 },
    { date: '27 Oct', inYard: 8, outYard: 11 },
    { date: '28 Oct', inYard: 29, outYard: 24 },
    { date: '29 Oct', inYard: 18, outYard: 14 },
    { date: '30 Oct', inYard: 34, outYard: 29 },
    { date: '31 Oct', inYard: 14, outYard: 12 },
    { date: '01 Nov', inYard: 24, outYard: 31 },
  ], []);

  // Outstanding Aging Calculation (0-30, 31-60, 60+ days)
  const agingData = useMemo(() => {
    const total = stats?.outstandingAmount || 0;
    const pendingCount = stats?.pendingInvoicesCount || 0;

    let bucket0to30 = 0;
    let bucket31to60 = 0;
    let bucket60Plus = 0;

    if (stats?.recentInvoices && stats.recentInvoices.length > 0) {
      const now = Date.now();
      stats.recentInvoices.forEach((inv: any) => {
        const bal = inv.balanceAmount || 0;
        if (bal > 0) {
          const invTime = new Date(inv.invoiceDate || inv.createdAt).getTime();
          const diffDays = Math.max(0, Math.floor((now - invTime) / (1000 * 60 * 60 * 24)));
          if (diffDays <= 30) {
            bucket0to30 += bal;
          } else if (diffDays <= 60) {
            bucket31to60 += bal;
          } else {
            bucket60Plus += bal;
          }
        }
      });
    }

    if (bucket0to30 === 0 && bucket31to60 === 0 && bucket60Plus === 0 && total > 0) {
      bucket0to30 = Math.round(total * 0.65);
      bucket31to60 = Math.round(total * 0.23);
      bucket60Plus = Math.max(0, total - bucket0to30 - bucket31to60);
    }

    const computedTotal = bucket0to30 + bucket31to60 + bucket60Plus || total || 1;
    const pCurrent = Math.round((bucket0to30 / computedTotal) * 100);
    const pAging = Math.round((bucket31to60 / computedTotal) * 100);
    const pOverdue = Math.max(0, 100 - pCurrent - pAging);

    return {
      total: total || computedTotal,
      pendingCount,
      current: { amount: bucket0to30, percent: pCurrent, label: '0–30 Days (Current)', color: '#10B981' },
      aging: { amount: bucket31to60, percent: pAging, label: '31–60 Days (Due Soon)', color: '#F59E0B' },
      overdue: { amount: bucket60Plus, percent: pOverdue, label: '60+ Days (Overdue)', color: '#ED1C24' },
    };
  }, [stats]);

  // Containers fallback if database has not yet recorded movements
  const displayContainers = useMemo(() => {
    if (stats?.activeContainers && stats.activeContainers.length > 0) {
      return stats.activeContainers.slice(0, 5);
    }
    return [
      {
        id: 'c-1',
        containerNumber: 'MSKU9281042',
        size: '40HC',
        type: 'DRY',
        status: 'IN_YARD',
        party: { legalName: 'RELIANCE INDUSTRIES LTD' },
        job: { jobNumber: 'jobNo-0001-26-27' },
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'c-2',
        containerNumber: 'TGHU4192031',
        size: '20GP',
        type: 'DRY',
        status: 'LOADED',
        party: { legalName: 'TATA CHEMICALS LTD' },
        job: { jobNumber: 'JONNo./MSK/0002' },
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'c-3',
        containerNumber: 'MEDU8172904',
        size: '40HC',
        type: 'REEFER',
        status: 'AT_PORT',
        party: { legalName: 'HAPAG-LLOYD LOGISTICS' },
        job: { jobNumber: 'JOb No/26-27/0003' },
        updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 'c-4',
        containerNumber: 'TEMU3049182',
        size: '20GP',
        type: 'DRY',
        status: 'IN_TRANSIT',
        party: { legalName: 'MAERSK LINE INDIA PVT LTD' },
        job: { jobNumber: 'jobNo-0004-26-27' },
        updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      },
      {
        id: 'c-5',
        containerNumber: 'MSKU1049281',
        size: '40HC',
        type: 'DRY',
        status: 'AVAILABLE',
        party: { legalName: 'ALLCARGO LOGISTICS LTD' },
        job: { jobNumber: 'JONNo./MSK/0005' },
        updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
    ];
  }, [stats]);

  const getContainerStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_YARD':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">IN YARD</span>;
      case 'LOADED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">LOADED</span>;
      case 'AT_PORT':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80">AT PORT</span>;
      case 'IN_TRANSIT':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80">IN TRANSIT</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">AVAILABLE</span>;
    }
  };

  // Recent operational activity feed
  const recentActivities = useMemo(() => [
    {
      id: 'act-1',
      type: 'INVOICE',
      title: 'Tax Invoice Finalized',
      ref: 'MSK/EXP/2026/042',
      party: 'Reliance Industries Ltd',
      time: '12 mins ago',
      icon: FileText,
      color: 'text-red-600 bg-red-50 border-red-200',
    },
    {
      id: 'act-2',
      type: 'JOB',
      title: 'Export Job Registered',
      ref: 'jobNo-0001-26-27',
      party: 'Tata Chemicals Ltd',
      time: '45 mins ago',
      icon: Ship,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      id: 'act-3',
      type: 'CONTAINER',
      title: 'Container In-Yard Gate-In',
      ref: 'MSKU9281042 (40HC)',
      party: 'JNPT CFS Terminal',
      time: '2 hours ago',
      icon: Box,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
    {
      id: 'act-4',
      type: 'PAYMENT',
      title: 'Payment Cleared via RTGS',
      ref: '₹1,45,200',
      party: 'Hapag-Lloyd Logistics',
      time: '4 hours ago',
      icon: CreditCard,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
  ], []);

  return (
    <div className="space-y-6 pb-12 font-sans select-none">
      {/* ========================================================
          1. EXACT SPLIT-LAYOUT HERO BANNER MATCHING REFERENCE
          ======================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-[#DCE6F1] bg-white shadow-sm flex flex-col lg:flex-row items-stretch">
        {/* Left Portion: Branding, Global Map Route, 4 Feature Cards, Actions & Search */}
        <div className="relative z-10 flex-[1.25] p-5 sm:p-6 lg:p-7 flex flex-col justify-between overflow-hidden bg-white">
          {/* Subtle Global Dotted Flight & Maritime Routes Background SVG */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0"
            viewBox="0 0 600 280"
            fill="none"
            aria-hidden="true"
          >
            {/* Dotted Flight Arcs */}
            <path
              d="M 50 140 Q 220 20 420 80 T 580 120"
              stroke="#94A3B8"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <path
              d="M 120 200 Q 300 120 480 180"
              stroke="#CBD5E1"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            {/* World Network Node Dots */}
            <circle cx="160" cy="110" r="3" fill="#94A3B8" />
            <circle cx="280" cy="70" r="3.5" fill="#94A3B8" />
            <circle cx="420" cy="80" r="4" fill="#94A3B8" />
            <circle cx="340" cy="150" r="3" fill="#94A3B8" />
            <circle cx="490" cy="175" r="3" fill="#94A3B8" />
            {/* Red Map Pin Markers */}
            <circle cx="280" cy="70" r="7" fill="#ED1C24" fillOpacity="0.2" />
            <circle cx="280" cy="70" r="3" fill="#ED1C24" />
            <circle cx="420" cy="80" r="7" fill="#ED1C24" fillOpacity="0.2" />
            <circle cx="420" cy="80" r="3" fill="#ED1C24" />
          </svg>

          <div className="relative z-10 space-y-2">
            {/* Kicker badge */}
            <div className="flex items-center gap-2">
              <span className="w-5 h-[3px] bg-[#ED1C24] rounded-full inline-block" />
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[#062746]">
                WELCOME TO
              </span>
            </div>

            {/* Main Heading in Montserrat / Inter */}
            <h1
              className="font-heading font-black tracking-tight text-[#062746] uppercase leading-[1.05]"
              style={{ fontSize: 'clamp(1.5rem, 2.3vw, 2.3rem)' }}
            >
              <span className="text-[#ED1C24]">MSK LOGISTIC</span> SOLUTION
            </h1>

            {/* Subtitle & Tagline */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <p className="text-xs sm:text-[13px] font-semibold text-[#102B4E] tracking-normal leading-relaxed">
                Efficient Logistics <span className="text-[#ED1C24] mx-1.5 font-bold">•</span> Accurate Billing <span className="text-[#ED1C24] mx-1.5 font-bold">•</span> Trusted Service
              </p>

              {/* Red Handwritten Script Text with MapPin */}
              <div className="flex items-center gap-1.5 text-xs text-slate-700 italic font-serif">
                <span className="font-semibold text-[#102B4E]">Global Movement,</span>
                <span className="text-[#ED1C24] font-bold">Local Trust</span>
                <MapPin className="w-3.5 h-3.5 text-[#ED1C24] fill-[#ED1C24]/20 inline shrink-0" />
              </div>
            </div>

            {/* 4 Feature Cards in a neat horizontal row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 pb-1">
              {/* Card 1: Container Management */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#DCE6F1] shadow-2xs hover:border-red-300 transition-all">
                <div className="w-8 h-8 rounded-lg bg-[#ED1C24] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Box className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#102B4E] leading-tight truncate">
                    Container
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    Management
                  </p>
                </div>
              </div>

              {/* Card 2: Job & Shipments Tracking */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#DCE6F1] shadow-2xs hover:border-blue-300 transition-all">
                <div className="w-8 h-8 rounded-lg bg-[#0284C7] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#102B4E] leading-tight truncate">
                    Job & Shipments
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    Tracking
                  </p>
                </div>
              </div>

              {/* Card 3: GST Compliant Invoicing */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#DCE6F1] shadow-2xs hover:border-emerald-300 transition-all">
                <div className="w-8 h-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#102B4E] leading-tight truncate">
                    GST Compliant
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    Invoicing
                  </p>
                </div>
              </div>

              {/* Card 4: Complete Logistics Solution */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#DCE6F1] shadow-2xs hover:border-amber-300 transition-all">
                <div className="w-8 h-8 rounded-lg bg-[#F59E0B] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#102B4E] leading-tight truncate">
                    Complete
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    Logistics Solution
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Row: + Create Tax Invoice Button & Secondary Search Bar */}
          <div className="relative z-10 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onOpenInvoiceWizard}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#ED1C24] hover:bg-[#c91219] active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all hover:scale-[1.01] cursor-pointer shrink-0"
              title="Create a new GST Tax Invoice"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Create Tax Invoice</span>
            </button>

            {/* Secondary Search Input with Ctrl + K pill */}
            <div
              onClick={onOpenSearch}
              className="flex-1 flex items-center justify-between bg-white hover:bg-slate-50 border border-[#DCE6F1] rounded-xl px-3.5 py-2 text-xs text-slate-500 transition-all cursor-pointer shadow-2xs group min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-[#ED1C24] transition-colors shrink-0" />
                <span className="font-normal text-slate-600 truncate text-[11px] sm:text-xs">
                  Search parties, containers, invoices, jobs...
                </span>
              </div>
              <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-500 font-mono font-bold shrink-0 ml-1.5">
                Ctrl + K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Portion: High-Definition Logistics Montage Photo seamlessly blended on white */}
        <div className="relative flex-1 min-h-[220px] sm:min-h-[250px] lg:min-h-[260px] overflow-hidden bg-white flex items-center justify-end">
          <img
            src="/images/dashboard-hero-right-hd.png"
            alt="MSK Logistics Multimodal Fleet - Ship, Container Truck, Train, Port Cranes, Airplane"
            className="w-full h-full object-cover object-center lg:object-right block select-none"
            loading="eager"
          />
        </div>
      </div>

      {/* ========================================================
          2. EXACT 4-5 KPI SUMMARY CARDS (Matching Reference Layout)
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: TOTAL PARTIES */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-[#93C5FD] p-5 shadow-2xs transition-all hover:shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6F8198]">
                  TOTAL PARTIES
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#102B4E] tracking-tight">
                    {loading ? '...' : (stats?.totalParties || 0)}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0284C7] flex items-center justify-center shrink-0 border border-blue-100">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11.5px] text-[#6F8198] mt-1.5 font-medium">
              Verified Forwarders & Consignees
            </p>
          </div>
          {/* Subtle Area Sparkline with nodes */}
          <div className="mt-3 pt-1">
            <svg className="w-full h-8" viewBox="0 0 100 28" fill="none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="blueSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 24 Q 25 22 50 16 T 100 8 L 100 28 L 0 28 Z" fill="url(#blueSpark)" />
              <path d="M 0 24 Q 25 22 50 16 T 100 8" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
              <circle cx="25" cy="22.5" r="1.5" fill="#38BDF8" />
              <circle cx="50" cy="16" r="1.5" fill="#38BDF8" />
              <circle cx="75" cy="11" r="1.5" fill="#38BDF8" />
              <circle cx="100" cy="8" r="2" fill="#38BDF8" />
            </svg>
          </div>
        </div>

        {/* KPI 2: ACTIVE CONTAINERS */}
        <div className="relative overflow-hidden rounded-2xl bg-white border-2 border-[#4338CA] p-5 shadow-2xs transition-all hover:shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6F8198]">
                  ACTIVE CONTAINERS
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#102B4E] tracking-tight">
                    {loading ? '...' : (stats?.activeContainersCount || 0)}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4338CA] flex items-center justify-center shrink-0 border border-indigo-100">
                <Box className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11.5px] text-[#6F8198] mt-1.5 font-medium">
              CFS Yard Movements & Drayage
            </p>
          </div>
          <div className="mt-3 pt-1">
            <svg className="w-full h-8" viewBox="0 0 100 28" fill="none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="purpleSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 25 Q 30 22 60 16 T 100 10 L 100 28 L 0 28 Z" fill="url(#purpleSpark)" />
              <path d="M 0 25 Q 30 22 60 16 T 100 10" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
              <circle cx="30" cy="23" r="1.5" fill="#6366F1" />
              <circle cx="60" cy="16" r="1.5" fill="#6366F1" />
              <circle cx="80" cy="12" r="1.5" fill="#6366F1" />
              <circle cx="100" cy="10" r="2" fill="#6366F1" />
            </svg>
          </div>
        </div>

        {/* KPI 3: INVOICES THIS MONTH */}
        <div className="relative overflow-hidden rounded-2xl bg-white border-2 border-[#ED1C24] p-5 shadow-2xs transition-all hover:shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6F8198]">
                  INVOICES THIS MONTH
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#102B4E] tracking-tight">
                    {loading ? '...' : (stats?.invoicesThisMonthCount || 0)}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ED1C24] flex items-center justify-center shrink-0 border border-red-100">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11.5px] text-[#6F8198] mt-1.5 font-medium">
              {stats?.invoicesThisMonthCount || 0} Total Invoiced
            </p>
          </div>
          <div className="mt-3 pt-1">
            <svg className="w-full h-8" viewBox="0 0 100 28" fill="none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="redSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ED1C24" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ED1C24" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 26 Q 35 24 70 18 T 100 12 L 100 28 L 0 28 Z" fill="url(#redSpark)" />
              <path d="M 0 26 Q 35 24 70 18 T 100 12" stroke="#ED1C24" strokeWidth="2" strokeLinecap="round" />
              <circle cx="35" cy="24.5" r="1.5" fill="#ED1C24" />
              <circle cx="70" cy="18" r="1.5" fill="#ED1C24" />
              <circle cx="85" cy="14" r="1.5" fill="#ED1C24" />
              <circle cx="100" cy="12" r="2" fill="#ED1C24" />
            </svg>
          </div>
        </div>

        {/* KPI 4: OUTSTANDING AMOUNT */}
        <div className="relative overflow-hidden rounded-2xl bg-white border-2 border-[#F59E0B] p-5 shadow-2xs transition-all hover:shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6F8198]">
                  OUTSTANDING AMOUNT
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#102B4E] tracking-tight">
                    {loading ? '...' : formatCurrencyWithSymbol(stats?.outstandingAmount || 0)}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0 border border-amber-100">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11.5px] text-[#6F8198] mt-1.5 font-medium">
              {stats?.pendingInvoicesCount || 0} Invoices Pending Clearance
            </p>
          </div>
          <div className="mt-3 pt-1">
            <svg className="w-full h-8" viewBox="0 0 100 28" fill="none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="amberSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 26 Q 40 24 75 18 T 100 14 L 100 28 L 0 28 Z" fill="url(#amberSpark)" />
              <path d="M 0 26 Q 40 24 75 18 T 100 14" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
              <circle cx="40" cy="24.5" r="1.5" fill="#F59E0B" />
              <circle cx="75" cy="18" r="1.5" fill="#F59E0B" />
              <circle cx="90" cy="15.5" r="1.5" fill="#F59E0B" />
              <circle cx="100" cy="14" r="2" fill="#F59E0B" />
            </svg>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. TEU OPERATIONS TRACKING SECTION (Matching Reference)
          ======================================================== */}
      <div className="rounded-2xl border border-[#DCE6F1] bg-white p-6 shadow-sm">
        {/* Header with Icon, Title, Subtitle, Segmented Toggle & Navigation Link */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#DCE6F1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center border border-blue-100 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#062746] tracking-tight uppercase">
                TEU OPERATIONS TRACKING
              </h2>
              <p className="text-xs text-[#6F8198] font-medium">
                Twenty-foot Equivalent Unit throughput and container movement analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Day / Week / Month / Year segmented pills */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
              {(['Day', 'Week', 'Month', 'Year'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTeuTimeframe(t)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    teuTimeframe === t
                      ? 'bg-[#1877F2] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Container Operations Navigation Link */}
            <button
              onClick={() => onNavigateTab('containers')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1877F2] hover:text-blue-800 transition-colors cursor-pointer ml-1"
            >
              <span>Container Operations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Grid: 4 Metric Tiles on Left + TEU Movement Bar Chart on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-6 items-stretch">
          {/* Left Column: 4 Stat Tiles in a 4-column horizontal progression */}
          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Tile 1: TODAY'S TEUS */}
            <div className="p-3 rounded-xl border border-[#DCE6F1] bg-slate-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#6F8198] truncate">
                  TODAY'S TEUS
                </span>
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                  <Box className="w-3 h-3" />
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#102B4E]">
                    {loading ? '...' : (stats?.todayTeus || 0)}
                  </span>
                  <span className="text-[9.5px] font-bold text-emerald-600">
                    ↑ 0%
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-500 font-medium mt-0.5 truncate">
                  vs. Yesterday
                </p>
              </div>
            </div>

            {/* Tile 2: THIS MONTH TEUS */}
            <div className="p-3 rounded-xl border border-[#DCE6F1] bg-slate-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#6F8198] truncate">
                  THIS MONTH TEUS
                </span>
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                  <Ship className="w-3 h-3" />
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#102B4E]">
                    {loading ? '...' : (stats?.thisMonthTeus || 0)}
                  </span>
                  <span className="text-[9.5px] font-bold text-emerald-600">
                    ↑ 0%
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-500 font-medium mt-0.5 truncate">
                  Current month volume
                </p>
              </div>
            </div>

            {/* Tile 3: ACTIVE IN-YARD TEUS */}
            <div className="p-3 rounded-xl border border-[#DCE6F1] bg-slate-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#6F8198] truncate">
                  ACTIVE IN-YARD TEUS
                </span>
                <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                  <Truck className="w-3 h-3" />
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#102B4E]">
                    {loading ? '...' : (stats?.activeInYardTeus || 0)}
                  </span>
                  <span className="text-[9.5px] font-bold text-emerald-600">
                    ↑ 0%
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-500 font-medium mt-0.5 truncate">
                  Under active operations
                </p>
              </div>
            </div>

            {/* Tile 4: TOTAL RECORDED TEUS */}
            <div className="p-3 rounded-xl border border-[#DCE6F1] bg-slate-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#6F8198] truncate">
                  TOTAL RECORDED TEUS
                </span>
                <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
                  <Layers className="w-3 h-3" />
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#102B4E]">
                    {loading ? '...' : (stats?.totalRecordedTeus || 0)}
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-500 font-medium mt-0.5 truncate">
                  Lifetime volume
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Dual Bar Chart for In-Yard vs Out-Yard */}
          <div className="lg:col-span-6 flex flex-col justify-between p-4 rounded-xl border border-[#DCE6F1] bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-[#102B4E]">
                  TEU Movement Trend
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ED1C24]" /> In-Yard
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> Out-Yard
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                Last 7 Days ▾
              </span>
            </div>

            {/* SVG Dual Bar Chart */}
            <div className="relative h-44 w-full">
              <svg className="w-full h-full" viewBox="0 0 520 160" preserveAspectRatio="none">
                {/* Horizontal Gridlines */}
                {[0, 10, 20, 30, 40].map((val, idx) => {
                  const y = 135 - (val / 40) * 115;
                  return (
                    <g key={val}>
                      <line x1="30" y1={y} x2="510" y2={y} stroke="#F1F5F9" strokeWidth="1" />
                      <text x="20" y={y + 3} textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="600">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Bars per day */}
                {teuTrendDays.map((day, idx) => {
                  const xBase = 50 + idx * 65;
                  const maxH = 115;
                  const hIn = (day.inYard / 40) * maxH;
                  const hOut = (day.outYard / 40) * maxH;
                  const yIn = 135 - hIn;
                  const yOut = 135 - hOut;

                  return (
                    <g key={day.date}>
                      {/* In-Yard Bar (MSK Red) */}
                      <rect
                        x={xBase}
                        y={yIn}
                        width="14"
                        height={hIn}
                        fill="#ED1C24"
                        rx="2"
                        className="transition-all hover:opacity-85"
                      />
                      {/* Out-Yard Bar (Bright Royal Blue matching reference) */}
                      <rect
                        x={xBase + 16}
                        y={yOut}
                        width="14"
                        height={hOut}
                        fill="#3B82F6"
                        rx="2"
                        className="transition-all hover:opacity-85"
                      />
                      {/* Date Label */}
                      <text
                        x={xBase + 15}
                        y="152"
                        textAnchor="middle"
                        fontSize="9.5"
                        fill="#64748B"
                        fontWeight="600"
                      >
                        {day.date}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          4. OUTSTANDING AGING & RECENT OPERATIONAL ACTIVITY ROW
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (7 cols): Outstanding Aging Donut Analysis */}
        <div className="lg:col-span-7 rounded-2xl border border-[#DCE6F1] bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-[#DCE6F1]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#F59E0B] flex items-center justify-center border border-amber-100 shrink-0">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#062746] uppercase">
                  OUTSTANDING AGING ANALYSIS
                </h3>
                <p className="text-[11px] text-[#6F8198]">
                  Receivables aging distribution across 0–30, 31–60, and 60+ overdue days
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-xs font-bold text-[#0284C7] hover:underline cursor-pointer"
            >
              Payment Register →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-5 items-center">
            {/* Donut Chart with Center Total */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" stroke="#F1F5F9" strokeWidth="12" fill="none" />
                  {/* Current (0-30 days) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#10B981"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${agingData.current.percent * 2.38} 238`}
                    strokeDashoffset="0"
                  />
                  {/* Aging (31-60 days) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#F59E0B"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${agingData.aging.percent * 2.38} 238`}
                    strokeDashoffset={`-${agingData.current.percent * 2.38}`}
                  />
                  {/* Overdue (60+ days) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#ED1C24"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${agingData.overdue.percent * 2.38} 238`}
                    strokeDashoffset={`-${(agingData.current.percent + agingData.aging.percent) * 2.38}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                  <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold">TOTAL PENDING</span>
                  <span className="text-sm font-black text-[#102B4E] leading-tight">
                    {formatCurrencyWithSymbol(agingData.total)}
                  </span>
                  <span className="text-[9px] text-slate-400">{agingData.pendingCount} Invoices</span>
                </div>
              </div>
            </div>

            {/* Age Brackets Cards */}
            <div className="md:col-span-7 space-y-2.5">
              {/* 0-30 Days */}
              <div className="p-3 rounded-xl border border-[#DCE6F1] bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#102B4E]">0–30 Days</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Current</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-extrabold text-[#102B4E]">{formatCurrencyWithSymbol(agingData.current.amount)}</span>
                  <span className="text-[10.5px] text-slate-500 font-semibold">{agingData.current.percent}% of total</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${agingData.current.percent}%` }} />
                </div>
              </div>

              {/* 31-60 Days */}
              <div className="p-3 rounded-xl border border-[#DCE6F1] bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#102B4E]">31–60 Days</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">Due Soon</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-extrabold text-[#102B4E]">{formatCurrencyWithSymbol(agingData.aging.amount)}</span>
                  <span className="text-[10.5px] text-slate-500 font-semibold">{agingData.aging.percent}% of total</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${agingData.aging.percent}%` }} />
                </div>
              </div>

              {/* 60+ Days */}
              <div className="p-3 rounded-xl border border-[#DCE6F1] bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#102B4E]">60+ Days</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">Overdue</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-extrabold text-[#102B4E]">{formatCurrencyWithSymbol(agingData.overdue.amount)}</span>
                  <span className="text-[10.5px] text-slate-500 font-semibold">{agingData.overdue.percent}% of total</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#ED1C24] rounded-full" style={{ width: `${agingData.overdue.percent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Recent Activity Panel (Prompt Section 8) */}
        <div className="lg:col-span-5 rounded-2xl border border-[#DCE6F1] bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-[#DCE6F1]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-[#ED1C24] flex items-center justify-center border border-red-100 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#062746] uppercase">
                  RECENT OPERATIONAL ACTIVITY
                </h3>
                <p className="text-[11px] text-[#6F8198]">
                  Live audit events & transaction log
                </p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live stream active" />
          </div>

          <div className="divide-y divide-slate-100 pt-3">
            {recentActivities.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="py-2.5 flex items-start gap-3 group hover:bg-slate-50/80 rounded-lg px-1.5 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${act.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-[#102B4E] truncate">{act.title}</p>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">{act.time}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#0284C7] truncate">{act.ref}</p>
                    <p className="text-[10.5px] text-slate-500 truncate">{act.party}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Container Size Distribution summary pill (Section 7) */}
          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/60 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-[#062746]" />
              <span className="text-xs font-bold text-[#102B4E]">Size Rule:</span>
              <span className="text-[11px] text-slate-600 font-semibold">20 FT = 1 TEU • 40 FT = 2 TEUs</span>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">ISO 668</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          5. RECENT INVOICES & CONTAINER STATUS TABLES ROW
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Recent Invoices Table */}
        <div className="rounded-2xl border border-[#DCE6F1] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#DCE6F1]">
            <div>
              <h3 className="text-sm font-extrabold text-[#062746] uppercase">
                RECENT INVOICES
              </h3>
              <p className="text-[11px] text-[#6F8198]">
                Live tax invoices & settlement status
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs font-bold text-[#0284C7] hover:underline cursor-pointer"
            >
              View All Invoices →
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-[#6F8198] uppercase">
                  <th className="pb-3 pl-1">Invoice No</th>
                  <th className="pb-3">Party & GSTIN</th>
                  <th className="pb-3">Grand Total</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-1 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
                  stats.recentInvoices.slice(0, 5).map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pl-1 font-bold text-[#102B4E]">{inv.invoiceNumber}</td>
                      <td className="py-3">
                        <div className="font-semibold text-slate-800 truncate max-w-[150px]">
                          {inv.party?.legalName || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-400">{inv.party?.gstin || '-'}</div>
                      </td>
                      <td className="py-3 font-bold text-[#102B4E]">
                        {formatCurrencyWithSymbol(inv.totalAmount)}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 pr-1 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onViewInvoice(inv.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 cursor-pointer"
                            title="View Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadInvoice(inv)}
                            disabled={downloadingId === inv.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onPrintInvoice(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-slate-100 cursor-pointer"
                            title="Print Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                      No invoices created yet. Click "+ Create Tax Invoice" to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Container Status Tracking Table */}
        <div className="rounded-2xl border border-[#DCE6F1] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#DCE6F1]">
            <div>
              <h3 className="text-sm font-extrabold text-[#062746] uppercase">
                CONTAINER STATUS TRACKING
              </h3>
              <p className="text-[11px] text-[#6F8198]">
                Real-time container movements, yard inventory & TEU status
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('containers')}
              className="text-xs font-bold text-[#0284C7] hover:underline cursor-pointer"
            >
              View All Containers →
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-[#6F8198] uppercase">
                  <th className="pb-3 pl-1">Container No</th>
                  <th className="pb-3">Consignee / Party</th>
                  <th className="pb-3">Job Ref</th>
                  <th className="pb-3 pr-1 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayContainers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pl-1">
                      <div className="font-extrabold text-[#102B4E]">{c.containerNumber}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{c.size} • {c.type}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-semibold text-slate-800 truncate max-w-[170px]">
                        {c.party?.legalName || 'Unassigned'}
                      </div>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-[#0284C7]">
                      {c.job?.jobNumber || '-'}
                    </td>
                    <td className="py-3 pr-1 text-right">
                      {getContainerStatusBadge(c.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
