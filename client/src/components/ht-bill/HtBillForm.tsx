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
  Calendar,
  Box,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { Invoice, Party, Job, Container, CONTAINER_SIZES, CONTAINER_TYPES } from '../../types/index';
import { formatCurrency, numberToIndianWords } from '../../utils/currency';

interface HtBillFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedInvoice: Invoice) => void;
  initialParty?: Partial<Party> | null;
}

interface ContainerRow {
  id: string;
  containerNumber: string;
  size: string;
  type: string;
  emptyGateInDate: string; // Empty Pick-up
  stuffingDate: string;
  cartingDate: string;
  lddOutDate: string; // Loaded Gate-in
}

interface ChargeRow {
  id: string;
  srNo: number;
  description: string;
  hsnSacCode: string;
  rate: number;
  quantity: number;
  amount: number;
}

const PRESET_CHARGES = [
  { description: 'Ocean Freight Charges (Base Carrier Contracted Rates)', hsnSacCode: '996521', defaultRate: 140000, defaultQty: 2 },
  { description: 'Empty Container Depot Supervision & Detention Fees', hsnSacCode: '996719', defaultRate: 1200, isDayBased: 'empty' },
  { description: 'Cargo Staging & Warehouse Handling', hsnSacCode: '996729', defaultRate: 2500, isDayBased: 'cargo' },
  { description: 'Loaded Ground Rent & Port Terminal Storage', hsnSacCode: '996711', defaultRate: 1800, isDayBased: 'loaded' },
  { description: 'Terminal Handling Charges (THC) & Origin Drayage Services', hsnSacCode: '996713', defaultRate: 18500, defaultQty: 2 },
];

