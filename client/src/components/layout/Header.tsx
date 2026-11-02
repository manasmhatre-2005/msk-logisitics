import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Ship,
  Box,
  Users,
  FileText,
  LogOut,
  Bell,
  CheckCircle2,
  Clock,
  ChevronDown,
  Loader2,
  ShieldCheck,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/index';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenInvoiceWizard: () => void;
  onOpenAddPartyModal: () => void;
  onOpenAddJobModal: () => void;
  onOpenAddContainerModal: () => void;
  onSignOut?: () => Promise<void> | void;
  onToggleMobileNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenInvoiceWizard,
  onOpenAddPartyModal,
  onOpenAddJobModal,
  onOpenAddContainerModal,
  onSignOut,
  onToggleMobileNav,
}) => {
  const { user, switchDemoRole, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };

    if (profileMenuOpen || notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen, notificationsOpen]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      setProfileMenuOpen(false);
      if (onSignOut) {
        await onSignOut();
      } else {
        await logout();
      }
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  const roles: { role: UserRole; title: string; color: string }[] = [
    { role: 'ADMIN', title: 'Admin (All Access)', color: 'text-red-700' },
    { role: 'ACCOUNT_MANAGER', title: 'Account Manager (Finance & Bills)', color: 'text-blue-700' },
    { role: 'BILLING', title: 'Billing Executive', color: 'text-red-600' },
    { role: 'OPERATIONS', title: 'Operations Executive', color: 'text-amber-600' },
    { role: 'DATA_ENTRY', title: 'Data Entry Operator', color: 'text-purple-600' },
  ];

  const roleDisplay = user?.role === 'ACCOUNT_MANAGER' ? 'ACCOUNT' : (user?.role || 'ADMIN');
  const userInitials = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between z-20 shrink-0 select-none shadow-2xs">
      {/* Left: Mobile Hamburger Menu Button & Global Search trigger */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-xl min-w-0 mr-2 sm:mr-3">
        {/* Professional Hamburger Menu Toggle Button (Mobile/Tablet < 1024px) */}
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl text-slate-700 hover:text-red-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer border border-slate-200 shadow-2xs"
          aria-label="Open Navigation Menu"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search trigger with responsive placeholder */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 sm:px-3.5 py-2 text-xs text-slate-500 transition-all text-left shadow-2xs group min-w-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors shrink-0" />
            <span className="font-normal text-slate-600 truncate text-[11px] sm:text-xs">
              <span className="inline md:hidden">Search ERP...</span>
              <span className="hidden md:inline">Search GSTIN, Party, Invoice, Container, Job, Shipping Line...</span>
            </span>
          </div>
          <kbd className="hidden sm:inline-block bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-500 font-mono shadow-2xs font-bold shrink-0 ml-1.5">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Action Buttons, Notifications & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* + Create Invoice Primary Button */}
        <button
          onClick={onOpenInvoiceWizard}
          className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold bg-[#e11d2e] text-white hover:bg-red-700 px-2.5 sm:px-4 py-2 rounded-lg shadow-xs shadow-red-500/20 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer shrink-0 min-h-[38px]"
          title="Create New Invoice"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span className="hidden sm:inline">+ Create Invoice</span>
          <span className="sm:hidden font-bold">Invoice</span>
        </button>

        {/* Quick Action Pill Buttons (Party, Job, Container) */}
        <div className="hidden lg:flex items-center gap-2 border-r border-slate-200 pr-3">
          <button
            onClick={onOpenAddPartyModal}
            className="flex items-center gap-1.5 text-xs font-semibold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-all shadow-2xs"
            title="Add Party"
          >
            <Users className="w-3.5 h-3.5 text-slate-600" />
            <span>Party</span>
          </button>
          <button
            onClick={onOpenAddJobModal}
            className="flex items-center gap-1.5 text-xs font-semibold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-all shadow-2xs"
            title="Add Job"
          >
            <Ship className="w-3.5 h-3.5 text-slate-600" />
            <span>Job</span>
          </button>
          <button
            onClick={onOpenAddContainerModal}
            className="flex items-center gap-1.5 text-xs font-semibold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-all shadow-2xs"
            title="Add Container"
          >
            <Box className="w-3.5 h-3.5 text-slate-600" />
            <span>Container</span>
          </button>
        </div>

        {/* Notification Bell Control */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-red-600 transition-colors relative shadow-2xs"
            title="Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#e11d2e] ring-2 ring-white"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-xs">
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

        {/* User Profile matching reference: Rose circle avatar 'A', bold 'ADMIN', 'MSK System Administrator' */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#b85b6b] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
              {userInitials}
            </div>
            <div className="hidden sm:block leading-tight">
              <span className="font-black text-xs text-slate-900 tracking-tight block uppercase">
                {roleDisplay}
              </span>
              <span className="text-[10.5px] text-slate-500 font-medium block truncate max-w-[140px]">
                {user?.name || 'MSK System Administrator'}
              </span>
            </div>
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-xs">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="font-bold text-slate-900">{user?.name || 'MSK System Administrator'}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 uppercase">
                  {user?.role}
                </span>
              </div>

              {/* Demo Role Switcher (Development & Testing) */}
              <div className="px-3.5 py-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Switch Active Role
                </span>
                <div className="space-y-1">
                  {roles.map((r) => (
                    <button
                      key={r.role}
                      onClick={async () => {
                        await switchDemoRole(r.role);
                        setProfileMenuOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        user?.role === r.role ? 'font-bold bg-slate-100' : 'text-slate-700'
                      }`}
                    >
                      <span className={r.color}>{r.title}</span>
                      {user?.role === r.role && <span className="text-emerald-600 font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign Out Option */}
              <div className="pt-1 px-1">
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-bold transition-colors cursor-pointer"
                >
                  {isSigningOut ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                  <span>Sign Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
