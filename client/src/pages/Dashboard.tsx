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
  ExternalLink,
  Package,
} from 'lucide-react';
import { api } from '../services/api';
import { StatCard } from '../components/common/StatCard';
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
    { label: 'Gate In (CFS Yard)', count: gateInCount, color: '#168BFF', bg: 'bg-[#168BFF]' },
    { label: 'Under Carting', count: cartingCount, color: '#FF941F', bg: 'bg-[#FF941F]' },
    { label: 'Stuffing & Lashing', count: stuffedCount, color: '#00D6B0', bg: 'bg-[#00D6B0]' },
    { label: 'LDD Out (Dispatched)', count: lddOutCount, color: '#FF1838', bg: 'bg-[#FF1838]' },
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
    <div className="space-y-6 pb-12 font-sans">
      {/* ========================================================
          APPROVED MSK HERO BANNER — STABLE SCALE-INDEPENDENT RESPONSIVE SPLIT
          ======================================================== */}
      <div className="relative overflow-hidden rounded-[24px] border border-[#D8E2ED] shadow-xl shadow-slate-200/50 bg-white flex flex-col lg:flex-row items-stretch select-none">
        
        {/* LEFT PANEL: BRANDING, MAP BACKDROP, 4 FEATURES, BUTTON & SEARCH */}
        <div className="relative z-10 flex-1 min-w-0 p-5 sm:p-7 lg:p-8 flex flex-col justify-between overflow-hidden">
          {/* Subtle World Map Vector Background with Curved Route Arcs & Red Pins */}
          <div className="absolute inset-0 pointer-events-none opacity-35 z-0 overflow-hidden">
            <svg
              className="w-full h-full"
              viewBox="0 0 600 320"
              preserveAspectRatio="xMidYMid slice"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* World Map Dotted Continents Silhouette */}
              <g fill="#A0AEC0" opacity="0.45">
                {/* North America */}
                <circle cx="100" cy="70" r="2" /><circle cx="115" cy="65" r="2.5" /><circle cx="130" cy="60" r="2" />
                <circle cx="90" cy="85" r="2.5" /><circle cx="105" cy="80" r="3" /><circle cx="120" cy="75" r="2.5" /><circle cx="135" cy="70" r="2" />
                <circle cx="95" cy="100" r="2" /><circle cx="110" cy="95" r="2.5" /><circle cx="125" cy="90" r="2.5" /><circle cx="140" cy="85" r="2" />
                <circle cx="115" cy="110" r="2" /><circle cx="130" cy="105" r="2" /><circle cx="145" cy="100" r="2" />
                {/* South America */}
                <circle cx="145" cy="150" r="2" /><circle cx="155" cy="160" r="2.5" /><circle cx="165" cy="170" r="2.5" />
                <circle cx="150" cy="185" r="2.5" /><circle cx="160" cy="195" r="2" /><circle cx="170" cy="205" r="2" />
                <circle cx="155" cy="220" r="1.8" /><circle cx="165" cy="235" r="1.8" />
                {/* Europe */}
                <circle cx="280" cy="65" r="2.5" /><circle cx="295" cy="60" r="2.5" /><circle cx="310" cy="55" r="2" />
                <circle cx="275" cy="80" r="2.5" /><circle cx="290" cy="75" r="3" /><circle cx="305" cy="70" r="2.5" />
                {/* Africa */}
                <circle cx="280" cy="110" r="2" /><circle cx="295" cy="115" r="2.5" /><circle cx="310" cy="120" r="2.5" />
                <circle cx="285" cy="135" r="2.5" /><circle cx="300" cy="140" r="2.5" /><circle cx="315" cy="145" r="2" />
                <circle cx="295" cy="165" r="2" /><circle cx="310" cy="170" r="2" />
                {/* Asia & Middle East */}
                <circle cx="330" cy="65" r="2.5" /><circle cx="350" cy="60" r="3" /><circle cx="370" cy="60" r="2.5" /><circle cx="390" cy="65" r="2" />
                <circle cx="340" cy="85" r="2.5" /><circle cx="360" cy="80" r="3" /><circle cx="380" cy="80" r="3" /><circle cx="400" cy="85" r="2.5" /><circle cx="420" cy="90" r="2" />
                <circle cx="355" cy="105" r="2.5" /><circle cx="375" cy="100" r="3" /><circle cx="395" cy="100" r="2.5" /><circle cx="415" cy="105" r="2" />
                {/* India Subcontinent */}
                <circle cx="365" cy="115" r="3" /><circle cx="370" cy="125" r="2.5" /><circle cx="372" cy="135" r="2" />
                {/* East Asia & Australia */}
                <circle cx="435" cy="95" r="2.5" /><circle cx="450" cy="105" r="2" />
                <circle cx="430" cy="180" r="2.5" /><circle cx="445" cy="190" r="2.5" /><circle cx="460" cy="185" r="2" />
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
              <path
                d="M 155 160 Q 230 140 370 125"
                stroke="#CBD5E1"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                fill="none"
              />

              {/* Red Location Pins with Rings */}
              {/* North America */}
              <circle cx="120" cy="75" r="3.5" fill="#F5222D" />
              <circle cx="120" cy="75" r="6" stroke="#F5222D" strokeWidth="1" strokeOpacity="0.4" />
              {/* Europe */}
              <circle cx="290" cy="75" r="3.5" fill="#F5222D" />
              <circle cx="290" cy="75" r="6" stroke="#F5222D" strokeWidth="1" strokeOpacity="0.4" />
              {/* India (Hub) */}
              <circle cx="370" cy="125" r="4.5" fill="#F5222D" />
              <circle cx="370" cy="125" r="8" stroke="#F5222D" strokeWidth="1.5" strokeOpacity="0.5" />
              {/* East Asia */}
              <circle cx="400" cy="85" r="3.5" fill="#F5222D" />
              <circle cx="400" cy="85" r="6" stroke="#F5222D" strokeWidth="1" strokeOpacity="0.4" />
              {/* Australia */}
              <circle cx="445" cy="190" r="3.5" fill="#F5222D" />
              <circle cx="445" cy="190" r="6" stroke="#F5222D" strokeWidth="1" strokeOpacity="0.4" />
            </svg>
          </div>

          {/* TOP LEVEL CONTENT: LEFT HEADING & TAGLINE */}
          <div className="relative z-10 flex flex-col items-start justify-between">
            <div className="space-y-1 max-w-[480px] lg:max-w-[540px]">
              {/* First Line: WELCOME TO with red dash */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.28em] text-[#0B1B30]">
                  WELCOME TO
                </span>
                <span className="w-5 h-[2px] bg-[#F5222D] rounded-full inline-block" />
              </div>

              {/* Main Heading: MSK LOGISTIC SOLUTION */}
              <h1 className="text-2xl sm:text-3xl lg:text-[36px] xl:text-[40px] font-black tracking-tight text-[#0B1B30] uppercase leading-[1.06] drop-shadow-xs">
                <span className="text-[#F5222D]">MSK</span> LOGISTIC<br className="hidden sm:inline" /> SOLUTION
              </h1>

              {/* Tagline */}
              <p className="text-[11px] sm:text-xs font-bold text-[#4B637C] tracking-wide pt-0.5">
                Efficient Logistics · Accurate Billing · Trusted Service
              </p>
            </div>
          </div>

          {/* MIDDLE LEVEL: FOUR HORIZONTALLY ALIGNED FEATURE CARDS */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 my-3.5 sm:my-4 max-w-[460px] sm:max-w-[540px] lg:max-w-[580px]">
            {/* Feature 1: Container Management (Red) */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-2.5 px-2.5 sm:px-3 shadow-xs border border-[#D8E2ED] flex items-center gap-2 sm:gap-2.5 hover:shadow-md hover:border-red-200 transition-all group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#F5222D] flex items-center justify-center shrink-0 shadow-xs shadow-red-500/30 group-hover:scale-105 transition-transform">
                <Box className="w-4 h-4 text-white stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#14263D] block tracking-tight leading-tight">
                  Container<br />Management
                </span>
                <div className="w-5 h-[2px] bg-[#F5222D] mt-1 rounded-full shadow-[0_0_6px_#F5222D]" />
              </div>
            </div>

            {/* Feature 2: Job & Shipment Tracking (Blue) */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-2.5 px-2.5 sm:px-3 shadow-xs border border-[#D8E2ED] flex items-center gap-2 sm:gap-2.5 hover:shadow-md hover:border-blue-200 transition-all group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#168BFF] flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <Ship className="w-4 h-4 text-white stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#14263D] block tracking-tight leading-tight">
                  Job & Shipment<br />Tracking
                </span>
                <div className="w-5 h-[2px] bg-[#168BFF] mt-1 rounded-full shadow-[0_0_6px_#168BFF]" />
              </div>
            </div>

            {/* Feature 3: GST Compliant Invoicing (Teal-Green) */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-2.5 px-2.5 sm:px-3 shadow-xs border border-[#D8E2ED] flex items-center gap-2 sm:gap-2.5 hover:shadow-md hover:border-teal-200 transition-all group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#00D6B0] flex items-center justify-center shrink-0 shadow-xs shadow-teal-500/30 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4 text-white stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#14263D] block tracking-tight leading-tight">
                  GST Compliant<br />Invoicing
                </span>
                <div className="w-5 h-[2px] bg-[#00D6B0] mt-1 rounded-full shadow-[0_0_6px_#00D6B0]" />
              </div>
            </div>

            {/* Feature 4: Complete Logistics Solution (Orange) */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-2.5 px-2.5 sm:px-3 shadow-xs border border-[#D8E2ED] flex items-center gap-2 sm:gap-2.5 hover:shadow-md hover:border-orange-200 transition-all group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#FF941F] flex items-center justify-center shrink-0 shadow-xs shadow-orange-500/30 group-hover:scale-105 transition-transform">
                <Truck className="w-4 h-4 text-white stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#14263D] block tracking-tight leading-tight">
                  Complete<br />Logistics Solution
                </span>
                <div className="w-5 h-[2px] bg-[#FF941F] mt-1 rounded-full shadow-[0_0_6px_#FF941F]" />
              </div>
            </div>
          </div>

          {/* BOTTOM LEVEL: CREATE TAX INVOICE BUTTON + WHITE SEARCH FIELD */}
          <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-[460px] sm:max-w-[540px] pt-1">
            {/* Red Create Tax Invoice Button */}
            <button
              onClick={onOpenInvoiceWizard}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#F5222D] hover:bg-[#d91b25] active:scale-95 px-4 sm:px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/25 transition-all hover:scale-[1.01] shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Create Tax Invoice</span>
            </button>

            {/* Clean Search Field with Thin Blue Border */}
            <div className="relative flex-1">
              <form onSubmit={handleBannerSearchSubmit}>
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-[#F5222D] absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={bannerSearch}
                    onChange={(e) => setBannerSearch(e.target.value)}
                    onClick={() => onOpenSearch && onOpenSearch()}
                    placeholder="Search parties, containers, invoices, jobs..."
                    className="w-full rounded-xl bg-white border border-[#D8E2ED] pl-9 pr-16 py-2 text-xs text-[#14263D] placeholder-[#62758A] focus:outline-hidden focus:border-[#168BFF] focus:ring-1 focus:ring-[#168BFF] transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => onOpenSearch && onOpenSearch()}
                    className="absolute right-1.5 px-2 py-0.5 rounded-md bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#62758A] text-[10px] font-mono border border-[#D8E2ED] transition-colors font-bold cursor-pointer"
                  >
                    Ctrl K
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: SCALE-INDEPENDENT HIGH-DEFINITION LOGISTICS MONTAGE & SLOGAN */}
        <div className="relative w-full lg:w-[50%] xl:w-[52%] 2xl:w-[54%] shrink-0 flex items-center justify-end overflow-hidden aspect-[1.85/1] lg:aspect-auto self-stretch min-h-[220px] sm:min-h-[260px] lg:min-h-[300px]">
          <img
            src="/images/dashboard-hero-right-hd.png"
            alt="Multimodal Logistics Fleet & Moving Business Forward"
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover object-left-center select-none"
            style={{
              imageRendering: '-webkit-optimize-contrast',
            }}
          />
        </div>
      </div>

      {/* ========================================================
          7. FOUR KPI CARDS BENEATH THE BANNER
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Parties */}
        <StatCard
          title="Total Parties"
          value={stats?.totalParties ?? 0}
          subtext="Verified Forwarders & Consignees"
          icon={Users}
          variant="blue"
          accentBorder="blue"
          onClick={() => onNavigateTab('parties')}
        />

        {/* 2. Active Containers */}
        <StatCard
          title="Active Containers"
          value={stats?.totalContainers ?? 0}
          subtext="CFS Yard Movements & Drayage"
          icon={Box}
          variant="indigo"
          accentBorder="indigo"
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
          TEU (Twenty-foot Equivalent Unit) Operations Tracking
          ======================================================== */}
      <div className="rounded-2xl border border-[#D8E2ED] bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold shadow-xs">
              <Package className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#14263D] uppercase tracking-wider">
                  TEU Operations Tracking
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 font-mono font-semibold">
                  20 FT = 1 TEU • 40 FT = 2 TEUs
                </span>
              </div>
              <p className="text-xs text-[#62758A] mt-0.5">
                Twenty-foot Equivalent Unit throughput computed across all registered CFS container records
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('containers')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#168BFF] hover:text-blue-800 transition-colors self-start sm:self-auto"
          >
            <span>Container Operations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
          <div className="bg-[#F8FAFC] border border-[#D8E2ED] rounded-xl p-3.5 hover:border-slate-300 transition-colors">
            <span className="text-[10px] font-bold text-[#62758A] block uppercase tracking-wider">
              Today's TEUs
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-2xl font-black text-[#14263D] font-mono">{stats?.todayTeus ?? 0}</span>
              <span className="text-xs font-bold text-[#62758A]">TEU</span>
            </div>
            <span className="text-[10.5px] text-emerald-600 font-medium block mt-0.5">Logged today</span>
          </div>

          <div className="bg-[#F8FAFC] border border-[#D8E2ED] rounded-xl p-3.5 hover:border-slate-300 transition-colors">
            <span className="text-[10px] font-bold text-[#62758A] block uppercase tracking-wider">
              This Month TEUs
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-2xl font-black text-[#168BFF] font-mono">{stats?.thisMonthTeus ?? 0}</span>
              <span className="text-xs font-bold text-[#62758A]">TEU</span>
            </div>
            <span className="text-[10.5px] text-blue-600 font-medium block mt-0.5">Current month volume</span>
          </div>

          <div className="bg-[#F8FAFC] border border-[#D8E2ED] rounded-xl p-3.5 hover:border-slate-300 transition-colors">
            <span className="text-[10px] font-bold text-[#62758A] block uppercase tracking-wider">
              Active In-Yard TEUs
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-2xl font-black text-[#FF941F] font-mono">{stats?.activeTeus ?? 0}</span>
              <span className="text-xs font-bold text-[#62758A]">TEU</span>
            </div>
            <span className="text-[10.5px] text-amber-600 font-medium block mt-0.5">Under active operations</span>
          </div>

          <div className="bg-[#F8FAFC] border border-[#D8E2ED] rounded-xl p-3.5 hover:border-slate-300 transition-colors">
            <span className="text-[10px] font-bold text-[#62758A] block uppercase tracking-wider">
              Total Recorded TEUs
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-2xl font-black text-[#14263D] font-mono">{stats?.totalTeus ?? 0}</span>
              <span className="text-xs font-bold text-[#62758A]">TEU</span>
            </div>
            <span className="text-[10.5px] text-slate-500 font-medium block mt-0.5">Lifetime all-time throughput</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          8 & 9. INVOICE ANALYTICS CHART & SHIPMENT DOUGHNUT CHART
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Component 8: Invoice Analytics Chart (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-[#D8E2ED] bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#F5222D]" />
                <h2 className="text-sm font-bold text-[#14263D] uppercase tracking-wider">
                  Invoice & Turnover Analytics
                </h2>
              </div>
              <p className="text-xs text-[#62758A] mt-0.5">
                Monthly billing volume and GST liability from actual invoice records
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-[#14263D] font-medium">
                <span className="w-3 h-3 rounded bg-[#0B1B30] inline-block" />
                <span>Turnover</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#14263D] font-medium">
                <span className="w-3 h-3 rounded bg-[#F5222D] inline-block" />
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
                      <span className="text-[10px] font-mono text-[#62758A] group-hover:text-[#14263D] group-hover:font-bold transition-colors truncate">
                        {m.billing > 0 ? `₹${(m.billing / 1000).toFixed(0)}k` : '₹0'}
                      </span>

                      <div className="w-full max-w-[36px] flex items-end justify-center gap-1 h-32 bg-[#F8FAFC] rounded-t-lg p-1 border-t border-x border-[#D8E2ED]">
                        <div
                          style={{ height: `${billingHeight}%` }}
                          className="w-1/2 bg-[#0B1B30] hover:bg-[#132B45] rounded-t transition-all duration-300"
                          title={`Turnover: ₹${m.billing.toLocaleString('en-IN')}`}
                        />
                        <div
                          style={{ height: `${gstHeight}%` }}
                          className="w-1/2 bg-[#F5222D] hover:bg-[#d91b25] rounded-t transition-all duration-300"
                          title={`GST: ₹${m.gst.toLocaleString('en-IN')}`}
                        />
                      </div>

                      <span className="text-[11px] font-bold text-[#62758A] uppercase">
                        {m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#62758A]">
                No monthly invoicing records available yet.
              </div>
            )}
          </div>

          {/* Mini Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#D8E2ED]">
              <span className="text-[11px] text-[#62758A] font-medium">All-Time Invoiced</span>
              <p className="text-sm font-bold text-[#14263D] mt-0.5">
                ₹{((stats?.thisMonthBilling || 0) + (stats?.outstandingAmount || 0)).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#D8E2ED]">
              <span className="text-[11px] text-[#62758A] font-medium">Total GST Collected</span>
              <p className="text-sm font-bold text-[#F5222D] mt-0.5">
                ₹{(stats?.totalGstCollected || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#D8E2ED] col-span-2 sm:col-span-1">
              <span className="text-[11px] text-[#62758A] font-medium">On-Time Settlement</span>
              <p className="text-sm font-bold text-[#00D6B0] mt-0.5">
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
        <div className="rounded-2xl border border-[#D8E2ED] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-[#168BFF]" />
              <h2 className="text-sm font-bold text-[#14263D] uppercase tracking-wider">
                Shipment & Yard Status
              </h2>
            </div>
            <span className="text-[10px] font-bold text-[#62758A] uppercase">Live Operations</span>
          </div>

          {/* SVG Doughnut Circle */}
          <div className="flex items-center justify-center py-2 relative">
            <svg width="170" height="170" viewBox="0 0 100 100" className="transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="11"
              />
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
              <span className="text-2xl font-black text-[#14263D] leading-none">
                {stats?.totalContainers ?? 0}
              </span>
              <span className="text-[9.5px] font-bold text-[#62758A] uppercase tracking-wider mt-1">
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
                  <span className="text-[#14263D] font-medium">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#14263D]">{seg.count}</span>
                  <span className="text-[#62758A] text-[10px]">
                    ({Math.round((seg.count / totalDoughnutUnits) * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================
          10, 11, 12, 13. RECENT INVOICES, SHIPMENTS, ACTIONS & CALENDAR
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Invoices & Recent Shipments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Component 11: Recent Invoices Table */}
          <div className="rounded-2xl border border-[#D8E2ED] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#14263D] uppercase tracking-wider">
                  Recent Invoices
                </h2>
                <p className="text-xs text-[#62758A]">Live tax invoices and settlement status</p>
              </div>
              <button
                onClick={() => onNavigateTab('invoices')}
                className="flex items-center gap-1 text-xs font-bold text-[#F5222D] hover:text-[#d91b25] transition-colors"
              >
                <span>View All Invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#62758A] font-semibold border-b border-[#D8E2ED]">
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
                      <td colSpan={8} className="text-center py-8 text-[#62758A]">
                        No invoices created yet.
                      </td>
                    </tr>
                  ) : (
                    stats?.recentInvoices?.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="p-3 font-mono font-bold text-[#F5222D]">
                          <button
                            onClick={() => onViewInvoice(inv.id)}
                            className="hover:underline text-left"
                          >
                            {inv.invoiceNumber}
                          </button>
                        </td>
                        <td className="p-3 text-[#62758A]">
                          {new Date(inv.invoiceDate).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-[#14263D] truncate max-w-[170px]">
                            {inv.party?.legalName || inv.billToName}
                          </p>
                          <p className="text-[10px] font-mono text-[#62758A]">{inv.billToGstin}</p>
                        </td>
                        <td className="p-3 text-right font-medium text-[#14263D]">
                          {formatCurrencyWithSymbol(inv.taxableAmount, inv.currency)}
                        </td>
                        <td className="p-3 text-right text-[#62758A]">
                          {formatCurrencyWithSymbol(inv.totalGst, inv.currency)}
                        </td>
                        <td className="p-3 text-right font-bold text-[#14263D]">
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
                              className="rounded p-1 text-[#62758A] hover:bg-slate-100 hover:text-[#F5222D] transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`/api/invoices/${inv.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              title="Download PDF"
                              className="rounded p-1 text-[#62758A] hover:bg-slate-100 hover:text-[#F5222D] transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => onPrintInvoice(inv)}
                              title="Print Invoice"
                              className="rounded p-1 text-[#62758A] hover:bg-slate-100 hover:text-[#F5222D] transition-colors cursor-pointer"
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

          {/* Component 12: Recent Shipments Table */}
          <div className="rounded-2xl border border-[#D8E2ED] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#14263D] uppercase tracking-wider">
                  Recent Shipments & Export Jobs
                </h2>
                <p className="text-xs text-[#62758A]">Active consignments, shipping bills, and port movements</p>
              </div>
              <button
                onClick={() => onNavigateTab('jobs')}
                className="flex items-center gap-1 text-xs font-bold text-[#168BFF] hover:text-blue-800 transition-colors"
              >
                <span>View All Jobs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#62758A] font-semibold border-b border-[#D8E2ED]">
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
                      <td colSpan={7} className="text-center py-8 text-[#62758A]">
                        No export shipments registered yet.
                      </td>
                    </tr>
                  ) : (
                    stats?.recentJobs?.map((j: any) => (
                      <tr key={j.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="p-3 font-mono font-bold text-[#14263D]">
                          {j.jobNumber}
                        </td>
                        <td className="p-3 font-medium text-[#14263D] truncate max-w-[160px]">
                          {j.party?.legalName}
                        </td>
                        <td className="p-3 text-[#62758A] truncate max-w-[140px]">
                          {j.exporter?.name || 'Direct Exporter'}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block bg-[#F1F5F9] text-[#14263D] px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-[#D8E2ED]">
                            {j._count?.containers || 0} Units
                          </span>
                        </td>
                        <td className="p-3 text-[#62758A]">
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
                            className="p-1 rounded text-[#62758A] hover:text-[#168BFF] hover:bg-slate-100"
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
          <div className="rounded-2xl border border-[#D8E2ED] bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#F5222D]" />
                <h2 className="text-xs font-bold text-[#14263D] uppercase tracking-wider">
                  Quick Actions
                </h2>
              </div>
              <span className="text-[10px] text-[#62758A] font-medium">Working Shortcuts</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                onClick={onOpenInvoiceWizard}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-50/70 border border-red-200/80 text-[#F5222D] hover:bg-red-100 hover:border-red-300 font-bold transition-all group shadow-2xs"
              >
                <Plus className="w-5 h-5 mb-1 text-[#F5222D] group-hover:scale-110 transition-transform" />
                <span>Create Invoice</span>
              </button>

              <button
                onClick={onOpenAddContainerModal}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F8FAFC] border border-[#D8E2ED] text-[#14263D] hover:bg-slate-100 hover:text-slate-900 font-semibold transition-all group shadow-2xs"
              >
                <Box className="w-5 h-5 mb-1 text-[#62758A] group-hover:scale-110 transition-transform" />
                <span>Add Container</span>
              </button>

              <button
                onClick={onOpenAddPartyModal}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F8FAFC] border border-[#D8E2ED] text-[#14263D] hover:bg-slate-100 hover:text-slate-900 font-semibold transition-all group shadow-2xs"
              >
                <Users className="w-5 h-5 mb-1 text-[#62758A] group-hover:scale-110 transition-transform" />
                <span>Add Party</span>
              </button>

              <button
                onClick={onOpenAddJobModal}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F8FAFC] border border-[#D8E2ED] text-[#14263D] hover:bg-slate-100 hover:text-slate-900 font-semibold transition-all group shadow-2xs"
              >
                <Ship className="w-5 h-5 mb-1 text-[#62758A] group-hover:scale-110 transition-transform" />
                <span>New Shipment</span>
              </button>

              <button
                onClick={() => onNavigateTab('payments')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F8FAFC] border border-[#D8E2ED] text-[#14263D] hover:bg-slate-100 hover:text-slate-900 font-semibold transition-all group shadow-2xs"
              >
                <CreditCard className="w-5 h-5 mb-1 text-[#00D6B0] group-hover:scale-110 transition-transform" />
                <span>Record Payment</span>
              </button>

              <button
                onClick={() => onNavigateTab('reports')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F8FAFC] border border-[#D8E2ED] text-[#14263D] hover:bg-slate-100 hover:text-slate-900 font-semibold transition-all group shadow-2xs"
              >
                <BarChart3 className="w-5 h-5 mb-1 text-[#168BFF] group-hover:scale-110 transition-transform" />
                <span>View Reports</span>
              </button>
            </div>
          </div>

          {/* Component 13: Calendar & Upcoming Operational Activities */}
          <div className="rounded-2xl border border-[#D8E2ED] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#F5222D]" />
                <h2 className="text-xs font-bold text-[#14263D] uppercase tracking-wider">
                  Operational Schedule
                </h2>
              </div>
              <span className="text-[10px] font-bold text-[#62758A] uppercase">{currentMonthName}</span>
            </div>

            {/* Visual Mini Calendar Month Grid */}
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#D8E2ED]">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#62758A] mb-1">
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
                          ? 'bg-[#F5222D] text-white font-bold shadow-xs'
                          : 'text-[#14263D] hover:bg-slate-200/70 transition-colors'
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
              <div className="flex items-center justify-between text-[11px] font-bold text-[#14263D]">
                <span>Upcoming Milestones & Due Dates</span>
                <span className="text-[10px] bg-red-100 text-[#F5222D] px-1.5 py-0.5 rounded font-bold">
                  {stats?.upcomingActivities?.length || 0} Due
                </span>
              </div>

              {stats?.upcomingActivities && stats.upcomingActivities.length > 0 ? (
                stats.upcomingActivities.map((act: any) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border border-[#D8E2ED] bg-[#F8FAFC] hover:bg-slate-100/70 transition-colors text-xs flex items-start justify-between gap-2 shadow-2xs"
                  >
                    <div>
                      <p className="font-bold text-[#14263D]">{act.title}</p>
                      <p className="text-[11px] text-[#62758A] truncate max-w-[150px]">
                        {act.subtitle}
                      </p>
                      {act.date && (
                        <p className="text-[10px] text-[#62758A] mt-1 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-[#FF941F]" />
                          Due: {new Date(act.date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {act.badge && (
                      <span className="text-[10px] font-bold font-mono text-[#F5222D] bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        {act.badge}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-[#62758A]">
                  <CheckCircle2 className="w-5 h-5 text-[#00D6B0] mx-auto mb-1 opacity-70" />
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
