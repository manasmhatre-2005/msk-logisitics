import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { GSTINSearchWidget } from './components/gstin/GSTINSearchWidget';
import { InvoiceWizard } from './components/invoice/InvoiceWizard';
import { InvoicePrintView } from './components/invoice/InvoicePrintView';
import { LogiBillAssistantChatbot } from './components/chat/LogiBillAssistantChatbot';
import { Modal } from './components/common/Modal';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { GSTINLookupPage } from './pages/GSTINLookupPage';
import { PartiesPage } from './pages/PartiesPage';
import { PartyDetailPage } from './pages/PartyDetailPage';
import { ExportersPage } from './pages/ExportersPage';
import { JobsPage } from './pages/JobsPage';
import { ContainersPage } from './pages/ContainersPage';
import { ChargesPage } from './pages/ChargesPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { WhatsAppPage } from './pages/WhatsAppPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogPage } from './pages/AuditLogPage';

import { Party, Invoice } from './types/index';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [printableInvoice, setPrintableInvoice] = useState<Invoice | null>(null);

  // Modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isGstinModalOpen, setIsGstinModalOpen] = useState(false);
  const [isInvoiceWizardOpen, setIsInvoiceWizardOpen] = useState(false);
  const [prefilledPartyForWizard, setPrefilledPartyForWizard] = useState<Partial<Party> | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-xs">
        Initializing MSK Logistic Solution ERP...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleStartInvoiceFromGstin = (partyData: Partial<Party>) => {
    setPrefilledPartyForWizard(partyData);
    setIsGstinModalOpen(false);
    setIsInvoiceWizardOpen(true);
  };

  const handleNavigateFromSearch = (tab: string, id?: string) => {
    setCurrentTab(tab);
    if (tab === 'parties' && id) setSelectedPartyId(id);
    if (tab === 'invoices' && id) setSelectedInvoiceId(id);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Light Professional Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setSelectedPartyId(null);
          setSelectedInvoiceId(null);
        }}
        onOpenGstinModal={() => setIsGstinModalOpen(true)}
        onOpenInvoiceWizard={() => {
          setPrefilledPartyForWizard(null);
          setIsInvoiceWizardOpen(true);
        }}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onOpenSearch={() => setIsSearchModalOpen(true)}
          onOpenGstinModal={() => setIsGstinModalOpen(true)}
          onOpenInvoiceWizard={() => {
            setPrefilledPartyForWizard(null);
            setIsInvoiceWizardOpen(true);
          }}
          onOpenAddPartyModal={() => {
            setCurrentTab('parties');
            setSelectedPartyId(null);
          }}
          onOpenAddJobModal={() => setCurrentTab('jobs')}
          onOpenAddContainerModal={() => setCurrentTab('containers')}
        />

        {/* Page Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {/* Dashboard */}
          {currentTab === 'dashboard' && (
            <Dashboard
              onOpenSearch={() => setIsSearchModalOpen(true)}
              onOpenGstinModal={() => setIsGstinModalOpen(true)}
              onOpenInvoiceWizard={() => {
                setPrefilledPartyForWizard(null);
                setIsInvoiceWizardOpen(true);
              }}
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
              onPrintInvoice={(inv) => setPrintableInvoice(inv)}
              onWhatsAppInvoice={(inv) => {
                setSelectedInvoiceId(inv.id);
                setCurrentTab('invoices');
              }}
              onNavigateTab={(tab) => {
                setCurrentTab(tab);
                setSelectedPartyId(null);
                setSelectedInvoiceId(null);
              }}
            />
          )}

          {/* GSTIN Lookup */}
          {currentTab === 'gstin' && (
            <GSTINLookupPage
              onCreateInvoiceFromGstin={handleStartInvoiceFromGstin}
              onViewParty={(pId) => {
                setSelectedPartyId(pId);
                setCurrentTab('parties');
              }}
            />
          )}

          {/* Parties Master */}
          {currentTab === 'parties' && (
            selectedPartyId ? (
              <PartyDetailPage
                partyId={selectedPartyId}
                onBack={() => setSelectedPartyId(null)}
                onCreateInvoice={(party) => {
                  setPrefilledPartyForWizard(party);
                  setIsInvoiceWizardOpen(true);
                }}
                onViewInvoice={(invId) => {
                  setSelectedInvoiceId(invId);
                  setCurrentTab('invoices');
                }}
              />
            ) : (
              <PartiesPage
                onSelectParty={(id) => setSelectedPartyId(id)}
                onCreateInvoiceForParty={(party) => {
                  setPrefilledPartyForWizard(party);
                  setIsInvoiceWizardOpen(true);
                }}
              />
            )
          )}

          {/* Exporters */}
          {currentTab === 'exporters' && <ExportersPage />}

          {/* Jobs & Shipments */}
          {currentTab === 'jobs' && <JobsPage />}

          {/* Containers */}
          {currentTab === 'containers' && <ContainersPage />}

          {/* Charges & Rates Master */}
          {currentTab === 'charges' && <ChargesPage />}

          {/* Invoices */}
          {currentTab === 'invoices' && (
            selectedInvoiceId ? (
              <InvoiceDetailPage
                invoiceId={selectedInvoiceId}
                onBack={() => setSelectedInvoiceId(null)}
                onPrint={(inv) => setPrintableInvoice(inv)}
              />
            ) : (
              <InvoicesPage
                onCreateInvoice={() => {
                  setPrefilledPartyForWizard(null);
                  setIsInvoiceWizardOpen(true);
                }}
                onViewInvoice={(id) => setSelectedInvoiceId(id)}
                onPrintInvoice={(inv) => setPrintableInvoice(inv)}
              />
            )
          )}

          {/* Payments */}
          {currentTab === 'payments' && <PaymentsPage />}

          {/* Reports */}
          {currentTab === 'reports' && <ReportsPage />}

          {/* WhatsApp */}
          {currentTab === 'whatsapp' && <WhatsAppPage />}

          {/* Users & Roles */}
          {currentTab === 'users' && <UsersPage />}

          {/* Settings */}
          {currentTab === 'settings' && <SettingsPage />}

          {/* Audit Log */}
          {currentTab === 'audit' && <AuditLogPage />}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onNavigate={handleNavigateFromSearch}
      />

      {/* Quick GSTIN Lookup Modal */}
      <Modal
        isOpen={isGstinModalOpen}
        onClose={() => setIsGstinModalOpen(false)}
        title="Quick GSTIN Verification"
        subtitle="Lookup any 15-digit GSTIN and populate invoice"
        maxWidth="3xl"
      >
        <GSTINSearchWidget
          onCreateInvoiceFromGstin={handleStartInvoiceFromGstin}
          onViewParty={(pId) => {
            setIsGstinModalOpen(false);
            setSelectedPartyId(pId);
            setCurrentTab('parties');
          }}
        />
      </Modal>

      {/* Invoice Creation Wizard Modal */}
      {isInvoiceWizardOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs p-4 sm:p-8">
          <div className="max-w-5xl mx-auto">
            <InvoiceWizard
              initialParty={prefilledPartyForWizard}
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

      {/* Printable Invoice View (A4 Portrait) */}
      {printableInvoice && (
        <InvoicePrintView
          invoice={printableInvoice}
          onClose={() => setPrintableInvoice(null)}
        />
      )}

      {/* Floating AI Assistant Chatbot */}
      <LogiBillAssistantChatbot
        onNavigateToInvoice={(invNum) => {
          setCurrentTab('invoices');
        }}
        onNavigateToParty={(gstin) => {
          setCurrentTab('parties');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
