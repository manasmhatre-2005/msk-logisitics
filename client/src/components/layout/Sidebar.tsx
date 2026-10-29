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
  Bot,
  UserCheck,
  Settings,
  ShieldAlert,
  PlusCircle,
  Truck,
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
    {
      id: 'parties',
      label: 'Parties Master',
      icon: Users,
    },
    { id: 'exporters', label: 'Exporters', icon: Truck },
    { id: 'jobs', label: 'Jobs / Shipments', icon: Ship },
    { id: 'containers', label: 'Containers', icon: Box },
    { id: 'charges', label: 'Charges & Rates', icon: BadgePercent },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: FileText,
    },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'whatsapp', label: 'WhatsApp Cloud', icon: MessageSquare },
    { id: 'users', label: 'Users & Roles', icon: UserCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'audit', label: 'Audit Log', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src="/images/msk-logo.png"
            alt="MSK LOGISTIC SOLUTION"
            className="h-12 w-auto max-w-[58px] object-contain shrink-0 drop-shadow-xs"
          />
          <div className="truncate">
            <span className="font-black text-slate-900 text-sm tracking-tight block truncate">MSK LOGISTIC</span>
            <span className="block text-[10px] text-red-600 font-extrabold uppercase tracking-wider truncate">
              SOLUTION ERP
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              ISO 9001:2015
            </span>
          </div>
        </div>
      </div>

      {/* Quick Launch Actions */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/60 flex flex-col gap-1.5">
        <button
          onClick={onOpenGstinModal}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-sm transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          <span>GSTIN Lookup</span>
        </button>
        <button
          onClick={onOpenInvoiceWizard}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium py-1.5 px-3 rounded-lg transition-all hover:border-red-300"
        >
          <PlusCircle className="w-3.5 h-3.5 text-red-600" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-red-50 text-red-700 font-semibold border-l-4 border-red-600 rounded-l-none'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-red-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Status Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider truncate">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
