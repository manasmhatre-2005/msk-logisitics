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
  Truck,
  Box,
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

interface HtBillVerificationPageProps {
  token: string;
}

export const HtBillVerificationPage: React.FC<HtBillVerificationPageProps> = ({ token }) => {
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
        const res = await api.verifyHtBill(token);
        setData(res);
      } catch (err: any) {
        console.error('H&T Verification error:', err);
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
                Verifying H & T Tax Invoice...
              </h2>
              <p className="text-xs text-slate-500">
                Contacting MSK Logistic ERP document registry...
              </p>
            </div>
          ) : error || !data ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Verification Failed
                </h2>
                <p className="text-xs text-red-600 mt-1 max-w-sm mx-auto">
                  {error || 'Unable to authenticate this document.'}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto pt-2 border-t border-slate-100">
                This verification URL may be invalid, or the record has been revoked. If you believe this is an error, please contact MSK Logistic Solution accounts desk at accounts@msklogisticsolution.com.
              </p>
            </div>
          ) : (
            <div>
              {/* Success Badge Banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white flex items-center gap-3.5">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-xs rounded-2xl flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                      GENUINE RECORD
                    </span>
                    <span className="text-[10px] text-emerald-100 font-mono">
                      {formatDate(data.verifiedAt)}
                    </span>
                  </div>
                  <h2 className="text-base font-bold tracking-tight mt-0.5">
                    H & T Tax Invoice Verified Authentic
                  </h2>
                </div>
              </div>

              {/* Verified Details */}
              <div className="p-6 space-y-4">
                {/* Invoice Numbers & Status */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Invoice Number
                    </span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {data.invoiceNumber}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Document Type
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100/70 px-2 py-0.5 rounded">
                      <Truck className="w-3.5 h-3.5" />
                      H & T Bill
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Invoice Date
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {formatDate(data.invoiceDate)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Lifecycle Status
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {data.status || 'FINALIZED'}
                    </span>
                  </div>
                </div>

                {/* Recipient & Shipment Info */}
                <div className="border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Billed Recipient
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {data.partyName}
                    </span>
                    {data.partyGstin && (
                      <span className="block text-[11px] text-slate-600 font-mono mt-0.5">
                        GSTIN: {data.partyGstin}
                      </span>
                    )}
                  </div>

                  {(data.vesselVoyage || data.mblHbl) && (
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Vessel/Voyage:</span>
                        <span className="font-semibold text-slate-800">{data.vesselVoyage || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">MBL / HBL:</span>
                        <span className="font-mono text-slate-800">{data.mblHbl || '-'}</span>
                      </div>
                    </div>
                  )}

                  {(data.portOfLoading || data.portOfDischarge) && (
                    <div className="pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-[10px] text-slate-400 block">Port Route:</span>
                      <span className="font-semibold text-slate-800">
                        {data.portOfLoading || 'Nhava Sheva'} → {data.portOfDischarge || 'Destination'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Amount Highlight */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total Verified Invoice Value
                    </span>
                    <span className="text-xl font-black text-white font-mono mt-0.5 block">
                      ₹ {formatCurrency(data.grandTotal)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-700/50">
                      Tax Compliant
                    </span>
                  </div>
                </div>

                {/* Issuing Authority */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Issued & Authenticated By
                  </span>
                  <p className="text-xs font-black text-slate-900 uppercase">
                    {data.company.name}
                  </p>
                  <p className="text-[10px] text-slate-600 font-mono">
                    GSTIN: {data.company.gstin} | {data.company.city}
                  </p>
                </div>
              </div>

              {/* Disclaimer Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-center text-[10px] text-slate-500">
                Document digitally recorded and verified against MSK Logistic ERP ledger.
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full text-center text-[10px] text-slate-500 pb-2">
        &copy; {new Date().getFullYear()} MSK Logistic Solution. ISO 9001:2015 Certified Logistics Partner.
      </footer>
    </div>
  );
};
