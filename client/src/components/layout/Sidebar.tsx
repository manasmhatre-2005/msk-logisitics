import React from 'react';
import {
  LayoutDashboard,
  Users,
  Ship,
  Box,
  BadgePercent,
  FileText,
  CreditCard,
  UserCheck,
  Settings,
  PlusCircle,
  Truck,
  BarChart3,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenInvoiceWizard: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenInvoiceWizard,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Role-specific navigation items
  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'parties', label: 'Parties Master', icon: Users },
    { id: 'exporters', label: 'Exporters Master', icon: Truck },
    { id: 'jobs', label: 'Jobs & Shipments', icon: Ship },
    { id: 'containers', label: 'Containers Operations', icon: Box },
    { id: 'charges', label: 'Charges & Rates', icon: BadgePercent },
    { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
    { id: 'payments', label: 'Payment Register', icon: CreditCard },
    { id: 'users', label: 'User Management', icon: UserCheck },
    { id: 'settings', label: 'Company Settings', icon: Settings },
  ];

  const accountManagerNavItems = [
    { id: 'dashboard', label: 'Accounts Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
    { id: 'payments', label: 'Payment Register', icon: CreditCard },
    { id: 'parties', label: 'Parties Master', icon: Users },
    { id: 'exporters', label: 'Exporters Master', icon: Truck },
    { id: 'charges', label: 'Charges & Rates', icon: BadgePercent },
    { id: 'reports', label: 'Financial Reports & TDS', icon: BarChart3 },
  ];

  const navItems = isAdmin ? adminNavItems : accountManagerNavItems;

  return (
    <aside
      className="w-[270px] relative text-white border-r border-[#28658D]/50 flex flex-col h-screen select-none shrink-0 transition-all duration-150 overflow-hidden"
      style={{
        background: isAdmin
          ? 'linear-gradient(180deg, #10243B 0%, #153B5B 38%, #1D5278 75%, #28658D 100%)'
          : 'linear-gradient(180deg, #0B192C 0%, #132B4F 38%, #1B3C68 75%, #244E85 100%)',
      }}
    >
      {/* Subtle atmospheric blue and red smoky illumination effects */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 85% 15%, rgba(67, 136, 180, 0.32) 0%, transparent 55%),
            radial-gradient(circle at 15% 45%, rgba(67, 136, 180, 0.28) 0%, transparent 60%),
            radial-gradient(circle at 80% 70%, rgba(40, 101, 141, 0.45) 0%, transparent 55%),
            radial-gradient(circle at 20% 88%, rgba(245, 34, 53, 0.22) 0%, transparent 55%),
            radial-gradient(circle at 75% 95%, rgba(67, 136, 180, 0.40) 0%, transparent 60%)
          `,
        }}
      />

      {/* Atmospheric glowing blue & red fluid wave ribbon near the bottom */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full h-48 pointer-events-none z-0 opacity-40"
        viewBox="0 0 270 190"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,70 C60,120 140,50 270,100 L270,190 L0,190 Z"
          fill="url(#blueSmokeGrad)"
        />
        <path
          d="M0,110 C80,75 160,135 270,105 L270,190 L0,190 Z"
          fill="url(#redSmokeGrad)"
          opacity="0.9"
        />
        <path
          d="M0,140 C90,110 180,160 270,135 L270,190 L0,190 Z"
          fill="url(#lightBlueSmokeGrad)"
          opacity="0.6"
        />
        <defs>
          <linearGradient id="blueSmokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4388B4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1D5278" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="redSmokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F52235" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#4388B4" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="lightBlueSmokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4388B4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#28658D" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      {/* Brand Header — Official MSK Logistic Solution Logo */}
      <div className="relative z-10 p-3.5 border-b border-[#28658D]/40 bg-[#10243B]/75 backdrop-blur-md flex flex-col justify-center">
        <div className="bg-white rounded-xl p-1.5 shadow-md border border-white/20 flex items-center justify-center overflow-hidden h-[86px]">
          <img
            src="/images/msk-logo.png"
            alt="MSK LOGISTIC SOLUTION - Beyond logistics we Deliver Trust"
            className="w-full h-full object-contain block"
          />
        </div>
        {/* Company Information — Stacked, Centered, Bold Pure White */}
        <div className="flex flex-col items-center justify-center text-center pt-2.5 pb-0.5 space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest bg-red-600/30 text-red-200 border border-red-500/40">
                <ShieldCheck className="w-3 h-3 text-red-400" />
                ADMIN PORTAL
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest bg-blue-500/30 text-blue-200 border border-blue-400/40">
                <Landmark className="w-3 h-3 text-blue-300" />
                ACCOUNTS PORTAL
              </span>
            )}
          </div>
          <div className="inline-flex items-center justify-center gap-2 text-white font-bold text-[11px] tracking-wider">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>ISO 9001:2015</span>
          </div>
        </div>
      </div>

      {/* Quick Launch Action */}
      <div className="relative z-10 p-3.5 border-b border-[#28658D]/35 bg-[#153B5B]/40 backdrop-blur-xs flex flex-col">
        <button
          onClick={onOpenInvoiceWizard}
          className="w-full flex items-center justify-center gap-2 bg-[#F52235] hover:bg-[#d91b25] text-white text-[12.5px] font-bold py-2.5 px-3 rounded-xl shadow-md shadow-red-950/40 border border-red-400/30 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-white stroke-[2.5]" />
          <span>+ Create Tax Invoice</span>
        </button>
      </div>

      {/* Navigation List — Visible smoky blue contrast, rounded-xl items, white text */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 custom-dark-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#F52235] text-white font-bold shadow-lg shadow-red-950/50 border border-red-400/30'
                  : 'text-white hover:text-white hover:bg-[#28658D]/65 border border-transparent hover:border-[#4388B4]/50'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-[#8EC5E8] group-hover:text-white'
                  }`}
                />
                <span className={`truncate tracking-normal text-left ${isActive ? 'font-bold text-white' : 'font-semibold text-white group-hover:text-white'}`}>
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Status Footer */}
      <div className="relative z-10 p-3.5 border-t border-[#28658D]/40 bg-[#10243B]/90 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={`w-9 h-9 rounded-full ${isAdmin ? 'bg-[#F52235]/20 border-[#F52235]/50' : 'bg-blue-500/20 border-blue-400/50'} text-white border flex items-center justify-center text-xs font-bold uppercase shrink-0 shadow-xs`}>
              {user?.name?.charAt(0) || (isAdmin ? 'A' : 'M')}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <p className="text-[12.5px] font-bold text-white truncate">{user?.name || user?.email}</p>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-2xs" title="Online" />
              </div>
              <p className={`text-[10px] ${isAdmin ? 'text-[#F52235]' : 'text-blue-300'} font-extrabold uppercase tracking-wider truncate`}>
                {user?.role === 'ACCOUNT_MANAGER' ? 'Account Manager' : user?.role}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
