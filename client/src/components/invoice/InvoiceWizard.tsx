import React, { useState, useEffect } from 'react';
import {
  Users,
  Ship,
  Box,
  BadgePercent,
  Calculator,
  Eye,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  FileText,
  Mail,
  MessageSquare,
  LayoutTemplate,
  Percent,
  Check,
  Phone,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';
import { Party, Exporter, Job, Container, ChargeMaster, Invoice, CompanySettings, Currency, BillFormatId, BILL_FORMAT_SLOTS, BillType, BILL_TYPE_LIST } from '../../types/index';
import { Badge } from '../common/Badge';
import { DateCalculationBox } from '../common/DateCalculationBox';
import { getCurrencySymbol, formatCurrency } from '../../utils/currency';
import { WhatsAppSendModal } from '../whatsapp/WhatsAppSendModal';
import { EmailSendModal } from '../email/EmailSendModal';

interface InvoiceWizardProps {
  initialParty?: Partial<Party> | null;
  initialBillType?: BillType | null;
  onSuccess: (invoice: Invoice) => void;
  onCancel: () => void;
}

export const InvoiceWizard: React.FC<InvoiceWizardProps> = ({
  initialParty,
  initialBillType,
  onSuccess,
  onCancel,
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bill Type
  const [billType, setBillType] = useState<BillType | null>(initialBillType || null);

  // Master Data
  const [parties, setParties] = useState<Party[]>([]);
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [chargeMasters, setChargeMasters] = useState<ChargeMaster[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  const getDefaultNotesForBillType = (bType?: BillType | null) => {
    switch (bType) {
      case 'EMPTY_CONTAINER':
        return 'Empty container movement, repositioning & yard handling charges.';
      case 'CREDIT_NOTE':
        return 'Credit note towards billing adjustment and rate revision.';
      case 'HT_BILL':
        return 'Operational charges for handling & transportation (H & T).';
      case 'FORWARDING':
        return 'Freight forwarding, shipping documentation & terminal logistics charges.';
      default:
        return 'Operational charges for container movement.';
    }
  };

  // Wizard Form State
  const [currency, setCurrency] = useState<Currency>('INR');
  const [selectedParty, setSelectedParty] = useState<Partial<Party> | null>(initialParty || null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [selectedExporterId, setSelectedExporterId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [sbNumbers, setSbNumbers] = useState('6010085/18.08.2026, 6007882/17.08.2026');
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [notes, setNotes] = useState(getDefaultNotesForBillType(initialBillType));
  const [terms, setTerms] = useState(
    '1. Payment due within 15 days of invoice date.\n2. Interest @ 18% p.a. charged for delayed payments.\n3. Subject to Mumbai Jurisdiction.'
  );

  // Template Slots (5 Slots)
  const [templateId, setTemplateId] = useState<BillFormatId>('format-1');

  // Editable GST Rates & Supply Type
  const [forceTaxType, setForceTaxType] = useState<'AUTO' | 'INTRA_STATE' | 'INTER_STATE'>('AUTO');
  const [gstSlab, setGstSlab] = useState<number>(18);
  const [customTotalGstRate, setCustomTotalGstRate] = useState<number>(18);
  const [customCgstRate, setCustomCgstRate] = useState<number>(9);
  const [customSgstRate, setCustomSgstRate] = useState<number>(9);
  const [customIgstRate, setCustomIgstRate] = useState<number>(18);
  const [isCustomGst, setIsCustomGst] = useState<boolean>(false);

  // Post-Save / Sharing Modal State
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);

  // Containers List
  const [containers, setContainers] = useState<any[]>([
    {
      containerNumber: 'TGBU3802319',
      size: '40 FT HC',
      type: 'DRY',
      cartingDate: '2026-08-10',
      emptyGateInDate: '2026-08-12',
      stuffingDate: '2026-08-18',
      lddOutDate: '2026-08-25',
      emptyGroundDays: 3,
      daysAfterCarting: 8,
      loadedGroundDays: 2,
      isOverride: false,
    },
  ]);

  // Line Items List
  const [lineItems, setLineItems] = useState<any[]>([
    {
      srNo: 1,
      description: 'Handling & Transportation Loaded Container (TGBU3802319 - 40HC)',
      hsnSacCode: '996511',
      quantity: 1,
      unit: 'PER_CONTAINER',
      rate: 12500,
      discount: 0,
    },
    {
      srNo: 2,
      description: 'Logistics & Service Charges (TGBU3802319)',
      hsnSacCode: '996719',
      quantity: 1,
      unit: 'PER_CONTAINER',
      rate: 4500,
      discount: 0,
    },
    {
      srNo: 3,
      description: 'Wooden Plywood ISPM-15 sheets',
      hsnSacCode: '4415',
      quantity: 5,
      unit: 'PER_PIECE',
      rate: 650,
      discount: 0,
    },
    {
      srNo: 4,
      description: 'Dunnage Kraft Air Bags',
      hsnSacCode: '3926',
      quantity: 3,
      unit: 'PER_PIECE',
      rate: 850,
      discount: 0,
    },
  ]);

  const [invoiceLevelDiscount, setInvoiceLevelDiscount] = useState<number>(0);

  // Live Tax Calculation
  const [taxCalc, setTaxCalc] = useState<any>(null);

  // Load masters on mount
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [pList, eList, jList, cList, setts] = await Promise.all([
          api.getParties(),
          api.getExporters(),
          api.getJobs(),
          api.getCharges(true),
          api.getSettings().catch(() => null),
        ]);
        setParties(pList);
        setExporters(eList);
        setJobs(jList);
        setChargeMasters(cList);
        if (setts) {
          setSettings(setts);
          if (setts.defaultCurrency) {
            setCurrency(setts.defaultCurrency);
          }
        }

        if (!selectedParty && pList.length > 0) {
          setSelectedParty(pList[0]);
        }
        if (eList.length > 0) {
          setSelectedExporterId(eList[0].id);
          setConsigneeName(eList[0].name);
          setConsigneeAddress(`${eList[0].address || ''}, ${eList[0].city || ''}`);
        }
        if (jList.length > 0) {
          setSelectedJobId(jList[0].id);
          if (jList[0].sbNumber) setSbNumbers(jList[0].sbNumber);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadMasters();
  }, []);

  // Recalculate tax summary whenever items, party, currency, or custom GST rates change
  useEffect(() => {
    const calculateTaxes = async () => {
      if (!selectedParty) return;
      try {
        const partyState = selectedParty.stateCode || '27';
        const isInter = forceTaxType === 'AUTO'
          ? (partyState.trim() !== (settings?.stateCode || '27').trim())
          : (forceTaxType === 'INTER_STATE');

        const res = await api.calculateInvoice({
          items: lineItems,
          partyStateCode: partyState,
          discountAmount: invoiceLevelDiscount,
          currency,
          customCgstRate,
          customSgstRate,
          customIgstRate,
          customTotalGstRate,
          forceInterState: isInter,
        });
        setTaxCalc(res);
      } catch (e) {
        console.error('Calculation error:', e);
      }
    };
    calculateTaxes();
  }, [lineItems, selectedParty, invoiceLevelDiscount, currency, customTotalGstRate, customCgstRate, customSgstRate, customIgstRate, forceTaxType, settings]);

  // Handle Add Item from Charge Master
  const handleAddChargeItem = (chargeId: string) => {
    const chg = chargeMasters.find((c) => c.id === chargeId);
    if (!chg) return;
    const newItem = {
      srNo: lineItems.length + 1,
      chargeMasterId: chg.id,
      description: chg.name,
      hsnSacCode: chg.hsnSacCode,
      quantity: 1,
      unit: chg.unit,
      rate: chg.defaultRate,
      discount: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleDeleteItem = (index: number) => {
    const filtered = lineItems.filter((_, i) => i !== index).map((item, idx) => ({
      ...item,
      srNo: idx + 1,
    }));
    setLineItems(filtered);
  };

  // Add Empty Container
  const handleAddContainer = () => {
    setContainers([
      ...containers,
      {
        containerNumber: `MSKU${Math.floor(1000000 + Math.random() * 9000000)}`,
        size: '20 FT',
        type: 'DRY',
        cartingDate: new Date().toISOString().split('T')[0],
        emptyGateInDate: new Date().toISOString().split('T')[0],
        stuffingDate: '',
        lddOutDate: '',
        emptyGroundDays: 0,
        daysAfterCarting: 0,
        loadedGroundDays: 0,
        isOverride: false,
      },
    ]);
  };

  const handleUpdateContainer = async (index: number, field: string, val: any) => {
    const updated = [...containers];
    updated[index] = { ...updated[index], [field]: val };

    // Auto-calculate days if dates change
    if (['cartingDate', 'emptyGateInDate', 'stuffingDate', 'lddOutDate'].includes(field)) {
      try {
        const days = await api.calculateContainerDates({
          cartingDate: updated[index].cartingDate,
          emptyGateInDate: updated[index].emptyGateInDate,
          stuffingDate: updated[index].stuffingDate,
          lddOutDate: updated[index].lddOutDate,
          isOverride: updated[index].isOverride,
        });
        updated[index].emptyGroundDays = days.emptyGroundRentDays;
        updated[index].daysAfterCarting = days.daysAfterCarting;
        updated[index].loadedGroundDays = days.loadedGroundDays;
      } catch (e) {
        // ignore
      }
    }

    setContainers(updated);
  };

  const handleSaveInvoice = async (finalStatus: 'DRAFT' | 'FINALIZED') => {
    if (!selectedParty) {
      setError('Please select a Party');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const isInter = forceTaxType === 'AUTO'
        ? (selectedParty.stateCode?.trim() !== (settings?.stateCode || '27').trim())
        : (forceTaxType === 'INTER_STATE');

      const payload = {
        invoiceDate,
        dueDate,
        partyId: selectedParty.id,
        exporterId: selectedExporterId || null,
        jobId: selectedJobId || null,
        sbNumbers,
        consigneeName,
        consigneeAddress,
        items: lineItems,
        containers,
        discountAmount: invoiceLevelDiscount,
        currency,
        notes,
        terms,
        status: finalStatus,
        templateId,
        customCgstRate,
        customSgstRate,
        customIgstRate,
        customTotalGstRate,
        forceInterState: isInter,
      };

      const res = await api.createInvoice(payload);
      setCreatedInvoice(res);
      onSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Party', icon: Users },
    { num: 2, label: 'Shipment', icon: Ship },
    { num: 3, label: 'Containers', icon: Box },
    { num: 4, label: 'Charges', icon: BadgePercent },
    { num: 5, label: 'Taxes', icon: Calculator },
    { num: 6, label: 'Preview', icon: Eye },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[600px]">
      {/* Wizard Header with Step Indicator */}
      <div className="border-b border-slate-200 p-5 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">New Logistics Tax Invoice</h2>
              {billType && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                  <FileText className="w-3 h-3 text-red-600" />
                  <span>{BILL_TYPE_LIST.find((b) => b.id === billType)?.label || billType}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete the guided steps below to calculate and generate an A4 logistics invoice.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveInvoice('DRAFT')}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Save Draft</span>
            </button>
            <button
              onClick={onCancel}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Step Tabs */}
        <div className="grid grid-cols-6 gap-2">
          {steps.map((s) => {
            const Icon = s.icon;
            const isCurrent = step === s.num;
            const isPast = step > s.num;
            return (
              <button
                key={s.num}
                onClick={() => setStep(s.num)}
                className={`flex items-center justify-center gap-2 py-2 px-1 rounded-lg text-xs font-medium border transition-all ${
                  isCurrent
                    ? 'border-red-600 bg-red-50 text-red-700 font-bold shadow-2xs'
                    : isPast
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {isPast ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-red-600' : 'text-slate-400'}`} />
                )}
                <span className="hidden md:inline">
                  {s.num}. {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="m-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Wizard Body Steps */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* STEP 1: PARTY SELECTION */}
        {step === 1 && (
          <div className="space-y-4 max-w-3xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Step 1: Select Billed To Party
            </h3>
            <p className="text-xs text-slate-500">
              The invoice recipient whose GSTIN and state will be used for tax determination (CGST+SGST vs IGST).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Existing Party
                </label>
                <select
                  value={selectedParty?.id || ''}
                  onChange={(e) => {
                    const p = parties.find((party) => party.id === e.target.value);
                    if (p) setSelectedParty(p);
                  }}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:outline-blue-500"
                >
                  <option value="">-- Select Party from Master --</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.legalName} ({p.gstin})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:outline-blue-500"
                />
              </div>
            </div>

            {/* Invoice Currency Selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Billing Currency
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  Controls monetary calculations, symbols, and amount in words
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCurrency('INR')}
                  className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border text-xs font-bold transition-all ${
                    currency === 'INR'
                      ? 'border-red-600 bg-red-600 text-white shadow-xs ring-2 ring-red-600/20'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                  }`}
                >
                  <span className="text-sm font-black">₹</span>
                  <span>INR (₹) — Indian Rupee</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border text-xs font-bold transition-all ${
                    currency === 'USD'
                      ? 'border-red-600 bg-red-600 text-white shadow-xs ring-2 ring-red-600/20'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                  }`}
                >
                  <span className="text-sm font-black">$</span>
                  <span>USD ($) — US Dollar</span>
                </button>
              </div>
            </div>

            {selectedParty && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-2 mt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{selectedParty.legalName}</span>
                  <Badge variant="blue" size="sm">
                    {selectedParty.isGstVerified ? 'GST Verified' : 'Registered'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-700">GSTIN:</span>{' '}
                    <span className="font-mono text-red-700 font-bold">{selectedParty.gstin}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">State:</span> {selectedParty.state} (Code:{' '}
                    {selectedParty.stateCode})
                  </p>
                  <p className="col-span-2">
                    <span className="font-semibold text-slate-700">Billing Address:</span>{' '}
                    {selectedParty.billingAddress || selectedParty.registeredAddress}
                  </p>
                </div>

                {/* Stored Email and Phone Number for Sharing */}
                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200">
                    <Mail className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-[10px] text-slate-500 block leading-tight">Saved Email (for Invoice PDF):</span>
                      {selectedParty.email ? (
                        <span className="font-medium text-slate-900 truncate block">{selectedParty.email}</span>
                      ) : (
                        <span className="text-amber-600 italic">No email saved on file</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-[10px] text-slate-500 block leading-tight">Saved Phone (for WhatsApp):</span>
                      {selectedParty.mobile ? (
                        <span className="font-medium text-slate-900 font-mono truncate block">{selectedParty.mobile}</span>
                      ) : (
                        <span className="text-amber-600 italic">No phone saved on file</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: EXPORTER & SHIPMENT */}
        {step === 2 && (
          <div className="space-y-4 max-w-3xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Step 2: Exporter & Shipment Particulars
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Exporter (Consignee)
                </label>
                <select
                  value={selectedExporterId}
                  onChange={(e) => {
                    setSelectedExporterId(e.target.value);
                    const exp = exporters.find((x) => x.id === e.target.value);
                    if (exp) {
                      setConsigneeName(exp.name);
                      setConsigneeAddress(`${exp.address || ''}, ${exp.city || ''}`);
                    }
                  }}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900"
                >
                  <option value="">-- None / Direct --</option>
                  {exporters.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} (IEC: {e.iecCode || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Associate Job / Shipment Ref
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => {
                    setSelectedJobId(e.target.value);
                    const j = jobs.find((job) => job.id === e.target.value);
                    if (j && j.sbNumber) setSbNumbers(j.sbNumber);
                  }}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900"
                >
                  <option value="">-- None / Ad-hoc --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.jobNumber} ({j.port} → {j.destination || 'Port'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shipping Bill Number(s)
                </label>
                <input
                  type="text"
                  value={sbNumbers}
                  onChange={(e) => setSbNumbers(e.target.value)}
                  placeholder="e.g. 6010085/18.08.2026, 6007882/17.08.2026"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Consignee Name</label>
                <input
                  type="text"
                  value={consigneeName}
                  onChange={(e) => setConsigneeName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CONTAINERS & DATES */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Step 3: Container Operations & Movement Dates
                </h3>
                <p className="text-xs text-slate-500">
                  Track container gate movements. Ground rent days and days after carting are computed automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddContainer}
                className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Container</span>
              </button>
            </div>

            {containers.map((cont, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 uppercase">
                      Container #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={cont.containerNumber}
                      onChange={(e) => handleUpdateContainer(idx, 'containerNumber', e.target.value.toUpperCase())}
                      placeholder="Container No (e.g. TGBU3802319)"
                      className="font-mono text-xs font-bold rounded border border-slate-300 px-2 py-1 uppercase"
                    />
                  </div>
                  {containers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setContainers(containers.filter((_, i) => i !== idx))}
                      className="text-xs text-rose-600 hover:text-rose-800"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Size</label>
                    <select
                      value={cont.size}
                      onChange={(e) => handleUpdateContainer(idx, 'size', e.target.value)}
                      className="w-full rounded border border-slate-300 p-1 bg-white"
                    >
                      <option value="20 FT">20 FT</option>
                      <option value="40 FT">40 FT</option>
                      <option value="40 FT HC">40 FT HC</option>
                      <option value="45 FT">45 FT</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Type</label>
                    <select
                      value={cont.type}
                      onChange={(e) => handleUpdateContainer(idx, 'type', e.target.value)}
                      className="w-full rounded border border-slate-300 p-1 bg-white"
                    >
                      <option value="DRY">DRY</option>
                      <option value="REEFER">REEFER</option>
                      <option value="FLAT RACK">FLAT RACK</option>
                      <option value="OPEN TOP">OPEN TOP</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Carting Date</label>
                    <input
                      type="date"
                      value={cont.cartingDate || ''}
                      onChange={(e) => handleUpdateContainer(idx, 'cartingDate', e.target.value)}
                      className="w-full rounded border border-slate-300 p-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Empty Gate-In</label>
                    <input
                      type="date"
                      value={cont.emptyGateInDate || ''}
                      onChange={(e) => handleUpdateContainer(idx, 'emptyGateInDate', e.target.value)}
                      className="w-full rounded border border-slate-300 p-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Stuffing Date</label>
                    <input
                      type="date"
                      value={cont.stuffingDate || ''}
                      onChange={(e) => handleUpdateContainer(idx, 'stuffingDate', e.target.value)}
                      className="w-full rounded border border-slate-300 p-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">LDD Out Date</label>
                    <input
                      type="date"
                      value={cont.lddOutDate || ''}
                      onChange={(e) => handleUpdateContainer(idx, 'lddOutDate', e.target.value)}
                      className="w-full rounded border border-slate-300 p-1 bg-white"
                    />
                  </div>
                </div>

                {/* Day Calculation Box */}
                <DateCalculationBox
                  emptyDays={cont.emptyGroundDays}
                  cartingDays={cont.daysAfterCarting}
                  loadedDays={cont.loadedGroundDays}
                  isOverride={cont.isOverride}
                  overrideReason={cont.overrideReason}
                  onToggleOverride={(ov) => handleUpdateContainer(idx, 'isOverride', ov)}
                  onOverrideChange={(f, val) => {
                    if (f === 'empty') handleUpdateContainer(idx, 'emptyGroundDays', val);
                    if (f === 'carting') handleUpdateContainer(idx, 'daysAfterCarting', val);
                    if (f === 'loaded') handleUpdateContainer(idx, 'loadedGroundDays', val);
                    if (f === 'reason') handleUpdateContainer(idx, 'overrideReason', val);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* STEP 4: CHARGES & LINE ITEMS */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Step 4: Container Charges & Line Items
                </h3>
                <p className="text-xs text-slate-500">
                  Add container-specific or general logistics charges from the Rate Master or create custom items.
                </p>
              </div>

              {/* Add Charge Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddChargeItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-xs rounded-lg border border-blue-300 bg-blue-50/60 p-2 font-medium text-blue-900 focus:outline-blue-500"
                >
                  <option value="">+ Add Charge from Master</option>
                  {chargeMasters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (₹{c.defaultRate})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setLineItems([
                      ...lineItems,
                      {
                        srNo: lineItems.length + 1,
                        description: 'Custom Operational Charge',
                        hsnSacCode: '996719',
                        quantity: 1,
                        unit: 'PER_CONTAINER',
                        rate: 1000,
                        discount: 0,
                      },
                    ]);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  + Custom Line
                </button>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-10">Sr</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 w-24">HSN/SAC</th>
                    <th className="p-2.5 w-16 text-center">Qty</th>
                    <th className="p-2.5 w-24 text-right">Rate ({getCurrencySymbol(currency)})</th>
                    <th className="p-2.5 w-24 text-right">Discount ({getCurrencySymbol(currency)})</th>
                    <th className="p-2.5 w-28 text-right">Taxable ({getCurrencySymbol(currency)})</th>
                    <th className="p-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((item, idx) => {
                    const taxable = Math.max(0, Number(item.quantity || 0) * Number(item.rate || 0) - Number(item.discount || 0));
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-2 text-center text-slate-400 font-medium">{item.srNo}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 bg-white text-slate-900"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.hsnSacCode}
                            onChange={(e) => handleUpdateItem(idx, 'hsnSacCode', e.target.value)}
                            className="w-full rounded border border-slate-200 p-1.5 bg-white font-mono text-center"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-slate-200 p-1.5 bg-white text-center"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            value={item.rate}
                            onChange={(e) => handleUpdateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-slate-200 p-1.5 bg-white text-right font-medium"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            value={item.discount}
                            onChange={(e) => handleUpdateItem(idx, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-slate-200 p-1.5 bg-white text-right text-rose-600"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900">
                          {getCurrencySymbol(currency)} {formatCurrency(taxable, currency)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Line Totals */}
            <div className="flex justify-end p-2 text-xs font-semibold text-slate-700">
              <span>
                Line Items Subtotal: {getCurrencySymbol(currency)}{' '}
                {formatCurrency(taxCalc?.subtotal, currency)}
              </span>
            </div>
          </div>
        )}

        {/* STEP 5: TAXES & TOTALS */}
        {step === 5 && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Step 5: GST Calculation & Financial Summary
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and customize GST percentages, supply type, discounts, and decimal-safe totals.
              </p>
            </div>

            {/* GST Percentage & Supply Type Controls */}
            <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-2xs space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-red-600" />
                  <span>GST Percentage & Rate Slabs</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Editable GST Workflow</span>
              </div>

              {/* Standard Slab Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Select GST Rate Slab:
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[0, 5, 12, 18, 28].map((slab) => {
                    const isSelected = !isCustomGst && customTotalGstRate === slab;
                    return (
                      <button
                        key={slab}
                        type="button"
                        onClick={() => {
                          setIsCustomGst(false);
                          setCustomTotalGstRate(slab);
                          setCustomCgstRate(slab / 2);
                          setCustomSgstRate(slab / 2);
                          setCustomIgstRate(slab);
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${
                          isSelected
                            ? 'border-red-600 bg-red-600 text-white shadow-2xs'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {slab}%
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsCustomGst(true)}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${
                      isCustomGst
                        ? 'border-red-600 bg-red-600 text-white shadow-2xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {/* Supply Type Override */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Supply Tax Type:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setForceTaxType('AUTO')}
                    className={`p-2 rounded-lg border text-left text-[11px] transition-all ${
                      forceTaxType === 'AUTO'
                        ? 'border-red-600 bg-red-50 text-red-950 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>Auto-Determine</div>
                    <div className="text-[10px] text-slate-500 font-normal">By party state code</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForceTaxType('INTRA_STATE')}
                    className={`p-2 rounded-lg border text-left text-[11px] transition-all ${
                      forceTaxType === 'INTRA_STATE'
                        ? 'border-red-600 bg-red-50 text-red-950 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>Intra-State</div>
                    <div className="text-[10px] text-slate-500 font-normal">CGST + SGST</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForceTaxType('INTER_STATE')}
                    className={`p-2 rounded-lg border text-left text-[11px] transition-all ${
                      forceTaxType === 'INTER_STATE'
                        ? 'border-red-600 bg-red-50 text-red-950 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>Inter-State</div>
                    <div className="text-[10px] text-slate-500 font-normal">IGST Only</div>
                  </button>
                </div>
              </div>

              {/* Detailed Editable Percentages Inputs */}
              {taxCalc && (
                <div className="pt-2 border-t border-slate-200">
                  {taxCalc.isInterState ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50/60 border border-purple-200">
                      <div>
                        <span className="font-bold text-purple-950">IGST Rate:</span>
                        <p className="text-[10px] text-purple-700">Inter-state supply tax rate</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={customIgstRate}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setIsCustomGst(true);
                            setCustomIgstRate(val);
                            setCustomTotalGstRate(val);
                          }}
                          className="w-20 text-center font-bold p-1 rounded border border-purple-300 bg-white text-purple-950 text-xs"
                        />
                        <span className="font-bold text-purple-900">%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-200">
                        <div>
                          <span className="font-bold text-blue-950">CGST Rate:</span>
                          <p className="text-[10px] text-blue-700">Central tax %</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="50"
                            value={customCgstRate}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setIsCustomGst(true);
                              setCustomCgstRate(val);
                              setCustomTotalGstRate(val + customSgstRate);
                            }}
                            className="w-16 text-center font-bold p-1 rounded border border-blue-300 bg-white text-blue-950 text-xs"
                          />
                          <span className="font-bold text-blue-900">%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-200">
                        <div>
                          <span className="font-bold text-blue-950">SGST Rate:</span>
                          <p className="text-[10px] text-blue-700">State tax %</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="50"
                            value={customSgstRate}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setIsCustomGst(true);
                              setCustomSgstRate(val);
                              setCustomTotalGstRate(customCgstRate + val);
                            }}
                            className="w-16 text-center font-bold p-1 rounded border border-blue-300 bg-white text-blue-950 text-xs"
                          />
                          <span className="font-bold text-blue-900">%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {taxCalc && (
              <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-xs space-y-3 text-xs">
                {/* Inter-State / Intra-State Notification */}
                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  taxCalc.isInterState ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  <div>
                    <span className="font-bold">
                      {taxCalc.isInterState ? 'Inter-State Supply (IGST Applicable)' : 'Intra-State Supply (CGST + SGST Applicable)'}
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Company State: Maharashtra (27) ➔ Party State: {selectedParty?.state} ({selectedParty?.stateCode})
                    </p>
                  </div>
                  <Badge variant={taxCalc.isInterState ? 'purple' : 'blue'}>
                    {taxCalc.isInterState ? `IGST ${taxCalc.igstRate}%` : `CGST ${taxCalc.cgstRate}% + SGST ${taxCalc.sgstRate}%`}
                  </Badge>
                </div>

                {/* Subtotals Breakdown */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Before Tax:</span>
                    <span className="font-medium text-slate-900">{getCurrencySymbol(currency)} {formatCurrency(taxCalc.subtotal, currency)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Special Invoice Discount:</span>
                    <div className="flex items-center gap-1">
                      <span>- {getCurrencySymbol(currency)}</span>
                      <input
                        type="number"
                        min="0"
                        value={invoiceLevelDiscount}
                        onChange={(e) => setInvoiceLevelDiscount(parseFloat(e.target.value) || 0)}
                        className="w-24 rounded border border-slate-300 p-1 text-right text-rose-600 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-2">
                    <span>Total Taxable Value:</span>
                    <span>{getCurrencySymbol(currency)} {formatCurrency(taxCalc.taxableAmount, currency)}</span>
                  </div>

                  {taxCalc.isInterState ? (
                    <div className="flex justify-between text-purple-800 font-medium">
                      <span>IGST ({taxCalc.igstRate}%):</span>
                      <span>{getCurrencySymbol(currency)} {formatCurrency(taxCalc.igstAmount, currency)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-blue-800 font-medium">
                        <span>CGST ({taxCalc.cgstRate}%):</span>
                        <span>{getCurrencySymbol(currency)} {formatCurrency(taxCalc.cgstAmount, currency)}</span>
                      </div>
                      <div className="flex justify-between text-blue-800 font-medium">
                        <span>SGST ({taxCalc.sgstRate}%):</span>
                        <span>{getCurrencySymbol(currency)} {formatCurrency(taxCalc.sgstAmount, currency)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Round Off:</span>
                    <span>{getCurrencySymbol(currency)} {formatCurrency(taxCalc.roundOff, currency)}</span>
                  </div>

                  {/* Grand Total */}
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 bg-red-50/40 p-3 rounded-lg border border-red-200">
                    <span className="text-base text-slate-900">GRAND TOTAL:</span>
                    <span className="text-xl text-red-600">{getCurrencySymbol(currency)} {formatCurrency(taxCalc.grandTotal, currency)}</span>
                  </div>

                  {/* Words */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 italic text-[11px]">
                    <span className="font-semibold text-slate-900">Amount in Words:</span> {taxCalc.amountInWords}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: PREVIEW & FINALIZE */}
        {step === 6 && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Step 6: A4 Tax Invoice Final Preview & Format Selection
                </h3>
                <p className="text-xs text-slate-500">
                  Select between 5 bill format slots and review the complete document before issuing.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveInvoice('DRAFT')}
                  disabled={loading}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveInvoice('FINALIZED')}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Finalize & Issue Invoice</span>
                </button>
              </div>
            </div>

            {/* Template Selection Slots (5 Slots) */}
            <div className="rounded-xl border border-slate-300 bg-white p-3 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <LayoutTemplate className="w-4 h-4 text-red-600" />
                  <span>INVOICE TEMPLATE SELECTION (5 SLOTS):</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Format 1 is active official reference</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {BILL_FORMAT_SLOTS.map((s) => {
                  const isSelected = templateId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setTemplateId(s.id)}
                      className={`p-2 rounded-lg border text-left text-xs transition-all ${
                        isSelected
                          ? 'border-red-600 bg-red-50 text-red-950 font-bold ring-2 ring-red-600/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{s.name.split(' (')[0]}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-red-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal truncate block mt-0.5">
                        {s.referenceTag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* A4 Invoice Preview Box */}
            <div className="bg-white border border-slate-400 rounded-xl p-6 shadow-md text-[11px] space-y-0 font-sans">
              {templateId !== 'format-1' && (
                <div className="mb-2 p-1.5 bg-slate-100 border border-slate-300 rounded text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  {BILL_FORMAT_SLOTS.find((s) => s.id === templateId)?.name} — TEMPLATE SLOT ACTIVE (READY FOR REFERENCE DESIGN)
                </div>
              )}

              {/* Header */}
              <div className="border border-slate-800 grid grid-cols-12 items-center p-2 gap-2">
                {/* Framed ISO logo box with text "ISO CERTIFIED 9001:2015" */}
                <div className="col-span-2 flex flex-col items-center justify-center border border-slate-300 rounded-xs p-1 h-20">
                  <img
                    src={settings?.isoLogoUrl || '/images/iso-logo.png'}
                    alt="ISO 9001:2015"
                    className="h-12 w-auto object-contain"
                  />
                  <span className="text-[8px] font-bold text-slate-800 mt-1 uppercase text-center leading-none">
                    ISO CERTIFIED 9001:2015
                  </span>
                </div>

                <div className="col-span-7 text-center space-y-0.5 px-2">
                  <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                    {settings?.companyName || 'MSK LOGISTIC SOLUTION'}
                  </h1>
                  <p className="text-[10px] text-slate-700 font-medium">
                    {settings?.address || 'JNPT Township Colony, Sector - 3, Building No. B/48, Office No. 3'}, {settings?.city || 'Navi Mumbai'} {settings?.pincode || '400702'}.
                  </p>
                  <p className="text-[10px] text-slate-900 font-bold">
                    TAN NO: {settings?.tan || 'PNES72845D'} &nbsp; PAN NO: {settings?.pan || 'AXWPK4562G'} &nbsp; GST NO: {settings?.gstin || '27AXWPK4562G1ZX'}
                  </p>
                  <p className="text-[10px] text-slate-700 font-medium">
                    Email id : {settings?.email || 'accounts@msklogisticsolution.com'} &nbsp; Mob No.{settings?.phone || '+91 8104592823'}
                  </p>
                </div>

                {/* Framed MSK logo box */}
                <div className="col-span-3 flex items-center justify-center border border-slate-300 rounded-xs p-1 h-20">
                  <img
                    src={settings?.logoUrl || '/images/msk-logo.png'}
                    alt="MSK LOGISTIC SOLUTION"
                    className="h-16 w-auto max-w-full object-contain"
                  />
                </div>
              </div>

              {/* Banner */}
              <div className="bg-[#1f2937] text-white text-center py-1 font-bold text-xs tracking-wider border-x border-b border-slate-800 uppercase">
                {settings?.invoiceTitle || 'TAX INVOICE (EXPORT STUFFING CONTAINER)'}
              </div>

              {/* Inv No & Date */}
              <div className="flex justify-between items-center px-3 py-1 border-x border-b border-slate-800 font-bold text-xs bg-slate-50/50">
                <div>
                  Invoice No: <span className="font-mono text-slate-950">(Auto: MSK/HT.../{new Date(invoiceDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}{String(new Date(invoiceDate).getFullYear()).slice(-2)})</span>
                </div>
                <div>
                  Invoice Date: <span className="text-slate-950">{new Date(invoiceDate).toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              {/* Billed To / Consignee */}
              <div className="grid grid-cols-2 border-x border-b border-slate-800 text-[10.5px]">
                <div className="border-r border-slate-800">
                  <div className="bg-slate-200 py-1 px-2 font-bold text-center border-b border-slate-800 text-[11px]">
                    Details of Receiver / Billed to
                  </div>
                  <div className="p-2 space-y-1">
                    <p><strong>Name:</strong> {selectedParty?.legalName}</p>
                    <p className="text-slate-700"><strong>Address:</strong> {selectedParty?.billingAddress || selectedParty?.registeredAddress}</p>
                    <p className="font-mono font-bold"><strong>GSTIN:</strong> {selectedParty?.gstin}</p>
                    <p><strong>State:</strong> {selectedParty?.state} &nbsp; <strong>State Code:</strong> {selectedParty?.stateCode}</p>
                  </div>
                </div>
                <div>
                  <div className="bg-slate-200 py-1 px-2 font-bold text-center border-b border-slate-800 text-[11px]">
                    Details of Consignee / Shipped to
                  </div>
                  <div className="p-2 space-y-1">
                    <p><strong>Name:</strong> {consigneeName || '-'}</p>
                    <p className="text-slate-700"><strong>Address:</strong> {consigneeAddress || '-'}</p>
                    <p><strong>GSTIN:</strong> -</p>
                    <p><strong>State:</strong> -</p>
                  </div>
                </div>
              </div>

              {/* Exporter & S/Bill */}
              <div className="grid grid-cols-2 border-x border-b border-slate-800 font-bold text-[10.5px]">
                <div className="p-1 px-2 border-r border-slate-800">
                  EXPORTER NAME : <span className="font-semibold">{consigneeName || '-'}</span>
                </div>
                <div className="p-1 px-2">
                  S/BILL NO : <span className="font-mono font-semibold">{sbNumbers || '-'}</span>
                </div>
              </div>

              {/* Containers Table (9 Columns matching Image 3) */}
              {/* Container Operational Details Table */}
              {containers.length > 0 && (
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
                      {containers.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50 divide-x divide-slate-800 text-[9px]">
                          <td className="py-1 px-0.5 font-mono text-center">{i + 1}</td>
                          <td className="py-1 px-1 font-mono font-bold text-slate-950 truncate text-center">{c.containerNumber}</td>
                          <td className="py-1 px-0.5 text-center">{c.size}</td>
                          <td className="py-1 px-0.5 text-center">{c.type}</td>
                          <td className="py-1 px-0.5 font-mono text-center">{c.emptyGroundDays || 0}</td>
                          <td className="py-1 px-0.5 font-mono text-center">{c.loadedGroundDays || 0}</td>
                          <td className="py-1 px-1.5 text-right font-mono">{c.htCharges ? `${getCurrencySymbol(currency)} ${formatCurrency(c.htCharges, currency)}` : '-'}</td>
                          <td className="py-1 px-1.5 text-right font-mono">{c.logisticsCharges ? `${getCurrencySymbol(currency)} ${formatCurrency(c.logisticsCharges, currency)}` : '-'}</td>
                          <td className="py-1 px-1.5 text-right font-mono">{c.emptyTransportCharges ? `${getCurrencySymbol(currency)} ${formatCurrency(c.emptyTransportCharges, currency)}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Section Divider Bar between Container Operational Details and Line Item Charges */}
              {containers.length > 0 && (
                <div className="h-2 bg-slate-100 border-x border-b border-slate-800 print:h-1.5" />
              )}

              {/* Line Items Table (7 Columns matching Image 3) */}
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
                      <th className="py-1.5 px-1.5 text-right">Rate ({getCurrencySymbol(currency)})</th>
                      <th className="py-1.5 px-1.5 text-right">Amount ({getCurrencySymbol(currency)})</th>
                      <th className="py-1.5 px-1.5 text-right">Taxable ({getCurrencySymbol(currency)})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {lineItems.map((item, i) => {
                      const taxable = Math.max(0, item.quantity * item.rate - (item.discount || 0));
                      return (
                        <tr key={i} className="hover:bg-slate-50 divide-x divide-slate-800 text-[9.5px]">
                          <td className="py-1.5 px-0.5 text-center font-mono">{i + 1}</td>
                          <td className="py-1.5 px-2 text-left font-bold text-slate-900 leading-snug break-words">{item.description}</td>
                          <td className="py-1.5 px-1 text-center font-mono">{item.hsnSacCode}</td>
                          <td className="py-1.5 px-0.5 text-center font-mono">{item.quantity}</td>
                          <td className="py-1.5 px-1.5 text-right font-mono">{formatCurrency(item.rate, currency)}</td>
                          <td className="py-1.5 px-1.5 text-right font-mono">{formatCurrency(item.quantity * item.rate, currency)}</td>
                          <td className="py-1.5 px-1.5 text-right font-mono font-bold text-slate-950">{formatCurrency(taxable, currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Totals & Banking Details */}
              <div className="grid grid-cols-12 border-x border-b border-slate-800 text-[10.5px]">
                <div className="col-span-7 border-r border-slate-800 p-2 space-y-2">
                  <p className="font-bold text-slate-800 text-[10px]">Total invoice amount in words:</p>
                  <p className="font-bold text-slate-950 uppercase">{taxCalc?.amountInWords} ONLY</p>
                  
                  <div className="border-t border-slate-300 pt-1.5 space-y-0.5 text-[9.5px]">
                    <p className="font-bold uppercase tracking-wider text-slate-900">OUR BANKING DETAILS:</p>
                    <p>Company name : <strong>{settings?.bankAccountName || settings?.companyName || 'MSK LOGISTIC SOLUTION'}</strong></p>
                    <p>A/C Number : <strong className="font-mono">{settings?.bankAccountNo || '574005000006'}</strong></p>
                    <p>Bank Name : <strong>{settings?.bankName || 'ICICI Bank'}</strong></p>
                    <p>Branch Name : {settings?.bankBranch || 'Dronagiri Node (Nhava Sheva)'}</p>
                    <p>IFSC Code : <strong className="font-mono">{settings?.bankIfsc || 'ICIC0005740'}</strong></p>
                  </div>
                </div>

                <div className="col-span-5 divide-y divide-slate-300 text-right">
                  <div className="flex justify-between p-1 px-2">
                    <span className="text-slate-600">Total Before Tax:</span>
                    <span className="font-mono font-semibold">{getCurrencySymbol(currency)} {formatCurrency(taxCalc?.taxableAmount, currency)}</span>
                  </div>
                  {taxCalc?.isInterState ? (
                    <div className="flex justify-between p-1 px-2 text-[#7c3aed]">
                      <span>Add: IGST ({taxCalc?.igstRate}%):</span>
                      <span className="font-mono font-bold">{getCurrencySymbol(currency)} {formatCurrency(taxCalc?.igstAmount, currency)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between p-1 px-2 text-[#7c3aed]">
                        <span>Add: CGST ({taxCalc?.cgstRate}%):</span>
                        <span className="font-mono font-bold">{getCurrencySymbol(currency)} {formatCurrency(taxCalc?.cgstAmount, currency)}</span>
                      </div>
                      <div className="flex justify-between p-1 px-2 text-[#7c3aed]">
                        <span>Add: SGST ({taxCalc?.sgstRate}%):</span>
                        <span className="font-mono font-bold">{getCurrencySymbol(currency)} {formatCurrency(taxCalc?.sgstAmount, currency)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between p-1.5 px-2 bg-slate-50 font-bold text-xs border-t border-slate-300">
                    <span className="uppercase text-slate-900">TOTAL AFTER TAX:</span>
                    <span className="font-mono text-red-600 font-black">{getCurrencySymbol(currency)} {formatCurrency(taxCalc?.grandTotal, currency)}</span>
                  </div>
                  <div className="p-2 text-center text-[10px] space-y-1">
                    <p className="font-bold text-slate-900 uppercase">{settings?.companyName || 'MSK LOGISTIC SOLUTION'}</p>
                    <div className="h-6"></div>
                    <p className="text-slate-600">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Navigation */}
      <div className="border-t border-slate-200 px-6 py-4 bg-slate-50/50 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous Step</span>
        </button>

        <div className="text-xs text-slate-500 font-medium">
          Step {step} of 6
        </div>

        {step < 6 ? (
          <button
            type="button"
            onClick={() => setStep(Math.min(6, step + 1))}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
          >
            <span>Next Step</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSaveInvoice('FINALIZED')}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Finalize & Issue Invoice</span>
          </button>
        )}
      </div>

      {/* WhatsApp Sharing Modal */}
      {createdInvoice && isWhatsAppOpen && (
        <WhatsAppSendModal
          isOpen={isWhatsAppOpen}
          onClose={() => setIsWhatsAppOpen(false)}
          invoice={createdInvoice}
        />
      )}

      {/* Email Sharing Modal */}
      {createdInvoice && isEmailOpen && (
        <EmailSendModal
          isOpen={isEmailOpen}
          onClose={() => setIsEmailOpen(false)}
          invoice={createdInvoice}
          templateId={templateId}
        />
      )}
    </div>
  );
};
