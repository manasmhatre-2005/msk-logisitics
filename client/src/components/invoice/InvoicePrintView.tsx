import React, { useState, useEffect } from 'react';
import { Invoice, CompanySettings } from '../../types/index';
import { Printer, ArrowLeft, Download, Mail, MessageSquare } from 'lucide-react';
import { api } from '../../services/api';
import { getCurrencySymbol, formatCurrency } from '../../utils/currency';
import { WhatsAppSendModal } from '../whatsapp/WhatsAppSendModal';
import { EmailSendModal } from '../email/EmailSendModal';
import { CreditNotePrintView } from '../credit-note/CreditNotePrintView';
import { HtBillPrintView } from '../ht-bill/HtBillPrintView';
import { EmptyContainerPrintView } from '../empty-container/EmptyContainerPrintView';

interface InvoicePrintViewProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({
  invoice,
  onClose,
}) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  if (invoice.billType === 'EMPTY_CONTAINER') {
    return <EmptyContainerPrintView invoice={invoice} isOpen={true} onClose={onClose} companySettings={settings} />;
  }
  if (invoice.billType === 'HT_BILL') {
    return <HtBillPrintView invoice={invoice} isOpen={true} onClose={onClose} companySettings={settings} />;
  }
  if (invoice.billType === 'CREDIT_NOTE') {
    return <CreditNotePrintView invoice={invoice} isOpen={true} onClose={onClose} />;
  }

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
    const url = api.getInvoicePdfUrl(invoice.id);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`;
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
      </div>

      {/* A4 Sheet Following Exact Client Sample Invoice (Image 3) */}
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 border border-slate-400 shadow-xl print:shadow-none print:border-none print:p-2 text-slate-900 text-[11px] leading-tight font-sans">
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
          templateId="format-1"
        />
      )}
    </div>
  );
};
