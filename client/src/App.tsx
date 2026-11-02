import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { InvoiceWizard } from './components/invoice/InvoiceWizard';
import { BillTypeSelectionModal } from './components/invoice/BillTypeSelectionModal';
import { InvoicePrintView } from './components/invoice/InvoicePrintView';
import { CreditNoteForm } from './components/credit-note/CreditNoteForm';
import { CreditNotePrintView } from './components/credit-note/CreditNotePrintView';
import { HtBillForm } from './components/ht-bill/HtBillForm';
import { HtBillPrintView } from './components/ht-bill/HtBillPrintView';
import { EmptyContainerForm } from './components/empty-container/EmptyContainerForm';
import { EmptyContainerPrintView } from './components/empty-container/EmptyContainerPrintView';
import { LogiBillAssistantChatbot } from './components/chat/LogiBillAssistantChatbot';
import { Modal } from './components/common/Modal';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AccountDashboard } from './pages/AccountDashboard';
import { PartiesPage } from './pages/PartiesPage';
import { PartyDetailPage } from './pages/PartyDetailPage';
import { ExportersPage } from './pages/ExportersPage';
import { JobsPage } from './pages/JobsPage';
import { ContainersPage } from './pages/ContainersPage';
import { ChargesPage } from './pages/ChargesPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { CreditNoteVerificationPage } from './pages/CreditNoteVerificationPage';
import { HtBillVerificationPage } from './pages/HtBillVerificationPage';
import { EmptyContainerVerificationPage } from './pages/EmptyContainerVerificationPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogPage } from './pages/AuditLogPage';

import { Party, Invoice, BillType } from './types/index';

const MainApp: React.FC = () => {
  // Support public read-only verification of Credit Notes & H & T Bills via QR code scan
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const verifyMatch = pathname.match(/^\/verify\/cn\/([a-zA-Z0-9_-]+)/);
  const verifyHtMatch = pathname.match(/^\/verify\/ht\/([a-zA-Z0-9_-]+)/);
  const verifyEmptyMatch = pathname.match(/^\/verify\/empty\/([a-zA-Z0-9_-]+)/);
  const verifyGenericMatch = pathname.match(/^\/verify\/invoice\/([a-zA-Z0-9_-]+)/);
  const verifyToken = verifyMatch ? verifyMatch[1] : searchParams.get('verify_cn');
  const verifyHtToken = verifyHtMatch ? verifyHtMatch[1] : (verifyGenericMatch ? verifyGenericMatch[1] : searchParams.get('verify_ht'));
  const verifyEmptyToken = verifyEmptyMatch ? verifyEmptyMatch[1] : searchParams.get('verify_empty');

  const { user, loading, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [printableInvoice, setPrintableInvoice] = useState<Invoice | null>(null);
  const [printableCreditNote, setPrintableCreditNote] = useState<Invoice | null>(null);
  const [printableHtInvoice, setPrintableHtInvoice] = useState<Invoice | null>(null);
  const [printableEmptyContainer, setPrintableEmptyContainer] = useState<Invoice | null>(null);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  // Modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isBillTypeModalOpen, setIsBillTypeModalOpen] = useState(false);
  const [selectedBillType, setSelectedBillType] = useState<BillType | null>(null);
  const [isInvoiceWizardOpen, setIsInvoiceWizardOpen] = useState(false);
  const [isCreditNoteFormOpen, setIsCreditNoteFormOpen] = useState(false);
  const [isHtBillFormOpen, setIsHtBillFormOpen] = useState(false);
  const [isEmptyContainerFormOpen, setIsEmptyContainerFormOpen] = useState(false);
  const [prefilledPartyForWizard, setPrefilledPartyForWizard] = useState<Partial<Party> | null>(null);

  // Sync state with browser location
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string) => {
    if (window.location.pathname !== to) {
      window.history.pushState(null, '', to);
    }
    setCurrentPath(to);
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
          currentPath === '/admin/login'
        ) {
          navigate('/admin/dashboard');
        }
      } else {
        if (
          currentPath === '/' ||
          currentPath === '/login' ||
          currentPath.startsWith('/admin') ||
          currentPath === '/account/login'
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
        currentPath === '/parties'
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

  // Support public read-only verification of Credit Notes & H & T Bills via QR code scan
  if (verifyToken) {
    return <CreditNoteVerificationPage token={verifyToken} />;
  }
  if (verifyHtToken) {
    return <HtBillVerificationPage token={verifyHtToken} />;
  }
  if (verifyEmptyToken) {
    return <EmptyContainerVerificationPage token={verifyEmptyToken} />;
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
          const target = role === 'ADMIN' ? '/admin/dashboard' : '/account/dashboard';
          navigate(target);
        }}
        logoutMessage={logoutNotice}
        onClearLogoutMessage={() => setLogoutNotice(null)}
      />
    );
  }

  const handleOpenCreateInvoice = (partyData?: Partial<Party> | null) => {
    setPrefilledPartyForWizard(partyData || null);
    setIsBillTypeModalOpen(true);
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
    <div className="flex h-screen bg-[#F2F6FA] overflow-hidden font-sans">
      {/* Light Professional Sidebar with Role Differentiation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setSelectedPartyId(null);
          setSelectedInvoiceId(null);
        }}
        onOpenInvoiceWizard={() => handleOpenCreateInvoice()}
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
        />

        {/* Page Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
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
                onBack={() => setSelectedInvoiceId(null)}
                onPrint={(inv) => handlePrintInvoice(inv)}
              />
            ) : (
              <InvoicesPage
                onCreateInvoice={() => handleOpenCreateInvoice()}
                onViewInvoice={(id) => setSelectedInvoiceId(id)}
                onPrintInvoice={(inv) => handlePrintInvoice(inv)}
              />
            )
          )}

          {/* Payments */}
          {currentTab === 'payments' && (
            <PaymentsPage
              onViewInvoice={(id) => {
                setSelectedInvoiceId(id);
                setCurrentTab('invoices');
              }}
              onPrintInvoice={(inv) => handlePrintInvoice(inv)}
            />
          )}

          {/* Reports */}
          {currentTab === 'reports' && <ReportsPage />}

          {/* Users & Roles (ADMIN ONLY) */}
          {currentTab === 'users' && user.role === 'ADMIN' && <UsersPage />}

          {/* Settings (ADMIN ONLY) */}
          {currentTab === 'settings' && user.role === 'ADMIN' && <SettingsPage />}

          {/* Audit Log (ADMIN ONLY) */}
          {currentTab === 'audit' && user.role === 'ADMIN' && <AuditLogPage />}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onNavigate={handleNavigateFromSearch}
      />

      {/* Bill Type Selection Modal */}
      <BillTypeSelectionModal
        isOpen={isBillTypeModalOpen}
        onClose={() => setIsBillTypeModalOpen(false)}
        onSelectBillType={handleSelectBillType}
      />

      {/* Invoice Creation Wizard Modal */}
      {isInvoiceWizardOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs p-4 sm:p-8">
          <div className="max-w-5xl mx-auto">
            <InvoiceWizard
              initialParty={prefilledPartyForWizard}
              initialBillType={selectedBillType}
              onSuccess={(createdInv) => {
                setIsInvoiceWizardOpen(false);
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
