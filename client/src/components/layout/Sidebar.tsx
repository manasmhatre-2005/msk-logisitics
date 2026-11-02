import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Ship,
  Box,
  BadgePercent,
  FileText,
  CreditCard,
  Settings,
  Truck,
  ShieldCheck,
  Landmark,
  ChevronRight,
  Home,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenInvoiceWizard: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpen = false,
  onClose,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Support Escape key to close navigation drawer on mobile/tablet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Exact 10 Navigation Items matching the reference design for Admin
  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'parties', label: 'Parties Master', icon: Users },
    { id: 'exporters', label: 'Exporters Master', icon: Truck },
    { id: 'jobs', label: 'Jobs & Shipments', icon: Ship },
    { id: 'containers', label: 'Containers Operations', icon: Box },
    { id: 'charges', label: 'Charges & Rates', icon: BadgePercent },
    { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
    { id: 'payments', label: 'Payment Register', icon: CreditCard },
    { id: 'settings', label: 'Company Settings', icon: Settings },
  ];

  const accountManagerNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'parties', label: 'Parties Master', icon: Users },
    { id: 'exporters', label: 'Exporters Master', icon: Truck },
    { id: 'jobs', label: 'Jobs & Shipments', icon: Ship },
    { id: 'containers', label: 'Containers Operations', icon: Box },
    { id: 'charges', label: 'Charges & Rates', icon: BadgePercent },
    { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
    { id: 'payments', label: 'Payment Register', icon: CreditCard },
  ];

  const navItems = isAdmin ? adminNavItems : accountManagerNavItems;

  return (
    <>
      {/* Mobile/Tablet Backdrop Overlay with Outside Tap to Close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer: Fixed & Slide-In on Mobile/Tablet (< 1024px), Static Expanded on Desktop (>= 1024px) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[270px] max-w-[85vw] bg-[#071328] text-white border-r border-[#15233c] flex flex-col h-screen select-none shrink-0 transition-transform duration-300 ease-in-out overflow-hidden shadow-2xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Sidebar Navigation"
      >
        {/* Mobile Close Button (X) */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
          aria-label="Close navigation menu"
          title="Close Navigation"
        >
          <X className="w-5 h-5" />
        </button>
      {/* Background Port Cranes & Shipping Vessel Silhouette at Bottom Left */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full h-56 pointer-events-none z-0 opacity-25"
        viewBox="0 0 270 200"
        fill="none"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <path
          d="M 0 160 L 40 160 L 60 140 L 120 140 L 140 160 L 270 160 L 270 200 L 0 200 Z"
          fill="#1e3a63"
        />
        {/* Vessel Hull */}
        <path
          d="M 10 165 L 140 165 L 120 195 L 30 195 Z"
          fill="#172e4f"
        />
        {/* Port Gantry Crane 1 */}
        <g stroke="#264b7c" strokeWidth="2" strokeLinecap="round">
          <line x1="20" y1="160" x2="45" y2="80" />
          <line x1="60" y1="160" x2="45" y2="80" />
          <line x1="10" y1="80" x2="90" y2="80" />
          <line x1="30" y1="80" x2="45" y2="50" />
          <line x1="60" y1="80" x2="45" y2="50" />
          <line x1="10" y1="80" x2="45" y2="50" />
          <line x1="90" y1="80" x2="45" y2="50" />
        </g>
        {/* Port Gantry Crane 2 */}
        <g stroke="#1d3b63" strokeWidth="1.5" strokeLinecap="round">
          <line x1="80" y1="160" x2="105" y2="90" />
          <line x1="120" y1="160" x2="105" y2="90" />
          <line x1="70" y1="90" x2="150" y2="90" />
          <line x1="90" y1="90" x2="105" y2="65" />
          <line x1="120" y1="90" x2="105" y2="65" />
        </g>
      </svg>

      {/* Brand Header — Official MSK Logistic Solution Logo in White Rounded Rectangle */}
      <div className="relative z-10 p-3.5 pb-2">
        <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-white/20 flex items-center justify-center overflow-hidden h-[86px]">
          <img
            src="/images/msk-logo.png"
            alt="MSK LOGISTIC SOLUTION - Beyond logistics We Deliver Trust"
            className="w-full h-full object-contain block"
          />
        </div>

        {/* Status Pills: [ ADMIN PORTAL ] & ● ISO 9001:2015 */}
        <div className="flex flex-col items-center justify-center text-center pt-2.5 space-y-1.5">
          <div className="flex items-center justify-center">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-[#260e19] text-[#f87171] border border-red-900/40 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                <span>ADMIN PORTAL</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-blue-950/70 text-blue-300 border border-blue-800/40 shadow-xs">
                <Landmark className="w-3.5 h-3.5 text-blue-400" />
                <span>ACCOUNTS PORTAL</span>
              </span>
            )}
          </div>
          <div className="inline-flex items-center justify-center gap-2 text-white font-bold text-[11px] tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_#34d399]" />
            <span>ISO 9001:2015</span>
          </div>
        </div>
      </div>

      {/* Navigation List — Exactly matches reference with active red highlight and right chevrons */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-dark-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                if (onClose) onClose();
              }}
              className={`w-full group flex items-center justify-between px-3.5 py-3 min-h-[44px] rounded-xl text-[12.5px] transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#e11d2e] text-white font-bold shadow-md shadow-red-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-[#10203a] font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-[#7b98b7] group-hover:text-white'
                  }`}
                />
                <span className="truncate text-left tracking-tight">
                  {item.label}
                </span>
              </div>
              <ChevronRight
                className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive
                    ? 'text-white'
                    : 'text-[#38516e] group-hover:text-slate-300 group-hover:translate-x-0.5'
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* User Status Footer with initials 'MS', Name, Online dot, and Role */}
      <div className="relative z-10 p-3.5 border-t border-[#15233c] bg-[#071328]/95 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-[#3f0c11] border border-red-900/50 text-white flex items-center justify-center text-xs font-black uppercase shrink-0 shadow-xs tracking-wider">
              MS
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <p className="text-[12px] font-bold text-white truncate">
                  {user?.name || 'MSK System Administrator'}
                </p>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_#34d399]" title="Online" />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                {user?.role === 'ACCOUNT_MANAGER' ? 'Account Manager' : (user?.role || 'ADMIN')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
