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
  ArrowRight,
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  Truck,
  BarChart3,
  PieChart as PieChartIcon,
  Package,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Invoice, Job, Container } from '../types/index';
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
  const [bannerSearch, setBannerSearch] = useState('');
  const [teuTimeframe, setTeuTimeframe] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Day');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (e) {
        console.error('Failed to load dashboard stats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
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

  const handleBannerSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onOpenSearch) {
      onOpenSearch();
    }
  };

  // 7-day TEU Movement Trend Data matching reference image
  const teuTrendDays = [
    { date: '26 Oct', inYard: 10, outYard: 15 },
    { date: '27 Oct', inYard: 5, outYard: 8 },
    { date: '28 Oct', inYard: 29, outYard: 24 },
    { date: '29 Oct', inYard: 15, outYard: 10 },
    { date: '30 Oct', inYard: 34, outYard: 29 },
    { date: '31 Oct', inYard: 7, outYard: 9 },
    { date: '01 Nov', inYard: 20, outYard: 29 },
  ];

  return (
    <div className="space-y-6 pb-12 font-sans select-none">
      {/* ========================================================
          1. MAIN HERO BANNER — SPLIT LAYOUT WITH LOGISTICS ARTWORK
          ======================================================== */}
      <div className="relative overflow-hidden rounded-[24px] border border-slate-200/90 shadow-sm bg-white flex flex-col lg:flex-row items-stretch">
        {/* LEFT SECTION: BRANDING, MAP BACKDROP, 4 FEATURES, BUTTON & SEARCH */}
        <div className="relative z-10 flex-1 min-w-0 p-6 sm:p-7 lg:p-8 flex flex-col justify-between overflow-hidden">
          {/* Subtle World Map Vector Background with Curved Route Arcs & Red Pins */}
          <div className="absolute inset-0 pointer-events-none opacity-40 z-0 overflow-hidden">
            <svg
              className="w-full h-full"
              viewBox="0 0 600 320"
              preserveAspectRatio="xMidYMid slice"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* World Map Dotted Silhouette */}
              <g fill="#94A3B8" opacity="0.45">
                {/* North America */}
                <circle cx="100" cy="70" r="2.2" /><circle cx="115" cy="65" r="2.5" /><circle cx="130" cy="60" r="2" />
                <circle cx="90" cy="85" r="2.5" /><circle cx="105" cy="80" r="3" /><circle cx="120" cy="75" r="2.5" /><circle cx="135" cy="70" r="2" />
                <circle cx="95" cy="100" r="2" /><circle cx="110" cy="95" r="2.5" /><circle cx="125" cy="90" r="2.5" /><circle cx="140" cy="85" r="2" />
                {/* South America */}
                <circle cx="145" cy="150" r="2" /><circle cx="155" cy="160" r="2.5" /><circle cx="165" cy="170" r="2.5" />
                <circle cx="150" cy="185" r="2.5" /><circle cx="160" cy="195" r="2" />
                {/* Europe */}
                <circle cx="280" cy="65" r="2.5" /><circle cx="295" cy="60" r="2.5" /><circle cx="310" cy="55" r="2" />
                <circle cx="275" cy="80" r="2.5" /><circle cx="290" cy="75" r="3" /><circle cx="305" cy="70" r="2.5" />
                {/* Africa */}
                <circle cx="280" cy="110" r="2" /><circle cx="295" cy="115" r="2.5" /><circle cx="310" cy="120" r="2.5" />
                <circle cx="285" cy="135" r="2.5" /><circle cx="300" cy="140" r="2.5" />
                {/* Asia & Middle East */}
                <circle cx="330" cy="65" r="2.5" /><circle cx="350" cy="60" r="3" /><circle cx="370" cy="60" r="2.5" />
                <circle cx="340" cy="85" r="2.5" /><circle cx="360" cy="80" r="3" /><circle cx="380" cy="80" r="3" /><circle cx="400" cy="85" r="2.5" />
                {/* India Subcontinent */}
                <circle cx="365" cy="115" r="3" /><circle cx="370" cy="125" r="2.5" />
                {/* East Asia & Australia */}
                <circle cx="435" cy="95" r="2.5" /><circle cx="450" cy="105" r="2" />
                <circle cx="430" cy="180" r="2.5" /><circle cx="445" cy="190" r="2.5" />
              </g>

              {/* Connected Curved Flight & Shipping Routes */}
              <path
                d="M 120 75 Q 200 30 290 75 T 370 125"
                stroke="#CBD5E1"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                fill="none"
              />
              <path
                d="M 290 75 Q 340 45 400 85 T 445 190"
                stroke="#CBD5E1"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                fill="none"
              />

              {/* Red Location Pins with Rings */}
              <circle cx="120" cy="75" r="3.5" fill="#e11d2e" />
              <circle cx="120" cy="75" r="6" stroke="#e11d2e" strokeWidth="1" strokeOpacity="0.4" />

              <circle cx="290" cy="75" r="3.5" fill="#e11d2e" />
              <circle cx="290" cy="75" r="6" stroke="#e11d2e" strokeWidth="1" strokeOpacity="0.4" />

              <circle cx="370" cy="125" r="4.5" fill="#e11d2e" />
              <circle cx="370" cy="125" r="8" stroke="#e11d2e" strokeWidth="1.5" strokeOpacity="0.5" />

              <circle cx="400" cy="85" r="3.5" fill="#e11d2e" />
              <circle cx="400" cy="85" r="6" stroke="#e11d2e" strokeWidth="1" strokeOpacity="0.4" />

              <circle cx="445" cy="190" r="3.5" fill="#e11d2e" />
              <circle cx="445" cy="190" r="6" stroke="#e11d2e" strokeWidth="1" strokeOpacity="0.4" />
            </svg>
          </div>

          {/* Cursive Calligraphy Overlay: "Global Movement Local Trust" */}
          <div className="absolute right-6 sm:right-10 top-12 sm:top-14 pointer-events-none select-none z-10 hidden sm:block transform -rotate-6">
            <p className="font-serif italic text-red-600 font-extrabold text-xl sm:text-2xl tracking-normal leading-tight opacity-90 drop-shadow-2xs">
              Global Movement
              <br />
              <span className="ml-5">Local Trust</span>
            </p>
            <svg className="w-28 sm:w-36 h-3 text-red-500 ml-4 mt-0.5" viewBox="0 0 100 12" fill="none">
              <path d="M 2 8 Q 50 1 98 6" stroke="#e11d2e" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* TOP SECTION: WELCOME TO, MSK LOGISTIC SOLUTION, SLOGAN */}
          <div className="relative z-10 flex flex-col items-start">
            <div className="space-y-1 max-w-xl">
              {/* WELCOME TO with red bar */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-slate-900">
                  WELCOME TO
                </span>
                <span className="w-5 h-[2.5px] bg-[#e11d2e] rounded-full inline-block" />
              </div>

              {/* Headline */}
              <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-black tracking-tight uppercase leading-[1.08] text-[#0c1d37]">
                <span className="text-[#e11d2e]">MSK LOGISTIC</span><br className="hidden sm:inline" /> SOLUTION
              </h1>

              {/* Tagline with red bullet separators */}
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 tracking-wide pt-0.5">
                Efficient Logistics <span className="text-[#e11d2e] mx-1">•</span> Accurate Billing <span className="text-[#e11d2e] mx-1">•</span> Trusted Service
              </p>
            </div>
          </div>

          {/* MIDDLE SECTION: 4 COMPACT FEATURE TILES */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 max-w-[560px]">
            {/* Tile 1: Container Management (Red) */}
            <div className="bg-white rounded-xl p-2 sm:p-2.5 shadow-xs border border-slate-200 flex items-center gap-2 hover:border-red-300 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-[#e11d2e] flex items-center justify-center shrink-0 shadow-xs shadow-red-500/30 text-white">
                <Box className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10.5px] font-bold text-slate-900 block leading-tight">
                  Container<br />Management
                </span>
                <div className="w-5 h-[2px] bg-[#e11d2e] mt-1 rounded-full" />
              </div>
            </div>

            {/* Tile 2: Job & Shipments Tracking (Blue) */}
            <div className="bg-white rounded-xl p-2 sm:p-2.5 shadow-xs border border-slate-200 flex items-center gap-2 hover:border-blue-300 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-[#168bff] flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/30 text-white">
                <Truck className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10.5px] font-bold text-slate-900 block leading-tight">
                  Job &<br />Shipments Tracking
                </span>
                <div className="w-5 h-[2px] bg-[#168bff] mt-1 rounded-full" />
              </div>
            </div>

            {/* Tile 3: GST Compliant Invoicing (Green/Teal) */}
            <div className="bg-white rounded-xl p-2 sm:p-2.5 shadow-xs border border-slate-200 flex items-center gap-2 hover:border-emerald-300 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-[#00d6b0] flex items-center justify-center shrink-0 shadow-xs shadow-emerald-500/30 text-white font-bold text-base">
                ₹
              </div>
              <div className="min-w-0">
                <span className="text-[10.5px] font-bold text-slate-900 block leading-tight">
                  GST Compliant<br />Invoicing
                </span>
                <div className="w-5 h-[2px] bg-[#00d6b0] mt-1 rounded-full" />
              </div>
            </div>

            {/* Tile 4: Complete Logistics Solution (Orange) */}
            <div className="bg-white rounded-xl p-2 sm:p-2.5 shadow-xs border border-slate-200 flex items-center gap-2 hover:border-orange-300 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-[#ff941f] flex items-center justify-center shrink-0 shadow-xs shadow-orange-500/30 text-white">
                <BarChart3 className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10.5px] font-bold text-slate-900 block leading-tight">
                  Complete<br />Logistics Solution
                </span>
                <div className="w-5 h-[2px] bg-[#ff941f] mt-1 rounded-full" />
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: CREATE TAX INVOICE BUTTON + WHITE SEARCH FIELD */}
          <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-[540px] pt-1">
            <button
              onClick={onOpenInvoiceWizard}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#e11d2e] hover:bg-red-700 active:scale-95 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:scale-[1.01] shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Create Tax Invoice</span>
            </button>

            <div className="relative flex-1">
              <form onSubmit={handleBannerSearchSubmit}>
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-[#e11d2e] absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={bannerSearch}
                    onChange={(e) => setBannerSearch(e.target.value)}
                    onClick={() => onOpenSearch && onOpenSearch()}
                    placeholder="Search parties, containers, invoices, jobs..."
                    className="w-full rounded-lg bg-white border border-slate-200 pl-9 pr-16 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-2xs transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => onOpenSearch && onOpenSearch()}
                    className="absolute right-1.5 px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-500 text-[10px] font-mono border border-slate-200 font-bold cursor-pointer"
                  >
                    Ctrl + K
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION: SCALE-INDEPENDENT HIGH-DEFINITION LOGISTICS MONTAGE & SLOGAN */}
        <div className="relative w-full lg:w-[48%] xl:w-[50%] shrink-0 flex items-center justify-end overflow-hidden aspect-[1.85/1] lg:aspect-auto self-stretch min-h-[220px] sm:min-h-[260px] lg:min-h-[290px]">
          <img
            src="/images/dashboard-hero-right-hd.png"
            alt="MSK Multimodal Logistics Fleet — Moving Business Forward"
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover object-left-center select-none block"
            style={{
              imageRendering: '-webkit-optimize-contrast',
            }}
          />
        </div>
      </div>

      {/* ========================================================
          2. FOUR KPI SUMMARY CARDS WITH COLORED SPARKLINE WAVES
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL PARTIES */}
        <div
          onClick={() => onNavigateTab('parties')}
          className="bg-white rounded-xl border border-slate-200 p-4 relative overflow-hidden shadow-xs hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                TOTAL PARTIES
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 font-sans tracking-tight my-1">
              {stats?.totalParties ?? 0}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Verified Forwarders & Consignees</p>
          </div>
          {/* Blue Sparkline Wave */}
          <div className="w-full h-6 mt-2">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none" fill="none">
              <path
                d="M 0 35 Q 50 15 100 25 T 200 10 L 200 40 L 0 40 Z"
                fill="url(#blueWaveGrad)"
                opacity="0.3"
              />
              <path
                d="M 0 35 Q 50 15 100 25 T 200 10"
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="200" cy="10" r="3" fill="#3b82f6" />
              <defs>
                <linearGradient id="blueWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Card 2: ACTIVE CONTAINERS */}
        <div
          onClick={() => onNavigateTab('containers')}
          className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-blue-600 p-4 relative overflow-hidden shadow-xs hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                ACTIVE CONTAINERS
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
                <Box className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 font-sans tracking-tight my-1">
              {stats?.totalContainers ?? 0}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">CFS Yard Movements & Drayage</p>
          </div>
          {/* Indigo Sparkline Wave */}
          <div className="w-full h-6 mt-2">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none" fill="none">
              <path
                d="M 0 32 Q 45 10 110 28 T 200 8 L 200 40 L 0 40 Z"
                fill="url(#indigoWaveGrad)"
                opacity="0.3"
              />
              <path
                d="M 0 32 Q 45 10 110 28 T 200 8"
                stroke="#6366f1"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="200" cy="8" r="3" fill="#6366f1" />
              <defs>
                <linearGradient id="indigoWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Card 3: INVOICES THIS MONTH */}
        <div
          onClick={() => onNavigateTab('invoices')}
          className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-red-500 p-4 relative overflow-hidden shadow-xs hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                INVOICES THIS MONTH
              </span>
              <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200/60 flex items-center justify-center text-red-600">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 font-sans tracking-tight my-1">
              {stats?.invoicesThisMonth ?? 0}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {stats?.thisMonthBilling ? `₹${stats.thisMonthBilling.toLocaleString('en-IN')} Invoiced` : '0 Total Invoiced'}
            </p>
          </div>
          {/* Red Sparkline Wave */}
          <div className="w-full h-6 mt-2">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none" fill="none">
              <path
                d="M 0 35 Q 60 20 120 30 T 200 12 L 200 40 L 0 40 Z"
                fill="url(#redWaveGrad)"
                opacity="0.3"
              />
              <path
                d="M 0 35 Q 60 20 120 30 T 200 12"
                stroke="#e11d2e"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="200" cy="12" r="3" fill="#e11d2e" />
              <defs>
                <linearGradient id="redWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e11d2e" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Card 4: OUTSTANDING AMOUNT */}
        <div
          onClick={() => onNavigateTab('payments')}
          className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-amber-500 p-4 relative overflow-hidden shadow-xs hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                OUTSTANDING AMOUNT
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 font-bold text-sm">
                ₹
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 font-sans tracking-tight my-1">
              ₹{(stats?.outstandingAmount || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {stats?.pendingInvoicesCount || 0} Invoices Pending Clearance
            </p>
          </div>
          {/* Amber Sparkline Wave */}
          <div className="w-full h-6 mt-2">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none" fill="none">
              <path
                d="M 0 35 Q 50 18 100 26 T 200 14 L 200 40 L 0 40 Z"
                fill="url(#amberWaveGrad)"
                opacity="0.3"
              />
              <path
                d="M 0 35 Q 50 18 100 26 T 200 14"
                stroke="#f59e0b"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="200" cy="14" r="3" fill="#f59e0b" />
              <defs>
                <linearGradient id="amberWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. TEU OPERATIONS TRACKING PANEL (MATCHING REFERENCE EXACTLY)
          ======================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        {/* Top Header Row with Time Filters & Container Operations Link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shadow-xs">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                TEU OPERATIONS TRACKING
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Twenty-foot Equivalent Unit throughput and container movement analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Day / Week / Month / Year Pills */}
            <div className="bg-slate-100 rounded-lg p-0.5 flex items-center text-xs">
              {(['Day', 'Week', 'Month', 'Year'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTeuTimeframe(t)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    teuTimeframe === t
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Container Operations Link */}
            <button
              onClick={() => onNavigateTab('containers')}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors ml-1 cursor-pointer"
            >
              <span>Container Operations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inner Grid: Left 4 Stat Tiles + Right TEU Movement Trend Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
          {/* LEFT 4 STAT TILES (5 Cols on LG) */}
          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5 items-stretch">
            {/* Tile 1: TODAY'S TEUS */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:bg-slate-50 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                TODAY'S TEUS
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 my-2">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black text-slate-900">{stats?.todayTeus ?? 0}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded">
                    ↑ 0%
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">vs. Yesterday</span>
              </div>
            </div>

            {/* Tile 2: THIS MONTH TEUS */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:bg-slate-50 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                THIS MONTH TEUS
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 my-2">
                <Ship className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black text-slate-900">{stats?.thisMonthTeus ?? 0}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded">
                    ↑ 0%
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Current month volume</span>
              </div>
            </div>

            {/* Tile 3: ACTIVE IN-YARD TEUS */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:bg-slate-50 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                ACTIVE IN-YARD TEUS
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 my-2">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black text-slate-900">{stats?.activeTeus ?? 0}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded">
                    ↑ 0%
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Under active operations</span>
              </div>
            </div>

            {/* Tile 4: TOTAL RECORDED TEUS */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:bg-slate-50 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                TOTAL RECORDED TEUS
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 my-2">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black text-slate-900">{stats?.totalTeus ?? 0}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Lifetime volume</span>
              </div>
            </div>
          </div>

          {/* RIGHT TEU MOVEMENT TREND CHART (6 Cols on LG) */}
          <div className="lg:col-span-6 border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between">
            {/* Chart Header: Title, Legend, Dropdown */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-800">TEU Movement Trend</span>
                <div className="flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#f43f5e] inline-block" />
                    <span>In-Yard</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#3b82f6] inline-block" />
                    <span>Out-Yard</span>
                  </span>
                </div>
              </div>
              <div className="text-xs">
                <span className="px-2 py-0.5 rounded border border-slate-200 text-[10.5px] font-medium text-slate-600 bg-white shadow-2xs">
                  Last 7 Days ▾
                </span>
              </div>
            </div>

            {/* Dual Bar Chart with Y-Axis Gridlines */}
            <div className="relative pt-3 pb-1">
              {/* Y-Axis Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9.5px] text-slate-400 font-mono pr-2">
                <div className="flex items-center w-full">
                  <span className="w-5 text-right mr-1.5">40</span>
                  <div className="flex-1 border-b border-slate-100" />
                </div>
                <div className="flex items-center w-full">
                  <span className="w-5 text-right mr-1.5">30</span>
                  <div className="flex-1 border-b border-slate-100" />
                </div>
                <div className="flex items-center w-full">
                  <span className="w-5 text-right mr-1.5">20</span>
                  <div className="flex-1 border-b border-slate-100" />
                </div>
                <div className="flex items-center w-full">
                  <span className="w-5 text-right mr-1.5">10</span>
                  <div className="flex-1 border-b border-slate-100" />
                </div>
                <div className="flex items-center w-full">
                  <span className="w-5 text-right mr-1.5">0</span>
                  <div className="flex-1 border-b border-slate-200" />
                </div>
              </div>

              {/* Bars Row */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 pl-6 sm:pl-7 h-28 items-end relative z-10">
                {teuTrendDays.map((item, idx) => {
                  const maxVal = 40;
                  const inHeight = Math.round((item.inYard / maxVal) * 100);
                  const outHeight = Math.round((item.outYard / maxVal) * 100);

                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full group min-w-0">
                      <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-24">
                        {/* Red In-Yard Bar */}
                        <div
                          style={{ height: `${inHeight}%` }}
                          className="w-2 sm:w-3 bg-[#f43f5e] hover:bg-rose-600 rounded-t-xs transition-all duration-300"
                          title={`In-Yard: ${item.inYard} TEU`}
                        />
                        {/* Blue Out-Yard Bar */}
                        <div
                          style={{ height: `${outHeight}%` }}
                          className="w-2 sm:w-3 bg-[#3b82f6] hover:bg-blue-600 rounded-t-xs transition-all duration-300"
                          title={`Out-Yard: ${item.outYard} TEU`}
                        />
                      </div>
                      <span className="text-[8.5px] sm:text-[10px] text-slate-500 font-medium mt-1 truncate block text-center w-full">
                        {item.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          4. PRESERVED OPERATIONAL TABLES (RECENT INVOICES & SHIPMENTS)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Recent Invoices Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recent Invoices
              </h2>
              <p className="text-xs text-slate-400">Live tax invoices and settlement status</p>
            </div>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
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
                  <th className="p-3">Party & GSTIN</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!stats?.recentInvoices || stats.recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No invoices created yet. Click "+ Create Invoice" to generate one.
                    </td>
                  </tr>
                ) : (
                  stats.recentInvoices.slice(0, 5).map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-red-600">
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="hover:underline text-left cursor-pointer"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-slate-900 truncate max-w-[170px]">
                          {inv.party?.legalName || inv.billToName}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">{inv.billToGstin}</p>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 font-mono">
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
                          size="sm"
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewInvoice(inv.id)}
                            title="View Invoice"
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadInvoice(inv)}
                            disabled={downloadingId === inv.id}
                            title="Download Official PDF"
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onPrintInvoice(inv)}
                            title="Print Invoice"
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
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

        {/* Recent Shipments & Export Jobs Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recent Shipments & Export Jobs
              </h2>
              <p className="text-xs text-slate-400">Active consignments, shipping bills, and port routes</p>
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
                  <th className="p-3">Party & Exporter</th>
                  <th className="p-3 text-center">Containers</th>
                  <th className="p-3">Port Route</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!stats?.recentJobs || stats.recentJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No jobs created yet. Click "+ Add Job" to register a shipment.
                    </td>
                  </tr>
                ) : (
                  stats.recentJobs.slice(0, 5).map((job: any) => (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {job.jobNumber}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-slate-900 truncate max-w-[170px]">
                          {job.party?.legalName}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[150px]">
                          {job.exporter?.name || 'Direct'}
                        </p>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="blue" size="sm">
                          {job._count?.containers || 0} Containers
                        </Badge>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-slate-800">{job.port || 'JNPT'}</p>
                        <p className="text-[10px] text-slate-400">→ {job.destination || 'Discharge Port'}</p>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={job.status === 'ACTIVE' ? 'green' : 'slate'}
                          size="sm"
                        >
                          {job.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
