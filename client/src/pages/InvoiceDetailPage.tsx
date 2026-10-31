import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  MessageSquare,
  Mail,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  LayoutTemplate,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { Invoice, CompanySettings, BillFormatId, BILL_FORMAT_SLOTS } from '../types/index';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { WhatsAppSendModal } from '../components/whatsapp/WhatsAppSendModal';
import { EmailSendModal } from '../components/email/EmailSendModal';
import { getCurrencySymbol, formatCurrency } from '../utils/currency';

interface InvoiceDetailPageProps {
  invoiceId: string;
  onBack: () => void;
  onPrint: (inv: Invoice) => void;
}

export const InvoiceDetailPage: React.FC<InvoiceDetailPageProps> = ({
  invoiceId,
  onBack,
  onPrint,
}) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('NEFT/RTGS');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [recordingPay, setRecordingPay] = useState(false);

  // Template Slot State (5 slots)
  const [activeTemplate, setActiveTemplate] = useState<BillFormatId>('format-1');

  // Sharing Modals State
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const [invData, settsData] = await Promise.all([
        api.getInvoice(invoiceId),
        api.getSettings().catch(() => null),
      ]);
      setInvoice(invData);
      if (settsData) setSettings(settsData);
      if (invData) {
        setPayAmount(String(invData.balanceAmount));
        // Extract saved template or default to format-1
        if (invData.notes && invData.notes.includes('[TEMPLATE:')) {
          const match = invData.notes.match(/\[TEMPLATE:(format-[1-5])\]/);
          if (match) setActiveTemplate(match[1] as BillFormatId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const handleFinalize = async () => {
    if (!invoice) return;
    try {
      await api.finalizeInvoice(invoice.id);
      fetchInvoice();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setRecordingPay(true);
    try {
      await api.recordPayment({
        invoiceId: invoice.id,
        amount: parseFloat(payAmount) || 0,
        paymentMode: payMode,
        referenceNumber: payRef,
        notes: payNotes,
      });
      setIsPayModalOpen(false);
      fetchInvoice();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRecordingPay(false);
    }
  };

  const formatDate = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurr = (n: number | null | undefined) => formatCurrency(n, invoice?.currency);
  const currSymbol = getCurrencySymbol(invoice?.currency);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
        <span>Loading Invoice...</span>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="bg-white p-10 text-center rounded-xl border border-slate-200">
        <p className="text-slate-600">Invoice not found.</p>
        <button onClick={onBack} className="text-xs text-red-600 font-semibold mt-2 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const companyName = settings?.companyName || 'MSK LOGISTIC SOLUTION';
  const address = settings?.address || 'JNPT Township Colony, Sector - 3, Building No. B/48, Office No. 3';
  const city = settings?.city || 'Navi Mumbai';
  const pincode = settings?.pincode || '400702';
  const tan = settings?.tan || 'PNES72845D';
  const pan = settings?.pan || 'AXWPK4562G';
  const gstin = settings?.gstin || '27AXWPK4562G1ZX';
  const email = settings?.email || 'accounts@msklogisticsolution.com';
  const phone = settings?.phone || '+91 8104592823';
  const bankName = settings?.bankName || 'ICICI Bank';
  const bankAccountName = settings?.bankAccountName || 'MSK LOGISTIC SOLUTION';
  const bankAccountNo = settings?.bankAccountNo || '574005000006';
  const bankBranch = settings?.bankBranch || 'Dronagiri Node (Nhava Sheva)';
  const bankIfsc = settings?.bankIfsc || 'ICIC0005740';
  const invoiceTitle = settings?.invoiceTitle || 'TAX INVOICE (EXPORT STUFFING CONTAINER)';
  const mskLogoUrl = settings?.logoUrl || '/images/msk-logo.png';
  const isoLogoUrl = settings?.isoLogoUrl || '/images/iso-logo.png';
  const signatureUrl = settings?.signatureUrl;

  const defaultWords = invoice.currency === 'USD' ? 'US Dollars Zero Only' : 'INR Zero Only';
  let wordsText = (invoice.amountInWords || defaultWords).toUpperCase();
  if (!wordsText.endsWith('ONLY')) {
    wordsText = `${wordsText} ONLY ONLY`;
  } else if (!wordsText.endsWith('ONLY ONLY')) {
    wordsText = `${wordsText} ONLY`;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-red-600" />
          <span>Back to Invoices</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'DRAFT' && (
            <button
              onClick={handleFinalize}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Finalize Invoice</span>
            </button>
          )}

          {invoice.balanceAmount > 0 && invoice.status !== 'CANCELLED' && (
            <button
              onClick={() => setIsPayModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700 shadow-2xs transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment ({currSymbol}{formatCurr(invoice.balanceAmount)})</span>
            </button>
          )}

          <a
            href={api.getInvoicePdfUrl(invoice.id, activeTemplate)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-red-600" />
            <span>Download PDF</span>
          </a>

          <button
            onClick={() => onPrint(invoice)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print A4</span>
          </button>

          <button
            onClick={() => setWhatsAppModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={() => setEmailModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 text-red-800 px-3.5 py-2 text-xs font-bold hover:bg-red-100 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-red-600" />
            <span>Email PDF</span>
          </button>
        </div>
      </div>

      {/* 5 Bill Format Selection Slots */}
      <div className="bg-white border border-slate-300 rounded-xl p-3.5 shadow-2xs no-print">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <LayoutTemplate className="w-4 h-4 text-red-600" />
            <span>VIEW WITH TEMPLATE FORMAT (5 SLOTS):</span>
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            Format 1 matches official company reference (Image 3)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {BILL_FORMAT_SLOTS.map((slot) => {
            const isSelected = activeTemplate === slot.id;
            return (
              <button
                key={slot.id}
                onClick={() => setActiveTemplate(slot.id)}
                className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-red-600 bg-red-50/60 ring-2 ring-red-600/20 text-red-950 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold">{slot.name.split(' (')[0]}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                </div>
                <span className="text-[10px] text-slate-500 font-normal truncate w-full mt-0.5">
                  {slot.referenceTag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Invoice Document Frame (A4 Layout strictly matching Image 3) */}
      <div className="bg-white border border-slate-400 rounded-xl p-6 sm:p-8 shadow-sm text-[11px] space-y-0 font-sans">
        
        {/* Template Slot Badge (for slots 2-5) */}
        {activeTemplate !== 'format-1' && (
          <div className="mb-2 p-1.5 bg-slate-100 border border-slate-300 rounded text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            {BILL_FORMAT_SLOTS.find((s) => s.id === activeTemplate)?.name} — TEMPLATE SLOT ACTIVE (READY FOR REFERENCE DESIGN)
          </div>
        )}

        {/* 1. Top Header Box: ISO Logo Box (Left), Company Info (Center), MSK Logo Box (Right) */}
        <div className="border border-slate-800 grid grid-cols-12 items-center p-3 gap-2">
          {/* Framed ISO 9001:2015 Logo Box */}
          <div className="col-span-2 flex flex-col items-center justify-center border border-slate-300 rounded-xs p-1 h-20">
            <img
              src={isoLogoUrl}
              alt="ISO 9001:2015"
              className="h-12 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-[8px] font-bold text-slate-800 mt-1 uppercase text-center leading-none">
              ISO CERTIFIED 9001:2015
            </span>
          </div>

          {/* Company Details */}
          <div className="col-span-7 text-center space-y-0.5 px-2">
            <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
              {companyName}
            </h1>
            <p className="text-[10px] text-slate-700 font-medium">
              {address}, {city} {pincode}.
            </p>
            <p className="text-[10px] text-slate-900 font-bold">
              TAN NO: {tan} &nbsp; PAN NO: {pan} &nbsp; GST NO: {gstin}
            </p>
            <p className="text-[10px] text-slate-700 font-medium">
              Email id : {email} &nbsp; Mob No.{phone}
            </p>
          </div>

          {/* Framed MSK Logo Box */}
          <div className="col-span-3 flex items-center justify-center border border-slate-300 rounded-xs p-1 h-20">
            <img
              src={mskLogoUrl}
              alt="MSK LOGISTIC SOLUTION"
              className="h-16 w-auto max-w-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* 2. Banner: TAX INVOICE (EXPORT STUFFING CONTAINER) */}
        <div className="bg-[#1f2937] text-white text-center py-1 font-bold text-xs tracking-wider border-x border-b border-slate-800 uppercase">
          {invoiceTitle}
        </div>

        {/* 3. Invoice No & Date */}
        <div className="flex justify-between items-center px-3 py-1.5 border-x border-b border-slate-800 font-bold text-xs bg-slate-50/50">
          <div>
            Invoice No: <span className="font-mono text-slate-950">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Invoice Date: <span className="text-slate-950">{formatDate(invoice.invoiceDate)}</span></span>
            <Badge
              variant={
                invoice.status === 'PAID'
                  ? 'green'
                  : invoice.status === 'FINALIZED'
                  ? 'red'
                  : invoice.status === 'PARTIALLY_PAID'
                  ? 'amber'
                  : 'slate'
              }
              size="sm"
            >
              {invoice.status}
            </Badge>
          </div>
        </div>

        {/* 4. Details of Receiver & Consignee */}
        <div className="grid grid-cols-2 border-x border-b border-slate-800 text-[10.5px]">
          {/* Receiver / Billed To */}
          <div className="border-r border-slate-800">
            <div className="bg-slate-200 py-1 px-2 font-bold text-center border-b border-slate-800 text-[11px]">
              Details of Receiver / Billed to
            </div>
            <div className="p-2.5 space-y-1">
              <div className="flex">
                <span className="w-16 font-bold shrink-0">Name:</span>
                <span className="font-semibold text-slate-950">{invoice.billToName}</span>
              </div>
              <div className="flex">
                <span className="w-16 font-bold shrink-0">Address:</span>
                <span className="text-slate-700">{invoice.billToAddress}</span>
              </div>
              <div className="flex">
                <span className="w-16 font-bold shrink-0">GSTIN:</span>
                <span className="font-mono font-bold text-slate-900">{invoice.billToGstin}</span>
              </div>
              <div className="flex justify-between">
                <div>
                  <span className="font-bold">State: </span>
                  <span>{invoice.billToState}</span>
                </div>
                <div className="pr-4">
                  <span className="font-bold">State Code: </span>
                  <span className="font-mono">{invoice.billToStateCode}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Consignee / Shipped To */}
          <div>
            <div className="bg-slate-200 py-1 px-2 font-bold text-center border-b border-slate-800 text-[11px]">
              Details of Consignee / Shipped to
            </div>
            <div className="p-2.5 space-y-1">
              <div className="flex">
                <span className="w-16 font-bold shrink-0">Name:</span>
                <span className="text-slate-900 font-medium">{invoice.consigneeName || invoice.exporter?.name || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-16 font-bold shrink-0">Address:</span>
                <span className="text-slate-700">{invoice.consigneeAddress || invoice.exporter?.address || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-16 font-bold shrink-0">GSTIN:</span>
                <span className="font-mono text-slate-700">{invoice.exporter?.gstin || '-'}</span>
              </div>
              <div className="flex justify-between">
                <div>
                  <span className="font-bold">State: </span>
                  <span className="text-slate-700">{invoice.exporter?.state || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Exporter Name & S/Bill No */}
        <div className="grid grid-cols-2 border-x border-b border-slate-800 font-bold text-[10.5px]">
          <div className="p-1.5 px-2 border-r border-slate-800 flex items-center">
            <span className="shrink-0">EXPORTER NAME :&nbsp;</span>
            <span className="font-semibold text-slate-950 truncate">
              {invoice.exporter?.name || invoice.consigneeName || '-'}
            </span>
          </div>
          <div className="p-1.5 px-2 flex items-center">
            <span className="shrink-0">S/BILL NO :&nbsp;</span>
            <span className="font-mono font-semibold text-slate-950 truncate">
              {invoice.sbNumbers || '-'}
            </span>
          </div>
        </div>

        {/* 6. Container Details Table (Exact 9 Columns from Image 3) */}
        <div className="border-x border-b border-slate-800 bg-white">
          <table className="w-full text-[9px] text-center border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead className="bg-slate-200 text-slate-900 font-bold border-b border-slate-800 text-[8px] uppercase tracking-tight leading-tight">
              <tr className="divide-x divide-slate-800">
                <th className="py-1.5 px-0.5">SR NO</th>
                <th className="py-1.5 px-1">CONTAINER NO</th>
                <th className="py-1.5 px-0.5">SIZE</th>
                <th className="py-1.5 px-0.5">TYPE</th>
                <th className="py-1.5 px-0.5 whitespace-normal">EMPTY GROUND<br/>(DAYS)</th>
                <th className="py-1.5 px-0.5 whitespace-normal">LOADED GROUND<br/>DAYS</th>
                <th className="py-1.5 px-1 whitespace-normal">H &amp; T<br/>CHARGES</th>
                <th className="py-1.5 px-1 whitespace-normal">LOGISTICS<br/>CHARGES</th>
                <th className="py-1.5 px-1 whitespace-normal">EMPTY<br/>TRANSPORTATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {invoice.containers && invoice.containers.length > 0 ? (
                invoice.containers.map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 divide-x divide-slate-800 text-[9px]">
                    <td className="py-1 px-0.5 font-mono text-center">{i + 1}</td>
                    <td className="py-1 px-1 font-mono font-bold text-slate-950 truncate text-center" title={c.containerNumber}>
                      {c.containerNumber}
                    </td>
                    <td className="py-1 px-0.5 text-center">{c.size || '40 FT HC'}</td>
                    <td className="py-1 px-0.5 text-center">{c.type || 'DRY'}</td>
                    <td className="py-1 px-0.5 font-mono text-center">{c.emptyGroundDays ?? '-'}</td>
                    <td className="py-1 px-0.5 font-mono text-center">{c.loadedGroundDays ?? '-'}</td>
                    <td className="py-1 px-1.5 text-right font-mono">
                      {c.htCharges > 0 ? formatCurr(c.htCharges) : '-'}
                    </td>
                    <td className="py-1 px-1.5 text-right font-mono">
                      {c.logisticsCharges > 0 ? formatCurr(c.logisticsCharges) : '-'}
                    </td>
                    <td className="py-1 px-1.5 text-right font-mono">
                      {c.emptyTransportCharges > 0 ? formatCurr(c.emptyTransportCharges) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="divide-x divide-slate-800 text-[9px]">
                  <td className="py-1 px-0.5 font-mono text-center">1</td>
                  <td className="py-1 px-1 font-mono font-bold text-slate-950 text-center">TGBU3802319</td>
                  <td className="py-1 px-0.5 text-center">40 FT HC</td>
                  <td className="py-1 px-0.5 text-center">DRY</td>
                  <td className="py-1 px-0.5 font-mono text-center">3</td>
                  <td className="py-1 px-0.5 font-mono text-center">2</td>
                  <td className="py-1 px-1.5 text-right font-mono">-</td>
                  <td className="py-1 px-1.5 text-right font-mono">-</td>
                  <td className="py-1 px-1.5 text-right font-mono">-</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section Divider Bar between Container Operational Details and Line Item Charges */}
        <div className="h-2 bg-slate-100 border-x border-b border-slate-800 print:h-1.5" />

        {/* 7. Charges & Itemized Table (Exact 7 Columns from Image 3) */}
        <div className="border-x border-b border-slate-800 bg-white">
          <table className="w-full text-[9.5px] border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '43%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead className="bg-slate-200 text-slate-900 font-bold border-b border-slate-800 text-center text-[9px] uppercase tracking-tight leading-tight">
              <tr className="divide-x divide-slate-800">
                <th className="py-1.5 px-0.5">Sr</th>
                <th className="py-1.5 px-2 text-left">Description</th>
                <th className="py-1.5 px-1">HSN/SAC</th>
                <th className="py-1.5 px-0.5">Qty</th>
                <th className="py-1.5 px-1.5 text-right">Rate ({currSymbol})</th>
                <th className="py-1.5 px-1.5 text-right">Amount ({currSymbol})</th>
                <th className="py-1.5 px-1.5 text-right">Taxable ({currSymbol})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {invoice.items?.map((item, idx) => {
                const lineQty = Number(item.quantity || 1);
                const lineRate = Number(item.rate || 0);
                const lineAmt = item.amount !== undefined ? Number(item.amount) : lineQty * lineRate;
                const lineTaxable = item.taxableValue !== undefined ? Number(item.taxableValue) : Math.max(0, lineAmt - Number(item.discount || 0));

                return (
                  <tr key={idx} className="hover:bg-slate-50 divide-x divide-slate-800 text-[9.5px]">
                    <td className="py-1.5 px-0.5 text-center font-mono">{item.srNo || idx + 1}</td>
                    <td className="py-1.5 px-2 text-left font-bold text-slate-900 leading-snug break-words">
                      {item.description}
                    </td>
                    <td className="py-1.5 px-1 text-center font-mono">{item.hsnSacCode || '-'}</td>
                    <td className="py-1.5 px-0.5 text-center font-mono">{lineQty}</td>
                    <td className="py-1.5 px-1.5 text-right font-mono">{formatCurr(lineRate)}</td>
                    <td className="py-1.5 px-1.5 text-right font-mono">{formatCurr(lineAmt)}</td>
                    <td className="py-1.5 px-1.5 text-right font-mono font-bold text-slate-950">
                      {formatCurr(lineTaxable)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 8. Bottom Summary & Banking Details Section (Exact Match to Image 3) */}
        <div className="grid grid-cols-12 border-x border-b border-slate-800 text-[10.5px]">
          {/* Left Side: Amount in Words & Banking Details */}
          <div className="col-span-7 border-r border-slate-800 p-3 space-y-3">
            <div>
              <p className="font-bold text-slate-800 text-[10px]">Total invoice amount in words:</p>
              <p className="font-bold text-slate-950 uppercase mt-0.5 leading-snug">
                {wordsText}
              </p>
            </div>

            <div className="border-t border-slate-300 pt-2 space-y-1 text-[10px]">
              <p className="font-black text-slate-900 uppercase tracking-wide">
                OUR BANKING DETAILS:
              </p>
              <div className="grid grid-cols-12 gap-0.5">
                <span className="col-span-4 text-slate-700">Company name :</span>
                <span className="col-span-8 font-bold text-slate-900">{bankAccountName}</span>

                <span className="col-span-4 text-slate-700">A/C Number :</span>
                <span className="col-span-8 font-mono font-bold text-slate-900">{bankAccountNo}</span>

                <span className="col-span-4 text-slate-700">Bank Name :</span>
                <span className="col-span-8 font-bold text-slate-900">{bankName}</span>

                <span className="col-span-4 text-slate-700">Branch Name :</span>
                <span className="col-span-8 text-slate-800">{bankBranch}</span>

                <span className="col-span-4 text-slate-700">IFSC Code :</span>
                <span className="col-span-8 font-mono font-bold text-slate-900">{bankIfsc}</span>
              </div>
            </div>
          </div>

          {/* Right Side: Tax Totals & Signatory */}
          <div className="col-span-5 flex flex-col justify-between">
            {/* Calculation Totals */}
            <div className="divide-y divide-slate-300 text-[10.5px]">
              <div className="flex justify-between p-1.5 px-3">
                <span className="text-slate-700">Total Before Tax:</span>
                <span className="font-mono font-bold text-slate-900">{currSymbol} {formatCurr(invoice.taxableAmount)}</span>
              </div>

              {invoice.isInterState ? (
                <div className="flex justify-between p-1.5 px-3 text-[#7c3aed]">
                  <span>Add: IGST ({invoice.igstRate || 18}%):</span>
                  <span className="font-mono font-bold">{currSymbol} {formatCurr(invoice.igstAmount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between p-1.5 px-3 text-[#7c3aed]">
                    <span>Add: CGST ({invoice.cgstRate || 9}%):</span>
                    <span className="font-mono font-bold">{currSymbol} {formatCurr(invoice.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between p-1.5 px-3 text-[#7c3aed]">
                    <span>Add: SGST ({invoice.sgstRate || 9}%):</span>
                    <span className="font-mono font-bold">{currSymbol} {formatCurr(invoice.sgstAmount)}</span>
                  </div>
                </>
              )}

              {/* TOTAL AFTER TAX (Bold Red Highlight) */}
              <div className="flex justify-between p-2 px-3 font-black text-xs border-t border-slate-400">
                <span className="uppercase text-slate-900">TOTAL AFTER TAX:</span>
                <span className="font-mono text-sm text-[#dc2626]">{currSymbol} {formatCurr(invoice.grandTotal)}</span>
              </div>
            </div>

            {/* Signature Box */}
            <div className="p-3 text-center border-t border-slate-300 space-y-1.5 mt-auto">
              <p className="font-black text-slate-900 uppercase tracking-tight text-xs">
                {companyName}
              </p>
              
              <div className="h-10 flex items-center justify-center">
                {signatureUrl ? (
                  <img
                    src={signatureUrl}
                    alt="Authorized Signature"
                    className="max-h-10 max-w-full object-contain"
                  />
                ) : (
                  <div className="h-6"></div>
                )}
              </div>

              <p className="text-slate-600 text-[10px]">
                Authorized Signatory
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Record Payment for ${invoice.invoiceNumber}`}
        subtitle={`Outstanding Balance: ${currSymbol} ${formatCurr(invoice.balanceAmount)}`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Payment Amount ({currSymbol}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              max={invoice.balanceAmount}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full rounded border border-slate-300 p-2 text-sm font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Payment Mode</label>
            <select
              value={payMode}
              onChange={(e) => setPayMode(e.target.value)}
              className="w-full rounded border border-slate-300 p-2 bg-white"
            >
              <option value="NEFT/RTGS">NEFT / RTGS</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">UTR / Cheque / Reference No</label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. HDFCR98231049281"
              className="w-full rounded border border-slate-300 p-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Bank remittance comments..."
              className="w-full rounded border border-slate-300 p-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordingPay}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50"
            >
              {recordingPay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
              <span>Confirm Payment</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* WhatsApp Modal */}
      <WhatsAppSendModal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        invoice={invoice}
        onSuccess={() => fetchInvoice()}
      />

      {/* Email Modal */}
      <EmailSendModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        invoice={invoice}
        templateId={activeTemplate}
        onSuccess={() => fetchInvoice()}
      />
    </div>
  );
};
