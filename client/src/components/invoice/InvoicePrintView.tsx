import React, { useState, useEffect } from 'react';
import { Invoice, CompanySettings, BillFormatId, BILL_FORMAT_SLOTS } from '../../types/index';
import { Printer, ArrowLeft, Download, Mail, MessageSquare, LayoutTemplate, Check } from 'lucide-react';
import { api } from '../../services/api';
import { getCurrencySymbol, formatCurrency } from '../../utils/currency';
import { WhatsAppSendModal } from '../whatsapp/WhatsAppSendModal';
import { EmailSendModal } from '../email/EmailSendModal';

interface InvoicePrintViewProps {
  invoice: Invoice;
  onClose: () => void;
  defaultTemplateId?: BillFormatId;
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({
  invoice,
  onClose,
  defaultTemplateId = 'format-1',
}) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  // Initialize template from invoice metadata, props, or default
  const getInitialTemplate = (): BillFormatId => {
    if (invoice.templateId && ['format-1', 'format-2', 'format-3', 'format-4', 'format-5'].includes(invoice.templateId)) {
      return invoice.templateId;
    }
    if (invoice.notes && invoice.notes.includes('[TEMPLATE:')) {
      const match = invoice.notes.match(/\[TEMPLATE:(format-[1-5])\]/);
      if (match) return match[1] as BillFormatId;
    }
    return defaultTemplateId;
  };

  const [activeTemplate, setActiveTemplate] = useState<BillFormatId>(getInitialTemplate());
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  const formatDate = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurr = (n: number | null | undefined) => formatCurrency(n, invoice.currency);
  const currSymbol = getCurrencySymbol(invoice.currency);

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

  // Handle PDF Download
  const handleDownloadPdf = () => {
    const url = api.getInvoicePdfUrl(invoice.id, activeTemplate);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}_${activeTemplate}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto p-2 sm:p-6 print:p-0">
      {/* Action Bar (hidden when printed) */}
      <div className="max-w-4xl mx-auto mb-4 no-print space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-300 shadow-sm">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-red-600" />
            <span>Exit Print View</span>
          </button>

          {/* Quick Actions: WhatsApp, Email, Download, Print */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsWhatsAppOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => setIsEmailOpen(true)}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email PDF</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-1.5 rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Portrait</span>
            </button>
          </div>
        </div>

