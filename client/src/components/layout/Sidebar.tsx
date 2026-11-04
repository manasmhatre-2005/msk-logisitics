import React, { useEffect } from 'react';
import {
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

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
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

  // Structured navigation groups with subtle separators
  const navGroups: NavGroup[] = isAdmin
    ? [
        {
          id: 'operations',
          items: [
            { id: 'dashboard', label: 'Dashboard', icon: Home },
            { id: 'parties', label: 'Parties Master', icon: Users },
            { id: 'exporters', label: 'Exporters Master', icon: Truck },
            { id: 'jobs', label: 'Jobs & Shipments', icon: Ship },
            { id: 'containers', label: 'Containers Operations', icon: Box },
          ],
        },
        {
          id: 'financial',
          items: [
            { id: 'charges', label: 'Charges & Rates', icon: BadgePercent },
            { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
            { id: 'payments', label: 'Payment Register', icon: CreditCard },
          ],
        },
        {
          id: 'admin',
          items: [
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'settings', label: 'Company Settings', icon: Settings },
          ],
        },
      ]
    : [
        {
          id: 'operations',
          items: [
            { id: 'dashboard', label: 'Dashboard', icon: Home },
            { id: 'parties', label: 'Parties Master', icon: Users },
            { id: 'exporters', label: 'Exporters Master', icon: Truck },
            { id: 'jobs', label: 'Jobs & Shipments', icon: Ship },
            { id: 'containers', label: 'Containers Operations', icon: Box },
          ],
        },
        {
          id: 'financial',
          items: [
            { id: 'charges', label: 'Charges & Rates', icon: BadgePercent },
            { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
            { id: 'payments', label: 'Payment Register', icon: CreditCard },
          ],
        },
      ];

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

      {/* Sidebar Drawer: Sophisticated Navy-to-Steel-Blue Gradient Panel */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[265px] max-w-[85vw] text-white border-r border-[#1D5278]/50 flex flex-col h-screen select-none shrink-0 transition-transform duration-300 ease-in-out overflow-hidden shadow-2xl lg:shadow-[4px_0_24px_rgba(11,41,69,0.35)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          background: 'linear-gradient(180deg, #0B2945 0%, #103859 38%, #14446C 70%, #1D5278 100%)',
        }}
        aria-label="Sidebar Navigation"
      >
        {/* Mobile Close Button (X) */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20 shadow-sm"
          aria-label="Close navigation menu"
          title="Close Navigation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Background Logistics Vector Illustration (8–15% Opacity behind navigation) */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full h-72 pointer-events-none z-0 opacity-12"
          viewBox="0 0 265 240"
          fill="none"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="shipGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7DB8DC" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1D5278" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Global Logistics Dotted Route Arcs */}
          <path
            d="M 10 90 Q 90 20 200 60 T 260 40"
            stroke="#7DB8DC"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <path
            d="M 40 130 Q 140 70 250 110"
            stroke="#7DB8DC"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle cx="200" cy="60" r="3" fill="#7DB8DC" />
          <circle cx="90" cy="45" r="2.5" fill="#7DB8DC" />
          <circle cx="250" cy="110" r="2.5" fill="#7DB8DC" />

          {/* Port Terminal Dock Line */}
          <path
            d="M 0 200 L 265 200 L 265 240 L 0 240 Z"
            fill="#1D5278"
            fillOpacity="0.3"
          />
          <line x1="0" y1="200" x2="265" y2="200" stroke="#7DB8DC" strokeWidth="1.5" />

          {/* Container Ship Hull Silhouette */}
          <path
            d="M 15 200 L 40 180 L 170 180 L 195 200 Z"
            fill="url(#shipGrad)"
            stroke="#7DB8DC"
            strokeWidth="1.2"
          />
          {/* Ship Bridge / Superstructure */}
          <rect x="145" y="155" width="22" height="25" fill="#1D5278" stroke="#7DB8DC" strokeWidth="1" rx="1" />
          <line x1="145" y1="165" x2="167" y2="165" stroke="#7DB8DC" strokeWidth="0.8" />
          <line x1="156" y1="145" x2="156" y2="155" stroke="#7DB8DC" strokeWidth="1.5" />

          {/* Stacked Containers on Deck */}
          <g stroke="#7DB8DC" strokeWidth="1" fill="#1D5278" fillOpacity="0.5">
            <rect x="45" y="168" width="22" height="12" rx="0.5" />
            <rect x="69" y="168" width="22" height="12" rx="0.5" />
            <rect x="93" y="168" width="22" height="12" rx="0.5" />
            <rect x="117" y="168" width="22" height="12" rx="0.5" />
            <rect x="56" y="155" width="22" height="12" rx="0.5" />
            <rect x="80" y="155" width="22" height="12" rx="0.5" />
            <rect x="104" y="155" width="22" height="12" rx="0.5" />
          </g>

          {/* Port STS Gantry Crane 1 (Left) */}
          <g stroke="#7DB8DC" strokeWidth="1.4" strokeLinecap="round">
            <line x1="20" y1="200" x2="42" y2="110" />
            <line x1="55" y1="200" x2="42" y2="110" />
            <line x1="26" y1="170" x2="50" y2="170" strokeWidth="1" />
            <line x1="32" y1="140" x2="45" y2="140" strokeWidth="1" />
            <line x1="10" y1="110" x2="85" y2="110" strokeWidth="1.8" />
            <line x1="10" y1="106" x2="85" y2="106" strokeWidth="0.8" strokeDasharray="2 2" />
            <line x1="28" y1="110" x2="42" y2="80" />
            <line x1="56" y1="110" x2="42" y2="80" />
            <line x1="15" y1="110" x2="42" y2="80" strokeWidth="0.8" />
            <line x1="80" y1="110" x2="42" y2="80" strokeWidth="0.8" />
            <line x1="65" y1="110" x2="65" y2="135" strokeWidth="1" strokeDasharray="1 1" />
            <rect x="60" y="135" width="10" height="5" fill="#7DB8DC" stroke="none" />
          </g>

          {/* Port Gantry Crane 2 (Right) */}
          <g stroke="#7DB8DC" strokeWidth="1.2" strokeLinecap="round" opacity="0.8">
            <line x1="190" y1="200" x2="210" y2="120" />
            <line x1="225" y1="200" x2="210" y2="120" />
            <line x1="180" y1="120" x2="250" y2="120" strokeWidth="1.5" />
            <line x1="198" y1="120" x2="210" y2="95" />
            <line x1="222" y1="120" x2="210" y2="95" />
            <line x1="185" y1="120" x2="210" y2="95" strokeWidth="0.7" />
            <line x1="245" y1="120" x2="210" y2="95" strokeWidth="0.7" />
          </g>

          {/* Subtle Waterline Waves */}
          <path
            d="M 0 205 Q 30 203 60 205 T 120 205 T 180 205 T 240 205 T 265 205"
            stroke="#7DB8DC"
            strokeWidth="0.8"
            strokeDasharray="6 3"
          />
          <path
            d="M 10 215 Q 40 213 70 215 T 130 215 T 190 215 T 250 215"
            stroke="#7DB8DC"
            strokeWidth="0.6"
            strokeDasharray="4 4"
          />
        </svg>

        {/* Brand Header — Official MSK Logistic Solution Logo in White Rounded Rectangle */}
        <div className="relative z-10 px-3.5 pt-3.5 pb-2 shrink-0">
          <div className="bg-white rounded-2xl px-2.5 py-2 shadow-md shadow-[#0B2945]/30 border border-white/20 flex items-center justify-center overflow-hidden h-[114px]">
            <img
              src="/images/msk-logo.png"
              alt="MSK LOGISTIC SOLUTION - Beyond logistics We Deliver Trust"
              className="w-full h-full object-contain object-center scale-[1.12] block select-none"
              loading="eager"
              decoding="async"
            />
          </div>

          {/* Status Pills: [ ADMIN PORTAL ] & ● ISO 9001:2015 */}
          <div className="flex flex-col items-center justify-center text-center pt-2.5 space-y-1.5">
            <div className="flex items-center justify-center">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-[#ED1C24]/15 text-[#ff8085] border border-[#ED1C24]/30 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#ED1C24]" />
                  <span>ADMIN PORTAL</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-[#1D5278]/40 text-[#7DB8DC] border border-[#7DB8DC]/30 shadow-xs">
                  <Landmark className="w-3.5 h-3.5 text-[#7DB8DC]" />
                  <span>ACCOUNTS PORTAL</span>
                </span>
              )}
            </div>
            <div className="inline-flex items-center justify-center gap-2 text-white font-bold text-[11px] tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_#34d399]" />
              <span className="text-white/95">ISO 9001:2015</span>
            </div>
          </div>

          {/* Subtle Separator below Branding Section */}
          <div className="mt-3.5 border-b border-[#7DB8DC]/20" />
        </div>

        {/* Navigation List with Light Blue Outline Icons, Subtle Separators, and Refined Active Highlight */}
        <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-dark-scrollbar">
          {navGroups.map((group, groupIdx) => (
            <div key={group.id} className="space-y-1">
              {groupIdx > 0 && (
                <div className="my-2 border-t border-[#7DB8DC]/15 mx-1" />
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      if (onClose) onClose();
                    }}
                    className={`w-full group relative flex items-center justify-between px-3.5 py-2.5 min-h-[42px] rounded-xl text-[12.5px] transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#ED1C24] to-[#C91219] text-white font-bold shadow-md shadow-red-950/40 border border-red-500/30'
                        : 'text-white/90 hover:text-white hover:bg-[#1D5278]/60 font-medium border border-transparent hover:border-[#7DB8DC]/25'
                    }`}
                  >
                    {/* Active Accent Left Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full shadow-xs" />
                    )}

                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                          isActive
                            ? 'text-white stroke-[2.2]'
                            : 'text-[#7DB8DC] group-hover:text-white stroke-[1.8]'
                        }`}
                      />
                      <span className="truncate text-left tracking-tight">
                        {item.label}
                      </span>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-all duration-150 ${
                        isActive
                          ? 'text-white/90'
                          : 'text-[#7DB8DC]/50 group-hover:text-white group-hover:translate-x-0.5'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Status Footer with initials 'MS', Name, Online dot, and Role */}
        <div className="relative z-10 p-3.5 border-t border-[#7DB8DC]/20 bg-[#0B2945]/85 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-[#ED1C24] border-2 border-white/20 text-white flex items-center justify-center text-xs font-black uppercase shrink-0 shadow-sm tracking-wider ring-2 ring-[#7DB8DC]/30">
                MS
              </div>
              <div className="truncate min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[12.5px] font-bold text-white truncate leading-tight">
                    {user?.name || 'MSK System Administrator'}
                  </p>
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#34d399] ring-2 ring-[#0B2945]"
                    title="Online"
                  />
                </div>
                <p className="text-[10px] text-[#7DB8DC] font-bold uppercase tracking-wider truncate mt-0.5">
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