export const HtBillForm: React.FC<HtBillFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialParty,
}) => {
  // Master Data
  const [parties, setParties] = useState<Party[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // Form Basic Info
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  // Party (Bill To)
  const [partyId, setPartyId] = useState<string>('');
  const [billToName, setBillToName] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [billToGstin, setBillToGstin] = useState('');
  const [billToState, setBillToState] = useState('Maharashtra');
  const [billToStateCode, setBillToStateCode] = useState('27');

  // Shipment Reference
  const [vesselVoyage, setVesselVoyage] = useState('Pacific Pioneer / V-042E');
  const [mblHbl, setMblHbl] = useState('MEDU67201948 / AGLPNE0941');
  const [portOfLoading, setPortOfLoading] = useState('Nhava Sheva (INNSA)');
  const [portOfDischarge, setPortOfDischarge] = useState('Rotterdam (NLRTM)');
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Section 1: Container Rows
  const [containers, setContainers] = useState<ContainerRow[]>([
    {
      id: 'c-1',
      containerNumber: 'MSCU4810294',
      size: '40 FT',
      type: 'HC',
      emptyGateInDate: '2026-10-12',
      stuffingDate: '2026-10-15',
      cartingDate: '2026-10-19',
      lddOutDate: '2026-10-24',
    },
    {
      id: 'c-2',
      containerNumber: 'MSCU9182740',
      size: '40 FT',
      type: 'HC',
      emptyGateInDate: '2026-10-12',
      stuffingDate: '2026-10-16',
      cartingDate: '2026-10-20',
      lddOutDate: '2026-10-24',
    },
  ]);

  // Section 2: Charge Rows
  const [charges, setCharges] = useState<ChargeRow[]>([
    {
      id: 'ch-1',
      srNo: 1,
      description: 'Ocean Freight Charges (Base Carrier Contracted Rates)',
      hsnSacCode: '996521',
      rate: 140000,
      quantity: 2,
      amount: 280000,
    },
    {
      id: 'ch-2',
      srNo: 2,
      description: 'Empty Container Depot Supervision & Detention Fees (Total 7 Days)',
      hsnSacCode: '996719',
      rate: 1200,
      quantity: 7,
      amount: 8400,
    },
    {
      id: 'ch-3',
      srNo: 3,
      description: 'Cargo Staging & Warehouse Handling (Cargo Days: Total 8 Days)',
      hsnSacCode: '996729',
      rate: 2500,
      quantity: 8,
      amount: 20000,
    },
    {
      id: 'ch-4',
      srNo: 4,
      description: 'Loaded Ground Rent & Port Terminal Storage (Loaded Days: Total 9 Days)',
      hsnSacCode: '996711',
      rate: 1800,
      quantity: 9,
      amount: 16200,
    },
    {
      id: 'ch-5',
      srNo: 5,
      description: 'Terminal Handling Charges (THC) & Origin Drayage Services',
      hsnSacCode: '996713',
      rate: 18500,
      quantity: 2,
      amount: 37000,
    },
  ]);

  // GST & Tax Configuration
  const [isInterState, setIsInterState] = useState(false);
  const [cgstRate, setCgstRate] = useState(9);
  const [sgstRate, setSgstRate] = useState(9);
  const [igstRate, setIgstRate] = useState(18);

  // Terms & Notes
  const [terms, setTerms] = useState(
    '1. Interest @ 18% p.a. will be levied if payment is not received within 14 credit days.\n2. All business is transacted subject to standard Freight Forwarders Association Conditions.\n3. No claims for discrepancies will be entertained unless notified in writing within 7 days.'
  );

  // Submission / Loading
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load parties, jobs, and settings on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchMasters = async () => {
      setLoadingMasters(true);
      try {
        const [partiesRes, jobsRes, settingsRes] = await Promise.all([
          api.getParties(),
          api.getJobs(),
          api.getSettings(),
        ]);
        setParties(partiesRes || []);
        setJobs(jobsRes || []);
        setSettings(settingsRes);

        // Preselect initial party if provided
        if (initialParty?.id) {
          handleSelectParty(initialParty.id, partiesRes || []);
        } else if (partiesRes && partiesRes.length > 0) {
          handleSelectParty(partiesRes[0].id, partiesRes);
        }

        // Fetch next sequential H&T invoice number
        api.getNextInvoiceNumber('HT_BILL', invoiceDate)
          .then((res) => setInvoiceNumber(res.nextInvoiceNumber))
          .catch(() => {
            const now = new Date();
            const year = now.getFullYear();
            const nextYear = String(year + 1).slice(-2);
            setInvoiceNumber(`MSK/HT/${year}-${nextYear}/0001`);
          });
      } catch (err: any) {
        console.error('Error fetching masters for H&T form:', err);
      } finally {
        setLoadingMasters(false);
      }
    };

    fetchMasters();
  }, [isOpen]);

  const handleSelectParty = (selectedId: string, partyList: Party[] = parties) => {
    setPartyId(selectedId);
    const p = partyList.find((item) => item.id === selectedId);
    if (p) {
      setBillToName(p.legalName || p.tradeName);
      setBillToAddress(p.billingAddress || p.registeredAddress || '');
      setBillToGstin(p.gstin || '');
      setBillToState(p.state || 'Maharashtra');
      setBillToStateCode(p.stateCode || '27');

      // Auto check inter-state (Maharashtra code is 27)
      if (p.stateCode && p.stateCode !== '27') {
        setIsInterState(true);
      } else {
        setIsInterState(false);
      }
    }
  };

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    const j = jobs.find((item) => item.id === jobId);
    if (j) {
      if (j.shipmentRef) setVesselVoyage(j.shipmentRef);
      if (j.sbNumber) setMblHbl(j.sbNumber);
      if (j.port) setPortOfLoading(j.port);
      if (j.destination) setPortOfDischarge(j.destination);
    }
  };

  // Helper date calculation in days
  const calculateDays = (d1Str: string, d2Str: string): number => {
    if (!d1Str || !d2Str) return 0;
    const t1 = new Date(d1Str).getTime();
    const t2 = new Date(d2Str).getTime();
    if (isNaN(t1) || isNaN(t2) || t2 < t1) return 0;
    return Math.max(0, Math.round((t2 - t1) / (1000 * 3600 * 24)));
  };

  // Calculate container days
  const getContainerDays = (c: ContainerRow) => {
    const emptyDays = calculateDays(c.emptyGateInDate, c.stuffingDate);
    const cargoDays = calculateDays(c.stuffingDate, c.cartingDate);
    const loadedDays = calculateDays(c.cartingDate, c.lddOutDate);
    return { emptyDays, cargoDays, loadedDays };
  };

  // Calculate totals across all containers
  const totalContainerDays = containers.reduce(
    (acc, c) => {
      const { emptyDays, cargoDays, loadedDays } = getContainerDays(c);
      return {
        emptyDays: acc.emptyDays + emptyDays,
        cargoDays: acc.cargoDays + cargoDays,
        loadedDays: acc.loadedDays + loadedDays,
      };
    },
    { emptyDays: 0, cargoDays: 0, loadedDays: 0 }
  );

  // Container row handlers
  const handleAddContainer = () => {
    const newId = `c-${Date.now()}`;
    setContainers((prev) => [
      ...prev,
      {
        id: newId,
        containerNumber: '',
        size: '40 FT',
        type: 'HC',
        emptyGateInDate: invoiceDate,
        stuffingDate: invoiceDate,
        cartingDate: invoiceDate,
        lddOutDate: invoiceDate,
      },
    ]);
  };

  const handleUpdateContainer = (id: string, field: keyof ContainerRow, value: string) => {
    setContainers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleRemoveContainer = (id: string) => {
    if (containers.length <= 1) {
      alert('At least one container row is required.');
      return;
    }
    setContainers((prev) => prev.filter((c) => c.id !== id));
  };

  // Charge row handlers
  const handleAddCharge = (preset?: any) => {
    const newId = `ch-${Date.now()}`;
    const newRow: ChargeRow = {
      id: newId,
      srNo: charges.length + 1,
      description: preset?.description || 'Handling & Transportation Service',
      hsnSacCode: preset?.hsnSacCode || '996719',
      rate: preset?.defaultRate || 2500,
      quantity: preset?.defaultQty || 1,
      amount: (preset?.defaultRate || 2500) * (preset?.defaultQty || 1),
    };
    setCharges((prev) => [...prev, newRow]);
  };

  const handleUpdateCharge = (id: string, field: keyof ChargeRow, value: any) => {
    setCharges((prev) =>
      prev.map((ch) => {
        if (ch.id !== id) return ch;
        const updated = { ...ch, [field]: value };
        if (field === 'rate' || field === 'quantity') {
          const r = Number(field === 'rate' ? value : ch.rate) || 0;
          const q = Number(field === 'quantity' ? value : ch.quantity) || 0;
          updated.amount = r * q;
        }
        return updated;
      })
    );
  };

  const handleRemoveCharge = (id: string) => {
    if (charges.length <= 1) {
      alert('At least one charge row is required.');
      return;
    }
    setCharges((prev) =>
      prev.filter((ch) => ch.id !== id).map((ch, idx) => ({ ...ch, srNo: idx + 1 }))
    );
  };

  // Sync container days to day-based charges
  const handleSyncDaysToCharges = () => {
    setCharges((prev) =>
      prev.map((ch) => {
        if (ch.description.includes('Empty Container Depot Supervision')) {
          const qty = totalContainerDays.emptyDays || 1;
          return {
            ...ch,
            description: `Empty Container Depot Supervision & Detention Fees (Total ${qty} Days)`,
            quantity: qty,
            amount: ch.rate * qty,
          };
        }
        if (ch.description.includes('Cargo Staging & Warehouse Handling')) {
          const qty = totalContainerDays.cargoDays || 1;
          return {
            ...ch,
            description: `Cargo Staging & Warehouse Handling (Cargo Days: Total ${qty} Days)`,
            quantity: qty,
            amount: ch.rate * qty,
          };
        }
        if (ch.description.includes('Loaded Ground Rent')) {
          const qty = totalContainerDays.loadedDays || 1;
          return {
            ...ch,
            description: `Loaded Ground Rent & Port Terminal Storage (Loaded Days: Total ${qty} Days)`,
            quantity: qty,
            amount: ch.rate * qty,
          };
        }
        return ch;
      })
    );
  };

  // Calculate financial totals
  const subtotalTaxable = charges.reduce((sum, ch) => sum + (Number(ch.amount) || 0), 0);
  const cgstAmount = isInterState ? 0 : Math.round(subtotalTaxable * (cgstRate / 100) * 100) / 100;
  const sgstAmount = isInterState ? 0 : Math.round(subtotalTaxable * (sgstRate / 100) * 100) / 100;
  const igstAmount = isInterState ? Math.round(subtotalTaxable * (igstRate / 100) * 100) / 100 : 0;
  const totalTax = cgstAmount + sgstAmount + igstAmount;
  const grandTotal = Math.round((subtotalTaxable + totalTax) * 100) / 100;
  const amountInWords = numberToIndianWords(grandTotal);

  // Submit Handler
  const handleSaveInvoice = async (status: 'DRAFT' | 'FINALIZED' = 'FINALIZED') => {
    if (!partyId) {
      setError('Please select a recipient party.');
      return;
    }
    if (containers.length === 0) {
      setError('Please add at least one container.');
      return;
    }
    if (charges.length === 0) {
      setError('Please add at least one charge line item.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Map containers
      const mappedContainers = containers.map((c) => {
        const { emptyDays, cargoDays, loadedDays } = getContainerDays(c);
        return {
          containerNumber: c.containerNumber.trim().toUpperCase(),
          size: c.size,
          type: c.type,
          emptyGateInDate: c.emptyGateInDate ? new Date(c.emptyGateInDate).toISOString() : null,
          stuffingDate: c.stuffingDate ? new Date(c.stuffingDate).toISOString() : null,
          cartingDate: c.cartingDate ? new Date(c.cartingDate).toISOString() : null,
          lddOutDate: c.lddOutDate ? new Date(c.lddOutDate).toISOString() : null,
          emptyGroundDays: emptyDays,
          daysAfterCarting: cargoDays,
          loadedGroundDays: loadedDays,
        };
      });

      // Map charge items
      const mappedItems = charges.map((ch, idx) => ({
        srNo: idx + 1,
        description: ch.description,
        hsnSacCode: ch.hsnSacCode,
        rate: Number(ch.rate),
        quantity: Number(ch.quantity),
        amount: Number(ch.amount),
        taxableValue: Number(ch.amount),
        unit: 'PER_CONTAINER',
      }));

      const payload = {
        customInvoiceNumber: invoiceNumber.trim() || undefined,
        billType: 'HT_BILL',
        partyId,
        invoiceDate: new Date(invoiceDate).toISOString(),
        vesselVoyage: vesselVoyage.trim(),
        mblHbl: mblHbl.trim(),
        portOfLoading: portOfLoading.trim(),
        portOfDischarge: portOfDischarge.trim(),
        currency,
        status,
        containers: mappedContainers,
        items: mappedItems,
        terms,
        forceInterState: isInterState,
        customCgstRate: cgstRate,
        customSgstRate: sgstRate,
        customIgstRate: igstRate,
        templateId: 'format-1',
      };

      const saved = await api.createInvoice(payload);
      onSuccess(saved);
    } catch (err: any) {
      console.error('Failed to save H&T invoice:', err);
      setError(err.message || 'Failed to generate invoice. Please check the inputs.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-300 bg-red-950/80 px-2 py-0.5 rounded border border-red-700/50">
                  NEW BILL TYPE
                </span>
                <span className="text-xs text-slate-300 font-medium">Handling & Transportation</span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white mt-0.5">
                Create H & T Tax Invoice
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Header Information & Recipient Details */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Invoice Meta */}
            <div className="md:col-span-4 space-y-3 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
              <h3 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-red-600" />
                <span>Invoice Metadata</span>
              </h3>
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                  placeholder="Auto-generated (e.g. MSK/HT/2026-27/001)"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bill To Recipient */}
            <div className="md:col-span-8 space-y-3">
              <h3 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-red-600" />
                <span>Bill To (Recipient Party)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    Select Existing Party
                  </label>
                  <select
                    value={partyId}
                    onChange={(e) => handleSelectParty(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
                  >
                    <option value="">-- Choose Party from Master --</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.legalName || p.tradeName} ({p.gstin || 'URP'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    Party Legal Name
                  </label>
                  <input
                    type="text"
                    value={billToName}
                    onChange={(e) => setBillToName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900"
                    placeholder="Recipient Company Name"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    Billing Address
                  </label>
                  <input
                    type="text"
                    value={billToAddress}
                    onChange={(e) => setBillToAddress(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                    placeholder="Address, City, State, Pincode"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    Party GSTIN
                  </label>
                  <input
                    type="text"
                    value={billToGstin}
                    onChange={(e) => setBillToGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                    placeholder="e.g. 27AXWPK4562G1ZX"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    State & Code (Place of Supply)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={billToState}
                      onChange={(e) => setBillToState(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                      placeholder="State"
                    />
                    <input
                      type="text"
                      value={billToStateCode}
                      onChange={(e) => setBillToStateCode(e.target.value)}
                      className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-center"
                      placeholder="Code"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Shipment Reference */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-red-600" />
                <span>Shipment Reference</span>
              </h3>
              {jobs.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">Link from Job:</span>
                  <select
                    value={selectedJobId}
                    onChange={(e) => handleSelectJob(e.target.value)}
                    className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px]"
                  >
                    <option value="">-- Manual Reference --</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.jobNumber} {j.shipmentRef ? `(${j.shipmentRef})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                  Vessel / Voyage
                </label>
                <input
                  type="text"
                  value={vesselVoyage}
                  onChange={(e) => setVesselVoyage(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
                  placeholder="e.g. Pacific Pioneer / V-042E"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                  MBL / HBL Number
                </label>
                <input
                  type="text"
                  value={mblHbl}
                  onChange={(e) => setMblHbl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  placeholder="e.g. MEDU67201948 / AGLPNE0941"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                  Port of Loading
                </label>
                <input
                  type="text"
                  value={portOfLoading}
                  onChange={(e) => setPortOfLoading(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900"
                  placeholder="e.g. Nhava Sheva (INNSA)"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                  Port of Discharge
                </label>
                <input
                  type="text"
                  value={portOfDischarge}
                  onChange={(e) => setPortOfDischarge(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900"
                  placeholder="e.g. Rotterdam (NLRTM)"
                />
              </div>
            </div>
          </div>

          {/* 3. Section 1: Container Tracking, Milestones & Period Calculations */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 uppercase text-xs flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-red-600" />
                  <span>1. Container Tracking, Milestones & Period Calculations</span>
                </h3>
                <p className="text-[10px] text-slate-500">
                  Enter container operational milestones; day periods are calculated automatically.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncDaysToCharges}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-teal-50 border border-teal-300 text-teal-800 rounded-lg hover:bg-teal-100 transition-colors"
                  title="Update charge row quantities with calculated days"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Days to Charges</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddContainer}
                  className="flex items-center gap-1 text-[11px] font-bold px-3 py-1 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Container</span>
                </button>
              </div>
            </div>

            {/* Containers Table */}
            <div className="border border-slate-300 rounded-xl overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold text-[10px] uppercase">
                    <th className="p-2 border-r border-slate-700 w-44">Container No. & Size/Type</th>
                    <th className="p-2 border-r border-slate-700 w-32 text-center">Empty Pick-up</th>
                    <th className="p-2 border-r border-slate-700 w-32 text-center">Stuffing Date</th>
                    <th className="p-2 border-r border-slate-700 w-32 text-center">Carting Date</th>
                    <th className="p-2 border-r border-slate-700 w-32 text-center">Loaded Gate-in</th>
                    <th className="p-2 border-r border-slate-700 w-24 text-center bg-slate-900">
                      Empty Days<br/><span className="text-[8px] text-slate-300 font-normal">(Pick-up to Stuff)</span>
                    </th>
                    <th className="p-2 border-r border-slate-700 w-24 text-center bg-slate-900">
                      Cargo Days<br/><span className="text-[8px] text-slate-300 font-normal">(Stuff to Cart)</span>
                    </th>
                    <th className="p-2 border-r border-slate-700 w-24 text-center bg-slate-900">
                      Loaded Days<br/><span className="text-[8px] text-slate-300 font-normal">(Cart to Gate-in)</span>
                    </th>
                    <th className="p-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {containers.map((c) => {
                    const { emptyDays, cargoDays, loadedDays } = getContainerDays(c);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={c.containerNumber}
                            onChange={(e) => handleUpdateContainer(c.id, 'containerNumber', e.target.value.toUpperCase())}
                            className="w-full font-mono font-bold text-slate-950 px-2 py-1 border border-slate-300 rounded mb-1"
                            placeholder="e.g. MSCU4810294"
                          />
                          <div className="flex gap-1">
                            <select
                              value={c.size}
                              onChange={(e) => handleUpdateContainer(c.id, 'size', e.target.value)}
                              className="w-1/2 px-1 py-0.5 border border-slate-300 rounded text-[10px] bg-white font-medium"
                            >
                              {CONTAINER_SIZES.map((sz) => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                            </select>
                            <select
                              value={c.type}
                              onChange={(e) => handleUpdateContainer(c.id, 'type', e.target.value)}
                              className="w-1/2 px-1 py-0.5 border border-slate-300 rounded text-[10px] bg-white font-medium"
                            >
                              {CONTAINER_TYPES.map((tp) => (
                                <option key={tp} value={tp}>{tp}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center">
                          <input
                            type="date"
                            value={c.emptyGateInDate}
                            onChange={(e) => handleUpdateContainer(c.id, 'emptyGateInDate', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-[10.5px]"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center">
                          <input
                            type="date"
                            value={c.stuffingDate}
                            onChange={(e) => handleUpdateContainer(c.id, 'stuffingDate', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-[10.5px]"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center">
                          <input
                            type="date"
                            value={c.cartingDate}
                            onChange={(e) => handleUpdateContainer(c.id, 'cartingDate', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-[10.5px]"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center">
                          <input
                            type="date"
                            value={c.lddOutDate}
                            onChange={(e) => handleUpdateContainer(c.id, 'lddOutDate', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-[10.5px]"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-teal-700 bg-teal-50/40 font-mono">
                          {emptyDays} Days
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-teal-700 bg-teal-50/40 font-mono">
                          {cargoDays} Days
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-teal-700 bg-teal-50/40 font-mono">
                          {loadedDays} Days
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveContainer(c.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Remove Container"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-[10.5px] border-t border-slate-300">
                    <td colSpan={5} className="p-2 text-right pr-4 text-slate-700">
                      Total Calculated Days Across All Containers:
                    </td>
                    <td className="p-2 text-center text-teal-800 font-black font-mono bg-teal-100/60">
                      {totalContainerDays.emptyDays} Days
                    </td>
                    <td className="p-2 text-center text-teal-800 font-black font-mono bg-teal-100/60">
                      {totalContainerDays.cargoDays} Days
                    </td>
                    <td className="p-2 text-center text-teal-800 font-black font-mono bg-teal-100/60">
                      {totalContainerDays.loadedDays} Days
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 4. Section 2: Itemised Financial Charge Particulars */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 uppercase text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-red-600" />
                  <span>2. Itemised Financial Charge Particulars</span>
                </h3>
                <p className="text-[10px] text-slate-500">
                  Select predefined suggestions or add custom charge line items.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAddCharge()}
                className="flex items-center gap-1 text-[11px] font-bold px-3 py-1 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Charge Line</span>
              </button>
            </div>

            {/* Quick Add Buttons for Initial Suggested Categories */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mr-1">
                Quick Presets:
              </span>
              {PRESET_CHARGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddCharge(preset)}
                  className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:border-red-400 hover:bg-red-50 text-[10px] font-medium text-slate-700 transition-colors shadow-2xs"
                >
                  + {preset.description.split(' (')[0]}
                </button>
              ))}
            </div>

            {/* Charges Table */}
            <div className="border border-slate-300 rounded-xl overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold text-[10px] uppercase">
                    <th className="p-2 w-10 text-center border-r border-slate-700">Sr.</th>
                    <th className="p-2 border-r border-slate-700">Description of Service Charges / Operations</th>
                    <th className="p-2 w-28 text-center border-r border-slate-700">SAC Code</th>
                    <th className="p-2 w-28 text-right border-r border-slate-700">Rate (INR)</th>
                    <th className="p-2 w-20 text-center border-r border-slate-700">Qty</th>
                    <th className="p-2 w-32 text-right border-r border-slate-700 pr-3">Taxable Value (INR)</th>
                    <th className="p-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {charges.map((ch, idx) => (
                    <tr key={ch.id} className="hover:bg-slate-50/50">
                      <td className="p-2 text-center font-bold text-slate-400 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={ch.description}
                          onChange={(e) => handleUpdateCharge(ch.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded font-semibold text-slate-900"
                          placeholder="Service Charge Description"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={ch.hsnSacCode}
                          onChange={(e) => handleUpdateCharge(ch.id, 'hsnSacCode', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-center"
                          placeholder="SAC Code"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="number"
                          value={ch.rate}
                          onChange={(e) => handleUpdateCharge(ch.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-right"
                          step="100"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="number"
                          value={ch.quantity}
                          onChange={(e) => handleUpdateCharge(ch.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-200 rounded font-bold text-center"
                          step="1"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-950 pr-3">
                        ₹ {formatCurrency(ch.amount)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveCharge(ch.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove Charge"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & GST Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2">
              {/* GST Type Controls */}
              <div className="md:col-span-7 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase text-[10.5px]">
                    GST Treatment:
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700">
                      <input
                        type="radio"
                        name="taxType"
                        checked={!isInterState}
                        onChange={() => setIsInterState(false)}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span>Intra-State (CGST + SGST)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700">
                      <input
                        type="radio"
                        name="taxType"
                        checked={isInterState}
                        onChange={() => setIsInterState(true)}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span>Inter-State (IGST)</span>
                    </label>
                  </div>
                </div>

                {!isInterState ? (
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">CGST Rate:</span>
                      <input
                        type="number"
                        value={cgstRate}
                        onChange={(e) => setCgstRate(parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-0.5 border border-slate-300 rounded font-mono text-center"
                      />
                      <span className="text-slate-500">%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">SGST Rate:</span>
                      <input
                        type="number"
                        value={sgstRate}
                        onChange={(e) => setSgstRate(parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-0.5 border border-slate-300 rounded font-mono text-center"
                      />
                      <span className="text-slate-500">%</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1 text-[11px]">
                    <span className="text-slate-600">IGST Rate:</span>
                    <input
                      type="number"
                      value={igstRate}
                      onChange={(e) => setIgstRate(parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-0.5 border border-slate-300 rounded font-mono text-center"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                )}
                <div className="text-[10px] text-slate-500 pt-1">
                  Amount in words: <span className="font-semibold text-slate-800">{amountInWords}</span>
                </div>
              </div>

              {/* Totals Box */}
              <div className="md:col-span-5 bg-white border border-slate-300 rounded-xl divide-y divide-slate-200 shadow-xs overflow-hidden">
                <div className="flex justify-between p-2.5">
                  <span className="font-bold text-slate-700">Subtotal Taxable Amount</span>
                  <span className="font-bold font-mono text-slate-900">₹ {formatCurrency(subtotalTaxable)}</span>
                </div>
                {!isInterState ? (
                  <>
                    <div className="flex justify-between p-2 text-slate-600">
                      <span>CGST @ {cgstRate}%</span>
                      <span className="font-mono">₹ {formatCurrency(cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between p-2 text-slate-600">
                      <span>SGST @ {sgstRate}%</span>
                      <span className="font-mono">₹ {formatCurrency(sgstAmount)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between p-2 text-slate-600">
                    <span>IGST @ {igstRate}%</span>
                    <span className="font-mono">₹ {formatCurrency(igstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between p-3 bg-slate-900 text-white font-black text-sm">
                  <span>TOTAL INVOICE VALUE</span>
                  <span className="font-mono text-red-400">₹ {formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Terms & Conditions and Bank Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-900 uppercase mb-1">
                Terms & Conditions
              </label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-[10.5px] leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-900 uppercase mb-1">
                Bank Remittance Details (From Settings)
              </label>
              <div className="bg-white p-2.5 border border-slate-300 rounded-lg text-[10px] space-y-0.5 text-slate-700">
                <p><span className="font-bold text-slate-900">Bank:</span> {settings?.bankName || 'ICICI Bank'}</p>
                <p><span className="font-bold text-slate-900">Account Name:</span> {settings?.bankAccountName || 'MSK LOGISTIC SOLUTION'}</p>
                <p><span className="font-bold text-slate-900">A/C Number:</span> <span className="font-mono font-bold">{settings?.bankAccountNo || '574005000006'}</span></p>
                <p><span className="font-bold text-slate-900">IFSC Code:</span> <span className="font-mono">{settings?.bankIfsc || 'ICIC0005740'}</span> | <span className="font-bold text-slate-900">Branch:</span> {settings?.bankBranch || 'Dronagiri Node'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveInvoice('DRAFT')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveInvoice('FINALIZED')}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors shadow-md shadow-red-900/20"
            >
              {saving ? (
                <span>Generating Invoice...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Generate & Preview H & T Bill</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
