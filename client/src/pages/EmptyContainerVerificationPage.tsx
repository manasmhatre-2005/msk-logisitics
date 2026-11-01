import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Calendar,
  Building2,
  FileText,
  DollarSign,
  CheckCircle2,
  Box,
  Truck,
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/currency';

interface VerificationData {
  verified: boolean;
  id: string;
  invoiceNumber: string;
  billType: string;
  invoiceDate: string;
  partyName: string;
  partyGstin?: string;
  vesselVoyage?: string;
  mblHbl?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  consigneeName?: string;
  sbNumbers?: string;
  containersCount?: number;
  taxableAmount?: number;
  grandTotal: number;
  currency: string;
  status: string;
  company: {
    name: string;
    gstin: string;
    city: string;
  };
  verifiedAt: string;
}

interface EmptyContainerVerificationPageProps {
  token: string;
}

export const EmptyContainerVerificationPage: React.FC<EmptyContainerVerificationPageProps> = ({ token }) => {
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
        const res = await api.verifyInvoice(token);
        setData(res);
      } catch (err: any) {
        console.error('Empty Container Verification error:', err);
        setError(
          err.message || 'Invalid, expired, or non-existent invoice verification token.'
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
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">MSK LOGISTIC SOLUTION</h1>
            <p className="text-xs text-slate-400">Official Document Verification Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>E-Bill Portal</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto w-full my-6 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
        {loading ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mx-auto" />
            <p className="text-slate-300 font-medium text-sm">Verifying Empty Container Bill Authenticity...</p>
            <p className="text-slate-500 text-xs font-mono">Querying MSK Secure Ledger</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white">Verification Failed</h2>
            <p className="text-sm text-red-300 max-w-md mx-auto">{error}</p>
            <div className="pt-4 border-t border-slate-700/60 text-xs text-slate-400">
              Please verify that you scanned an official MSK Logistic Solution QR code.
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Success Shield */}
            <div className="flex flex-col items-center text-center p-4 bg-teal-950/40 border border-teal-500/30 rounded-xl space-y-2">
              <div className="w-14 h-14 rounded-full bg-teal-500/20 border border-teal-400/50 flex items-center justify-center text-teal-400 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-teal-200">Official Document Verified</h2>
                <p className="text-xs text-teal-400/90">
                  This Empty Container Bill was generated & authenticated by MSK Logistic Solution.
                </p>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Verified At: {new Date(data.verifiedAt).toLocaleString('en-GB')}
              </div>
            </div>

            {/* Document Details Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-teal-400" />
                <span>Invoice Credentials</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                  <span className="text-slate-400 text-[11px] block">Invoice Number</span>
                  <span className="text-red-400 font-mono font-bold text-sm">{data.invoiceNumber}</span>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                  <span className="text-slate-400 text-[11px] block">Document Type</span>
                  <span className="text-teal-300 font-bold text-xs uppercase">Empty Container Bill</span>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                  <span className="text-slate-400 text-[11px] block">Issue Date</span>
                  <span className="text-slate-200 font-semibold">{formatDate(data.invoiceDate)}</span>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                  <span className="text-slate-400 text-[11px] block">Total Amount</span>
                  <span className="text-teal-400 font-bold font-mono text-sm">
                    ₹ {formatCurrency(data.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Recipient & Depot Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-teal-400" />
                <span>Billed Entity & Depot</span>
              </h3>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/50 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Bill To (Recipient)</span>
                  <p className="text-slate-100 font-bold text-sm">{data.partyName}</p>
                  {data.partyGstin && (
                    <p className="text-[11px] text-slate-400 font-mono">GSTIN: {data.partyGstin}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Issuing Depot:</span>
                    <span className="text-slate-300 font-semibold">MSK Nhava Sheva CFS & Empty Depot</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Depot Location:</span>
                    <span className="text-slate-300 font-semibold">Navi Mumbai, Maharashtra</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Grounding */}
            {(data.vesselVoyage || data.mblHbl || data.consigneeName || data.sbNumbers) && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-teal-400" />
                  <span>Shipment & Depot Reference</span>
                </h3>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 grid grid-cols-2 gap-2 text-xs">
                  {data.consigneeName && (
                    <div>
                      <span className="text-slate-400 text-[11px] block">Vehicle Number:</span>
                      <span className="font-mono text-slate-200 font-semibold">{data.consigneeName}</span>
                    </div>
                  )}
                  {data.sbNumbers && (
                    <div>
                      <span className="text-slate-400 text-[11px] block">EIR / LoLo Receipt:</span>
                      <span className="font-mono text-slate-200 font-semibold">{data.sbNumbers}</span>
                    </div>
                  )}
                  {data.vesselVoyage && (
                    <div>
                      <span className="text-slate-400 text-[11px] block">Vessel / Voyage:</span>
                      <span className="font-mono text-slate-200">{data.vesselVoyage}</span>
                    </div>
                  )}
                  {data.mblHbl && (
                    <div>
                      <span className="text-slate-400 text-[11px] block">Master B/L:</span>
                      <span className="font-mono text-slate-200">{data.mblHbl}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Company Authority Info */}
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/40 text-[11px] text-slate-400 space-y-1">
              <p className="font-bold text-slate-300">
                Issued By: {data.company?.name || 'MSK LOGISTIC SOLUTION'}
              </p>
              <p>
                GSTIN: <span className="font-mono text-slate-300">{data.company?.gstin || '27AXWPK4562G1ZX'}</span> | Location: {data.company?.city || 'Navi Mumbai'}
              </p>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full text-center text-xs text-slate-500 pb-4">
        <p>© {new Date().getFullYear()} MSK Logistic Solution. Secure QR Verification Engine.</p>
      </footer>
    </div>
  );
};