        {/* Template Selector Bar (5 Bill Format Slots) */}
        <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <LayoutTemplate className="w-4 h-4 text-red-600" />
              <span>SELECT INVOICE TEMPLATE (5 SLOTS):</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Changing template preserves all underlying transaction data & calculations
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {BILL_FORMAT_SLOTS.map((slot) => {
              const isActive = activeTemplate === slot.id;
              return (
                <button
                  key={slot.id}
                  onClick={() => setActiveTemplate(slot.id)}
                  className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all ${
                    isActive
                      ? 'border-red-600 bg-red-50/60 ring-2 ring-red-600/20 text-red-950 font-bold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold">{slot.name.split(' (')[0]}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal mt-0.5 truncate w-full">
                    {slot.referenceTag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* A4 Sheet Following Exact Client Sample Invoice (Image 3) */}
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 border border-slate-400 shadow-xl print:shadow-none print:border-none print:p-2 text-slate-900 text-[11px] leading-tight font-sans">
        
        {/* Template Slot Badge (visible for slots 2-5) */}
        {activeTemplate !== 'format-1' && (
          <div className="mb-2 p-1.5 bg-slate-100 border border-slate-300 rounded text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            {BILL_FORMAT_SLOTS.find((s) => s.id === activeTemplate)?.name} — TEMPLATE SLOT ACTIVE (READY FOR REFERENCE DESIGN)
          </div>
        )}

        {/* 1. Top Header Box: ISO Logo, Company Heading, MSK Logo */}
        <div className="border border-slate-800 grid grid-cols-12 items-center p-2 gap-2">
          {/* ISO 9001:2015 Logo Box (Left) - Framed as in Image 3 */}
          <div className="col-span-2 flex flex-col items-center justify-center border border-slate-300 rounded-xs p-1 h-20">
            <img
              src={isoLogoUrl}
              alt="ISO 9001:2015 Certified Company"
              className="h-12 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-[8px] font-bold text-slate-800 mt-1 uppercase text-center leading-none">
              ISO CERTIFIED 9001:2015
            </span>
          </div>

          {/* Company Details (Center) */}
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

          {/* MSK LOGISTIC SOLUTION Logo Box (Right) - Framed as in Image 3 */}
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
        <div className="flex justify-between items-center px-3 py-1 border-x border-b border-slate-800 font-bold text-xs bg-slate-50/50">
          <div>
            Invoice No: <span className="font-mono text-slate-950">{invoice.invoiceNumber}</span>
          </div>
          <div>
            Invoice Date: <span className="text-slate-950">{formatDate(invoice.invoiceDate)}</span>
          </div>
        </div>

        {/* 4. Details of Receiver & Consignee */}
        <div className="grid grid-cols-2 border-x border-b border-slate-800 text-[10.5px]">
          {/* Receiver / Billed To */}
          <div className="border-r border-slate-800">
            <div className="bg-slate-200 py-1 px-2 font-bold text-center border-b border-slate-800 text-[11px]">
              Details of Receiver / Billed to
            </div>
            <div className="p-2 space-y-1">
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
            <div className="p-2 space-y-1">
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
              <div className="flex">
                <span className="w-16 font-bold shrink-0">State:</span>
                <span className="text-slate-700">{invoice.exporter?.state || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Exporter Name & S/Bill No */}
        <div className="grid grid-cols-2 border-x border-b border-slate-800 font-bold text-[10.5px]">
          <div className="p-1 px-2 border-r border-slate-800 flex items-center">
            <span className="shrink-0">EXPORTER NAME :&nbsp;</span>
            <span className="font-semibold text-slate-950 truncate">
              {invoice.exporter?.name || invoice.consigneeName || '-'}
            </span>
          </div>
          <div className="p-1 px-2 flex items-center">
            <span className="shrink-0">S/BILL NO :&nbsp;</span>
            <span className="font-mono font-semibold text-slate-950 truncate">
              {invoice.sbNumbers || '-'}
            </span>
          </div>
        </div>

        {/* 6. Container Details Table (Exact 9 Columns from Image 3) */}
        <div className="border-x border-b border-slate-800 overflow-x-auto">
          <table className="w-full text-[9px] text-center border-collapse">
            <thead className="bg-slate-200 font-bold border-b border-slate-800">
              <tr>
                <th className="p-1 border-r border-slate-800 w-8">SR NO</th>
                <th className="p-1 border-r border-slate-800 w-24">CONTAINER NO</th>
                <th className="p-1 border-r border-slate-800 w-16">SIZE</th>
                <th className="p-1 border-r border-slate-800 w-14">TYPE</th>
                <th className="p-1 border-r border-slate-800">EMPTY GROUND (DAYS)</th>
                <th className="p-1 border-r border-slate-800">LOADED GROUND DAYS</th>
                <th className="p-1 border-r border-slate-800">H & T CHARGES</th>
                <th className="p-1 border-r border-slate-800">LOGISTICS CHARGES</th>
                <th className="p-1">EMPTY TRANSPORTATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {invoice.containers && invoice.containers.length > 0 ? (
                invoice.containers.map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-1 border-r border-slate-800">{i + 1}</td>
                    <td className="p-1 border-r border-slate-800 font-mono font-bold text-slate-950">{c.containerNumber}</td>
                    <td className="p-1 border-r border-slate-800">{c.size || '40 FT HC'}</td>
                    <td className="p-1 border-r border-slate-800">{c.type || 'DRY'}</td>
                    <td className="p-1 border-r border-slate-800">{c.emptyGroundDays ?? '-'}</td>
                    <td className="p-1 border-r border-slate-800">{c.loadedGroundDays ?? '-'}</td>
                    <td className="p-1 border-r border-slate-800 text-right font-mono">
                      {c.htCharges > 0 ? formatCurr(c.htCharges) : '-'}
                    </td>
                    <td className="p-1 border-r border-slate-800 text-right font-mono">
                      {c.logisticsCharges > 0 ? formatCurr(c.logisticsCharges) : '-'}
                    </td>
                    <td className="p-1 text-right font-mono">
                      {c.emptyTransportCharges > 0 ? formatCurr(c.emptyTransportCharges) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-2 text-center text-slate-500 italic">
                    1 &nbsp;|&nbsp; TGBU3802319 &nbsp;|&nbsp; 40 FT HC &nbsp;|&nbsp; DRY &nbsp;|&nbsp; 3 &nbsp;|&nbsp; 2 &nbsp;|&nbsp; - &nbsp;|&nbsp; - &nbsp;|&nbsp; -
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 7. Charges & Itemized Table (Exact 7 Columns from Image 3) */}
        <div className="border-x border-b border-slate-800 overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead className="bg-slate-200 font-bold border-b border-slate-800 text-center">
              <tr>
                <th className="p-1 border-r border-slate-800 w-8">Sr</th>
                <th className="p-1 border-r border-slate-800 text-left">Description</th>
                <th className="p-1 border-r border-slate-800 w-20">HSN/SAC</th>
                <th className="p-1 border-r border-slate-800 w-10">Qty</th>
                <th className="p-1 border-r border-slate-800 text-right w-24">Rate ({currSymbol})</th>
                <th className="p-1 border-r border-slate-800 text-right w-24">Amount ({currSymbol})</th>
                <th className="p-1 text-right w-24">Taxable ({currSymbol})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {invoice.items?.map((item, idx) => {
                const lineQty = Number(item.quantity || 1);
                const lineRate = Number(item.rate || 0);
                const lineAmt = item.amount !== undefined ? Number(item.amount) : lineQty * lineRate;
                const lineTaxable = item.taxableValue !== undefined ? Number(item.taxableValue) : Math.max(0, lineAmt - Number(item.discount || 0));

                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-1 border-r border-slate-800 text-center">{item.srNo || idx + 1}</td>
                    <td className="p-1 border-r border-slate-800 font-bold text-slate-900">{item.description}</td>
                    <td className="p-1 border-r border-slate-800 text-center font-mono">{item.hsnSacCode}</td>
                    <td className="p-1 border-r border-slate-800 text-center">{lineQty}</td>
                    <td className="p-1 border-r border-slate-800 text-right font-mono">{formatCurr(lineRate)}</td>
                    <td className="p-1 border-r border-slate-800 text-right font-mono">{formatCurr(lineAmt)}</td>
                    <td className="p-1 text-right font-mono font-bold text-slate-950">
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
          <div className="col-span-7 border-r border-slate-800 p-2.5 space-y-2">
            <div>
              <p className="font-bold text-slate-800 text-[10px]">Total invoice amount in words:</p>
              <p className="font-bold text-slate-950 uppercase mt-0.5 leading-snug">
                {wordsText}
              </p>
            </div>

            <div className="border-t border-slate-300 pt-1.5 space-y-0.5 text-[10px]">
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

          {/* Right Side: Tax Totals & Signatory (Exact Match to Image 3) */}
          <div className="col-span-5 flex flex-col justify-between">
            {/* Calculation Totals */}
            <div className="divide-y divide-slate-300 text-[10.5px]">
              <div className="flex justify-between p-1 px-3">
                <span className="text-slate-700">Total Before Tax:</span>
                <span className="font-mono font-bold text-slate-900">{currSymbol} {formatCurr(invoice.taxableAmount)}</span>
              </div>

              {invoice.isInterState ? (
                <div className="flex justify-between p-1 px-3 text-[#7c3aed]">
                  <span>Add: IGST ({invoice.igstRate || 18}%):</span>
                  <span className="font-mono font-bold">{currSymbol} {formatCurr(invoice.igstAmount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between p-1 px-3 text-[#7c3aed]">
                    <span>Add: CGST ({invoice.cgstRate || 9}%):</span>
                    <span className="font-mono font-bold">{currSymbol} {formatCurr(invoice.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between p-1 px-3 text-[#7c3aed]">
                    <span>Add: SGST ({invoice.sgstRate || 9}%):</span>
                    <span className="font-mono font-bold">{currSymbol} {formatCurr(invoice.sgstAmount)}</span>
                  </div>
                </>
              )}

              {/* TOTAL AFTER TAX (Bold Red Highlight matching Image 3) */}
              <div className="flex justify-between p-1.5 px-3 font-black text-xs border-t border-slate-400">
                <span className="uppercase text-slate-900">TOTAL AFTER TAX:</span>
                <span className="font-mono text-sm text-[#dc2626]">{currSymbol} {formatCurr(invoice.grandTotal)}</span>
              </div>
            </div>

            {/* Signature Box */}
            <div className="p-2 text-center border-t border-slate-300 space-y-1 mt-auto">
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

      {/* WhatsApp Modal */}
      {isWhatsAppOpen && (
        <WhatsAppSendModal
          isOpen={isWhatsAppOpen}
          onClose={() => setIsWhatsAppOpen(false)}
          invoice={invoice}
        />
      )}

      {/* Email Modal */}
      {isEmailOpen && (
        <EmailSendModal
          isOpen={isEmailOpen}
          onClose={() => setIsEmailOpen(false)}
          invoice={invoice}
          templateId={activeTemplate}
        />
      )}
    </div>
  );
};
