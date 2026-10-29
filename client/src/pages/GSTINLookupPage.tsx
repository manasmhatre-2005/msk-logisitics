import React from 'react';
import { GSTINSearchWidget } from '../components/gstin/GSTINSearchWidget';
import { Party } from '../types/index';
import { ShieldCheck, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';

interface GSTINLookupPageProps {
  onCreateInvoiceFromGstin: (partyData: Partial<Party>) => void;
  onViewParty: (partyId: string) => void;
}

export const GSTINLookupPage: React.FC<GSTINLookupPageProps> = ({
  onCreateInvoiceFromGstin,
  onViewParty,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">GSTIN Registry & Direct Invoicing</h1>
        </div>
        <p className="text-xs text-slate-500">
          Search any GSTIN to instantly verify business details against official GST records, check existing customer records, or begin creating an invoice with pre-filled taxpayer data.
        </p>
      </div>

      {/* Main Search Component */}
      <GSTINSearchWidget
        onCreateInvoiceFromGstin={onCreateInvoiceFromGstin}
        onViewParty={onViewParty}
      />

      {/* Explanatory Workflow Diagram Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Automated GSTIN-to-Invoice Workflow
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-blue-600">1. Enter GSTIN</span>
            <p className="text-[11px] text-slate-500 mt-1">15-digit alphanumeric format validation</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-red-600">2. Verify Taxpayer</span>
            <p className="text-[11px] text-slate-500 mt-1">Fetches legal name, trade name & registered address</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="font-bold text-red-600">3. Check Party Master</span>
            <p className="text-[11px] text-slate-500 mt-1">Links existing jobs & containers or creates new party</p>
          </div>
          <div className="p-3 rounded-lg border border-red-200 bg-red-50/50">
            <span className="font-bold text-red-700">4. Create Invoice</span>
            <p className="text-[11px] text-red-600 mt-1">Instant prefill with 0 manual typing</p>
          </div>
        </div>
      </div>
    </div>
  );
};
