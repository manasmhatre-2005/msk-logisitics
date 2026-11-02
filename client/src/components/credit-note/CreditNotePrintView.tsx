import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Download,
  CheckCircle,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Invoice } from '../../types/index';
import { formatCurrency, numberToWords } from '../../utils/currency';
import { InvoiceWatermark } from '../common/InvoiceWatermark';

interface CreditNotePrintViewProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  companySettings?: any;
  displayMode?: 'modal' | 'inline';
}

export const CreditNotePrintView: React.FC<CreditNotePrintViewProps> = ({
  invoice,
  isOpen,
  onClose,
  companySettings,
  displayMode = 'modal',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Construct verification URL
  const verifyToken = invoice.verificationToken;
  const baseUrl = window.location.origin;
  const verifyUrl = verifyToken
    ? `${baseUrl}/verify/cn/${verifyToken}`
    : `${baseUrl}/invoices`;

  // Generate QR code
  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(verifyUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code data URL:', err));
  }, [isOpen, verifyUrl]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const downloadUrl = `/api/invoices/${invoice.id}/pdf`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Credit_Note_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const formatDate = (dateVal?: Date | string | null) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  // Company info from settings or defaults
  const compName = companySettings?.companyName || 'MSK LOGISTIC SOLUTION';
  const compAddress =
    companySettings?.address ||
    'JNPT Township Colony, Sector - 3, Building No. B/48, Office No. 3';
  const compCity = companySettings?.city || 'Navi Mumbai';
  const compPincode = companySettings?.pincode || '400702';
  const compGstin = companySettings?.gstin || '27AXWPK4562G1ZX';
  const compPan = companySettings?.pan || 'AXWPK4562G';
  const compTan = companySettings?.tan || 'PNES72845D';
  const compEmail = companySettings?.email || 'accounts@msklogisticsolution.com';
  const compPhone = companySettings?.phone || '+91 8104592823';
  const compWeb = companySettings?.website || 'www.msklogisticsolution.com';

  const party = invoice.party;
  const isInterState = invoice.isInterState;
  const curr = invoice.currency === 'USD' ? '$' : '₹';
  const taxableAmount = invoice.taxableAmount ?? invoice.subtotal ?? 0;
  const totalAmount = invoice.grandTotal ?? 0;
  const words = invoice.amountInWords || numberToWords(totalAmount, invoice.currency);

  const items =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : [
          {
            containerNumber: invoice.containers?.[0]?.containerNumber || '-',
            containerSize: invoice.containers?.[0]?.size || invoice.containers?.[0]?.containerSize || '40ft',
            description: invoice.notes || 'Rate adjustment on original invoice',
            rate: taxableAmount,
            quantity: 1,
            amount: taxableAmount,
          },
        ];

  const sheetInner = (
    <div className="relative overflow-hidden w-full h-full space-y-0">
      {/* Subtle Centered Official MSK Logo Watermark (Behind all content) */}
      <InvoiceWatermark />
      <div className="relative z-10 space-y-0">
      {/* 1. Header Box with QR, Company Details, Logos */}
      <div className="border border-slate-800 grid grid-cols-12 divide-x divide-slate-300">
              {/* QR Code (Col 1-2: Width 16%) */}
              <div className="col-span-2 p-2 flex flex-col items-center justify-center text-center bg-slate-50/50">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-700 leading-tight mb-1">
                  Scan to Verify Credit Note
                </span>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Scan to Verify Credit Note"
                    className="w-16 h-16 object-contain border border-slate-200 rounded p-0.5 bg-white shadow-2xs"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-200 animate-pulse rounded flex items-center justify-center text-[8px] text-slate-400">
                    QR
                  </div>
                )}
                <span className="text-[7.5px] text-slate-500 mt-1 flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 inline" />
                  Verified
                </span>
              </div>

              {/* Company Info (Col 3-9: Width 60%) */}
              <div className="col-span-8 p-3 text-center flex flex-col justify-center">
                <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                  {compName}
                </h1>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {compAddress}, {compCity} {compPincode}.
                </p>
                <p className="text-[9.5px] font-semibold text-slate-800 mt-1">
                  TAN NO: <span className="font-mono">{compTan}</span> &nbsp;|&nbsp; PAN NO: <span className="font-mono">{compPan}</span> &nbsp;|&nbsp; GST NO: <span className="font-mono font-bold text-slate-900">{compGstin}</span>
                </p>
                <p className="text-[9.5px] text-slate-600 mt-0.5">
                  Email: <span className="text-slate-800">{compEmail}</span> &nbsp;|&nbsp; Mob No: <span className="text-slate-800">{compPhone}</span>
                </p>
                <p className="text-[9.5px] font-semibold text-red-600 mt-0.5">
                  {compWeb}
                </p>
              </div>

              {/* Company Logo & ISO Stamp (Col 10-12: Width 24%) */}
              <div className="col-span-2 p-2 flex flex-col items-center justify-between bg-slate-50/30">
                <div className="w-full flex justify-center py-1">
                  <img
                    src="/images/msk-logo.png"
                    alt="MSK Logistic Solution"
                    className="max-h-11 max-w-[90px] object-contain"
                    onError={(e) => {
                      // Fallback text if image missing
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="w-full flex flex-col items-center py-0.5 border-t border-slate-200">
                  <img
                    src="/images/iso-logo.png"
                    alt="ISO 9001:2015 Certified"
                    className="w-9 h-9 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="text-[7.5px] font-bold text-slate-700 tracking-tighter mt-0.5">
                    ISO 9001:2015
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Document Title Banner */}
            <div className="bg-[#1e293b] text-white py-1.5 px-4 text-center border-x border-b border-slate-800">
              <span className="text-xs font-black uppercase tracking-widest">
                CREDIT NOTE (CREDIT ADJUSTMENT INVOICE)
              </span>
            </div>

            {/* 3. Credit Note Information Grid (4x2 Table) */}
            <div className="border-x border-b border-slate-800 grid grid-cols-4 divide-x divide-slate-300 text-[10px]">
              {/* Row 1 */}
              <div className="p-2 border-b border-slate-200">
                <span className="text-slate-500 block text-[9px] uppercase font-medium">Credit Note No</span>
                <span className="font-bold text-red-600 font-mono text-[11px] block mt-0.5">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="p-2 border-b border-slate-200">
                <span className="text-slate-500 block text-[9px] uppercase font-medium">Date of Issue</span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {formatDate(invoice.issueDate || invoice.invoiceDate)}
                </span>
              </div>
              <div className="p-2 border-b border-slate-200">
                <span className="text-slate-500 block text-[9px] uppercase font-medium">Original Invoice No</span>
                <span className="font-bold text-slate-900 font-mono block mt-0.5">
                  {invoice.originalInvoiceNumber || '-'}
                </span>
              </div>
              <div className="p-2 border-b border-slate-200">
                <span className="text-slate-500 block text-[9px] uppercase font-medium">Original Invoice Date</span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {formatDate(invoice.originalInvoiceDate)}
                </span>
              </div>

              {/* Row 2 */}
              <div className="p-2">
                <span className="text-slate-500 block text-[9px] uppercase font-medium">Place of Supply</span>
                <span className="font-semibold text-slate-800 block mt-0.5">
                  {invoice.placeOfSupply || 'Maharashtra (27)'}
                </span>
              </div>
              <div className="p-2">
                <span className="text-slate-500 block text-[9px] uppercase font-medium">Currency</span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {invoice.currency || 'INR'}
                </span>
              </div>
              <div className="p-2">
                <span className="text-slate-500 block text-[9px] uppercase font-medium">Reason for Credit</span>
                <span className="font-semibold text-slate-800 block mt-0.5 truncate" title={invoice.reasonForCredit || 'Service Adjustment'}>
                  {invoice.reasonForCredit || 'Service Charge Adjustment'}
                </span>
              </div>
              <div className="p-2">
                <span className="text-slate-500 block text-[9px] uppercase font-medium">Status</span>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {invoice.status || 'FINAL'}
                </span>
              </div>
            </div>

            {/* 4. Side-by-Side: Recipient & Shipment Reference */}
            <div className="border-x border-b border-slate-800 grid grid-cols-2 divide-x divide-slate-800">
              {/* Left: Recipient (BILL TO) */}
              <div className="flex flex-col">
                <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 font-bold text-[10px] text-slate-800 uppercase tracking-wide">
                  BILL TO (RECIPIENT)
                </div>
                <div className="p-3 text-[10px] space-y-1">
                  <p className="font-bold text-slate-900 text-[11px]">
                    {party?.legalName || invoice.billToName || 'N/A'}
                  </p>
                  <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                    {party?.address || party?.registeredAddress || invoice.billToAddress || '-'}
                  </p>
                  {(party?.city || party?.pincode) && (
                    <p className="text-slate-600">
                      City: {party.city || '-'} | PIN: {party.pincode || '-'}
                    </p>
                  )}
                  <p className="pt-1 text-slate-800 font-medium">
                    GSTIN: <span className="font-mono font-bold">{party?.gstin || invoice.billToGstin || '-'}</span>
                    {party?.pan && (
                      <span className="ml-3">
                        PAN: <span className="font-mono">{party.pan}</span>
                      </span>
                    )}
                  </p>
                  <p className="text-slate-600">
                    State: {party?.state || '-'} ({party?.stateCode || '-'})
                  </p>
                </div>
              </div>

              {/* Right: Shipment Reference */}
              <div className="flex flex-col">
                <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 font-bold text-[10px] text-slate-800 uppercase tracking-wide">
                  SHIPMENT REFERENCE
                </div>
                <div className="p-3 text-[10px] space-y-1.5">
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Vessel / Voyage:</span>
                    <span className="col-span-2 font-semibold text-slate-800">
                      {invoice.vesselVoyage || '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">MBL / HBL Ref:</span>
                    <span className="col-span-2 font-semibold text-slate-800 font-mono">
                      {invoice.mblHbl || invoice.sbNumbers || '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Port of Loading:</span>
                    <span className="col-span-2 font-semibold text-slate-800">
                      {invoice.portOfLoading || '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Port of Discharge:</span>
                    <span className="col-span-2 font-semibold text-slate-800">
                      {invoice.portOfDischarge || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Credit Adjustment Table (6 Columns with Charcoal Header) */}
            <div className="border-x border-b border-slate-800 overflow-hidden">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="bg-[#1e293b] text-white divide-x divide-slate-600 font-bold text-[9px] tracking-wider uppercase">
                    <th className="py-2 px-2 text-center w-8">SR.</th>
                    <th className="py-2 px-2.5 w-36">CONTAINER NO. & SIZE</th>
                    <th className="py-2 px-3">DESCRIPTION OF SERVICE ADJUSTMENT</th>
                    <th className="py-2 px-3 text-right w-24">RATE ({invoice.currency || 'INR'})</th>
                    <th className="py-2 px-2 text-center w-14">QTY</th>
                    <th className="py-2 px-3 text-right w-28">CREDIT VALUE ({invoice.currency || 'INR'})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item: any, idx: number) => {
                    const cNum = item.containerNumber || invoice.containers?.[idx]?.containerNumber || '-';
                    const cSize = item.containerSize || invoice.containers?.[idx]?.size || '';
                    const containerLabel = cSize ? `${cNum} (${cSize})` : cNum;

                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-2 px-2 text-center text-slate-500 font-mono border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-medium text-slate-800 border-r border-slate-200">
                          {containerLabel}
                        </td>
                        <td className="py-2 px-3 text-slate-900 border-r border-slate-200">
                          <p className="font-medium">{item.description}</p>
                          {item.notes && <p className="text-[9px] text-slate-500 mt-0.5">{item.notes}</p>}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800 border-r border-slate-200">
                          {formatCurrency(item.rate, invoice.currency)}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-800 border-r border-slate-200">
                          {item.quantity ?? 1}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.amount, invoice.currency)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty rows padding for document balance */}
                  {items.length < 3 &&
                    Array.from({ length: 3 - items.length }).map((_, padIdx) => (
                      <tr key={`pad-${padIdx}`} className="bg-white">
                        <td className="py-3 px-2 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-2.5 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-3 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-3 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-2 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-3">&nbsp;</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* 6. Summary & Signatory Section (Split Left & Right) */}
            <div className="border-x border-b border-slate-800 grid grid-cols-12 divide-x divide-slate-800">
              {/* Left Column (Col 1-7): Amount in Words & Notes */}
              <div className="col-span-7 p-3 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">
                    Total credit amount in words:
                  </span>
                  <p className="font-bold text-[10px] text-slate-900 uppercase mt-0.5 leading-snug">
                    {words}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[9px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800 uppercase tracking-wide">
                    NOTES & STATUTORY COMPLIANCE:
                  </p>
                  <p className="leading-relaxed">
                    1. This Credit Note is issued in accordance with <strong>Section 34 of the CGST Act, 2017</strong> against Original Tax Invoice <strong>{invoice.originalInvoiceNumber || 'referenced above'}</strong>.
                  </p>
                  <p className="leading-relaxed">
                    2. Input Tax Credit (ITC) reversed shall be adjusted in relevant GSTR-1 and GSTR-3B monthly tax filings.
                  </p>
                  <p className="leading-relaxed">
                    3. All credit adjustments are subject to mutual reconciliation of operational accounts.
                  </p>
                </div>
              </div>

              {/* Right Column (Col 8-12): Tax Calculations & Signature */}
              <div className="col-span-5 flex flex-col justify-between">
                {/* Tax Table */}
                <div className="p-3 space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Subtotal Taxable Amount:</span>
                    <span className="font-mono font-semibold">
                      {curr} {formatCurrency(taxableAmount, invoice.currency)}
                    </span>
                  </div>

                  {isInterState ? (
                    <div className="flex justify-between items-center text-purple-700 font-medium">
                      <span>Add: IGST ({invoice.igstRate || 18}%):</span>
                      <span className="font-mono font-bold">
                        {curr} {formatCurrency(invoice.igstAmount, invoice.currency)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-purple-700 font-medium">
                        <span>Add: CGST ({invoice.cgstRate || 9}%):</span>
                        <span className="font-mono font-bold">
                          {curr} {formatCurrency(invoice.cgstAmount, invoice.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-purple-700 font-medium">
                        <span>Add: SGST ({invoice.sgstRate || 9}%):</span>
                        <span className="font-mono font-bold">
                          {curr} {formatCurrency(invoice.sgstAmount, invoice.currency)}
                        </span>
                      </div>
                    </>
                  )}

                  {invoice.roundOff && Math.abs(invoice.roundOff) > 0.001 ? (
                    <div className="flex justify-between items-center text-slate-500 text-[9px]">
                      <span>Round Off:</span>
                      <span className="font-mono">
                        {curr} {formatCurrency(invoice.roundOff, invoice.currency)}
                      </span>
                    </div>
                  ) : null}

                  {/* Grand Total Bar */}
                  <div className="pt-2 border-t border-slate-300 flex justify-between items-center font-bold">
                    <span className="text-slate-900 uppercase tracking-tight">TOTAL CREDIT VALUE:</span>
                    <span className="text-sm font-mono text-red-600">
                      {curr} {formatCurrency(totalAmount, invoice.currency)}
                    </span>
                  </div>
                </div>

                {/* Signatory Area */}
                <div className="border-t border-slate-300 p-2.5 text-center bg-slate-50/50">
                  <p className="font-bold text-[10px] text-slate-900">
                    For {compName}
                  </p>
                  <div className="h-10 flex items-center justify-center">
                    {companySettings?.signatureUrl ? (
                      <img
                        src={companySettings.signatureUrl}
                        alt="Signature"
                        className="max-h-9 object-contain"
                      />
                    ) : (
                      <span className="text-[9px] text-slate-300 italic">Authorised Signature & Stamp</span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500 border-t border-dashed border-slate-300 pt-1 mt-1 font-medium">
                    Authorised Signatory
                  </p>
                </div>
              </div>
            </div>

            {/* Footer QR Verification Callout */}
            <div className="mt-3 text-center text-[8.5px] text-slate-400 flex items-center justify-center gap-1.5 print:mt-1">
              <ShieldCheck className="w-3 h-3 text-slate-400" />
              <span>
                Digitally generated and verified document. Original certificate token: <strong className="font-mono text-slate-600">{verifyToken || 'N/A'}</strong>
              </span>
            </div>
      </div>
    </div>
  );

  if (displayMode === 'inline') {
    return (
      <div
        ref={printContainerRef}
        className="bg-white text-slate-900 border border-slate-300 shadow-sm rounded-xl w-full p-6 sm:p-7 text-[11px] leading-tight font-sans space-y-3"
      >
        {sheetInner}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex justify-center p-0 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-700/80 rounded-none sm:rounded-2xl w-full max-w-5xl h-full sm:h-[94vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:h-auto print:w-full">
        {/* Top Floating Control Bar - Sticky */}
        <div className="bg-slate-900/95 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between no-print sticky top-0 z-10 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
              <ShieldCheck className="w-4 h-4" />
              <span>Official Credit Note (Rule 53)</span>
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Ref: {invoice.invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {verifyToken && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                title="Copy Verification Link"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Verify URL</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-red-400" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors ml-2"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container with Independent Vertical Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/70 print:p-0 print:bg-white print:overflow-visible">
          {/* A4 Sheet with Exact Format Matching Reference Image */}
          <div
            ref={printContainerRef}
            className="bg-white text-slate-900 shadow-xl border border-slate-300 w-full max-w-[794px] p-6 text-[11px] leading-tight print:shadow-none print:border-none print:p-2 print:max-w-none"
            style={{ minHeight: '1080px' }}
          >
            {sheetInner}
          </div>
        </div>
      </div>
    </div>
  );
};
