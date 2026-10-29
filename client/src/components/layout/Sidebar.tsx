import React from 'react';
import {
  LayoutDashboard,
  Search,
  Users,
  Ship,
  Box,
  BadgePercent,
  FileText,
  CreditCard,
  BarChart3,
  MessageSquare,
  UserCheck,
  Settings,
  ShieldAlert,
  PlusCircle,
  Truck,
  Anchor,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenGstinModal: () => void;
  onOpenInvoiceWizard: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenGstinModal,
  onOpenInvoiceWizard,
}) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'gstin', label: 'GSTIN Lookup', icon: Search, badge: 'Direct' },
    { id: 'parties', label: 'Parties Master', icon: Users },
    { id: 'exporters', label: 'Exporters Master', icon: Truck },
    { id: 'jobs', label: 'Jobs & Shipments', icon: Ship },
    { id: 'containers', label: 'Containers Operations', icon: Box },
    { id: 'charges', label: 'Charges & Rates', icon: BadgePercent },
    { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
    { id: 'payments', label: 'Payment Register', icon: CreditCard },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'whatsapp', label: 'WhatsApp Alerts', icon: MessageSquare },
    { id: 'users', label: 'User Management', icon: UserCheck },
    { id: 'settings', label: 'Company Settings', icon: Settings },
    { id: 'audit', label: 'System Audit Log', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 bg-[#0B1120] text-slate-300 border-r border-slate-800/80 flex flex-col h-screen select-none shrink-0 transition-colors">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-4 border-b border-slate-800/80 bg-[#0F172A]/70 backdrop-blur-xs">
        <div className="flex items-center gap-3 overflow-hidden w-full">
          <div className="bg-white p-1 rounded-lg shrink-0 shadow-sm flex items-center justify-center">
            <img
              src="/images/msk-logo.png"
              alt="MSK LOGISTIC SOLUTION"
              className="h-11 w-auto max-w-[54px] object-contain drop-shadow-xs"
            />
          </div>
          <div className="truncate">
            <span className="font-black text-white text-sm tracking-tight block truncate">
              MSK LOGISTIC
            </span>
            <span className="block text-[10px] text-red-500 font-extrabold uppercase tracking-wider truncate">
              SOLUTION ERP
            </span>
            <span className="inline-flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              ISO 9001:2015
            </span>
          </div>
        </div>
      </div>

      {/* Quick Launch Actions */}
      <div className="p-3 border-b border-slate-800/80 bg-[#0F172A]/40 flex flex-col gap-1.5">
        <button
          onClick={onOpenGstinModal}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-md shadow-red-900/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Search className="w-3.5 h-3.5" />
          <span>GSTIN Auto-Fill</span>
        </button>
        <button
          onClick={onOpenInvoiceWizard}
          className="w-full flex items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-red-500/50 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5 text-red-500" />
          <span>Create Tax Invoice</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-dark-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-red-800 text-white'
                      : 'bg-red-950/80 text-red-400 border border-red-800/40'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Premium Logistics-Themed Visual Element Near Bottom */}
      <div className="px-3 pb-2 pt-1">
        <div className="rounded-xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-3 text-xs shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              <Anchor className="w-3.5 h-3.5 text-red-400" />
              <span>JNPT Port Gateway</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live Yard
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
            Nhava Sheva CFS & Empty Ground Tracking active.
          </p>
        </div>
      </div>

      {/* User Status Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0F172A]/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center text-xs font-bold uppercase shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-red-400 font-medium uppercase tracking-wider truncate">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
