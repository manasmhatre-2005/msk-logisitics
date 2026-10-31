import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
  Eye,
  Save,
  Search,
  Building2,
  Truck,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';
import { Invoice, InvoiceItem, Party } from '../../types/index';
import { CreditNotePrintView } from './CreditNotePrintView';
import { formatCurrency, numberToWords } from '../../utils/currency';

interface CreditNoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedInvoice: Invoice) => void;
  preselectedInvoiceId?: string;
}

interface AdjustmentRow {
  id: string;
  containerNumber: string;
  containerSize: string;
  description: string;
  rate: number;
  quantity: number;
  amount: number;
}

const REASON_OPTIONS = [
  'Rate Difference / Overcharge',
  'Volume Rebate / Special Discount',
  'Container Detention Charges Waiver',
  'Handling & Transportation Rate Correction',
  'Cargo Shortage / Discrepancy Adjustment',
  'Service Quality Credit Adjustment',
  'Other Operational Credit Adjustment',
];

export const CreditNoteForm: React.FC<CreditNoteFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedInvoiceId,
}) => {
  // Existing invoices for picker
  const [existingInvoices, setExistingInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

  // Selected Original Invoice
  const [selectedOriginalInvoice, setSelectedOriginalInvoice] = useState<Invoice | null>(null);

  // Form State
  const [creditNoteNumber, setCreditNoteNumber] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reasonCategory, setReasonCategory] = useState(REASON_OPTIONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [placeOfSupply, setPlaceOfSupply] = useState('Maharashtra (27)');

  // Recipient (Bill To)
  const [partyId, setPartyId] = useState<string | undefined>(undefined);
  const [billToName, setBillToName] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [billToGstin, setBillToGstin] = useState('');
  const [billToPan, setBillToPan] = useState('');
  const [billToState, setBillToState] = useState('');
  const [billToStateCode, setBillToStateCode] = useState('');

  // Shipment Reference
  const [vesselVoyage, setVesselVoyage] = useState('');
  const [mblHbl, setMblHbl] = useState('');
  const [portOfLoading, setPortOfLoading] = useState('');
  const [portOfDischarge, setPortOfDischarge] = useState('');

  // Rows (6 Columns)
  const [rows, setRows] = useState<AdjustmentRow[]>([
    {
      id: 'row-1',
      containerNumber: '',
      containerSize: '40ft',
      description: 'Handling & Transportation Rate Adjustment',
      rate: 5000,
      quantity: 1,
      amount: 5000,
    },
  ]);

  // Tax treatment
  const [isInterState, setIsInterState] = useState(false);
  const [cgstRate, setCgstRate] = useState(9);
  const [sgstRate, setSgstRate] = useState(9);
  const [igstRate, setIgstRate] = useState(18);

  // Notes
  const [notes, setNotes] = useState('');

  // Modals & UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Load existing invoices for dropdown
  useEffect(() => {
    if (!isOpen) return;
    const fetchBaseData = async () => {
      setLoadingInvoices(true);
      try {
        const [invList, settings] = await Promise.all([
          api.getInvoices(),
          api.getSettings().catch(() => null),
        ]);
        // Filter out credit notes from the original invoice picker
        const standardList = (invList || []).filter((i: Invoice) => i.billType !== 'CREDIT_NOTE');
        setExistingInvoices(standardList);
        if (settings) setCompanySettings(settings);

        if (preselectedInvoiceId) {
          handleSelectOriginalInvoice(preselectedInvoiceId);
        }
      } catch (err) {
        console.error('Failed to fetch data for credit note form:', err);
      } finally {
        setLoadingInvoices(false);
      }
    };
    fetchBaseData();
  }, [isOpen, preselectedInvoiceId]);

  // When original invoice is selected
  const handleSelectOriginalInvoice = async (invoiceId: string) => {
    try {
      const full = await api.getInvoice(invoiceId);
      setSelectedOriginalInvoice(full);

      // Populate Party / Bill To
      const party = full.party;
      setPartyId(full.partyId);
      setBillToName(party?.legalName || party?.tradeName || full.billToName || '');
      setBillToAddress(party?.address || full.billToAddress || '');
      setBillToGstin(party?.gstin || full.billToGstin || '');
      setBillToPan(party?.pan || full.billToPan || '');
      setBillToState(party?.state || full.billToState || 'Maharashtra');
      setBillToStateCode(party?.stateCode || full.billToStateCode || '27');
      setPlaceOfSupply(full.placeOfSupply || `${party?.state || 'Maharashtra'} (${party?.stateCode || '27'})`);
      setCurrency((full.currency as 'INR' | 'USD') || 'INR');

      // Populate Shipment
      setVesselVoyage(full.vesselVoyage || '');
      setMblHbl(full.mblHbl || full.sbNumbers || '');
      setPortOfLoading(full.portOfLoading || '');
      setPortOfDischarge(full.portOfDischarge || '');

      // Check Inter-State
      const isInter = full.isInterState || (party?.stateCode && party.stateCode !== '27');
      setIsInterState(Boolean(isInter));

      // Populate container rows if available
      if (full.containers && full.containers.length > 0) {
        const newRows: AdjustmentRow[] = full.containers.map((c, i) => ({
          id: `row-${i + 1}`,
          containerNumber: c.containerNumber,
          containerSize: c.containerSize || '40ft',
          description: `Credit adjustment on container ${c.containerNumber}`,
          rate: 2000,
          quantity: 1,
          amount: 2000,
        }));
        setRows(newRows);
      } else if (full.items && full.items.length > 0) {
        const newRows: AdjustmentRow[] = full.items.map((item, i) => ({
          id: `row-${i + 1}`,
          containerNumber: item.containerNumber || '',
          containerSize: item.containerSize || '40ft',
          description: `Rate adjustment: ${item.description}`,
          rate: Math.round(item.amount * 0.1) || 1000, // default 10% credit or 1000
          quantity: 1,
          amount: Math.round(item.amount * 0.1) || 1000,
        }));
        setRows(newRows);
      }
    } catch (e: any) {
      console.error('Failed to load full invoice:', e);
      setErrorMsg(`Failed to load original invoice: ${e.message}`);
    }
  };

  // Row operations
  const handleAddRow = () => {
    const nextId = `row-${Date.now()}`;
    setRows((prev) => [
      ...prev,
      {
        id: nextId,
        containerNumber: '',
        containerSize: '40ft',
        description: 'Operational Credit Adjustment',
        rate: 0,
        quantity: 1,
        amount: 0,
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRowChange = (id: string, field: keyof AdjustmentRow, val: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: val };
        if (field === 'rate' || field === 'quantity') {
          const rate = field === 'rate' ? Number(val) || 0 : r.rate;
          const qty = field === 'quantity' ? Number(val) || 0 : r.quantity;
          updated.amount = Math.round(rate * qty * 100) / 100;
        }
        return updated;
      })
    );
  };

  // Tax calculations
  const subtotal = rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const roundedSubtotal = Math.round(subtotal * 100) / 100;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = Math.round(roundedSubtotal * (igstRate / 100) * 100) / 100;
  } else {
    cgstAmount = Math.round(roundedSubtotal * (cgstRate / 100) * 100) / 100;
    sgstAmount = Math.round(roundedSubtotal * (sgstRate / 100) * 100) / 100;
  }

  const rawGrandTotal = roundedSubtotal + cgstAmount + sgstAmount + igstAmount;
  let grandTotal = Math.round(rawGrandTotal);
  let roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;
  if (currency === 'USD') {
    grandTotal = Math.round(rawGrandTotal * 100) / 100;
    roundOff = 0;
  }

  const effectiveReason = customReason.trim()
    ? `${reasonCategory} — ${customReason.trim()}`
    : reasonCategory;

  const amountInWords = numberToWords(grandTotal, currency);

  // Construct draft invoice for preview
  const draftInvoice: Invoice = {
    id: 'preview-cn-id',
    invoiceNumber: creditNoteNumber.trim() || 'MSK/CN/2026-27/001 (Auto)',
    billType: 'CREDIT_NOTE',
    originalInvoiceId: selectedOriginalInvoice?.id,
    originalInvoiceNumber: selectedOriginalInvoice?.invoiceNumber || 'MSK/EXP/2026-27/001',
    originalInvoiceDate: selectedOriginalInvoice?.invoiceDate || issueDate,
    issueDate: issueDate,
    invoiceDate: issueDate,
    dueDate: issueDate,
    partyId: partyId,
    party: {
      id: partyId || 'preview-party',
      legalName: billToName || 'Select Party / Original Invoice',
      tradeName: billToName,
      address: billToAddress,
      gstin: billToGstin,
      pan: billToPan,
      state: billToState,
      stateCode: billToStateCode,
    } as any,
    billToName,
    billToAddress,
    billToGstin,
    billToPan,
    billToState,
    billToStateCode,
    vesselVoyage,
    mblHbl,
    portOfLoading,
    portOfDischarge,
    placeOfSupply,
    currency,
    reasonForCredit: effectiveReason,
    subtotal: roundedSubtotal,
    discountAmount: 0,
    taxableAmount: roundedSubtotal,
    isInterState,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalGst: isInterState ? igstAmount : Math.round((cgstAmount + sgstAmount) * 100) / 100,
    roundOff,
    grandTotal,
    paidAmount: 0,
    balanceAmount: grandTotal,
    balance: grandTotal,
    amountInWords,
    status: 'FINAL',
    notes,
    items: rows.map((r, i) => ({
      id: r.id,
      invoiceId: 'preview-cn-id',
      containerNumber: r.containerNumber,
      containerSize: r.containerSize,
      description: r.description,
      rate: r.rate,
      quantity: r.quantity,
      amount: r.amount,
      taxableAmount: r.amount,
    })) as any,
    verificationToken: 'preview-token-32-chars-hex-hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedOriginalInvoice) {
      setErrorMsg('Please select an original invoice to adjust credit against.');
      return;
    }

    if (!billToName.trim()) {
      setErrorMsg('Recipient (BILL TO) name is required.');
      return;
    }

    if (rows.length === 0 || roundedSubtotal <= 0) {
      setErrorMsg('Please enter at least one credit adjustment row with a positive amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        billType: 'CREDIT_NOTE',
        invoiceNumber: creditNoteNumber.trim() || undefined, // undefined lets server auto-generate sequential number
        partyId: partyId || selectedOriginalInvoice.partyId,
        billToName,
        billToAddress,
        billToGstin,
        billToPan,
        billToState,
        billToStateCode,
        invoiceDate: issueDate,
        dueDate: issueDate,
        currency,
        placeOfSupply,
        originalInvoiceId: selectedOriginalInvoice.id,
        originalInvoiceNumber: selectedOriginalInvoice.invoiceNumber,
        originalInvoiceDate: selectedOriginalInvoice.invoiceDate,
        reasonForCredit: effectiveReason,
        vesselVoyage,
        mblHbl,
        portOfLoading,
        portOfDischarge,
        isInterState,
        cgstRate,
        sgstRate,
        igstRate,
        notes,
        status: 'FINAL',
        items: rows.map((r) => ({
          containerNumber: r.containerNumber,
          containerSize: r.containerSize,
          description: r.description,
          rate: r.rate,
          quantity: r.quantity,
          amount: r.amount,
          taxableAmount: r.amount,
        })),
      };

      const saved = await api.createInvoice(payload);
      onSuccess(saved);
    } catch (err: any) {
      console.error('Failed to save credit note:', err);
      setErrorMsg(err.message || 'Failed to generate credit note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-900/40 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800/60">
                    MSK LOGISTIC SOLUTION ERP
                  </span>
                  <span className="text-[10px] font-medium text-slate-300">
                    Section 34 CGST Act Compliance
                  </span>
                </div>
                <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                  Create Credit Note Bill
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 bg-slate-50/50">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="font-bold">Error: </strong>
                  {errorMsg}
                </div>
              </div>
            )}

            {/* 1. Original Invoice Selector */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-red-600" />
                  Select Original Tax Invoice to Adjust *
                </label>
                {selectedOriginalInvoice && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded font-semibold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    Linked: {selectedOriginalInvoice.invoiceNumber}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <select
                    value={selectedOriginalInvoice?.id || ''}
                    onChange={(e) => handleSelectOriginalInvoice(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
                  >
                    <option value="">-- Choose Existing Tax Invoice --</option>
                    {existingInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.party?.tradeName || inv.billToName} ({formatCurrency(inv.grandTotal, inv.currency)})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Auto-populates recipient, containers, GSTIN, and shipment details
                  </p>
                </div>

                {selectedOriginalInvoice && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoice Date:</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(selectedOriginalInvoice.invoiceDate).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Party:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                        {selectedOriginalInvoice.party?.legalName || selectedOriginalInvoice.billToName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Original Amount:</span>
                      <span className="font-bold text-slate-900">
                        ₹ {formatCurrency(selectedOriginalInvoice.grandTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Credit Note Information Grid */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                Credit Note Information Grid
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Credit Note No
                  </label>
                  <input
                    type="text"
                    value={creditNoteNumber}
                    onChange={(e) => setCreditNoteNumber(e.target.value)}
                    placeholder="Auto: MSK/CN/YYYY-YY/..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono font-bold text-red-600 bg-slate-50"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Leave blank for auto-numbering</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Date of Issue *
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Place of Supply
                  </label>
                  <input
                    type="text"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    placeholder="e.g. Maharashtra (27)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'INR' | 'USD')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              {/* Reason for Credit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Reason for Credit *
                  </label>
                  <select
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                  >
                    {REASON_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Specific Reason / Remark Notes
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="e.g. Agreed waiver for 2 days ground rent, special discount approved"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 3. Recipient & Shipment Reference (Side-by-Side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Recipient */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Building2 className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    BILL TO (RECIPIENT)
                  </h3>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">Party Name *</label>
                    <input
                      type="text"
                      value={billToName}
                      onChange={(e) => setBillToName(e.target.value)}
                      placeholder="Customer / Party Legal Name"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">Billing Address</label>
                    <textarea
                      value={billToAddress}
                      onChange={(e) => setBillToAddress(e.target.value)}
                      rows={2}
                      placeholder="Address, City, State, PIN"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase">GSTIN</label>
                      <input
                        type="text"
                        value={billToGstin}
                        onChange={(e) => setBillToGstin(e.target.value)}
                        placeholder="GSTIN"
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-mono text-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase">PAN</label>
                      <input
                        type="text"
                        value={billToPan}
                        onChange={(e) => setBillToPan(e.target.value)}
                        placeholder="PAN"
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-mono text-slate-900 uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipment Reference */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Truck className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    SHIPMENT REFERENCE
                  </h3>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">Vessel / Voyage</label>
                    <input
                      type="text"
                      value={vesselVoyage}
                      onChange={(e) => setVesselVoyage(e.target.value)}
                      placeholder="e.g. EVER GIVEN V.045E"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">MBL / HBL Ref</label>
                    <input
                      type="text"
                      value={mblHbl}
                      onChange={(e) => setMblHbl(e.target.value)}
                      placeholder="Bill of Lading or Shipping Bill reference"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase">Port of Loading</label>
                      <input
                        type="text"
                        value={portOfLoading}
                        onChange={(e) => setPortOfLoading(e.target.value)}
                        placeholder="e.g. Nhava Sheva (INNSA)"
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase">Port of Discharge</label>
                      <input
                        type="text"
                        value={portOfDischarge}
                        onChange={(e) => setPortOfDischarge(e.target.value)}
                        placeholder="e.g. Jebel Ali (AEJEA)"
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Credit Adjustment Table (6 Columns) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Credit Adjustment Table
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    6-column layout matching Credit Note reference format
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-2.5 text-center w-10">SR.</th>
                      <th className="p-2.5 w-44">CONTAINER NO. & SIZE</th>
                      <th className="p-2.5">DESCRIPTION OF SERVICE ADJUSTMENT</th>
                      <th className="p-2.5 text-right w-28">RATE ({currency})</th>
                      <th className="p-2.5 text-center w-20">QTY</th>
                      <th className="p-2.5 text-right w-32">CREDIT VALUE ({currency})</th>
                      <th className="p-2.5 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="p-2 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={row.containerNumber}
                              onChange={(e) => handleRowChange(row.id, 'containerNumber', e.target.value.toUpperCase())}
                              placeholder="Container No"
                              className="w-28 rounded border border-slate-300 px-2 py-1 text-xs font-mono uppercase"
                            />
                            <select
                              value={row.containerSize}
                              onChange={(e) => handleRowChange(row.id, 'containerSize', e.target.value)}
                              className="rounded border border-slate-300 px-1.5 py-1 text-xs"
                            >
                              <option value="20ft">20ft</option>
                              <option value="40ft">40ft</option>
                              <option value="40HC">40HC</option>
                              <option value="45ft">45ft</option>
                            </select>
                          </div>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => handleRowChange(row.id, 'description', e.target.value)}
                            placeholder="Describe adjustment"
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900"
                            required
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.rate || ''}
                            onChange={(e) => handleRowChange(row.id, 'rate', e.target.value)}
                            placeholder="0.00"
                            className="w-24 text-right rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                            required
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={row.quantity || 1}
                            onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)}
                            className="w-14 text-center rounded border border-slate-300 px-1 py-1 text-xs font-mono"
                            required
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(row.amount, currency)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            disabled={rows.length === 1}
                            className={`p-1 rounded text-slate-400 hover:text-red-600 transition-colors ${
                              rows.length === 1 ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Tax Summary & Statutory Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Left Column (7 cols): Compliance & Amount in Words */}
              <div className="sm:col-span-7 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Total Credit Amount in Words
                  </span>
                  <p className="font-bold text-xs text-slate-900 uppercase mt-0.5 font-mono">
                    {amountInWords}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[10px] text-slate-500 uppercase mb-1">
                    Internal Notes / Audit Remarks
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Reference emails, approval names, or credit agreement notes"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 text-[10px] text-slate-600 border border-slate-200">
                  <span className="font-bold text-slate-800">Section 34 CGST Act, 2017 Notice:</span>
                  <p className="mt-0.5">
                    This Credit Note will link directly to Original Tax Invoice{' '}
                    <strong className="text-slate-900">{selectedOriginalInvoice?.invoiceNumber || '(Selected Invoice)'}</strong>{' '}
                    and generate a unique QR code for verification.
                  </p>
                </div>
              </div>

              {/* Right Column (5 cols): Calculation Box */}
              <div className="sm:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Tax Treatment
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-600 font-medium cursor-pointer flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={isInterState}
                        onChange={(e) => setIsInterState(e.target.checked)}
                        className="rounded text-red-600"
                      />
                      Inter-State (IGST)
                    </label>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal Taxable:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {currency === 'USD' ? '$' : '₹'} {formatCurrency(roundedSubtotal, currency)}
                    </span>
                  </div>

                  {isInterState ? (
                    <div className="flex justify-between items-center text-purple-700">
                      <span className="flex items-center gap-1">
                        IGST (
                        <input
                          type="number"
                          value={igstRate}
                          onChange={(e) => setIgstRate(Number(e.target.value))}
                          className="w-10 text-center border border-purple-200 rounded px-1 py-0.5 text-[11px]"
                        />
                        %):
                      </span>
                      <span className="font-mono font-bold">
                        {currency === 'USD' ? '$' : '₹'} {formatCurrency(igstAmount, currency)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-purple-700">
                        <span className="flex items-center gap-1">
                          CGST (
                          <input
                            type="number"
                            value={cgstRate}
                            onChange={(e) => setCgstRate(Number(e.target.value))}
                            className="w-10 text-center border border-purple-200 rounded px-1 py-0.5 text-[11px]"
                          />
                          %):
                        </span>
                        <span className="font-mono font-bold">
                          {currency === 'USD' ? '$' : '₹'} {formatCurrency(cgstAmount, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-purple-700">
                        <span className="flex items-center gap-1">
                          SGST (
                          <input
                            type="number"
                            value={sgstRate}
                            onChange={(e) => setSgstRate(Number(e.target.value))}
                            className="w-10 text-center border border-purple-200 rounded px-1 py-0.5 text-[11px]"
                          />
                          %):
                        </span>
                        <span className="font-mono font-bold">
                          {currency === 'USD' ? '$' : '₹'} {formatCurrency(sgstAmount, currency)}
                        </span>
                      </div>
                    </>
                  )}

                  {roundOff !== 0 && (
                    <div className="flex justify-between items-center text-slate-500 text-[11px]">
                      <span>Round Off:</span>
                      <span className="font-mono">
                        {currency === 'USD' ? '$' : '₹'} {formatCurrency(roundOff, currency)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-900 uppercase">Total Credit Value:</span>
                    <span className="font-mono font-black text-red-600 text-sm">
                      {currency === 'USD' ? '$' : '₹'} {formatCurrency(grandTotal, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold shadow-2xs transition-colors"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span>Preview Credit Note</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-900/20 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Generating...' : 'Save & Generate Credit Note'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <CreditNotePrintView
          invoice={draftInvoice}
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          companySettings={companySettings}
        />
      )}
    </>
  );
};
