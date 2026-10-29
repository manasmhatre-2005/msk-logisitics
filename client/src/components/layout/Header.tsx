import React, { useState } from 'react';
import {
  Search,
  Plus,
  Ship,
  Box,
  Users,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/index';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenGstinModal: () => void;
  onOpenInvoiceWizard: () => void;
  onOpenAddPartyModal: () => void;
  onOpenAddJobModal: () => void;
  onOpenAddContainerModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenGstinModal,
  onOpenInvoiceWizard,
  onOpenAddPartyModal,
  onOpenAddJobModal,
  onOpenAddContainerModal,
}) => {
  const { user, switchDemoRole, logout } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  const roles: { role: UserRole; title: string; color: string }[] = [
    { role: 'ADMIN', title: 'Admin (All Access)', color: 'text-red-700' },
    { role: 'BILLING', title: 'Billing Executive', color: 'text-red-600' },
    { role: 'OPERATIONS', title: 'Operations Executive', color: 'text-amber-600' },
    { role: 'ACCOUNTANT', title: 'Accountant', color: 'text-emerald-600' },
    { role: 'VIEWER', title: 'Viewer (Read Only)', color: 'text-slate-600' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 shrink-0">
      {/* Left: Global Search trigger */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3.5 py-1.5 text-xs text-slate-500 transition-all text-left group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
            <span>Search GSTIN, Party, Invoice, Container, Job, S/Bill...</span>
          </div>
          <kbd className="hidden sm:inline-block bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] text-slate-500 font-mono shadow-2xs">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Action Buttons & Role Switcher */}
      <div className="flex items-center gap-3">
        {/* Quick Action Buttons */}
        <div className="hidden lg:flex items-center gap-1.5 border-r border-slate-200 pr-3">
          <button
            onClick={onOpenGstinModal}
            className="flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors"
            title="GSTIN Lookup & Auto-fill"
          >
            <Search className="w-3.5 h-3.5" />
            <span>GSTIN Lookup</span>
          </button>
          <button
            onClick={onOpenInvoiceWizard}
            className="flex items-center gap-1.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
          <button
            onClick={onOpenAddPartyModal}
            className="flex items-center gap-1 text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Add Party"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Party</span>
          </button>
          <button
            onClick={onOpenAddJobModal}
            className="flex items-center gap-1 text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Add Job"
          >
            <Ship className="w-3.5 h-3.5 text-slate-500" />
            <span>Job</span>
          </button>
          <button
            onClick={onOpenAddContainerModal}
            className="flex items-center gap-1 text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Add Container"
          >
            <Box className="w-3.5 h-3.5 text-slate-500" />
            <span>Container</span>
          </button>
        </div>

        {/* Notifications Control */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-red-600 transition-colors relative"
            title="Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-xs">
              <div className="px-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-900">Operational Alerts</span>
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">2 Live</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                <div className="p-2.5 hover:bg-slate-50 transition-colors flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">GST Portal Sync Online</p>
                    <p className="text-[10px] text-slate-500">Live GSTIN verification active for JNPT port parties.</p>
                  </div>
                </div>
                <div className="p-2.5 hover:bg-slate-50 transition-colors flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">CFS Carting Tracking</p>
                    <p className="text-[10px] text-slate-500">Empty & Loaded ground days calculating automatically.</p>
                  </div>
                </div>
              </div>
              <div className="pt-2 px-3 border-t border-slate-100 text-center">
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                >
                  Close Alerts
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Demo Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-red-600" />
            <div className="text-left hidden sm:block">
              <span className="font-semibold text-slate-800">{user?.role}</span>
              <span className="text-[10px] text-slate-500 block -mt-0.5">Switch Demo Role</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Active Role
                </p>
                <p className="text-xs font-medium text-slate-700 truncate">{user?.email}</p>
              </div>

              {roles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => {
                    switchDemoRole(r.role);
                    setRoleMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    user?.role === r.role ? 'bg-red-50/70 font-semibold text-red-700' : 'text-slate-700'
                  }`}
                >
                  <span>{r.title}</span>
                  {user?.role === r.role && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  )}
                </button>
              ))}

              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    logout();
                    setRoleMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
