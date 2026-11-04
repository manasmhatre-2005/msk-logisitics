import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BillTypeSelectionModal } from './components/invoice/BillTypeSelectionModal';
import { Modal } from './components/common/Modal';

// Synchronous core entrypoint (always instant on initial paint)
import { Login } from './pages/Login';

// Asynchronous code-split page views (loaded on demand)
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const AccountDashboard = lazy(() => import('./pages/AccountDashboard').then((m) => ({ default: m.AccountDashboard })));
const PartiesPage = lazy(() => import('./pages/PartiesPage').then((m) => ({ default: m.PartiesPage })));
const PartyDetailPage = lazy(() => import('./pages/PartyDetailPage').then((m) => ({ default: m.PartyDetailPage })));
const ExportersPage = lazy(() => import('./pages/ExportersPage').then((m) => ({ default: m.ExportersPage })));
const JobsPage = lazy(() => import('./pages/JobsPage').then((m) => ({ default: m.JobsPage })));
const ContainersPage = lazy(() => import('./pages/ContainersPage').then((m) => ({ default: m.ContainersPage })));
const ChargesPage = lazy(() => import('./pages/ChargesPage').then((m) => ({ default: m.ChargesPage })));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage })));
const InvoiceDetailPage = lazy(() => import('./pages/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })));
const BillVerificationPage = lazy(() => import('./pages/BillVerificationPage').then((m) => ({ default: m.BillVerificationPage })));
const CreditNoteVerificationPage = lazy(() => import('./pages/CreditNoteVerificationPage').then((m) => ({ default: m.CreditNoteVerificationPage })));
const HtBillVerificationPage = lazy(() => import('./pages/HtBillVerificationPage').then((m) => ({ default: m.HtBillVerificationPage })));
const EmptyContainerVerificationPage = lazy(() => import('./pages/EmptyContainerVerificationPage').then((m) => ({ default: m.EmptyContainerVerificationPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const DataEntryModule = lazy(() => import('./pages/DataEntryModule').then((m) => ({ default: m.DataEntryModule })));

// Heavy Modals & Print Views
const GlobalSearchModal = lazy(() => import('./components/layout/GlobalSearchModal').then((m) => ({ default: m.GlobalSearchModal })));
const InvoiceWizard = lazy(() => import('./components/invoice/InvoiceWizard').then((m) => ({ default: m.InvoiceWizard })));
const InvoicePrintView = lazy(() => import('./components/invoice/InvoicePrintView').then((m) => ({ default: m.InvoicePrintView })));
const CreditNoteForm = lazy(() => import('./components/credit-note/CreditNoteForm').then((m) => ({ default: m.CreditNoteForm })));
const CreditNotePrintView = lazy(() => import('./components/credit-note/CreditNotePrintView').then((m) => ({ default: m.CreditNotePrintView })));
const HtBillForm = lazy(() => import('./components/ht-bill/HtBillForm').then((m) => ({ default: m.HtBillForm })));
const HtBillPrintView = lazy(() => import('./components/ht-bill/HtBillPrintView').then((m) => ({ default: m.HtBillPrintView })));
const EmptyContainerForm = lazy(() => import('./components/empty-container/EmptyContainerForm').then((m) => ({ default: m.EmptyContainerForm })));
const EmptyContainerPrintView = lazy(() => import('./components/empty-container/EmptyContainerPrintView').then((m) => ({ default: m.EmptyContainerPrintView })));
const LogiBillAssistantChatbot = lazy(() => import('./components/chat/LogiBillAssistantChatbot').then((m) => ({ default: m.LogiBillAssistantChatbot })));

const ViewLoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[350px] text-slate-400">
    <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
    <span className="text-xs font-semibold text-slate-500">Loading module...</span>
  </div>
);

import { Party, Invoice, BillType } from './types/index';

const MainApp: React.FC = () => {
  // DIRECT QR BILL OPENING: Directly stream and open original bill PDF in native mobile viewer
  // No Vercel landing page, no verification website, no intermediate portal
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const directPdfMatch = pathname.match(/^\/(?:bills|bill|verify-bill|verify(?:\/[a-z]+)?)\/([a-zA-Z0-9_.-]+)/);
  const directBillToken = directPdfMatch
    ? directPdfMatch[1].replace(/\.pdf$/i, '')
    : (searchParams.get('token') || searchParams.get('verify_bill') || searchParams.get('verify_cn') || searchParams.get('verify_ht') || searchParams.get('verify_empty'));

  useEffect(() => {
    if (directBillToken) {
      window.location.replace(`/api/bills/${directBillToken}`);
    }
  }, [directBillToken]);

  const { user, loading, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const p = window.location.pathname;
    const matchInvoice = p.match(/\/(?:admin|account)\/invoices(?:\/(.+))?/);
    if (matchInvoice) return 'invoices';
    const matchTab = p.match(/\/(?:admin|account)\/([a-z\-]+)/);
    if (matchTab && ['dashboard', 'parties', 'exporters', 'jobs', 'containers', 'charges', 'invoices', 'payments', 'reports', 'settings', 'audit'].includes(matchTab[1])) {
      return matchTab[1];
    }
    return 'dashboard';
  });
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(() => {
    const matchInvoice = window.location.pathname.match(/\/(?:admin|account)\/invoices\/(.+)/);
    return matchInvoice ? matchInvoice[1] : null;
  });
  const [invoiceRefreshCounter, setInvoiceRefreshCounter] = useState(0);
  const [printableInvoice, setPrintableInvoice] = useState<Invoice | null>(null);
  const [printableCreditNote, setPrintableCreditNote] = useState<Invoice | null>(null);
  const [printableHtInvoice, setPrintableHtInvoice] = useState<Invoice | null>(null);
  const [printableEmptyContainer, setPrintableEmptyContainer] = useState<Invoice | null>(null);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  // Modals & Navigation
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isBillTypeModalOpen, setIsBillTypeModalOpen] = useState(false);
  const [selectedBillType, setSelectedBillType] = useState<BillType | null>(null);
  const [isInvoiceWizardOpen, setIsInvoiceWizardOpen] = useState(false);
  const [isCreditNoteFormOpen, setIsCreditNoteFormOpen] = useState(false);
  const [isHtBillFormOpen, setIsHtBillFormOpen] = useState(false);
  const [isEmptyContainerFormOpen, setIsEmptyContainerFormOpen] = useState(false);
  const [prefilledPartyForWizard, setPrefilledPartyForWizard] = useState<Partial<Party> | null>(null);

  // Sync state with browser location & popstate for seamless Back/Forward button support
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      setCurrentPath(pathname);

      const matchInvoice = pathname.match(/\/(?:admin|account)\/invoices\/(.+)/);
      if (matchInvoice) {
        setCurrentTab('invoices');
        setSelectedInvoiceId(matchInvoice[1]);
        return;
      }

      const matchTab = pathname.match(/\/(?:admin|account)\/([a-z\-]+)/);
      if (matchTab) {
        const tab = matchTab[1];
        if (tab === 'invoices') {
          setCurrentTab('invoices');
          setSelectedInvoiceId(null);
        } else if (['dashboard', 'parties', 'exporters', 'jobs', 'containers', 'charges', 'payments', 'reports', 'settings', 'audit'].includes(tab)) {
          setCurrentTab(tab);
          setSelectedPartyId(null);
          setSelectedInvoiceId(null);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string) => {
    if (window.location.pathname !== to) {
      window.history.pushState(null, '', to);
    }
    setCurrentPath(to);

    const matchInvoice = to.match(/\/(?:admin|account)\/invoices\/(.+)/);
    if (matchInvoice) {
      setCurrentTab('invoices');
      setSelectedInvoiceId(matchInvoice[1]);
      return;
    }

    const matchTab = to.match(/\/(?:admin|account)\/([a-z\-]+)/);
    if (matchTab) {
      const tab = matchTab[1];
      if (tab === 'invoices') {
        setCurrentTab('invoices');
        setSelectedInvoiceId(null);
      } else if (['dashboard', 'parties', 'exporters', 'jobs', 'containers', 'charges', 'payments', 'reports', 'settings', 'audit'].includes(tab)) {
        setCurrentTab(tab);
        setSelectedPartyId(null);
        setSelectedInvoiceId(null);
      }
    }
  };

  // Robust session teardown and state isolation on sign out
  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      setCurrentTab('dashboard');
      setSelectedPartyId(null);
      setSelectedInvoiceId(null);
      setPrintableInvoice(null);
      setPrintableCreditNote(null);
      setPrintableHtInvoice(null);
      setPrintableEmptyContainer(null);
      setIsSearchModalOpen(false);
      setIsBillTypeModalOpen(false);
      setSelectedBillType(null);
      setIsInvoiceWizardOpen(false);
      setIsCreditNoteFormOpen(false);
      setIsHtBillFormOpen(false);
      setIsEmptyContainerFormOpen(false);
      setPrefilledPartyForWizard(null);
      setLogoutNotice('Signed out successfully.');
      navigate('/login');
    }
  };

  // Role-based URL route synchronization on authenticated session load
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'ADMIN') {
        if (
          currentPath === '/' ||
          currentPath === '/login' ||
          currentPath.startsWith('/account') ||
          currentPath === '/admin/login' ||
          currentPath === '/data-entry'
        ) {
          navigate('/admin/dashboard');
        }
      } else if (user.role === 'DATA_ENTRY') {
        if (currentPath !== '/data-entry') {
          navigate('/data-entry');
        }
      } else {
        if (
          currentPath === '/' ||
          currentPath === '/login' ||
          currentPath.startsWith('/admin') ||
          currentPath === '/account/login' ||
          currentPath === '/data-entry'
        ) {
          navigate('/account/dashboard');
        }
      }
    } else if (!loading && !user) {
      if (
        currentPath.startsWith('/admin') ||
        currentPath.startsWith('/account') ||
        currentPath === '/dashboard' ||
        currentPath === '/invoices' ||
        currentPath === '/parties' ||
        currentPath === '/data-entry'
      ) {
        navigate('/login');
      }
    }
  }, [user, loading, currentPath]);

  // Tab clamp for Account Manager: prevent opening admin-only tabs
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      if (currentTab === 'users' || currentTab === 'settings' || currentTab === 'audit') {
        setCurrentTab('dashboard');
      }
    }
  }, [user, currentTab]);

  // Global Ctrl+K hotkey for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dev preview hook for automated visual testing of invoice formats (called unconditionally)
  useEffect(() => {
    if (import.meta.env.DEV) {
      const type = searchParams.get('preview_invoice');
      if (type) {
        const mockInv: any = {
          id: 'mock-inv-1',
          invoiceNumber: type === 'cn' ? 'CN/MSK/2026/001' : type === 'empty' ? 'MSK/EMPTY/2026/012' : type === 'ht' ? 'MSK/HT/2026/008' : 'MSK/EXP/2026/042',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          billType: type === 'empty' ? 'EMPTY_CONTAINER' : type === 'ht' ? 'HT_BILL' : type === 'cn' ? 'CREDIT_NOTE' : 'FORWARDING',
          status: 'FINALIZED',
          currency: 'INR',
          totalAmount: 48500,
          subTotal: 41101.69,
          taxAmount: 7398.31,
          party: {
            legalName: 'RELIANCE INDUSTRIES LTD',
            tradeName: 'RELIANCE LOGISTICS',
            gstin: '27AABCR1234F1Z5',
            pan: 'AABCR1234F',
            tan: 'MUMB12345D',
            address: 'Maker Chambers IV, Nariman Point, Mumbai - 400021',
            contactPerson: 'Mr. Rajesh Sharma',
            mobile: '+91 9820012345',
            email: 'logistics@ril.com',
          },
          containers: [
            { containerNumber: 'MSKU1234567', containerSize: '40HC', containerType: 'DRY', sealNumber: 'SL-884920' },
            { containerNumber: 'MSKU9876543', containerSize: '20GP', containerType: 'DRY', sealNumber: 'SL-884921' },
          ],
          items: [
            { description: 'GROUND RENT / CFS HANDLING CHARGES', hsnSac: '996719', quantity: 2, rate: 12500, amount: 25000 },
            { description: 'STUFFING & LASHING LABOUR CHARGES', hsnSac: '996719', quantity: 2, rate: 8050.85, amount: 16101.69 },
          ],
          verificationToken: 'MSK-VERIFY-2026-X89Q',
        };
        if (mockInv.billType === 'EMPTY_CONTAINER') setPrintableEmptyContainer(mockInv);
        else if (mockInv.billType === 'CREDIT_NOTE') setPrintableCreditNote(mockInv);
        else if (mockInv.billType === 'HT_BILL') setPrintableHtInvoice(mockInv);
        else setPrintableInvoice(mockInv);
      }
    }
  }, []);

  // Direct PDF Opening state (replaces location immediately with native PDF resource)
  if (directBillToken) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-300 text-xs">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="font-semibold text-slate-200">Opening MSK Bill PDF...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-400 text-xs">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span>Authenticating MSK Logistic Solution ERP...</span>
      </div>
    );
  }

  // Unauthenticated view: Render the single unified login page
  if (!user) {
    return (
      <Login
        onSuccess={(role) => {
          setLogoutNotice(null);
          const target =
            role === 'ADMIN'
              ? '/admin/dashboard'
              : role === 'DATA_ENTRY'
              ? '/data-entry'
              : '/account/dashboard';
          navigate(target);
        }}
        logoutMessage={logoutNotice}
        onClearLogoutMessage={() => setLogoutNotice(null)}
      />
    );
  }

  // STRICT OPERATOR ISOLATION: Data Entry Operator receives ONLY the dedicated module
  if (user.role === 'DATA_ENTRY') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <DataEntryModule onSignOut={handleSignOut} />
      </Suspense>
    );
  }

  const handleOpenCreateInvoice = (partyData?: Partial<Party> | null, billType?: BillType | 'STANDARD') => {
    setPrefilledPartyForWizard(partyData || null);
    if (!billType) {
      setIsBillTypeModalOpen(true);
    } else if (billType === 'EMPTY_CONTAINER') {
      setIsEmptyContainerFormOpen(true);
    } else if (billType === 'CREDIT_NOTE') {
      setIsCreditNoteFormOpen(true);
    } else if (billType === 'HT_BILL') {
      setIsHtBillFormOpen(true);
    } else if (billType === 'FORWARDING') {
      setSelectedBillType('FORWARDING');
      setIsInvoiceWizardOpen(true);
    } else {
      setSelectedBillType(null);
      setIsInvoiceWizardOpen(true);
    }
  };

  const handleSelectBillType = (billType: BillType) => {
    setSelectedBillType(billType);
    setIsBillTypeModalOpen(false);
    if (billType === 'EMPTY_CONTAINER') {
      setIsEmptyContainerFormOpen(true);
    } else if (billType === 'CREDIT_NOTE') {
      setIsCreditNoteFormOpen(true);
    } else if (billType === 'HT_BILL') {
      setIsHtBillFormOpen(true);
    } else {
      setIsInvoiceWizardOpen(true);
    }
  };

  const handlePrintInvoice = (inv: Invoice) => {
    if (inv.billType === 'EMPTY_CONTAINER') {
      setPrintableEmptyContainer(inv);
    } else if (inv.billType === 'CREDIT_NOTE') {
      setPrintableCreditNote(inv);
    } else if (inv.billType === 'HT_BILL') {
      setPrintableHtInvoice(inv);
    } else {
      setPrintableInvoice(inv);
    }
  };

  const handleNavigateFromSearch = (tab: string, id?: string) => {
    setCurrentTab(tab);
    if (tab === 'parties' && id) setSelectedPartyId(id);
    if (tab === 'invoices' && id) setSelectedInvoiceId(id);
  };

  return (
    <div className="flex h-screen bg-[#F5F7FB] overflow-hidden font-sans">
      {/* Light Professional Sidebar with Mobile Collapsible Drawer */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setSelectedPartyId(null);
          setSelectedInvoiceId(null);
          navigate(user.role === 'ADMIN' ? `/admin/${tab}` : `/account/${tab}`);
        }}
        onOpenInvoiceWizard={() => handleOpenCreateInvoice()}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onOpenSearch={() => setIsSearchModalOpen(true)}
          onOpenInvoiceWizard={() => handleOpenCreateInvoice()}
          onOpenAddPartyModal={() => {
            setCurrentTab('parties');
            setSelectedPartyId(null);
          }}
          onOpenAddJobModal={() => setCurrentTab('jobs')}
          onOpenAddContainerModal={() => setCurrentTab('containers')}
          onSignOut={handleSignOut}
          onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
        />

        {/* Page Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 lg:p-7 bg-[#F3F7FC]">
          <Suspense fallback={<ViewLoadingFallback />}>
            {/* Dashboard: Dedicated view per verified role */}
          {currentTab === 'dashboard' && (
            user.role === 'ADMIN' ? (
              <Dashboard
                onOpenSearch={() => setIsSearchModalOpen(true)}
                onOpenInvoiceWizard={() => handleOpenCreateInvoice()}
                onOpenAddPartyModal={() => {
                  setCurrentTab('parties');
                  setSelectedPartyId(null);
                }}
                onOpenAddJobModal={() => setCurrentTab('jobs')}
                onOpenAddContainerModal={() => setCurrentTab('containers')}
                onViewInvoice={(id) => {
                  setSelectedInvoiceId(id);
                  setCurrentTab('invoices');
                }}
                onPrintInvoice={(inv) => handlePrintInvoice(inv)}
                onNavigateTab={(tab) => {
                  setCurrentTab(tab);
                  setSelectedPartyId(null);
                  setSelectedInvoiceId(null);
                }}
              />
            ) : (
              <AccountDashboard
                onOpenInvoiceWizard={() => handleOpenCreateInvoice()}
                onViewInvoice={(id) => {
                  setSelectedInvoiceId(id);
                  setCurrentTab('invoices');
                }}
                onPrintInvoice={(inv) => handlePrintInvoice(inv)}
                onNavigateTab={(tab) => {
                  setCurrentTab(tab);
                  setSelectedPartyId(null);
                  setSelectedInvoiceId(null);
                }}
              />
            )
          )}

          {/* Parties Master */}
          {currentTab === 'parties' && (
            selectedPartyId ? (
              <PartyDetailPage
                partyId={selectedPartyId}
                onBack={() => setSelectedPartyId(null)}
                onCreateInvoice={(party) => handleOpenCreateInvoice(party)}
                onViewInvoice={(invId) => {
                  setSelectedInvoiceId(invId);
                  setCurrentTab('invoices');
                }}
              />
            ) : (
              <PartiesPage
                onSelectParty={(id) => setSelectedPartyId(id)}
                onCreateInvoiceForParty={(party) => handleOpenCreateInvoice(party)}
              />
            )
          )}

          {/* Exporters */}
          {currentTab === 'exporters' && <ExportersPage />}

          {/* Jobs & Shipments (Admin & Ops) */}
          {currentTab === 'jobs' && <JobsPage />}

          {/* Containers (Admin & Ops) */}
          {currentTab === 'containers' && <ContainersPage />}

          {/* Charges & Rates Master */}
          {currentTab === 'charges' && <ChargesPage />}

          {/* Invoices */}
          {currentTab === 'invoices' && (
            selectedInvoiceId ? (
              <InvoiceDetailPage
                invoiceId={selectedInvoiceId}
                onBack={() => {
                  setSelectedInvoiceId(null);
                  navigate(user.role === 'ADMIN' ? '/admin/invoices' : '/account/invoices');
                }}
                onPrint={(inv) => handlePrintInvoice(inv)}
              />
            ) : (
              <InvoicesPage
                onCreateInvoice={(type) => handleOpenCreateInvoice(null, type)}
                onViewInvoice={(id) => {
                  setSelectedInvoiceId(id);
                  navigate(user.role === 'ADMIN' ? `/admin/invoices/${id}` : `/account/invoices/${id}`);
                }}
                onPrintInvoice={(inv) => handlePrintInvoice(inv)}
                refreshTrigger={invoiceRefreshCounter}
              />
            )
          )}

          {/* Payments */}
          {currentTab === 'payments' && (
            <PaymentsPage
              onViewInvoice={(id) => {
                setSelectedInvoiceId(id);
                setCurrentTab('invoices');
                navigate(user.role === 'ADMIN' ? `/admin/invoices/${id}` : `/account/invoices/${id}`);
              }}
              onPrintInvoice={(inv) => handlePrintInvoice(inv)}
            />
          )}

          {/* Reports */}
          {currentTab === 'reports' && <ReportsPage />}

          {/* Settings (ADMIN ONLY) */}
          {currentTab === 'settings' && user.role === 'ADMIN' && <SettingsPage />}

          {/* Audit Log (ADMIN ONLY) */}
          {currentTab === 'audit' && user.role === 'ADMIN' && <AuditLogPage />}
          </Suspense>
        </main>
      </div>

      <Suspense fallback={null}>
        {/* Global Search Modal */}
        {isSearchModalOpen && (
          <GlobalSearchModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            onNavigate={handleNavigateFromSearch}
          />
        )}

      {/* Bill Type Selection Modal */}
      <BillTypeSelectionModal
        isOpen={isBillTypeModalOpen}
        onClose={() => setIsBillTypeModalOpen(false)}
        onSelectBillType={handleSelectBillType}
      />

      {/* Invoice Creation Wizard Modal */}
      {isInvoiceWizardOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs p-2 sm:p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            <InvoiceWizard
              initialParty={prefilledPartyForWizard}
              initialBillType={selectedBillType}
              onSuccess={(createdInv) => {
                setIsInvoiceWizardOpen(false);
                setInvoiceRefreshCounter((c) => c + 1);
                setSelectedInvoiceId(createdInv.id);
                setCurrentTab('invoices');
              }}
              onCancel={() => setIsInvoiceWizardOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Dedicated Credit Note Creation Form */}
      {isCreditNoteFormOpen && (
        <CreditNoteForm
          isOpen={isCreditNoteFormOpen}
          onClose={() => setIsCreditNoteFormOpen(false)}
          onSuccess={(savedCn) => {
            setIsCreditNoteFormOpen(false);
            setInvoiceRefreshCounter((c) => c + 1);
            setPrintableCreditNote(savedCn);
            setSelectedInvoiceId(savedCn.id);
            setCurrentTab('invoices');
          }}
        />
      )}

      {/* Dedicated H & T Bill Creation Form */}
      {isHtBillFormOpen && (
        <HtBillForm
          isOpen={isHtBillFormOpen}
          onClose={() => setIsHtBillFormOpen(false)}
          initialParty={prefilledPartyForWizard}
          onSuccess={(savedHt) => {
            setIsHtBillFormOpen(false);
            setInvoiceRefreshCounter((c) => c + 1);
            setPrintableHtInvoice(savedHt);
            setSelectedInvoiceId(savedHt.id);
            setCurrentTab('invoices');
          }}
        />
      )}

      {/* Dedicated Empty Container Bill Creation Form */}
      {isEmptyContainerFormOpen && (
        <EmptyContainerForm
          isOpen={isEmptyContainerFormOpen}
          onClose={() => setIsEmptyContainerFormOpen(false)}
          initialParty={prefilledPartyForWizard}
          onSuccess={(savedEc) => {
            setIsEmptyContainerFormOpen(false);
            setInvoiceRefreshCounter((c) => c + 1);
            setPrintableEmptyContainer(savedEc);
            setSelectedInvoiceId(savedEc.id);
            setCurrentTab('invoices');
          }}
        />
      )}

      {/* Hidden Print Views */}
      {printableInvoice && (
        <InvoicePrintView
          invoice={printableInvoice}
          onClose={() => setPrintableInvoice(null)}
        />
      )}
      {printableCreditNote && (
        <CreditNotePrintView
          invoice={printableCreditNote}
          isOpen={true}
          onClose={() => setPrintableCreditNote(null)}
        />
      )}
      {printableHtInvoice && (
        <HtBillPrintView
          invoice={printableHtInvoice}
          isOpen={true}
          onClose={() => setPrintableHtInvoice(null)}
        />
      )}
      {printableEmptyContainer && (
        <EmptyContainerPrintView
          invoice={printableEmptyContainer}
          isOpen={true}
          onClose={() => setPrintableEmptyContainer(null)}
        />
      )}

      {/* AI Assistant Chatbot */}
      <LogiBillAssistantChatbot />
      </Suspense>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
