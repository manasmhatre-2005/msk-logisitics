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
  Mail,
  MessageSquare,
} from 'lucide-react';
import { Invoice } from '../../types/index';
import { formatCurrency, numberToIndianWords } from '../../utils/currency';
import { WhatsAppSendModal } from '../whatsapp/WhatsAppSendModal';
import { EmailSendModal } from '../email/EmailSendModal';
import { api } from '../../services/api';

interface HtBillPrintViewProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  companySettings?: any;
  displayMode?: 'modal' | 'inline';
}

export const HtBillPrintView: React.FC<HtBillPrintViewProps> = ({
  invoice,
  isOpen,
  onClose,
  companySettings,
  displayMode = 'modal',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Construct verification URL
  const verifyToken = invoice.verificationToken;
  const baseUrl = window.location.origin;
  const verifyUrl = verifyToken
    ? `${baseUrl}/verify/ht/${verifyToken}`
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
    const url = api.getInvoicePdfUrl(invoice.id);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HT_Invoice_${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyVerifyUrl = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const settings = companySettings || {
    companyName: 'MSK LOGISTIC SOLUTION',
    address: 'JNPT Township Colony, Sector - 3, Building No. B/48, Office No. 3, Navi Mumbai 400702',
    gstin: '27AXWPK4562G1ZX',
    pan: 'AXWPK4562G',
    email: 'accounts@msklogisticsolution.com',
    website: 'www.msklogisticsolution.com',
    bankName: 'ICICI Bank',
    bankAccountName: 'MSK LOGISTIC SOLUTION',
    bankAccountNo: '574005000006',
    bankIfsc: 'ICIC0005740',
    bankBranch: 'Dronagiri Node (Nhava Sheva)',
  };

  const formatDate = (dateVal?: any) => {
    if (!dateVal) return '-';
    const dt = new Date(dateVal);
    if (isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const calcDays = (d1: any, d2: any, stored?: number) => {
    if (stored !== undefined && stored !== null && Number(stored) > 0) return `${stored} Days`;
    if (!d1 || !d2) return '-';
    const dt1 = new Date(d1).getTime();
    const dt2 = new Date(d2).getTime();
    if (isNaN(dt1) || isNaN(dt2) || dt2 < dt1) return '-';
    const diff = Math.max(0, Math.round((dt2 - dt1) / (1000 * 3600 * 24)));
    return `${diff} Days`;
  };

  const containers = (invoice.containers && invoice.containers.length > 0)
    ? invoice.containers
    : [
        {
          containerNumber: 'MSCU4810294',
          size: "40' HC",
          type: 'Dry',
          emptyGateInDate: '2026-10-12',
          stuffingDate: '2026-10-15',
          cartingDate: '2026-10-19',
          lddOutDate: '2026-10-24',
          emptyGroundDays: 3,
          daysAfterCarting: 4,
          loadedGroundDays: 5,
        },
        {
          containerNumber: 'MSCU9182740',
          size: "40' HC",
          type: 'Dry',
          emptyGateInDate: '2026-10-12',
          stuffingDate: '2026-10-16',
          cartingDate: '2026-10-20',
          lddOutDate: '2026-10-24',
          emptyGroundDays: 4,
          daysAfterCarting: 4,
          loadedGroundDays: 4,
        },
      ];

  const items = (invoice.items && invoice.items.length > 0)
    ? invoice.items
    : [
        { srNo: 1, description: 'Ocean Freight Charges (Base Carrier Contracted Rates)', hsnSacCode: '996521', rate: 140000, quantity: 2, taxableValue: 280000 },
        { srNo: 2, description: 'Empty Container Depot Supervision & Detention Fees (Total 7 Days)', hsnSacCode: '996719', rate: 1200, quantity: 7, taxableValue: 8400 },
        { srNo: 3, description: 'Cargo Staging & Warehouse Handling (Cargo Days: Total 8 Days)', hsnSacCode: '996729', rate: 2500, quantity: 8, taxableValue: 20000 },
        { srNo: 4, description: 'Loaded Ground Rent & Port Terminal Storage (Loaded Days: Total 9 Days)', hsnSacCode: '996711', rate: 1800, quantity: 9, taxableValue: 16200 },
        { srNo: 5, description: 'Terminal Handling Charges (THC) & Origin Drayage Services', hsnSacCode: '996713', rate: 18500, quantity: 2, taxableValue: 37000 },
      ];

  const taxableAmount = invoice.taxableAmount || 361600;
  const cgstAmount = invoice.cgstAmount !== undefined ? invoice.cgstAmount : 32544;
  const sgstAmount = invoice.sgstAmount !== undefined ? invoice.sgstAmount : 32544;
  const igstAmount = invoice.igstAmount !== undefined ? invoice.igstAmount : 0;
  const grandTotal = invoice.grandTotal || 426688;
  const cgstRate = invoice.cgstRate || 9;
  const sgstRate = invoice.sgstRate || 9;
  const igstRate = invoice.igstRate || 18;
  const isInterState = igstAmount > 0;

  const rawWords = invoice.amountInWords || numberToIndianWords(grandTotal);
  let formattedWords = rawWords;
  if (!formattedWords.toLowerCase().startsWith('inr') && !formattedWords.toLowerCase().startsWith('rs')) {
    formattedWords = `INR ${formattedWords}`;
  }
  if (!formattedWords.toLowerCase().endsWith('only')) {
    formattedWords = `${formattedWords} Only`;
  }

  const sheetInner = (
    <>
      {/* ========================================== */}
      {/* 1. TOP HEADER (QR CODE, MSK BRANDING & TAX INVOICE) */}
        {/* ========================================== */}
        <div className="border border-slate-900 grid grid-cols-12 items-center p-2.5 gap-3">
          {/* QR Code Verification Box (Left) */}
          <div className="col-span-2 flex flex-col items-center justify-center border border-slate-200 rounded p-1 bg-slate-50/50">
            <span className="text-[7.5px] font-bold text-slate-800 mb-1 uppercase tracking-tight text-center">
              Scan to Verify
            </span>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Verification" className="w-14 h-14 object-contain" />
            ) : (
              <div className="w-14 h-14 bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">
                QR Code
              </div>
            )}
            <span className="text-[6.5px] text-slate-500 font-mono mt-0.5">MSK ERP</span>
          </div>

          {/* MSK Company Branding & Registration (Center-Left) */}
          <div className="col-span-6 space-y-1">
            <div className="flex items-center gap-2">
              <img
                src={settings?.logoUrl || '/images/msk-logo.png'}
                alt="MSK Logo"
                className="h-8 w-auto object-contain bg-white rounded"
              />
              <h1 className="text-base font-black tracking-tight text-red-600 uppercase">
                {settings?.companyName || 'MSK LOGISTIC SOLUTION'}
              </h1>
            </div>
            <p className="text-[9.5px] text-slate-700 leading-snug">
              {settings?.address || 'JNPT Township Colony, Sector - 3, Building No. B/48, Office No. 3, Navi Mumbai 400702'}
            </p>
            <p className="text-[9.5px] font-bold text-slate-900">
              GSTIN: <span className="font-mono">{settings?.gstin || '27AXWPK4562G1ZX'}</span> | PAN: <span className="font-mono">{settings?.pan || 'AXWPK4562G'}</span>
            </p>
            <p className="text-[8.5px] text-slate-500">
              Email: {settings?.email || 'accounts@msklogisticsolution.com'} | Web: {settings?.website || 'www.msklogisticsolution.com'}
            </p>
          </div>

          {/* Tax Invoice Details (Right) */}
          <div className="col-span-4 text-right space-y-1 pl-2 border-l border-slate-200">
            <h2 className="text-xl font-black text-slate-950 tracking-tight uppercase">
              TAX INVOICE
            </h2>
            <p className="text-xs font-bold text-slate-900">
              Invoice No: <span className="font-mono text-red-700 font-black">{invoice.invoiceNumber}</span>
            </p>
            <p className="text-[10.5px] text-slate-700">
              Date: <span className="font-semibold text-slate-900">{formatDate(invoice.invoiceDate)}</span>
            </p>
            <p className="text-[10px] font-semibold text-slate-600">
              Place of Supply: <span className="text-slate-900">{invoice.billToState ? `${invoice.billToState} (Code ${invoice.billToStateCode || '27'})` : 'Maharashtra (Code 27)'}</span>
            </p>
          </div>
        </div>

        {/* ========================================== */}
        {/* 2. BILL TO & SHIPMENT REFERENCE (TWO COLUMNS) */}
        {/* ========================================== */}
        <div className="border border-slate-900 grid grid-cols-12 text-[10.5px]">
          {/* Bill To */}
          <div className="col-span-6 p-2.5 border-r border-slate-900 space-y-1 bg-white">
            <div className="text-[10px] font-black text-slate-900 uppercase tracking-wider pb-0.5 border-b border-slate-100">
              BILL TO (RECIPIENT):
            </div>
            <p className="text-xs font-bold text-slate-950">{invoice.billToName || 'RECIPIENT PARTY'}</p>
            <p className="text-slate-700 whitespace-pre-line leading-relaxed text-[10px]">
              {invoice.billToAddress || 'Registered Office Address'}
            </p>
            <p className="text-slate-900 font-bold pt-1 text-[10px]">
              GSTIN: <span className="font-mono">{invoice.billToGstin || 'URP'}</span>
            </p>
          </div>

          {/* Shipment Reference */}
          <div className="col-span-6 p-2.5 space-y-1.5 bg-slate-50/30">
            <div className="text-[10px] font-black text-slate-900 uppercase tracking-wider pb-0.5 border-b border-slate-200">
              SHIPMENT REFERENCE:
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">Vessel/Voyage:</span>
              <span className="col-span-2 font-bold text-slate-900 font-mono">
                {invoice.vesselVoyage || 'Pacific Pioneer / V-042E'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">MBL / HBL No:</span>
              <span className="col-span-2 font-bold text-slate-900 font-mono">
                {invoice.mblHbl || 'MEDU67201948 / AGLPNE0941'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">Port of Loading/Discharge:</span>
              <span className="col-span-2 font-bold text-slate-900">
                {invoice.portOfLoading || 'Nhava Sheva (INNSA)'} / {invoice.portOfDischarge || 'Rotterdam (NLRTM)'}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* 3. SECTION 1 — CONTAINER TRACKING, MILESTONES & PERIOD CALCULATIONS */}
        {/* ========================================== */}
        <div className="space-y-1">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
            1. CONTAINER TRACKING, MILESTONES & PERIOD CALCULATIONS
          </h3>
          <div className="border border-slate-900 overflow-hidden">
            <table className="w-full text-center border-collapse text-[10px]">
              <thead>
                {/* Super-Header Row */}
                <tr className="border-b border-slate-900 font-bold text-[9px] uppercase tracking-wider">
                  <th className="bg-slate-800 text-white p-1 border-r border-slate-700 w-[24%]">
                    Container Details
                  </th>
                  <th colSpan={4} className="bg-slate-700 text-white p-1 border-r border-slate-600">
                    OPERATIONAL MILESTONE TIMELINE DATES
                  </th>
                  <th colSpan={3} className="bg-slate-800 text-white p-1">
                    DAYS CALCULATION BREAKDOWN
                  </th>
                </tr>
                {/* Column Headers */}
                <tr className="bg-slate-900 text-white font-bold text-[8.5px] uppercase border-b border-slate-900">
                  <th className="p-1.5 border-r border-slate-700 text-left pl-2">CONTAINER NO. & SIZE/TYPE</th>
                  <th className="p-1.5 border-r border-slate-700 w-[11%]">EMPTY PICK-UP</th>
                  <th className="p-1.5 border-r border-slate-700 w-[11%]">STUFFING DATE</th>
                  <th className="p-1.5 border-r border-slate-700 w-[11%]">CARTING DATE</th>
                  <th className="p-1.5 border-r border-slate-700 w-[11%]">LOADED GATE-IN</th>
                  <th className="p-1.5 border-r border-slate-700 w-[11%]">EMPTY DAYS<br/><span className="text-[7.5px] font-normal text-slate-300">(PICK-UP TO STUFF)</span></th>
                  <th className="p-1.5 border-r border-slate-700 w-[11%]">CARGO DAYS<br/><span className="text-[7.5px] font-normal text-slate-300">(STUFF TO CART)</span></th>
                  <th className="p-1.5 w-[11%]">LOADED DAYS<br/><span className="text-[7.5px] font-normal text-slate-300">(CART TO GATE-IN)</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {containers.map((c: any, idx: number) => {
                  const emptyD = calcDays(c.emptyGateInDate, c.stuffingDate, c.emptyGroundDays);
                  const cargoD = calcDays(c.stuffingDate, c.cartingDate, c.daysAfterCarting);
                  const loadedD = calcDays(c.cartingDate, c.lddOutDate, c.loadedGroundDays);

                  return (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                      <td className="p-1.5 border-r border-slate-200 text-left pl-2">
                        <div className="font-bold text-slate-950 font-mono text-[10.5px]">
                          {c.containerNumber}
                        </div>
                        <div className="text-[8.5px] text-slate-500 font-medium">
                          {c.size || "40'"} {c.type || 'HC (Dry)'}
                        </div>
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-800 font-medium">
                        {formatDate(c.emptyGateInDate)}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-800 font-medium">
                        {formatDate(c.stuffingDate)}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-800 font-medium">
                        {formatDate(c.cartingDate)}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-800 font-medium">
                        {formatDate(c.lddOutDate)}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 font-bold text-teal-700 bg-teal-50/30">
                        {emptyD}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 font-bold text-teal-700 bg-teal-50/30">
                        {cargoD}
                      </td>
                      <td className="p-1.5 font-bold text-teal-700 bg-teal-50/30">
                        {loadedD}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================== */}
        {/* 4. SECTION 2 — ITEMISED FINANCIAL CHARGE PARTICULARS */}
        {/* ========================================== */}
        <div className="space-y-1">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
            2. ITEMISED FINANCIAL CHARGE PARTICULARS
          </h3>
          <div className="border border-slate-900 overflow-hidden">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[8.5px] uppercase border-b border-slate-900">
                  <th className="p-1.5 text-center w-[5%] border-r border-slate-700">SR.</th>
                  <th className="p-1.5 border-r border-slate-700 w-[47%]">DESCRIPTION OF SERVICE CHARGES / OPERATIONS</th>
                  <th className="p-1.5 text-center border-r border-slate-700 w-[10%]">SAC CODE</th>
                  <th className="p-1.5 text-right border-r border-slate-700 w-[13%]">RATE (INR)</th>
                  <th className="p-1.5 text-center border-r border-slate-700 w-[7%]">QTY</th>
                  <th className="p-1.5 text-right w-[18%] pr-2">TAXABLE VALUE (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item: any, idx: number) => {
                  const lineTaxable = item.taxableValue || item.amount || (item.rate * item.quantity);
                  return (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                      <td className="p-1.5 text-center text-slate-500 border-r border-slate-200">
                        {item.srNo || idx + 1}
                      </td>
                      <td className="p-1.5 font-bold text-slate-900 border-r border-slate-200">
                        {item.description}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-700 border-r border-slate-200">
                        {item.hsnSacCode || '996719'}
                      </td>
                      <td className="p-1.5 text-right font-mono text-slate-800 border-r border-slate-200">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="p-1.5 text-center font-bold text-slate-900 border-r border-slate-200">
                        {item.quantity}
                      </td>
                      <td className="p-1.5 text-right font-bold text-slate-950 font-mono pr-2">
                        {formatCurrency(lineTaxable)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary (Right-Aligned) */}
          <div className="flex justify-end pt-0.5">
            <div className="w-[280px] border border-slate-900 divide-y divide-slate-200 text-[10px] bg-white">
              <div className="flex justify-between p-1.5">
                <span className="font-bold text-slate-800">Subtotal Taxable Amount</span>
                <span className="font-bold font-mono text-slate-950">₹ {formatCurrency(taxableAmount)}</span>
              </div>
              {isInterState ? (
                <div className="flex justify-between p-1.5">
                  <span className="text-slate-600">IGST @ {igstRate}%</span>
                  <span className="font-mono text-slate-800">₹ {formatCurrency(igstAmount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between p-1.5">
                    <span className="text-slate-600">CGST @ {cgstRate}%</span>
                    <span className="font-mono text-slate-800">₹ {formatCurrency(cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between p-1.5">
                    <span className="text-slate-600">SGST @ {sgstRate}%</span>
                    <span className="font-mono text-slate-800">₹ {formatCurrency(sgstAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between p-2 bg-slate-100/90 font-black text-[11px] border-t-2 border-slate-900">
                <span className="text-slate-950 uppercase">Total Invoice Value (INR)</span>
                <span className="text-red-700 font-mono text-xs">₹ {formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* 5. AMOUNT IN WORDS */}
        {/* ========================================== */}
        <div className="border border-slate-900 p-2 bg-slate-50/60 text-[10.5px]">
          <span className="font-bold text-slate-950">Amount in words: </span>
          <span className="font-bold text-slate-900">{formattedWords}</span>
        </div>

        {/* ========================================== */}
        {/* 6. TERMS & CONDITIONS AND BANK REMITTANCE (TWO COLUMNS) */}
        {/* ========================================== */}
        <div className="border border-slate-900 grid grid-cols-12 text-[9.5px]">
          {/* Terms & Conditions (Left) */}
          <div className="col-span-7 p-2.5 border-r border-slate-900 space-y-1">
            <h4 className="font-bold text-slate-950 uppercase text-[10px]">Terms & Conditions:</h4>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-700 text-[9px] leading-relaxed">
              <li>Interest @ 18% p.a. will be levied if payment is not received within 14 credit days.</li>
              <li>All business is transacted subject to standard Freight Forwarders Association Conditions.</li>
              <li>No claims for discrepancies will be entertained unless notified in writing within 7 days.</li>
            </ol>
          </div>

          {/* Bank Remittance Details (Right - Framed as in Reference Image 2) */}
          <div className="col-span-5 p-2.5 bg-slate-50/60 space-y-1">
            <h4 className="font-bold text-slate-950 uppercase text-[10px] pb-0.5 border-b border-slate-200">
              Bank Remittance Details:
            </h4>
            <div className="grid grid-cols-3 gap-0.5 text-[9px]">
              <span className="text-slate-500">Bank Name:</span>
              <span className="col-span-2 font-bold text-slate-900">{settings?.bankName || 'ICICI Bank'}</span>
              <span className="text-slate-500">A/C Name:</span>
              <span className="col-span-2 font-bold text-slate-900">{settings?.bankAccountName || 'MSK LOGISTIC SOLUTION'}</span>
              <span className="text-slate-500">A/C Number:</span>
              <span className="col-span-2 font-mono font-bold text-slate-950">{settings?.bankAccountNo || '574005000006'}</span>
              <span className="text-slate-500">IFSC Code:</span>
              <span className="col-span-2 font-mono font-bold text-slate-900">{settings?.bankIfsc || 'ICIC0005740'}</span>
              <span className="text-slate-500">Branch:</span>
              <span className="col-span-2 text-slate-800">{settings?.bankBranch || 'Dronagiri Node (Nhava Sheva)'}</span>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* 7. SIGNATURE & STAMP FOOTER */}
        {/* ========================================== */}
        <div className="border border-slate-900 grid grid-cols-12 items-center p-2.5">
          <div className="col-span-7 text-[9px] text-slate-500">
            <p className="font-semibold text-slate-700">
              Generated System Stamp: <span className="font-mono text-slate-900">MSK ERP Verified Authentic</span>
            </p>
            <p className="text-[8px] font-mono mt-0.5">
              Ref: {invoice.verificationToken?.slice(0, 16).toUpperCase() || 'GENUINE-RECORD'}
            </p>
          </div>
          <div className="col-span-5 text-center space-y-1">
            <p className="text-[9.5px] font-bold text-slate-950 uppercase">
              For {settings?.companyName || 'MSK LOGISTIC SOLUTION'}
            </p>
            <div className="h-6 flex items-center justify-center">
              {settings?.signatureUrl ? (
                <img src={settings.signatureUrl} alt="Signature" className="h-6 object-contain" />
              ) : (
                <div className="w-24 border-b border-dashed border-slate-400 mt-3" />
              )}
            </div>
            <p className="text-[9px] font-semibold text-slate-600">
              Authorised Signatory
            </p>
          </div>
        </div>

        {/* Page 1 of 1 Indicator */}
        <div className="text-right text-[8.5px] text-slate-400 font-mono pt-1">
          Page 1 of 1
        </div>
      </>
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      {/* Top Action Bar (hidden on print) */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900/90 text-white px-4 py-2 rounded-full shadow-2xl border border-slate-700 text-xs no-print">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5 pr-2 border-r border-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>H & T Tax Invoice</span>
        </span>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          title="Print Invoice"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>
        <button
          onClick={handleDownloadPdf}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
          title="Download PDF"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PDF</span>
        </button>
        <button
          onClick={() => setIsWhatsAppOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
          title="Share via WhatsApp"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </button>
        <button
          onClick={() => setIsEmailOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          title="Send via Email"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email</span>
        </button>
        <button
          onClick={handleCopyVerifyUrl}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          title="Copy QR Verification Link"
        >
          {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedUrl ? 'Copied' : 'Copy QR Link'}</span>
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main A4 Document Sheet */}
      <div
        ref={printContainerRef}
        className="bg-white text-slate-900 border border-slate-300 shadow-2xl rounded-xs w-full max-w-[820px] p-6 sm:p-7 text-[11px] leading-tight font-sans print:shadow-none print:border-none print:p-4 print:w-full print:max-w-none my-12 print:my-0 space-y-3"
        style={{ minHeight: '1050px' }}
      >
        {sheetInner}
      </div>

      {/* WhatsApp Sharing Modal */}
      {isWhatsAppOpen && (
        <WhatsAppSendModal
          isOpen={isWhatsAppOpen}
          onClose={() => setIsWhatsAppOpen(false)}
          invoice={invoice}
        />
      )}

      {/* Email Sharing Modal */}
      {isEmailOpen && (
        <EmailSendModal
          isOpen={isEmailOpen}
          onClose={() => setIsEmailOpen(false)}
          invoice={invoice}
          templateId="format-1"
        />
      )}
    </div>
  );
};
