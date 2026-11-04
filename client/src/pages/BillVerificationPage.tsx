import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Calendar,
  Building2,
  FileText,
  DollarSign,
  Download,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Truck,
  Box,
  Eye,
  EyeOff,
  Ship,
  Phone,
  Mail,
  MapPin,
  Landmark,
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';
import { InvoicePrintView } from '../components/invoice/InvoicePrintView';

interface BillVerificationPageProps {
  token: string;
}

export const BillVerificationPage: React.FC<BillVerificationPageProps> = ({ token }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showFullDocument, setShowFullDocument] = useState(false);

  useEffect(() => {
    if (!token || !token.trim()) {
      setError('Bill verification link is invalid or unavailable.');
      setLoading(false);
      return;
    }

    const verify = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.verifyBill(token.trim());
        if (res && res.verified) {
          setData(res);
        } else {
          setError(res?.error || 'Bill verification link is invalid or unavailable.');
        }
      } catch (err: any) {
        console.error('Bill verification error:', err);
        setError(err.message || 'Bill verification link is invalid or unavailable.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  const formatDate = (d?: string | Date | null) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDownloadPdf = async () => {
    if (!data?.verificationToken || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await api.downloadVerifiedBillPdf(data.verificationToken, data.invoiceNumber);
    } catch (err: any) {
      alert(err.message || 'Failed to download verified bill PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getBillTypeTitle = (billType?: string) => {
    switch (billType) {
      case 'CREDIT_NOTE':
        return 'Credit Note';
      case 'HT_BILL':
        return 'H & T Tax Invoice';
      case 'EMPTY_CONTAINER':
        return 'Empty Container Bill';
      case 'FORWARDING':
      default:
        return 'Tax Invoice / Forwarding Bill';
    }
  };

  const isCancelled = data?.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-6 font-sans">
      {/* Top MSK Header */}
      <header className="max-w-4xl mx-auto w-full pt-2 pb-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-md">
            <img
              src="/images/msk-logo.png"
              alt="MSK Logo"
              className="max-h-10 max-w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-wide text-white uppercase">
              MSK LOGISTIC SOLUTION
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400">
              Official Document Verification Registry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex text-[10px] font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            ISO 9001:2015
          </span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Copy verification URL"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full my-auto py-6">
        {loading ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center space-y-4 max-w-md mx-auto shadow-2xl">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-base font-bold text-white">Verifying MSK Bill...</h2>
            <p className="text-xs text-slate-400 font-mono">
              Validating cryptographic token against authentic ledger
            </p>
          </div>
        ) : error ? (
          <div className="bg-white text-slate-900 rounded-3xl p-8 sm:p-10 text-center space-y-5 max-w-lg mx-auto shadow-2xl border border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Document Verification Error</h2>
              <p className="text-sm font-semibold text-red-600 mt-2 bg-red-50 py-2 px-3 rounded-lg border border-red-100">
                {error}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 text-left space-y-1">
              <p className="font-semibold text-slate-700">Possible reasons:</p>
              <ul className="list-disc list-inside text-[11px] text-slate-500 space-y-0.5">
                <li>The verification token has expired or is invalid.</li>
                <li>The bill was generated from an outdated test run.</li>
                <li>The URL was mistyped or truncated.</li>
              </ul>
            </div>
            <div className="pt-2 text-xs text-slate-500">
              For verification queries, contact MSK Accounts:{' '}
              <a href="mailto:accounts@msklogisticsolution.com" className="text-red-600 font-bold hover:underline">
                accounts@msklogisticsolution.com
              </a>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Authenticated Verification Card */}
            <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Status Header Banner */}
              {isCancelled ? (
                <div className="bg-red-600 text-white p-5 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                    <XCircle className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-red-800 px-3 py-0.5 rounded-full mb-1">
                    OFFICIAL STATUS: REVOKED
                  </span>
                  <h2 className="text-xl font-black tracking-tight">DOCUMENT CANCELLED / REVOKED</h2>
                  <p className="text-xs text-red-100 mt-0.5 max-w-md">
                    This bill has been officially cancelled by MSK Logistic Solution. It is no longer valid for accounting, customs, or operational clearance.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-600 text-white p-5 sm:p-6 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-800/80 px-3 py-0.5 rounded-full mb-1">
                    OFFICIAL VERIFIED DOCUMENT
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    Authentic {getBillTypeTitle(data.billType)}
                  </h2>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Issued by {data.company?.name || 'MSK LOGISTIC SOLUTION'} • ISO 9001:2015 Certified
                  </p>
                  <p className="text-[11px] font-mono text-emerald-200 mt-1">
                    Verified: {new Date(data.verifiedAt || Date.now()).toLocaleString('en-IN')}
                  </p>
                </div>
              )}

              {/* Main Document Details */}
              <div className="p-5 sm:p-8 space-y-6 text-xs">
                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Bill / Invoice No
                    </span>
                    <span className="text-sm sm:text-base font-black font-mono text-red-600 block mt-0.5">
                      {data.invoiceNumber}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Bill Type
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 block mt-0.5">
                      {getBillTypeTitle(data.billType)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Bill Date
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 block mt-0.5">
                      {formatDate(data.invoiceDate)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Payment Status
                    </span>
                    <span
                      className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isCancelled
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : data.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {data.status || 'PENDING'}
                    </span>
                  </div>
                </div>

                {/* Amount Box */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-900 block">
                      Grand Total Amount
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-red-600 block mt-0.5">
                      {getCurrencySymbol(data.currency)} {formatCurrency(data.grandTotal, data.currency)}
                    </span>
                    {data.amountInWords && (
                      <span className="text-[10px] font-semibold text-slate-600 block mt-1 uppercase">
                        {data.amountInWords}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Tax Breakdown</span>
                    <div className="text-xs text-slate-700 space-y-0.5">
                      <div>Taxable Value: <span className="font-mono font-bold">{getCurrencySymbol(data.currency)} {formatCurrency(data.taxableAmount, data.currency)}</span></div>
                      <div>Total GST: <span className="font-mono font-bold text-purple-700">{getCurrencySymbol(data.currency)} {formatCurrency(data.totalGst, data.currency)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Billed To / Party Details */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
                    <Building2 className="w-4 h-4 text-red-600" />
                    <span className="uppercase tracking-wide text-xs">Billed To (Party Details)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <p className="font-bold text-sm text-slate-900">{data.billToName}</p>
                      {data.party?.tradeName && data.party.tradeName !== data.billToName && (
                        <p className="text-[11px] text-slate-500">{data.party.tradeName}</p>
                      )}
                      <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                        {data.billToAddress || 'Registered Address On File'}
                      </p>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div>
                        <span className="text-slate-500">GSTIN / UIN: </span>
                        <span className="font-mono font-bold text-slate-900">{data.billToGstin || 'URP'}</span>
                      </div>
                      {data.party?.pan && (
                        <div>
                          <span className="text-slate-500">PAN: </span>
                          <span className="font-mono font-semibold text-slate-800">{data.party.pan}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">State / Code: </span>
                        <span className="font-semibold text-slate-800">{data.billToState || 'Maharashtra'} ({data.billToStateCode || '27'})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operational Details (Vessel, Job, Port, Containers) */}
                {(data.job || data.vesselVoyage || data.portOfLoading || data.containers?.length > 0) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
                      <Ship className="w-4 h-4 text-red-600" />
                      <span className="uppercase tracking-wide text-xs">Shipment & Operational Tracking</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                      {data.job?.jobNumber && (
                        <div>
                          <span className="text-slate-500 block">Job Number:</span>
                          <span className="font-bold font-mono text-slate-900">{data.job.jobNumber}</span>
                        </div>
                      )}
                      {data.vesselVoyage && (
                        <div>
                          <span className="text-slate-500 block">Vessel & Voyage:</span>
                          <span className="font-bold text-slate-900">{data.vesselVoyage}</span>
                        </div>
                      )}
                      {data.mblHbl && (
                        <div>
                          <span className="text-slate-500 block">MBL / HBL:</span>
                          <span className="font-mono font-bold text-slate-900">{data.mblHbl}</span>
                        </div>
                      )}
                      {data.portOfLoading && (
                        <div>
                          <span className="text-slate-500 block">Port of Loading:</span>
                          <span className="font-semibold text-slate-900">{data.portOfLoading}</span>
                        </div>
                      )}
                    </div>

                    {/* Containers List */}
                    {data.containers && data.containers.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                          Containers ({data.containers.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {data.containers.map((c: any, idx: number) => (
                            <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-900">{c.containerNumber}</span>
                              <span className="text-slate-500 font-medium">{c.size} {c.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Itemized Charges Table */}
                {data.items && data.items.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Itemized Services Breakdown ({data.items.length} items):
                    </span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2 w-8 text-center">#</th>
                            <th className="p-2">Description</th>
                            <th className="p-2 w-20 text-center">HSN/SAC</th>
                            <th className="p-2 w-14 text-center">Qty</th>
                            <th className="p-2 w-20 text-right">Rate</th>
                            <th className="p-2 w-24 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {data.items.map((item: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="p-2 text-center text-slate-400">{item.srNo || i + 1}</td>
                              <td className="p-2 font-medium text-slate-900">{item.description}</td>
                              <td className="p-2 text-center font-mono text-slate-600">{item.hsnSac || '-'}</td>
                              <td className="p-2 text-center font-mono">{item.quantity || 1}</td>
                              <td className="p-2 text-right font-mono">{formatCurrency(item.rate, data.currency)}</td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(item.amount, data.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="flex-1 min-w-[200px] flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                  >
                    {downloadingPdf ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>{downloadingPdf ? 'Generating PDF...' : 'Download Verified PDF'}</span>
                  </button>

                  <button
                    onClick={() => setShowFullDocument((prev) => !prev)}
                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold py-3 px-4 rounded-xl transition border border-slate-700 cursor-pointer text-xs sm:text-sm"
                  >
                    {showFullDocument ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showFullDocument ? 'Hide Full Bill Preview' : 'View Original Bill Layout'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Embedded Full Bill Format View */}
            {showFullDocument && (
              <div className="bg-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-700">
                <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <FileText className="w-5 h-5 text-red-500" />
                    <span>Exact Original Bill Format Preview</span>
                  </div>
                  <button
                    onClick={() => setShowFullDocument(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                  >
                    <EyeOff className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-x-auto flex justify-center">
                  <InvoicePrintView
                    invoice={data}
                    displayMode="inline"
                    onClose={() => setShowFullDocument(false)}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>

      {/* Corporate Verification Footer */}
      <footer className="max-w-4xl mx-auto w-full pt-6 pb-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">MSK LOGISTIC SOLUTION</span>
            <span>•</span>
            <span>GSTIN: 27AXWPK4562G1ZX</span>
            <span>•</span>
            <span>PAN: AXWPK4562G</span>
          </div>
          <div>
            ISO 9001:2015 Registered Logistics Provider
          </div>
        </div>
        <p className="text-[10px] text-slate-500">
          JNPT Township Colony, Sector - 3, Building No. B/48, Office No. 3, Navi Mumbai - 400702 • Phone: +91 8104592823 • Email: accounts@msklogisticsolution.com
        </p>
      </footer>
    </div>
  );
};
