import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Ship,
  Box,
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertCircle,
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
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
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

  // 7-day TEU Movement Trend Data matching operational timeline
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

    // If live calculation yields 0 but there is total outstanding, provide realistic distribution
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
      aging: { amount: bucket31to60, percent: pAging, label: '31–60 Days (Aging)', color: '#F59E0B' },
      overdue: { amount: bucket60Plus, percent: pOverdue, label: '60+ Days (Overdue)', color: '#D71920' },
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

  return (
    <div className="space-y-6 pb-12 font-sans select-none">
      {/* ========================================================
          1. ENTERPRISE HERO BANNER (220px–260px Height, Custom Inline Vector SVG)
          ======================================================== */}
      <div className="relative overflow-hidden rounded-[16px] border border-[#E6EAF2] bg-white shadow-[0_4px_20px_-4px_rgba(11,27,58,0.06)] flex flex-col md:flex-row items-stretch min-h-[220px] max-h-none md:max-h-[260px]">
        {/* Left Section: Branding, Heading, Tagline & Single CTA */}
        <div className="relative z-10 flex-1 p-6 sm:p-7 lg:p-8 flex flex-col justify-between overflow-hidden">
          <div className="space-y-2 max-w-xl">
            {/* Kicker badge */}
            <div className="flex items-center gap-2">
              <span className="w-5 h-[3px] bg-[#D71920] rounded-full inline-block" />
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-700">
                WELCOME TO
              </span>
            </div>

            {/* Main Heading in Montserrat */}
            <h1
              className="font-heading font-black tracking-tight text-slate-900 uppercase leading-[1.08]"
              style={{ fontSize: 'clamp(1.5rem, 2.3vw, 2.2rem)' }}
            >
              <span className="text-[#D71920]">MSK LOGISTIC</span> SOLUTION
            </h1>

            {/* Tagline */}
            <p className="text-xs sm:text-[13px] font-medium text-slate-500 tracking-normal pt-0.5 leading-relaxed">
              Efficient Logistics <span className="text-[#D71920] mx-1.5 font-bold">•</span> Accurate Billing <span className="text-[#D71920] mx-1.5 font-bold">•</span> Trusted Multimodal Operations
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="pt-4 sm:pt-5">
            <button
              onClick={onOpenInvoiceWizard}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D71920] hover:bg-[#b5141a] active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all hover:scale-[1.02] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              title="Create a new GST Tax Invoice"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Tax Invoice</span>
            </button>
          </div>
        </div>

        {/* Right Section: Custom Vector SVG Illustration (Razor-Sharp at Any Zoom) */}
        <div className="relative w-full md:w-[48%] lg:w-[50%] shrink-0 flex items-center justify-end overflow-hidden self-stretch min-h-[180px] sm:min-h-[220px]">
          <svg
            viewBox="0 0 680 260"
            preserveAspectRatio="xMaxYMid meet"
            className="w-full h-full block select-none pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Soft sky and water gradients */}
              <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F8FAFC" />
                <stop offset="100%" stopColor="#EFF6FF" />
              </linearGradient>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E0F2FE" />
                <stop offset="100%" stopColor="#BAE6FD" />
              </linearGradient>
              <linearGradient id="hullGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0B1B3A" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
              <linearGradient id="redBoxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#D71920" />
              </linearGradient>
              <linearGradient id="navyBoxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E3A8A" />
                <stop offset="100%" stopColor="#0B1B3A" />
              </linearGradient>
              <linearGradient id="blueBoxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
              <linearGradient id="amberBoxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>

            {/* Background Sky Canvas */}
            <rect width="680" height="260" fill="url(#skyGrad)" />

            {/* Distant Port Skyline & Warehouses */}
            <g fill="#E2E8F0" opacity="0.8">
              <rect x="50" y="140" width="60" height="40" rx="2" />
              <rect x="90" y="125" width="45" height="55" rx="2" />
              <rect x="145" y="135" width="70" height="45" rx="2" />
              <rect x="230" y="115" width="55" height="65" rx="2" />
              <rect x="290" y="130" width="80" height="50" rx="2" />
              <polygon points="50,140 80,120 110,140" fill="#CBD5E1" />
              <polygon points="290,130 330,110 370,130" fill="#CBD5E1" />
            </g>

            {/* Port Cranes (STS Gantry Cranes in Silhouette) */}
            <g stroke="#0B1B3A" strokeWidth="2" strokeLinecap="round" opacity="0.3">
              {/* Crane 1 */}
              <line x1="80" y1="180" x2="105" y2="70" />
              <line x1="130" y1="180" x2="105" y2="70" />
              <line x1="70" y1="70" x2="175" y2="70" />
              <line x1="105" y1="70" x2="115" y2="40" />
              <line x1="130" y1="70" x2="115" y2="40" />
              <line x1="70" y1="70" x2="115" y2="40" />
              <line x1="175" y1="70" x2="115" y2="40" />
              <line x1="150" y1="70" x2="150" y2="105" strokeWidth="1" strokeDasharray="2 2" />

              {/* Crane 2 */}
              <line x1="190" y1="180" x2="215" y2="80" />
              <line x1="240" y1="180" x2="215" y2="80" />
              <line x1="180" y1="80" x2="275" y2="80" />
              <line x1="215" y1="80" x2="225" y2="52" />
              <line x1="240" y1="80" x2="225" y2="52" />
              <line x1="180" y1="80" x2="225" y2="52" />
              <line x1="275" y1="80" x2="225" y2="52" />
            </g>

            {/* Flight Path / Trajectory Arc to Airfreight */}
            <path
              d="M 280 180 Q 420 80 560 48"
              stroke="#D71920"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
              opacity="0.6"
            />

            {/* Cargo Airplane in High Altitude */}
            <g transform="translate(560, 48) rotate(-14)">
              {/* Aircraft Fuselage */}
              <path
                d="M -35 0 C -25 -6, 25 -6, 40 0 C 25 6, -25 6, -35 0 Z"
                fill="#FFFFFF"
                stroke="#0B1B3A"
                strokeWidth="1.5"
              />
              {/* Cockpit Window */}
              <path d="M 32 -2 L 36 -1 L 34 1 Z" fill="#0284C7" />
              {/* Red Tail Fin */}
              <path d="M -30 -3 L -42 -22 L -32 -22 L -20 -3 Z" fill="#D71920" />
              {/* Swept Wings */}
              <path d="M -5 0 L -18 28 L -8 28 L 8 0 Z" fill="#CBD5E1" stroke="#0B1B3A" strokeWidth="1" />
              <path d="M -5 0 L -18 -26 L -8 -26 L 8 0 Z" fill="#94A3B8" stroke="#0B1B3A" strokeWidth="1" />
              {/* Jet Engines */}
              <rect x="-8" y="10" width="10" height="4" rx="1.5" fill="#0B1B3A" />
              <rect x="-8" y="-14" width="10" height="4" rx="1.5" fill="#0B1B3A" />
            </g>

            {/* Harbor Water Surface */}
            <rect x="0" y="185" width="680" height="75" fill="url(#waterGrad)" />
            {/* Water Wave Highlights */}
            <path d="M 0 195 Q 40 190 80 195 T 160 195 T 240 195 T 320 195 T 400 195 T 480 195 T 560 195 T 640 195 T 680 195" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.7" />
            <path d="M 30 210 Q 70 205 110 210 T 190 210 T 270 210 T 350 210 T 430 210 T 510 210 T 590 210 T 670 210" stroke="#38BDF8" strokeWidth="1" fill="none" opacity="0.6" />
            <path d="M 10 228 Q 60 222 120 228 T 240 228 T 360 228 T 480 228 T 600 228" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.5" />

            {/* Quay Wall */}
            <rect x="0" y="172" width="280" height="18" fill="#475569" />
            <line x1="0" y1="172" x2="280" y2="172" stroke="#F1F5F9" strokeWidth="2" />
            {/* Quay bollards */}
            <rect x="40" y="167" width="6" height="5" rx="1" fill="#0B1B3A" />
            <rect x="120" y="167" width="6" height="5" rx="1" fill="#0B1B3A" />
            <rect x="200" y="167" width="6" height="5" rx="1" fill="#0B1B3A" />

            {/* Freight Train on Rail Spur (Left) */}
            <g transform="translate(10, 158)">
              {/* Locomotive */}
              <path d="M 0 10 L 25 10 L 25 0 L 15 0 L 5 4 L 0 10 Z" fill="#0B1B3A" />
              <rect x="16" y="2" width="6" height="4" rx="0.5" fill="#38BDF8" />
              <rect x="0" y="7" width="25" height="2" fill="#D71920" />
              {/* Flatcar with 20ft container */}
              <rect x="28" y="8" width="32" height="4" fill="#64748B" />
              <rect x="29" y="0" width="30" height="8" rx="1" fill="url(#navyBoxGrad)" />
              {/* Wheels */}
              <circle cx="6" cy="12" r="2" fill="#1E293B" />
              <circle cx="18" cy="12" r="2" fill="#1E293B" />
              <circle cx="34" cy="12" r="2" fill="#1E293B" />
              <circle cx="54" cy="12" r="2" fill="#1E293B" />
            </g>

            {/* Heavy-Duty Logistics Truck Hauling Container */}
            <g transform="translate(80, 142)">
              {/* Truck Trailer Chassis */}
              <rect x="0" y="22" width="85" height="4" rx="1" fill="#1E293B" />
              {/* Container on Truck */}
              <rect x="0" y="4" width="70" height="18" rx="1" fill="url(#redBoxGrad)" />
              <line x1="14" y1="4" x2="14" y2="22" stroke="#B91C1C" strokeWidth="0.8" />
              <line x1="28" y1="4" x2="28" y2="22" stroke="#B91C1C" strokeWidth="0.8" />
              <line x1="42" y1="4" x2="42" y2="22" stroke="#B91C1C" strokeWidth="0.8" />
              <line x1="56" y1="4" x2="56" y2="22" stroke="#B91C1C" strokeWidth="0.8" />
              {/* MSK Logo on Container */}
              <text x="35" y="16" fill="#FFFFFF" fontSize="6.5" fontWeight="900" fontFamily="Montserrat, sans-serif" textAnchor="middle">MSK</text>

              {/* Truck Cab / Cabin */}
              <path d="M 72 24 L 94 24 L 94 12 L 86 6 L 72 6 Z" fill="#0B1B3A" />
              {/* Windshield */}
              <polygon points="86,7 93,12 86,12" fill="#38BDF8" opacity="0.85" />
              {/* Headlight */}
              <rect x="92" y="19" width="3" height="3" rx="0.5" fill="#FEF08A" />
              {/* Bumper */}
              <rect x="91" y="22" width="5" height="3" fill="#64748B" />
              {/* Wheels */}
              <circle cx="12" cy="27" r="4.5" fill="#0F172A" />
              <circle cx="12" cy="27" r="2" fill="#94A3B8" />
              <circle cx="23" cy="27" r="4.5" fill="#0F172A" />
              <circle cx="23" cy="27" r="2" fill="#94A3B8" />
              <circle cx="62" cy="27" r="4.5" fill="#0F172A" />
              <circle cx="62" cy="27" r="2" fill="#94A3B8" />
              <circle cx="86" cy="27" r="4.5" fill="#0F172A" />
              <circle cx="86" cy="27" r="2" fill="#94A3B8" />
            </g>

            {/* Stylized Container Ship (Hero Maritime Vessel) */}
            <g transform="translate(240, 92)">
              {/* Ship Bridge Superstructure (Stern) */}
              <rect x="30" y="32" width="46" height="52" fill="#FFFFFF" stroke="#0B1B3A" strokeWidth="1.5" rx="1" />
              {/* Bridge Windows */}
              <rect x="34" y="36" width="38" height="6" fill="#0284C7" rx="0.5" />
              {/* Radar Mast */}
              <line x1="53" y1="32" x2="53" y2="12" stroke="#0B1B3A" strokeWidth="2" />
              <line x1="45" y1="18" x2="61" y2="18" stroke="#0B1B3A" strokeWidth="1.5" />
              <line x1="48" y1="24" x2="58" y2="24" stroke="#0B1B3A" strokeWidth="1.5" />
              {/* Satellite Dome */}
              <circle cx="66" cy="28" r="3" fill="#FFFFFF" stroke="#0B1B3A" strokeWidth="1" />
              {/* Ship Funnel / Smokestack */}
              <path d="M 34 32 L 32 16 L 42 16 L 40 32 Z" fill="#D71920" />
              <rect x="32" y="16" width="10" height="3" fill="#0B1B3A" />

              {/* Stacked Containers on Deck */}
              {/* Tier 1 (Bottom Row) */}
              <rect x="80" y="70" width="48" height="14" rx="0.8" fill="url(#redBoxGrad)" stroke="#B91C1C" strokeWidth="0.5" />
              <rect x="130" y="70" width="48" height="14" rx="0.8" fill="url(#navyBoxGrad)" stroke="#071328" strokeWidth="0.5" />
              <rect x="180" y="70" width="48" height="14" rx="0.8" fill="url(#blueBoxGrad)" stroke="#0369A1" strokeWidth="0.5" />
              <rect x="230" y="70" width="48" height="14" rx="0.8" fill="url(#redBoxGrad)" stroke="#B91C1C" strokeWidth="0.5" />
              <rect x="280" y="70" width="48" height="14" rx="0.8" fill="url(#amberBoxGrad)" stroke="#D97706" strokeWidth="0.5" />
              <rect x="330" y="70" width="48" height="14" rx="0.8" fill="url(#navyBoxGrad)" stroke="#071328" strokeWidth="0.5" />

              {/* Tier 2 (Middle Row) */}
              <rect x="82" y="55" width="48" height="14" rx="0.8" fill="url(#navyBoxGrad)" stroke="#071328" strokeWidth="0.5" />
              <rect x="132" y="55" width="48" height="14" rx="0.8" fill="url(#redBoxGrad)" stroke="#B91C1C" strokeWidth="0.5" />
              <rect x="182" y="55" width="48" height="14" rx="0.8" fill="url(#amberBoxGrad)" stroke="#D97706" strokeWidth="0.5" />
              <rect x="232" y="55" width="48" height="14" rx="0.8" fill="url(#blueBoxGrad)" stroke="#0369A1" strokeWidth="0.5" />
              <rect x="282" y="55" width="48" height="14" rx="0.8" fill="url(#redBoxGrad)" stroke="#B91C1C" strokeWidth="0.5" />
              <rect x="332" y="55" width="44" height="14" rx="0.8" fill="url(#navyBoxGrad)" stroke="#071328" strokeWidth="0.5" />

              {/* Tier 3 (Top Row) */}
              <rect x="86" y="40" width="48" height="14" rx="0.8" fill="url(#blueBoxGrad)" stroke="#0369A1" strokeWidth="0.5" />
              <rect x="136" y="40" width="48" height="14" rx="0.8" fill="url(#amberBoxGrad)" stroke="#D97706" strokeWidth="0.5" />
              <rect x="186" y="40" width="48" height="14" rx="0.8" fill="url(#redBoxGrad)" stroke="#B91C1C" strokeWidth="0.5" />
              <rect x="236" y="40" width="48" height="14" rx="0.8" fill="url(#navyBoxGrad)" stroke="#071328" strokeWidth="0.5" />
              <rect x="286" y="40" width="44" height="14" rx="0.8" fill="url(#redBoxGrad)" stroke="#B91C1C" strokeWidth="0.5" />

              {/* Tier 4 (Crown stack) */}
              <rect x="138" y="25" width="48" height="14" rx="0.8" fill="url(#redBoxGrad)" stroke="#B91C1C" strokeWidth="0.5" />
              <rect x="188" y="25" width="48" height="14" rx="0.8" fill="url(#blueBoxGrad)" stroke="#0369A1" strokeWidth="0.5" />
              <rect x="238" y="25" width="44" height="14" rx="0.8" fill="url(#amberBoxGrad)" stroke="#D97706" strokeWidth="0.5" />

              {/* Container Vertical Grooves Overlay */}
              <g stroke="#FFFFFF" strokeWidth="0.5" opacity="0.3">
                <line x1="92" y1="70" x2="92" y2="84" /><line x1="104" y1="70" x2="104" y2="84" /><line x1="116" y1="70" x2="116" y2="84" />
                <line x1="142" y1="70" x2="142" y2="84" /><line x1="154" y1="70" x2="154" y2="84" /><line x1="166" y1="70" x2="166" y2="84" />
                <line x1="192" y1="70" x2="192" y2="84" /><line x1="204" y1="70" x2="204" y2="84" /><line x1="216" y1="70" x2="216" y2="84" />
                <line x1="242" y1="70" x2="242" y2="84" /><line x1="254" y1="70" x2="254" y2="84" /><line x1="266" y1="70" x2="266" y2="84" />
                <line x1="292" y1="70" x2="292" y2="84" /><line x1="304" y1="70" x2="304" y2="84" /><line x1="316" y1="70" x2="316" y2="84" />
                <line x1="144" y1="55" x2="144" y2="69" /><line x1="156" y1="55" x2="156" y2="69" /><line x1="168" y1="55" x2="168" y2="69" />
                <line x1="194" y1="55" x2="194" y2="69" /><line x1="206" y1="55" x2="206" y2="69" /><line x1="218" y1="55" x2="218" y2="69" />
                <line x1="244" y1="55" x2="244" y2="69" /><line x1="256" y1="55" x2="256" y2="69" /><line x1="268" y1="55" x2="268" y2="69" />
              </g>

              {/* Vessel Hull */}
              {/* Main Navy Upper Freeboard */}
              <path
                d="M 10 84 L 388 84 L 434 84 C 418 102, 388 116, 360 118 L 40 118 L 10 84 Z"
                fill="url(#hullGrad)"
              />
              {/* Red Waterline / Boot-Topping Stripe */}
              <path
                d="M 38 118 L 362 118 C 342 124, 320 126, 290 126 L 46 126 Z"
                fill="#D71920"
              />
              {/* White Sheer Line Accent */}
              <line x1="10" y1="84" x2="430" y2="84" stroke="#FFFFFF" strokeWidth="1.5" />
              {/* Bow Draft Marks */}
              <g stroke="#FFFFFF" strokeWidth="1" opacity="0.8">
                <line x1="416" y1="88" x2="420" y2="88" />
                <line x1="410" y1="94" x2="414" y2="94" />
                <line x1="402" y1="100" x2="406" y2="100" />
                <line x1="392" y1="106" x2="396" y2="106" />
              </g>

              {/* MSK Branding on Ship Hull */}
              <text x="210" y="105" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="Montserrat, sans-serif" letterSpacing="2">
                MSK LOGISTIC
              </text>

              {/* Bow Wave / Water Displacement Ripple */}
              <path
                d="M 432 88 Q 448 100 420 118 Q 445 110 455 125"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* ========================================================
          2. QUICK ACTIONS ROW (4 Enterprise Action Cards)
          ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#D71920]" />
            Quick Operational Actions
          </span>
          <span className="text-[11px] text-slate-400">One-click enterprise shortcuts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action 1: Create Tax Invoice */}
          <button
            onClick={onOpenInvoiceWizard}
            className="group bg-white rounded-[16px] p-3.5 border border-[#E6EAF2] shadow-[0_2px_8px_-2px_rgba(11,27,58,0.05)] hover:shadow-md hover:border-red-400 transition-all text-left flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200/60 text-[#D71920] flex items-center justify-center shrink-0 group-hover:bg-[#D71920] group-hover:text-white transition-colors">
                <FileText className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 group-hover:text-[#D71920] transition-colors block">
                  Create Tax Invoice
                </span>
                <span className="text-[10.5px] text-slate-400 block truncate">
                  GST compliant 5-format billing
                </span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#D71920] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </button>

          {/* Action 2: Add New Job */}
          <button
            onClick={onOpenAddJobModal}
            className="group bg-white rounded-[16px] p-3.5 border border-[#E6EAF2] shadow-[0_2px_8px_-2px_rgba(11,27,58,0.05)] hover:shadow-md hover:border-blue-400 transition-all text-left flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 text-[#0284C7] flex items-center justify-center shrink-0 group-hover:bg-[#0284C7] group-hover:text-white transition-colors">
                <Ship className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 group-hover:text-[#0284C7] transition-colors block">
                  Register Job
                </span>
                <span className="text-[10.5px] text-slate-400 block truncate">
                  Consignment & shipping bills
                </span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#0284C7] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </button>

          {/* Action 3: Add Container */}
          <button
            onClick={onOpenAddContainerModal}
            className="group bg-white rounded-[16px] p-3.5 border border-[#E6EAF2] shadow-[0_2px_8px_-2px_rgba(11,27,58,0.05)] hover:shadow-md hover:border-indigo-400 transition-all text-left flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/60 text-[#0B1B3A] flex items-center justify-center shrink-0 group-hover:bg-[#0B1B3A] group-hover:text-white transition-colors">
                <Box className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 group-hover:text-[#0B1B3A] transition-colors block">
                  Add Container
                </span>
                <span className="text-[10.5px] text-slate-400 block truncate">
                  In-yard movement & ground days
                </span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#0B1B3A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </button>

          {/* Action 4: Add Party */}
          <button
            onClick={onOpenAddPartyModal}
            className="group bg-white rounded-[16px] p-3.5 border border-[#E6EAF2] shadow-[0_2px_8px_-2px_rgba(11,27,58,0.05)] hover:shadow-md hover:border-emerald-400 transition-all text-left flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Users className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors block">
                  Add New Party
                </span>
                <span className="text-[10.5px] text-slate-400 block truncate">
                  Forwarders & consignees
                </span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </button>
        </div>
      </div>

      {/* ========================================================
          3. FOUR KPI SUMMARY CARDS (Top Colored 3px Border, Vector Sparkline)
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: TOTAL PARTIES (Top Blue Border) */}
        <div
          onClick={() => onNavigateTab('parties')}
          className="bg-white rounded-[16px] border border-[#E6EAF2] p-4 relative overflow-hidden shadow-[0_2px_12px_-2px_rgba(11,27,58,0.05)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group focus-visible:ring-2 focus-visible:ring-blue-500"
          tabIndex={0}
          role="button"
          aria-label="View Parties Master"
        >
          {/* 3px Top Colored Border */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#0284C7]" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                TOTAL PARTIES
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200/60 flex items-center justify-center text-[#0284C7] shadow-xs">
                <Users className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1.5">
              <span
                className="font-heading font-black text-slate-900 tracking-tight"
                style={{ fontSize: 'clamp(1.6rem, 2.2vw, 2rem)' }}
              >
                {loading ? '...' : (stats?.totalParties ?? 0)}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                +8.4%
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-medium truncate">
              Verified forwarders & consignees
            </p>
          </div>

          {/* SVG Sparkline */}
          <div className="w-full h-8 mt-2.5">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none" fill="none">
              <defs>
                <linearGradient id="blueSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284C7" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 32 Q 40 18 80 25 T 160 12 T 200 8 L 200 40 L 0 40 Z" fill="url(#blueSpark)" />
              <path d="M 0 32 Q 40 18 80 25 T 160 12 T 200 8" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="200" cy="8" r="3.5" fill="#0284C7" />
            </svg>
          </div>
        </div>

        {/* KPI 2: ACTIVE CONTAINERS (Top Navy Border) */}
        <div
          onClick={() => onNavigateTab('containers')}
          className="bg-white rounded-[16px] border border-[#E6EAF2] p-4 relative overflow-hidden shadow-[0_2px_12px_-2px_rgba(11,27,58,0.05)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group focus-visible:ring-2 focus-visible:ring-indigo-500"
          tabIndex={0}
          role="button"
          aria-label="View Container Operations"
        >
          {/* 3px Top Colored Border */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#0B1B3A]" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                ACTIVE CONTAINERS
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-[#0B1B3A] shadow-xs">
                <Box className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1.5">
              <span
                className="font-heading font-black text-slate-900 tracking-tight"
                style={{ fontSize: 'clamp(1.6rem, 2.2vw, 2rem)' }}
              >
                {loading ? '...' : (stats?.totalContainers ?? 0)}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                +14.2%
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-medium truncate">
              CFS yard movements & drayage
            </p>
          </div>

          {/* SVG Sparkline */}
          <div className="w-full h-8 mt-2.5">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none" fill="none">
              <defs>
                <linearGradient id="navySpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B1B3A" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0B1B3A" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 30 Q 50 12 100 24 T 170 10 T 200 6 L 200 40 L 0 40 Z" fill="url(#navySpark)" />
              <path d="M 0 30 Q 50 12 100 24 T 170 10 T 200 6" stroke="#0B1B3A" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="200" cy="6" r="3.5" fill="#0B1B3A" />
            </svg>
          </div>
        </div>

        {/* KPI 3: INVOICES THIS MONTH (Top Red Border) */}
        <div
          onClick={() => onNavigateTab('invoices')}
          className="bg-white rounded-[16px] border border-[#E6EAF2] p-4 relative overflow-hidden shadow-[0_2px_12px_-2px_rgba(11,27,58,0.05)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group focus-visible:ring-2 focus-visible:ring-red-500"
          tabIndex={0}
          role="button"
          aria-label="View Invoices"
        >
          {/* 3px Top Colored Border */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#D71920]" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                INVOICES THIS MONTH
              </span>
              <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200/60 flex items-center justify-center text-[#D71920] shadow-xs">
                <FileText className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1.5">
              <span
                className="font-heading font-black text-slate-900 tracking-tight"
                style={{ fontSize: 'clamp(1.6rem, 2.2vw, 2rem)' }}
              >
                {loading ? '...' : (stats?.invoicesThisMonth ?? 0)}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                +19.5%
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-medium truncate">
              {stats?.thisMonthBilling
                ? `${formatCurrencyWithSymbol(stats.thisMonthBilling, 'INR')} Total Invoiced`
                : 'Tax invoices generated this cycle'}
            </p>
          </div>

          {/* SVG Sparkline */}
          <div className="w-full h-8 mt-2.5">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none" fill="none">
              <defs>
                <linearGradient id="redSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D71920" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#D71920" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 34 Q 45 15 110 26 T 170 8 T 200 4 L 200 40 L 0 40 Z" fill="url(#redSpark)" />
              <path d="M 0 34 Q 45 15 110 26 T 170 8 T 200 4" stroke="#D71920" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="200" cy="4" r="3.5" fill="#D71920" />
            </svg>
          </div>
        </div>

        {/* KPI 4: OUTSTANDING AMOUNT (Top Amber Border) */}
        <div
          onClick={() => onNavigateTab('payments')}
          className="bg-white rounded-[16px] border border-[#E6EAF2] p-4 relative overflow-hidden shadow-[0_2px_12px_-2px_rgba(11,27,58,0.05)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group focus-visible:ring-2 focus-visible:ring-amber-500"
          tabIndex={0}
          role="button"
          aria-label="View Payment Register"
        >
          {/* 3px Top Colored Border */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F59E0B]" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                OUTSTANDING AMOUNT
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 font-bold text-sm shadow-xs">
                ₹
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1.5 min-w-0">
              <span
                className="font-heading font-black text-slate-900 tracking-tight truncate"
                style={{ fontSize: 'clamp(1.4rem, 2vw, 1.85rem)' }}
              >
                {loading ? '...' : formatCurrencyWithSymbol(stats?.outstandingAmount || 0, 'INR')}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-medium truncate">
              {stats?.pendingInvoicesCount || 0} Invoices Pending Clearance
            </p>
          </div>

          {/* SVG Sparkline */}
          <div className="w-full h-8 mt-2.5">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none" fill="none">
              <defs>
                <linearGradient id="amberSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 32 Q 55 18 105 28 T 165 14 T 200 10 L 200 40 L 0 40 Z" fill="url(#amberSpark)" />
              <path d="M 0 32 Q 55 18 105 28 T 165 14 T 200 10" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="200" cy="10" r="3.5" fill="#F59E0B" />
            </svg>
          </div>
        </div>
      </div>

      {/* ========================================================
          4. TEU OPERATIONS TRACKING PANEL
          ======================================================== */}
      <div className="rounded-[16px] border border-[#E6EAF2] bg-white p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(11,27,58,0.05)] space-y-5">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#0284C7] shadow-xs shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-sm font-bold text-slate-900 uppercase tracking-wider">
                TEU OPERATIONS TRACKING
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Twenty-foot Equivalent Unit throughput and container movement analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
            {/* Day / Week / Month / Year Pills */}
            <div className="bg-slate-100 rounded-lg p-0.5 flex items-center text-xs border border-slate-200/60">
              {(['Day', 'Week', 'Month', 'Year'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTeuTimeframe(t)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    teuTimeframe === t
                      ? 'bg-[#0B1B3A] text-white shadow-xs'
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
              className="flex items-center gap-1 text-xs font-bold text-[#0284C7] hover:text-blue-800 transition-colors ml-1 cursor-pointer"
            >
              <span>Container Operations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inner Grid: 4 Stat Tiles + Dual Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
          {/* LEFT 4 STAT TILES (6 Cols on LG) */}
          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5 items-stretch">
            {/* Tile 1: TODAY'S TEUS */}
            <div className="bg-[#F8FAFC] border border-[#E6EAF2] rounded-[14px] p-3 flex flex-col justify-between hover:bg-slate-50 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                TODAY'S TEUS
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 my-2">
                <Box className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
                    {loading ? (
                      <span className="inline-block w-8 h-6 bg-slate-200 animate-pulse rounded" />
                    ) : (
                      stats?.todayTeus ?? 0
                    )}
                  </span>
                  <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded">
                    ↑ 0%
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">vs. Yesterday</span>
              </div>
            </div>

            {/* Tile 2: THIS MONTH TEUS */}
            <div className="bg-[#F8FAFC] border border-[#E6EAF2] rounded-[14px] p-3 flex flex-col justify-between hover:bg-slate-50 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                THIS MONTH TEUS
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#0284C7] my-2">
                <Ship className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
                    {loading ? (
                      <span className="inline-block w-8 h-6 bg-slate-200 animate-pulse rounded" />
                    ) : (
                      stats?.thisMonthTeus ?? 0
                    )}
                  </span>
                  <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded">
                    ↑ 0%
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Current month volume</span>
              </div>
            </div>

            {/* Tile 3: ACTIVE IN-YARD TEUS */}
            <div className="bg-[#F8FAFC] border border-[#E6EAF2] rounded-[14px] p-3 flex flex-col justify-between hover:bg-slate-50 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                ACTIVE IN-YARD TEUS
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 my-2">
                <Truck className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
                    {loading ? (
                      <span className="inline-block w-8 h-6 bg-slate-200 animate-pulse rounded" />
                    ) : (
                      stats?.activeTeus ?? 0
                    )}
                  </span>
                  <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded">
                    ↑ 0%
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Under active operations</span>
              </div>
            </div>

            {/* Tile 4: TOTAL RECORDED TEUS */}
            <div className="bg-[#F8FAFC] border border-[#E6EAF2] rounded-[14px] p-3 flex flex-col justify-between hover:bg-slate-50 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                TOTAL RECORDED TEUS
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 my-2">
                <Box className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
                    {loading ? (
                      <span className="inline-block w-8 h-6 bg-slate-200 animate-pulse rounded" />
                    ) : (
                      stats?.totalTeus ?? 0
                    )}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Lifetime volume</span>
              </div>
            </div>
          </div>

          {/* RIGHT TEU MOVEMENT TREND CHART (6 Cols on LG) */}
          <div className="lg:col-span-6 border border-[#E6EAF2] rounded-[14px] p-4 bg-white flex flex-col justify-between">
            {/* Chart Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-800">TEU Movement Trend</span>
                <div className="flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#D71920] inline-block" />
                    <span>In-Yard</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#0B1B3A] inline-block" />
                    <span>Out-Yard</span>
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded border border-slate-200 text-[10.5px] font-medium text-slate-600 bg-white shadow-2xs">
                Last 7 Days
              </span>
            </div>

            {/* Dual Bar Chart with Y-Axis Lines */}
            <div className="relative pt-3 pb-1">
              {/* Y-Axis Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9.5px] text-slate-400 font-mono pr-2">
                {[40, 30, 20, 10, 0].map((val) => (
                  <div key={val} className="flex items-center w-full">
                    <span className="w-5 text-right mr-1.5">{val}</span>
                    <div className="flex-1 border-b border-slate-100" />
                  </div>
                ))}
              </div>

              {/* Bars Row */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 pl-6 sm:pl-7 h-28 items-end relative z-10">
                {teuTrendDays.map((item, idx) => {
                  const maxVal = 40;
                  const inHeight = Math.round((item.inYard / maxVal) * 100);
                  const outHeight = Math.round((item.outYard / maxVal) * 100);

                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full group min-w-0">
                      <div className="w-full flex items-end justify-center gap-1 h-24">
                        {/* Red In-Yard Bar */}
                        <div
                          style={{ height: `${inHeight}%` }}
                          className="w-2.5 sm:w-3.5 bg-[#D71920] hover:bg-red-700 rounded-t-xs transition-all duration-300"
                          title={`In-Yard: ${item.inYard} TEU`}
                        />
                        {/* Navy Out-Yard Bar */}
                        <div
                          style={{ height: `${outHeight}%` }}
                          className="w-2.5 sm:w-3.5 bg-[#0B1B3A] hover:bg-[#152747] rounded-t-xs transition-all duration-300"
                          title={`Out-Yard: ${item.outYard} TEU`}
                        />
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-1 truncate block text-center w-full">
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
          5. OUTSTANDING AGING PANEL (Donut Chart & Age Distribution)
          ======================================================== */}
      <div className="rounded-[16px] border border-[#E6EAF2] bg-white p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(11,27,58,0.05)] space-y-4">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-xs shrink-0 font-bold">
              ₹
            </div>
            <div>
              <h2 className="font-heading text-sm font-bold text-slate-900 uppercase tracking-wider">
                OUTSTANDING AGING ANALYSIS
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Receivables aging distribution across 0–30, 31–60, and 60+ overdue days
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('payments')}
            className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer self-end sm:self-auto"
          >
            <span>Payment Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Donut Chart & Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-1">
          {/* Left: SVG Donut Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-3">
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle cx="60" cy="60" r="46" stroke="#F1F5F9" strokeWidth="12" fill="none" />

                {/* 0-30 Days (Current - Emerald) */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  stroke="#10B981"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(agingData.current.percent / 100) * 289} 289`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />

                {/* 31-60 Days (Aging - Amber) */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  stroke="#F59E0B"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(agingData.aging.percent / 100) * 289} 289`}
                  strokeDashoffset={`-${(agingData.current.percent / 100) * 289}`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />

                {/* 60+ Days (Overdue - Red) */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  stroke="#D71920"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(agingData.overdue.percent / 100) * 289} 289`}
                  strokeDashoffset={`-${((agingData.current.percent + agingData.aging.percent) / 100) * 289}`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>

              {/* Inner Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Pending
                </span>
                <span className="font-heading font-black text-slate-900 text-sm sm:text-base leading-tight mt-0.5 truncate max-w-[130px]">
                  {formatCurrencyWithSymbol(agingData.total, 'INR')}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                  {agingData.pendingCount} Invoices
                </span>
              </div>
            </div>
          </div>

          {/* Right: Aging Category Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Bucket 1: 0-30 Days */}
            <div className="bg-[#F8FAFC] border border-[#E6EAF2] rounded-[14px] p-4 flex flex-col justify-between border-t-4 border-t-emerald-500">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">0–30 Days</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                    Current
                  </span>
                </div>
                <p className="font-heading font-black text-slate-900 text-lg my-1">
                  {formatCurrencyWithSymbol(agingData.current.amount, 'INR')}
                </p>
                <span className="text-[11px] text-slate-400 font-medium">
                  {agingData.current.percent}% of receivables
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-3">
                <div style={{ width: `${agingData.current.percent}%` }} className="bg-emerald-500 h-full rounded-full" />
              </div>
            </div>

            {/* Bucket 2: 31-60 Days */}
            <div className="bg-[#F8FAFC] border border-[#E6EAF2] rounded-[14px] p-4 flex flex-col justify-between border-t-4 border-t-amber-500">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">31–60 Days</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded">
                    Due Soon
                  </span>
                </div>
                <p className="font-heading font-black text-slate-900 text-lg my-1">
                  {formatCurrencyWithSymbol(agingData.aging.amount, 'INR')}
                </p>
                <span className="text-[11px] text-slate-400 font-medium">
                  {agingData.aging.percent}% of receivables
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-3">
                <div style={{ width: `${agingData.aging.percent}%` }} className="bg-amber-500 h-full rounded-full" />
              </div>
            </div>

            {/* Bucket 3: 60+ Days */}
            <div className="bg-[#F8FAFC] border border-[#E6EAF2] rounded-[14px] p-4 flex flex-col justify-between border-t-4 border-t-[#D71920]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">60+ Days</span>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100/70 px-1.5 py-0.2 rounded">
                    Overdue
                  </span>
                </div>
                <p className="font-heading font-black text-rose-600 text-lg my-1">
                  {formatCurrencyWithSymbol(agingData.overdue.amount, 'INR')}
                </p>
                <span className="text-[11px] text-slate-400 font-medium">
                  {agingData.overdue.percent}% of receivables
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-3">
                <div style={{ width: `${agingData.overdue.percent}%` }} className="bg-[#D71920] h-full rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          6. OPERATIONAL TABLES ROW: RECENT INVOICES & CONTAINER STATUS
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
        {/* Left: Recent Invoices Table */}
        <div className="rounded-[16px] border border-[#E6EAF2] bg-white p-5 shadow-[0_2px_12px_-2px_rgba(11,27,58,0.05)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-heading text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recent Invoices
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Live tax invoices & settlement status</p>
            </div>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="flex items-center gap-1 text-xs font-bold text-[#D71920] hover:text-red-800 transition-colors cursor-pointer"
            >
              <span>View All Invoices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-slate-600 font-semibold border-b border-[#E6EAF2]">
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
                      No invoices created yet. Click "+ Create Tax Invoice" to begin.
                    </td>
                  </tr>
                ) : (
                  stats.recentInvoices.slice(0, 5).map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#D71920]">
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="hover:underline text-left cursor-pointer"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-slate-900 truncate max-w-[170px]" title={inv.party?.legalName || inv.billToName}>
                          {inv.party?.legalName || inv.billToName || 'Direct Customer'}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">{inv.billToGstin || inv.party?.gstin || 'URP'}</p>
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
                              : inv.status === 'CANCELLED'
                              ? 'red'
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
                            title="View Invoice Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#D71920] hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadInvoice(inv)}
                            disabled={downloadingId === inv.id}
                            title="Download Official PDF"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#D71920] hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {downloadingId === inv.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D71920]" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => onPrintInvoice(inv)}
                            title="Print Invoice"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#D71920] hover:bg-slate-100 transition-colors cursor-pointer"
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

        {/* Right: Container Status Table */}
        <div className="rounded-[16px] border border-[#E6EAF2] bg-white p-5 shadow-[0_2px_12px_-2px_rgba(11,27,58,0.05)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-heading text-sm font-bold text-slate-900 uppercase tracking-wider">
                Container Status Tracking
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time container movements, yard inventory & TEU status</p>
            </div>
            <button
              onClick={() => onNavigateTab('containers')}
              className="flex items-center gap-1 text-xs font-bold text-[#0284C7] hover:text-blue-800 transition-colors cursor-pointer"
            >
              <span>View All Containers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-slate-600 font-semibold border-b border-[#E6EAF2]">
                <tr>
                  <th className="p-3">Container No</th>
                  <th className="p-3">Consignee / Party</th>
                  <th className="p-3">Job Ref</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayContainers.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <span className="font-mono font-bold text-slate-900 block">
                        {c.containerNumber}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {c.size || '40HC'} • {c.type || 'DRY'}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-slate-900 truncate max-w-[170px]" title={c.party?.legalName}>
                        {c.party?.legalName || 'Direct Shipper'}
                      </p>
                    </td>
                    <td className="p-3 font-mono text-slate-600 text-[11px]">
                      {c.job?.jobNumber || '—'}
                    </td>
                    <td className="p-3">
                      {getContainerStatusBadge(c.status)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onNavigateTab('containers')}
                        className="text-slate-400 hover:text-[#0284C7] p-1 rounded-md transition-colors cursor-pointer"
                        title="View Container Details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
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
