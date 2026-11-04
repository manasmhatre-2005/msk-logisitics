import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import { Invoice } from '../../types/index';
import { formatCurrency, numberToIndianWords } from '../../utils/currency';
import { EmailSendModal } from '../email/EmailSendModal';
import { api } from '../../services/api';
import { InvoiceWatermark } from '../common/InvoiceWatermark';

interface EmptyContainerPrintViewProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  companySettings?: any;
  displayMode?: 'modal' | 'inline';
}

export const EmptyContainerPrintView: React.FC<EmptyContainerPrintViewProps> = ({
  invoice,
  isOpen,
  onClose,
  companySettings,
  displayMode = 'modal',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Construct verification URL
  const verifyToken = invoice.verificationToken;
  const origin = window.location.origin;
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
  const base = isLocal ? 'https://logistics-rouge-omega.vercel.app' : origin;
  const verifyUrl = verifyToken
    ? `${base}/verify-bill/${verifyToken}`
    : `${base}/invoices`;

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

  const [downloading, setDownloading] = useState(false);
  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await api.downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
    } catch (err: any) {
      alert(err.message || 'Failed to download Empty Container PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
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

  const containers = (invoice.containers && invoice.containers.length > 0)
    ? invoice.containers
    : [
        {
          containerNumber: 'MSCU4810294',
          size: "40'",
          type: 'HC (Dry)',
          emptyGateInDate: '2026-10-12',
          lddOutDate: '2026-10-24',
          emptyGroundDays: 3,
          loadedGroundDays: 12,
          daysAfterCarting: 9,
        },
        {
          containerNumber: 'MSCU9182740',
          size: "40'",
          type: 'HC (Dry)',
          emptyGateInDate: '2026-10-12',
          lddOutDate: '2026-10-24',
          emptyGroundDays: 3,
          loadedGroundDays: 12,
          daysAfterCarting: 9,
        },
      ];

  const items = (invoice.items && invoice.items.length > 0)
    ? invoice.items
    : [
        { srNo: 1, description: 'Empty Container Lift-On (LoLo) Fees', hsnSacCode: '996719', rate: 1500, quantity: 2, taxableValue: 3000 },
        { srNo: 2, description: 'Empty Depot Ground Storage Charges (Total 18 Chargeable Days)', hsnSacCode: '996711', rate: 450, quantity: 18, taxableValue: 8100 },
        { srNo: 3, description: 'Terminal Survey & Cleaning Charges', hsnSacCode: '996713', rate: 850, quantity: 2, taxableValue: 1700 },
      ];

  const taxableAmount = invoice.taxableAmount || 12800;
  const cgstAmount = invoice.cgstAmount !== undefined ? invoice.cgstAmount : 1152;
  const sgstAmount = invoice.sgstAmount !== undefined ? invoice.sgstAmount : 1152;
  const igstAmount = invoice.igstAmount !== undefined ? invoice.igstAmount : 0;
  const grandTotal = invoice.grandTotal || 15104;
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

  const tgp = invoice.consigneeName || 'TGP-948102';
  const eir = invoice.sbNumbers || 'EIR-48190';
  const placeOfSupply = invoice.billToState ? `${invoice.billToState} (Code ${invoice.billToStateCode || '27'})` : 'Maharashtra (Code 27)';

  const sheetInner = (
    <div className="relative overflow-hidden w-full h-full space-y-0">
      {/* Subtle Centered Official MSK Logo Watermark (Behind all content) */}
      <InvoiceWatermark />
      <div className="relative z-10 space-y-0">
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
          <p className="text-[10px] text-slate-700">
            Date: <span className="font-semibold text-slate-900">{formatDate(invoice.invoiceDate)}</span>
          </p>
          <p className="text-[9.5px] font-semibold text-slate-600">
            Place of Supply: <span className="text-slate-900">{placeOfSupply}</span>
          </p>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. SUBHEADER METADATA BAR */}
      {/* ========================================== */}
      <div className="border border-slate-900 bg-slate-50/80 px-3 py-1.5 grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <span className="text-slate-500 font-bold">Terminal Gate Pass: </span>
          <span className="font-mono font-bold text-slate-900">{tgp}</span>
        </div>
        <div>
          <span className="text-slate-500 font-bold">EIR / LoLo Receipt: </span>
          <span className="font-mono font-bold text-slate-900">{eir}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-500 font-bold">Payment Terms: </span>
          <span className="font-semibold text-slate-900">Net 15 Days</span>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. SUPPLIER / ISSUING DEPOT & BILL TO (TWO COLUMNS) */}
      {/* ========================================== */}
      <div className="border border-slate-900 grid grid-cols-12 text-[10.5px]">
        {/* Supplier / Issuing Depot (Left) */}
        <div className="col-span-6 p-2.5 border-r border-slate-900 space-y-1 bg-white">
          <div className="text-[10px] font-black text-slate-900 uppercase tracking-wider pb-0.5 border-b border-slate-100">
            SUPPLIER / ISSUING DEPOT:
          </div>
          <p className="text-xs font-bold text-slate-950">MSK Nhava Sheva CFS & Empty Depot</p>
          <p className="text-slate-700 leading-relaxed text-[10px]">
            Dronagiri Node, Sector 3, Nhava Sheva, Navi Mumbai, MH 400702
          </p>
          <p className="text-slate-900 font-bold pt-1 text-[10px]">
            State: <span className="font-semibold">Maharashtra</span> | State Code: <span className="font-mono">27</span>
          </p>
        </div>

        {/* Bill To (Right) */}
        <div className="col-span-6 p-2.5 space-y-1 bg-white">
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
      </div>

      {/* ========================================== */}
      {/* 4. SHIPMENT & TRANSPORT REFERENCE GROUNDING */}
      {/* ========================================== */}
      <div className="border border-slate-900 p-2.5 space-y-1.5 bg-slate-50/50 text-[10px]">
        <div className="text-[10px] font-black text-slate-900 uppercase tracking-wider pb-0.5 border-b border-slate-200">
          SHIPMENT & TRANSPORT REFERENCE GROUNDING
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-slate-500 font-semibold">Vessel/Voyage: </span>
            <span className="font-bold text-slate-900 font-mono">
              {invoice.vesselVoyage || 'Pacific Pioneer / V-042E'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Master B/L No: </span>
            <span className="font-bold text-slate-900 font-mono">
              {invoice.mblHbl || 'MEDU67201948'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Delivery Order: </span>
            <span className="font-bold text-slate-900 font-mono">
              {invoice.portOfLoading || 'DO-77821'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Transporter: </span>
            <span className="font-bold text-slate-900">
              {invoice.portOfDischarge || 'Shri Mahalakshmi Logistics'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Vehicle Number: </span>
            <span className="font-bold text-slate-900 font-mono">
              {invoice.consigneeName || 'MH-46-AR-8812'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Currency: </span>
            <span className="font-bold text-slate-900 font-mono">INR (₹)</span>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 5. SECTION 1 — EQUIPMENT TRACKING & OPERATION TIMELINES */}
      {/* ========================================== */}
      <div className="space-y-1">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
          1. EQUIPMENT TRACKING & OPERATION TIMELINES
        </h3>
        <div className="border border-slate-900 overflow-hidden">
          <table className="w-full text-center border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[8.5px] uppercase border-b border-slate-900">
                <th className="p-1.5 border-r border-slate-700 text-left pl-2 w-[24%]">CONTAINER NO.</th>
                <th className="p-1.5 border-r border-slate-700 w-[15%]">SIZE / TYPE</th>
                <th className="p-1.5 border-r border-slate-700 w-[15%]">GATE-IN DATE</th>
                <th className="p-1.5 border-r border-slate-700 w-[15%]">GATE-OUT DATE</th>
                <th className="p-1.5 border-r border-slate-700 w-[15%]">FREE DAYS</th>
                <th className="p-1.5 w-[16%]">STORAGE DAYS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {containers.map((c: any, idx: number) => {
                let sDays = c.loadedGroundDays;
                const freeD = c.emptyGroundDays || 3;
                let chgDays = c.daysAfterCarting;

                if ((sDays === undefined || sDays === null) && c.emptyGateInDate && c.lddOutDate) {
                  const t1 = new Date(c.emptyGateInDate).getTime();
                  const t2 = new Date(c.lddOutDate).getTime();
                  if (!isNaN(t1) && !isNaN(t2) && t2 >= t1) {
                    sDays = Math.max(0, Math.round((t2 - t1) / (1000 * 3600 * 24)));
                    chgDays = Math.max(0, sDays - freeD);
                  }
                }

                return (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                    <td className="p-1.5 border-r border-slate-200 text-left pl-2 font-bold font-mono text-slate-950 text-[10.5px]">
                      {c.containerNumber}
                    </td>
                    <td className="p-1.5 border-r border-slate-200 text-slate-800 font-medium">
                      {c.size || "40'"} {c.type || 'HC (Dry)'}
                    </td>
                    <td className="p-1.5 border-r border-slate-200 text-slate-800 font-medium">
                      {formatDate(c.emptyGateInDate)}
                    </td>
                    <td className="p-1.5 border-r border-slate-200 text-slate-800 font-medium">
                      {formatDate(c.lddOutDate)}
                    </td>
                    <td className="p-1.5 border-r border-slate-200 text-slate-800 font-medium">
                      {freeD} Days
                    </td>
                    <td className="p-1.5 text-teal-800 font-bold">
                      {sDays ?? 0} Days <span className="text-[9px] font-semibold text-slate-500">(Charge: {chgDays ?? 0}D)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* 6. SECTION 2 — ITEMISED TARIFF & FINANCIAL CHARGES */}
      {/* ========================================== */}
      <div className="space-y-1">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
          2. ITEMISED TARIFF & FINANCIAL CHARGES
        </h3>
        <div className="border border-slate-900 overflow-hidden">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[8.5px] uppercase border-b border-slate-900">
                <th className="p-1.5 border-r border-slate-700 text-center w-8">SR.</th>
                <th className="p-1.5 border-r border-slate-700 text-left pl-2">DESCRIPTION OF SERVICE CHARGES</th>
                <th className="p-1.5 border-r border-slate-700 text-center w-20">SAC CODE</th>
                <th className="p-1.5 border-r border-slate-700 text-right pr-2 w-24">RATE (INR)</th>
                <th className="p-1.5 border-r border-slate-700 text-center w-14">QTY</th>
                <th className="p-1.5 text-right pr-2 w-28">TAXABLE VALUE (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item: any, idx: number) => {
                const lineTotal = item.taxableValue || item.amount || (item.rate * item.quantity);
                return (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                    <td className="p-1.5 border-r border-slate-200 text-center text-slate-600 font-medium">
                      {item.srNo || idx + 1}
                    </td>
                    <td className="p-1.5 border-r border-slate-200 text-slate-900 font-semibold pl-2">
                      {item.description}
                    </td>
                    <td className="p-1.5 border-r border-slate-200 text-center font-mono text-slate-700 text-[9.5px]">
                      {item.hsnSacCode || '996719'}
                    </td>
                    <td className="p-1.5 border-r border-slate-200 text-right pr-2 text-slate-800 font-mono">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="p-1.5 border-r border-slate-200 text-center font-bold text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="p-1.5 text-right pr-2 font-mono font-bold text-slate-950">
                      {formatCurrency(lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* 7. TOTALS SUMMARY BOX (RIGHT-ALIGNED) */}
      {/* ========================================== */}
      <div className="flex justify-end">
        <div className="w-72 border border-slate-900 overflow-hidden text-[10.5px]">
          <div className="flex justify-between items-center px-3 py-1 bg-white border-b border-slate-200">
            <span className="font-bold text-slate-700">Subtotal Taxable Amount</span>
            <span className="font-mono font-bold text-slate-950">{formatCurrency(taxableAmount)}</span>
          </div>

          {isInterState ? (
            <div className="flex justify-between items-center px-3 py-1 bg-white border-b border-slate-200">
              <span className="text-slate-600 font-medium">IGST @ {igstRate}%</span>
              <span className="font-mono text-slate-900">{formatCurrency(igstAmount)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center px-3 py-1 bg-white border-b border-slate-200">
                <span className="text-slate-600 font-medium">CGST @ {cgstRate}%</span>
                <span className="font-mono text-slate-900">{formatCurrency(cgstAmount)}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-1 bg-white border-b border-slate-200">
                <span className="text-slate-600 font-medium">SGST @ {sgstRate}%</span>
                <span className="font-mono text-slate-900">{formatCurrency(sgstAmount)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between items-center px-3 py-1.5 bg-slate-100 font-bold">
            <span className="text-slate-950 text-xs">Total Invoice Value (INR)</span>
            <span className="font-mono font-black text-red-600 text-sm">
              ₹ {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 8. AMOUNT IN WORDS */}
      {/* ========================================== */}
      <div className="border border-slate-900 px-3 py-1.5 bg-slate-50/70 text-[10.5px]">
        <span className="font-bold text-slate-900">Amount in words: </span>
        <span className="font-semibold text-slate-800 italic">{formattedWords}</span>
      </div>

      {/* ========================================== */}
      {/* 9. TERMS & CONDITIONS AND BANK REMITTANCE */}
      {/* ========================================== */}
      <div className="border border-slate-900 grid grid-cols-12 text-[10px]">
        {/* Terms & Conditions (Left) */}
        <div className="col-span-7 p-2.5 border-r border-slate-900 space-y-1 bg-white">
          <div className="font-bold text-slate-900 uppercase tracking-tight text-[9.5px]">
            Terms & Conditions:
          </div>
          <ol className="list-decimal pl-3 space-y-0.5 text-slate-700 text-[9px] leading-relaxed">
            <li>EIR verification and physical container condition inspection must be acknowledged prior to gate-out.</li>
            <li>Storage slab calculations and yard demurrage accrue according to standard empty depot tariff rules.</li>
            <li>No claims for discrepancies or damaged equipment will be entertained unless notified in writing within 7 days.</li>
          </ol>
        </div>

        {/* Bank Remittance Details (Right) */}
        <div className="col-span-5 p-2.5 space-y-1 bg-slate-50/50">
          <div className="font-bold text-slate-900 uppercase tracking-tight text-[9.5px]">
            Bank Remittance Details:
          </div>
          <div className="text-[9px] space-y-0.5 text-slate-800">
            <p><span className="text-slate-500 font-semibold">Bank Name:</span> {settings.bankName}</p>
            <p><span className="text-slate-500 font-semibold">A/C Name:</span> {settings.bankAccountName}</p>
            <p><span className="text-slate-500 font-semibold">A/C Number:</span> <span className="font-mono font-bold">{settings.bankAccountNo}</span></p>
            <p><span className="text-slate-500 font-semibold">IFSC Code:</span> <span className="font-mono font-bold">{settings.bankIfsc}</span></p>
            <p><span className="text-slate-500 font-semibold">Branch:</span> {settings.bankBranch}</p>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 10. SYSTEM STAMP & AUTHORISED SIGNATURE */}
      {/* ========================================== */}
      <div className="border border-slate-900 grid grid-cols-12 items-center p-2.5 bg-white text-[10px]">
        <div className="col-span-7 space-y-0.5 text-slate-600">
          <p className="font-semibold text-slate-800 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Generated System Stamp: MSK ERP Verified Authentic</span>
          </p>
          <p className="text-[8.5px] text-slate-500 font-mono">
            Ref: {verifyToken ? verifyToken.slice(0, 16).toUpperCase() : 'EC-SECURE-STAMP'} | E-Bill Certified
          </p>
        </div>

        <div className="col-span-5 text-center space-y-1">
          <p className="font-bold text-slate-900 text-[10.5px]">
            For {settings.companyName || 'MSK LOGISTIC SOLUTION'}
          </p>
          <div className="h-8 flex items-center justify-center">
            {settings.signatureUrl ? (
              <img src={settings.signatureUrl} alt="Signature" className="h-7 w-auto object-contain" />
            ) : (
              <div className="w-32 border-b border-dashed border-slate-400 h-5" />
            )}
          </div>
          <p className="text-[9px] text-slate-500 font-medium">Authorised Signatory</p>
        </div>
      </div>

      {/* Footer Page Note */}
      <div className="flex justify-between items-center text-[8.5px] text-slate-400 pt-1">
        <span>This is a computer generated Empty Container Tax Invoice under Rule 46 of CGST Rules, 2017.</span>
        <span>Page 1 of 1</span>
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
        {/* Top Control Bar - Sticky & Responsive */}
        <div className="bg-slate-900/95 border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 no-print sticky top-0 z-10 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Empty Container</span>
            </span>
            <span className="text-[11px] sm:text-xs text-slate-300 font-mono font-bold truncate max-w-[150px] sm:max-w-none">
              Ref: {invoice.invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleCopyVerifyUrl}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
              title="Copy QR Verification Link"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedUrl ? 'Copied' : 'Copy Link'}</span>
            </button>

            <button
              onClick={() => setIsEmailOpen(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Email PDF</span>
              <span className="sm:hidden">Email</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-1.5 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{downloading ? 'Downloading...' : 'Download PDF'}</span>
              <span className="sm:hidden">{downloading ? '...' : 'PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 sm:px-4 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors ml-1 cursor-pointer"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container with Independent Horizontal & Vertical Scroll */}
        <div className="flex-1 overflow-auto p-2 sm:p-6 md:p-8 flex justify-start sm:justify-center bg-slate-200/70 print:p-0 print:bg-white print:overflow-visible">
          {/* Main A4 Document Sheet (Preserves true A4 layout on all mobile viewports) */}
          <div
            ref={printContainerRef}
            className="bg-white text-slate-900 border border-slate-300 shadow-xl rounded-none w-[820px] min-w-[760px] p-6 sm:p-8 text-[11px] leading-tight font-sans print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full print:min-w-0 my-0 space-y-3"
            style={{ minHeight: '1080px' }}
          >
            {sheetInner}
          </div>
        </div>
      </div>

      {/* Email Send Modal */}
      {isEmailOpen && (
        <EmailSendModal
          isOpen={isEmailOpen}
          onClose={() => setIsEmailOpen(false)}
          invoice={invoice}
        />
      )}
    </div>
  );
};
