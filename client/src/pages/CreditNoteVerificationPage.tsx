import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Calendar,
  Building2,
  FileText,
  DollarSign,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/currency';

interface VerificationData {
  status: string;
  creditNoteNumber: string;
  issueDate: string;
  originalInvoiceNumber?: string;
  originalInvoiceDate?: string;
  partyName?: string;
  taxableAmount?: number;
  grandTotal: number;
  currency: string;
  reasonForCredit?: string;
  company: {
    name: string;
    gstin: string;
    city: string;
  };
  verifiedAt: string;
}

interface CreditNoteVerificationPageProps {
  token: string;
}

export const CreditNoteVerificationPage: React.FC<CreditNoteVerificationPageProps> = ({ token }) => {
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No verification token provided.');
      setLoading(false);
      return;
    }

    const verify = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.verifyCreditNote(token);
        setData(res);
      } catch (err: any) {
        console.error('Verification error:', err);
        setError(
          err.message || 'Invalid, expired, or non-existent credit note verification token.'
        );
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  const formatDate = (d?: string | null) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Banner Header */}
      <header className="max-w-xl mx-auto w-full pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg">
            <img
              src="/images/msk-logo.png"
              alt="MSK Logo"
              className="max-h-8 max-w-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wide text-white uppercase">
              MSK LOGISTIC SOLUTION
            </h1>
            <p className="text-[10px] text-slate-400">
              Official Document Verification Registry
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
          ISO 9001:2015
        </span>
      </header>

      {/* Main Verification Card */}
      <main className="max-w-xl mx-auto w-full my-auto py-6">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <h2 className="text-base font-bold text-slate-800">
                Verifying Credit Note...
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Authenticating token against MSK secure ledger
              </p>
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Verification Failed
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  {error}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 font-mono">
                Token: {token}
              </div>
              <p className="text-[11px] text-slate-400">
                If you believe this is an error, please contact MSK Logistic Solution Accounts Department.
              </p>
            </div>
          ) : data ? (
            <div>
              {/* Verified Status Banner */}
              <div className="bg-emerald-600 text-white p-5 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-7 h-7 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-700/80 px-2.5 py-0.5 rounded-full mb-1">
                  OFFICIAL VERIFIED DOCUMENT
                </span>
                <h2 className="text-xl font-black tracking-tight">
                  Credit Note Authenticated
                </h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Issued by {data.company.name} in accordance with Section 34 CGST Act, 2017
                </p>
              </div>

              {/* Document Overview Body */}
              <div className="p-6 space-y-5 text-xs">
                {/* Credit Note & Issue Date */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Credit Note Number
                    </span>
                    <span className="text-base font-black font-mono text-red-600 block mt-0.5">
                      {data.creditNoteNumber}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Issue Date
                    </span>
                    <span className="text-sm font-bold text-slate-800 block mt-0.5">
                      {formatDate(data.issueDate)}
                    </span>
                  </div>
                </div>

                {/* Amount Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-900 block">
                      Total Credit Value
                    </span>
                    <span className="text-xl font-black font-mono text-red-600 block mt-0.5">
                      {data.currency === 'USD' ? '$' : '₹'} {formatCurrency(data.grandTotal, data.currency)}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Valid Status
                  </span>
                </div>

                {/* Details Table */}
                <div className="space-y-2.5 divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500">Party / Recipient:</span>
                    <span className="font-bold text-slate-900 text-right max-w-[240px] truncate">
                      {data.partyName || 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500">Original Invoice Ref:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {data.originalInvoiceNumber || 'N/A'}
                    </span>
                  </div>

                  {data.originalInvoiceDate && (
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-500">Original Invoice Date:</span>
                      <span className="font-medium text-slate-800">
                        {formatDate(data.originalInvoiceDate)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500">Reason for Credit:</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[240px]">
                      {data.reasonForCredit || 'Service Charge Adjustment'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500">Issuing Company GSTIN:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data.company.gstin}
                    </span>
                  </div>
                </div>

                {/* Notice */}
                <div className="p-3 bg-slate-50 rounded-xl text-[10px] text-slate-500 border border-slate-200 leading-relaxed">
                  <strong>Notice:</strong> This verification confirms this document is a genuine record within the MSK Logistic Solution ERP system. This application verification does not replace statutory GST portal e-invoice authentication where mandatory under government rules.
                </div>
              </div>

              {/* Verified Footer */}
              <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 text-center text-[10px] text-slate-500">
                Verified at: {new Date(data.verifiedAt).toLocaleString()}
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full text-center text-xs text-slate-500 py-3">
        &copy; {new Date().getFullYear()} MSK Logistic Solution. All rights reserved.
      </footer>
    </div>
  );
};
