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
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { Invoice, Party, Job, Container, CONTAINER_SIZES, CONTAINER_TYPES } from '../../types/index';
import { formatCurrency, numberToIndianWords } from '../../utils/currency';

interface EmptyContainerFormProps {
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
  gateInDate: string;
  gateOutDate: string;
  freeDays: number;
}

interface ChargeRow {
  id: string;
  srNo: number;
  description: string;
  hsnSacCode: string;
  rate: number;
  quantity: number;
  amount: number;
  isStorageCharge?: boolean;
}

const PRESET_CHARGES = [
  { description: 'Empty Container Lift-On (LoLo) Fees', hsnSacCode: '996719', defaultRate: 1500, linkToContainers: true },
  { description: 'Empty Depot Ground Storage Charges', hsnSacCode: '996711', defaultRate: 450, isStorageCharge: true },
  { description: 'Terminal Survey & Cleaning Charges', hsnSacCode: '996713', defaultRate: 850, linkToContainers: true },
];

export const EmptyContainerForm: React.FC<EmptyContainerFormProps> = ({
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

  // Supplier / Depot Details
  const [depotName, setDepotName] = useState('MSK Nhava Sheva CFS & Empty Depot');
  const [depotAddress, setDepotAddress] = useState('Dronagiri Node, Sector 3, Nhava Sheva, Navi Mumbai, MH 400702');
  const [depotState, setDepotState] = useState('Maharashtra');
  const [depotStateCode, setDepotStateCode] = useState('27');

  // Shipment & Transport Grounding
  const [vesselVoyage, setVesselVoyage] = useState('Pacific Pioneer / V-042E');
  const [mblHbl, setMblHbl] = useState('MEDU67201948');
  const [deliveryOrder, setDeliveryOrder] = useState('DO-77821');
  const [transporterName, setTransporterName] = useState('Shri Mahalakshmi Logistics');
  const [vehicleNumber, setVehicleNumber] = useState('MH-46-AR-8812');
  const [terminalGatePass, setTerminalGatePass] = useState('TGP-948102');
  const [eirReceipt, setEirReceipt] = useState('EIR-48190');
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Section 1: Container Rows
  const [containers, setContainers] = useState<ContainerRow[]>([
    {
      id: 'c-1',
      containerNumber: 'MSCU4810294',
      size: '40 FT',
      type: 'HC',
      gateInDate: '2026-10-12',
      gateOutDate: '2026-10-24',
      freeDays: 3,
    },
    {
      id: 'c-2',
      containerNumber: 'MSCU9182740',
      size: '40 FT',
      type: 'HC',
      gateInDate: '2026-10-12',
      gateOutDate: '2026-10-24',
      freeDays: 3,
    },
  ]);

  // Section 2: Charge Items
  const [charges, setCharges] = useState<ChargeRow[]>([
    {
      id: 'ch-1',
      srNo: 1,
      description: 'Empty Container Lift-On (LoLo) Fees',
      hsnSacCode: '996719',
      rate: 1500,
      quantity: 2,
      amount: 3000,
    },
    {
      id: 'ch-2',
      srNo: 2,
      description: 'Empty Depot Ground Storage Charges (Total 18 Chargeable Days)',
      hsnSacCode: '996711',
      rate: 450,
      quantity: 18,
      amount: 8100,
      isStorageCharge: true,
    },
    {
      id: 'ch-3',
      srNo: 3,
      description: 'Terminal Survey & Cleaning Charges',
      hsnSacCode: '996713',
      rate: 850,
      quantity: 2,
      amount: 1700,
    },
  ]);

  // Tax and GST
  const [taxRate, setTaxRate] = useState<number>(18);
  const [isInterState, setIsInterState] = useState(false);

  // Status and Submitting
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load masters on mount
  useEffect(() => {
    if (!isOpen) return;
    setLoadingMasters(true);
    Promise.all([
      api.getParties().catch(() => []),
      api.getJobs().catch(() => []),
      api.getSettings().catch(() => null),
    ])
      .then(([partiesData, jobsData, settingsData]) => {
        setParties(partiesData);
        setJobs(jobsData);
        if (settingsData) setSettings(settingsData);

        // Fetch next sequential EC invoice number if not set
        if (!invoiceNumber) {
          api.getNextInvoiceNumber('EMPTY_CONTAINER', invoiceDate)
            .then((res) => setInvoiceNumber(res.nextInvoiceNumber))
            .catch(() => {
              const now = new Date();
              const year = now.getFullYear();
              const nextYear = String(year + 1).slice(-2);
              setInvoiceNumber(`MSK/EC/${year}-${nextYear}/0001`);
            });
        }

        // Apply initial party if provided
        if (initialParty && initialParty.id) {
          const match = partiesData.find((p: Party) => p.id === initialParty.id);
          if (match) applyParty(match);
        } else if (partiesData.length > 0 && !partyId) {
          applyParty(partiesData[0]);
        }
      })
      .finally(() => setLoadingMasters(false));
  }, [isOpen]);

  const applyParty = (p: Party) => {
    setPartyId(p.id);
    setBillToName(p.legalName || p.tradeName);
    setBillToAddress(p.billingAddress || `${p.city || ''}, ${p.state || ''}`);
    setBillToGstin(p.gstin || '');
    setBillToState(p.state || 'Maharashtra');
    const sCode = p.stateCode || (p.state?.toLowerCase().includes('maharashtra') ? '27' : '29');
    setBillToStateCode(sCode);

    // Auto determine inter-state
    const isInter = sCode !== '27' && !p.state?.toLowerCase().includes('maharashtra');
    setIsInterState(isInter);
  };

  const handlePartySelect = (id: string) => {
    const p = parties.find((item) => item.id === id);
    if (p) applyParty(p);
  };

  const handleJobSelect = (jId: string) => {
    setSelectedJobId(jId);
    if (!jId) return;
    const j = jobs.find((job) => job.id === jId);
    if (!j) return;

    if ((j as any).vesselVoyage) setVesselVoyage((j as any).vesselVoyage);
    if ((j as any).mblHbl) setMblHbl((j as any).mblHbl);
    if (j.shipmentRef) setDeliveryOrder(j.shipmentRef);
    if (j.partyId) {
      const p = parties.find((party) => party.id === j.partyId);
      if (p) applyParty(p);
    }
  };

  // Helper date calculation
  const calculateDays = (d1: string, d2: string) => {
    if (!d1 || !d2) return 0;
    const dt1 = new Date(d1).getTime();
    const dt2 = new Date(d2).getTime();
    if (isNaN(dt1) || isNaN(dt2) || dt2 < dt1) return 0;
    return Math.max(0, Math.round((dt2 - dt1) / (1000 * 3600 * 24)));
  };

  // Compute container days breakdown
  const containerCalculations = containers.map((c) => {
    const storageDays = calculateDays(c.gateInDate, c.gateOutDate);
    const freeDays = c.freeDays || 3;
    const chargeableDays = Math.max(0, storageDays - freeDays);
    return {
      id: c.id,
      storageDays,
      freeDays,
      chargeableDays,
    };
  });

  const totalStorageDays = containerCalculations.reduce((sum, item) => sum + item.storageDays, 0);
  const totalChargeableDays = containerCalculations.reduce((sum, item) => sum + item.chargeableDays, 0);

  // Sync chargeable storage days to the storage charge row
  const syncStorageDaysToCharges = () => {
    setCharges((prev) =>
      prev.map((ch) => {
        if (ch.isStorageCharge || ch.description.toLowerCase().includes('storage')) {
          const qty = totalChargeableDays;
          return {
            ...ch,
            quantity: qty,
            amount: ch.rate * qty,
            description: `Empty Depot Ground Storage Charges (Total ${qty} Chargeable Days)`,
          };
        }
        if (ch.description.toLowerCase().includes('lift-on') || ch.description.toLowerCase().includes('survey')) {
          const qty = containers.length;
          return {
            ...ch,
            quantity: qty,
            amount: ch.rate * qty,
          };
        }
        return ch;
      })
    );
  };

  // Container row handlers
  const addContainerRow = () => {
    const newId = `c-${Date.now()}`;
    setContainers((prev) => [
      ...prev,
      {
        id: newId,
        containerNumber: '',
        size: '40 FT',
        type: 'HC',
        gateInDate: invoiceDate,
        gateOutDate: invoiceDate,
        freeDays: 3,
      },
    ]);
  };

  const removeContainerRow = (id: string) => {
    if (containers.length <= 1) {
      alert('At least one container row is required.');
      return;
    }
    setContainers((prev) => prev.filter((c) => c.id !== id));
  };

  const updateContainerRow = (id: string, field: keyof ContainerRow, value: any) => {
    setContainers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Charge row handlers
  const addChargeRow = (preset?: any) => {
    const newId = `ch-${Date.now()}`;
    const nextSr = charges.length + 1;
    const newCharge: ChargeRow = {
      id: newId,
      srNo: nextSr,
      description: preset ? preset.description : 'Custom Depot Handling Charge',
      hsnSacCode: preset ? preset.hsnSacCode : '996719',
      rate: preset ? preset.defaultRate : 1000,
      quantity: preset?.isStorageCharge ? (totalChargeableDays || 1) : 1,
      amount: preset ? preset.defaultRate * (preset.isStorageCharge ? (totalChargeableDays || 1) : 1) : 1000,
      isStorageCharge: preset?.isStorageCharge || false,
    };
    setCharges((prev) => [...prev, newCharge]);
  };

  const removeChargeRow = (id: string) => {
    if (charges.length <= 1) {
      alert('At least one charge line is required.');
      return;
    }
    setCharges((prev) =>
      prev
        .filter((ch) => ch.id !== id)
        .map((ch, idx) => ({ ...ch, srNo: idx + 1 }))
    );
  };

  const updateChargeRow = (id: string, field: 'description' | 'hsnSacCode' | 'rate' | 'quantity', value: any) => {
    setCharges((prev) =>
      prev.map((ch) => {
        if (ch.id !== id) return ch;
        const updated = { ...ch, [field]: value };
        const rate = field === 'rate' ? Number(value) || 0 : ch.rate;
        const qty = field === 'quantity' ? Number(value) || 0 : ch.quantity;
        updated.amount = Math.round(rate * qty * 100) / 100;
        return updated;
      })
    );
  };

  // Calculations
  const taxableAmount = Math.round(charges.reduce((sum, ch) => sum + (ch.amount || 0), 0) * 100) / 100;
  const halfTaxRate = taxRate / 2;
  const cgstAmount = isInterState ? 0 : Math.round((taxableAmount * (halfTaxRate / 100)) * 100) / 100;
  const sgstAmount = isInterState ? 0 : Math.round((taxableAmount * (halfTaxRate / 100)) * 100) / 100;
  const igstAmount = isInterState ? Math.round((taxableAmount * (taxRate / 100)) * 100) / 100 : 0;
  const totalTaxAmount = Math.round((cgstAmount + sgstAmount + igstAmount) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + totalTaxAmount) * 100) / 100;
  const amountInWords = numberToIndianWords(grandTotal);

  // Form submission
  const handleSubmit = async (targetStatus: 'DRAFT' | 'FINALIZED') => {
    setErrorMsg(null);
    if (!partyId && !billToName) {
      setErrorMsg('Please select or specify a Recipient Party (Bill To).');
      return;
    }
    if (!invoiceNumber.trim()) {
      setErrorMsg('Please enter an Invoice Number.');
      return;
    }
    if (containers.length === 0) {
      setErrorMsg('Please add at least one container row.');
      return;
    }
    if (charges.length === 0) {
      setErrorMsg('Please add at least one charge item.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Invoice> = {
        invoiceNumber,
        invoiceDate,
        dueDate: invoiceDate,
        partyId: partyId || undefined,
        jobId: selectedJobId || undefined,
        billType: 'EMPTY_CONTAINER',
        currency,
        status: targetStatus,
        subtotal: taxableAmount,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        cgstRate: isInterState ? 0 : halfTaxRate,
        sgstRate: isInterState ? 0 : halfTaxRate,
        igstRate: isInterState ? taxRate : 0,
        totalGst: totalTaxAmount,
        isInterState,
        grandTotal,
        balanceAmount: targetStatus === 'FINALIZED' ? grandTotal : 0,
        amountInWords,
        billToName,
        billToAddress,
        billToGstin,
        billToState,
        billToStateCode,
        vesselVoyage,
        mblHbl,
        portOfLoading: deliveryOrder, // Delivery Order
        portOfDischarge: transporterName, // Transporter Name
        consigneeName: vehicleNumber, // Vehicle Number
        sbNumbers: eirReceipt, // EIR / LoLo Receipt
        notes: `Terminal Gate Pass: ${terminalGatePass} | EIR: ${eirReceipt} | Delivery Order: ${deliveryOrder}`,
        terms:
          '1. EIR verification and physical condition inspection must be acknowledged before gate-out.\n' +
          '2. Storage slab calculations accrue according to standard empty depot tariff rules.\n' +
          '3. No claims for discrepancies will be entertained unless notified in writing within 7 days.',
        containers: containers.map((c) => {
          const sDays = calculateDays(c.gateInDate, c.gateOutDate);
          const fDays = c.freeDays || 3;
          const chgDays = Math.max(0, sDays - fDays);
          return {
            containerNumber: c.containerNumber || 'MSCU0000000',
            size: c.size,
            type: c.type,
            emptyGateInDate: c.gateInDate,
            lddOutDate: c.gateOutDate,
            emptyGroundDays: fDays,
            loadedGroundDays: sDays,
            daysAfterCarting: chgDays,
          } as any;
        }),
        items: charges.map((ch, idx) => ({
          srNo: idx + 1,
          description: ch.description,
          hsnSacCode: ch.hsnSacCode,
          rate: ch.rate,
          quantity: ch.quantity,
          taxableValue: ch.amount,
          amount: ch.amount,
        })) as any,
      };

      const saved = await api.createInvoice(payload);
      onSuccess(saved);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save Empty Container Bill.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 rounded-xl border border-teal-400/30">
              <Box className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Create Empty Container Bill</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-400/20 text-teal-300 border border-teal-400/30">
                  Depot Tariff & Storage
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Yard movements, LoLo fees, ground storage calculations & terminal survey billing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-800">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section A: Document Info & Party Selection */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Invoice No & Date */}
            <div className="md:col-span-3 space-y-1">
              <label className="font-semibold text-slate-700">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="MSK/EC/2026-27/0001"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono font-bold text-slate-900 bg-white"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <label className="font-semibold text-slate-700">Date of Issue</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 bg-white"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <label className="font-semibold text-slate-700">Terminal Gate Pass (TGP)</label>
              <input
                type="text"
                value={terminalGatePass}
                onChange={(e) => setTerminalGatePass(e.target.value)}
                placeholder="TGP-948102"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 bg-white font-mono"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <label className="font-semibold text-slate-700">EIR / LoLo Receipt</label>
              <input
                type="text"
                value={eirReceipt}
                onChange={(e) => setEirReceipt(e.target.value)}
                placeholder="EIR-48190"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 bg-white font-mono"
              />
            </div>

            {/* Link to Operational Job */}
            <div className="md:col-span-6 space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-teal-600" />
                <span>Pull From Operational Job (Optional)</span>
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => handleJobSelect(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 bg-white"
              >
                <option value="">-- Manual Entry / Select Existing Job --</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.jobNumber} - {job.party?.tradeName || job.party?.legalName} ({job.shipmentRef || 'Ref'})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Party */}
            <div className="md:col-span-6 space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Select Recipient Party (Party Master)</span>
              </label>
              <select
                value={partyId}
                onChange={(e) => handlePartySelect(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 bg-white font-medium"
              >
                <option value="">-- Select from Party Master --</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.legalName || p.tradeName} ({p.gstin || 'URP'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section B: Two Column Details (Issuing Depot vs Recipient Party) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Supplier / Issuing Depot */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="font-bold text-slate-900 uppercase tracking-tight text-[11px]">
                  Supplier / Issuing Depot
                </span>
                <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-bold">
                  Depot Master
                </span>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Depot Name</label>
                <input
                  type="text"
                  value={depotName}
                  onChange={(e) => setDepotName(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Depot Address</label>
                <input
                  type="text"
                  value={depotAddress}
                  onChange={(e) => setDepotAddress(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold">State</label>
                  <input
                    type="text"
                    value={depotState}
                    onChange={(e) => setDepotState(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold">State Code</label>
                  <input
                    type="text"
                    value={depotStateCode}
                    onChange={(e) => setDepotStateCode(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Right: Bill To (Recipient) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="font-bold text-slate-900 uppercase tracking-tight text-[11px]">
                  Bill To (Recipient)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {billToGstin || 'No GSTIN'}
                </span>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Party Legal Name</label>
                <input
                  type="text"
                  value={billToName}
                  onChange={(e) => setBillToName(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Billing Address</label>
                <input
                  type="text"
                  value={billToAddress}
                  onChange={(e) => setBillToAddress(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold">GSTIN</label>
                  <input
                    type="text"
                    value={billToGstin}
                    onChange={(e) => setBillToGstin(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold">Place of Supply (State)</label>
                  <input
                    type="text"
                    value={billToState}
                    onChange={(e) => setBillToState(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Shipment & Transport Reference Grounding */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <span className="font-bold text-slate-900 uppercase tracking-tight text-[11px] block">
              Shipment & Transport Reference Grounding
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Vessel / Voyage</label>
                <input
                  type="text"
                  value={vesselVoyage}
                  onChange={(e) => setVesselVoyage(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900 font-mono bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Master B/L No.</label>
                <input
                  type="text"
                  value={mblHbl}
                  onChange={(e) => setMblHbl(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900 font-mono bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Delivery Order (DO)</label>
                <input
                  type="text"
                  value={deliveryOrder}
                  onChange={(e) => setDeliveryOrder(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900 font-mono bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Transporter Name</label>
                <input
                  type="text"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Vehicle Number</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900 font-mono font-bold bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Billing Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900 font-bold bg-white"
                >
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="USD">USD ($ - US Dollar)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section D: 1. Equipment Tracking & Operation Timelines */}
          <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-slate-900 uppercase tracking-tight text-xs">
                  1. Equipment Tracking & Operation Timelines
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={syncStorageDaysToCharges}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold text-[11px] border border-teal-200 transition-colors"
                  title="Automatically update charge line quantity with calculated storage days"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync Storage Days to Charges</span>
                </button>
                <button
                  type="button"
                  onClick={addContainerRow}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold text-[11px] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Container</span>
                </button>
              </div>
            </div>

            {/* Containers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-2 w-36">Container No.</th>
                    <th className="p-2 w-24">Size</th>
                    <th className="p-2 w-28">Type</th>
                    <th className="p-2 w-32">Gate-In Date</th>
                    <th className="p-2 w-32">Gate-Out Date</th>
                    <th className="p-2 w-24 text-center">Free Days</th>
                    <th className="p-2 w-32 text-center">Storage Days</th>
                    <th className="p-2 w-10 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {containers.map((c) => {
                    const storageDays = calculateDays(c.gateInDate, c.gateOutDate);
                    const freeDays = c.freeDays || 3;
                    const chgDays = Math.max(0, storageDays - freeDays);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={c.containerNumber}
                            onChange={(e) => updateContainerRow(c.id, 'containerNumber', e.target.value.toUpperCase())}
                            placeholder="MSCU4810294"
                            className="w-full rounded border border-slate-300 px-2 py-1 font-mono font-bold text-slate-900"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={c.size}
                            onChange={(e) => updateContainerRow(c.id, 'size', e.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-slate-900"
                          >
                            {CONTAINER_SIZES.map((sz) => (
                              <option key={sz} value={sz}>{sz}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={c.type}
                            onChange={(e) => updateContainerRow(c.id, 'type', e.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-slate-900"
                          >
                            {CONTAINER_TYPES.map((tp) => (
                              <option key={tp} value={tp}>{tp}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={c.gateInDate}
                            onChange={(e) => updateContainerRow(c.id, 'gateInDate', e.target.value)}
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-slate-900"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={c.gateOutDate}
                            onChange={(e) => updateContainerRow(c.id, 'gateOutDate', e.target.value)}
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-slate-900"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={c.freeDays}
                            onChange={(e) => updateContainerRow(c.id, 'freeDays', Number(e.target.value) || 0)}
                            className="w-16 rounded border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-900"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <div className="font-bold text-teal-800">
                            {storageDays} Days
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">
                            (Chargeable: <span className="text-teal-700 font-bold">{chgDays}</span>)
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeContainerRow(c.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Storage Days Summary Bar */}
            <div className="flex items-center justify-between p-2.5 bg-teal-50/70 border border-teal-200/80 rounded-lg text-teal-900 text-xs">
              <span className="font-medium">
                Total Containers: <strong>{containers.length}</strong> | Total Storage Duration: <strong>{totalStorageDays} Days</strong>
              </span>
              <span className="font-bold text-teal-800">
                Total Chargeable Storage: <span className="text-sm font-black text-teal-950">{totalChargeableDays} Days</span>
              </span>
            </div>
          </div>

          {/* Section E: 2. Itemised Tariff & Financial Charges */}
          <div className="space-y-3 border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-slate-900 uppercase tracking-tight text-xs">
                  2. Itemised Tariff & Financial Charges
                </h3>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-semibold mr-1">Add Preset:</span>
                {PRESET_CHARGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => addChargeRow(preset)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10.5px] transition-colors"
                  >
                    + {preset.description.split(' ')[0]}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => addChargeRow()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold text-[11px] transition-colors ml-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Custom Item</span>
                </button>
              </div>
            </div>

            {/* Charges Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-2 w-10 text-center">Sr.</th>
                    <th className="p-2">Description of Service Charges</th>
                    <th className="p-2 w-28 text-center">SAC Code</th>
                    <th className="p-2 w-28 text-right pr-2">Rate (₹)</th>
                    <th className="p-2 w-20 text-center">Qty</th>
                    <th className="p-2 w-32 text-right pr-2">Taxable Value (₹)</th>
                    <th className="p-2 w-10 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {charges.map((ch, idx) => (
                    <tr key={ch.id} className="hover:bg-slate-50">
                      <td className="p-2 text-center text-slate-500 font-semibold">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={ch.description}
                          onChange={(e) => updateChargeRow(ch.id, 'description', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-slate-900 font-medium"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="text"
                          value={ch.hsnSacCode}
                          onChange={(e) => updateChargeRow(ch.id, 'hsnSacCode', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-center font-mono text-slate-700"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={ch.rate}
                          onChange={(e) => updateChargeRow(ch.id, 'rate', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-right font-mono font-bold text-slate-900"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={ch.quantity}
                          onChange={(e) => updateChargeRow(ch.id, 'quantity', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-center font-bold text-slate-900"
                        />
                      </td>
                      <td className="p-2 text-right pr-2 font-mono font-bold text-slate-950">
                        {formatCurrency(ch.amount)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeChargeRow(ch.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* GST Selection & Totals Box */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 border-t border-slate-200">
              {/* GST Type Config */}
              <div className="md:col-span-6 space-y-2">
                <span className="font-semibold text-slate-700 block">GST Classification</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="taxType"
                      checked={!isInterState}
                      onChange={() => setIsInterState(false)}
                      className="text-teal-600"
                    />
                    <span className="text-slate-800">Intra-State (CGST 9% + SGST 9%)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="taxType"
                      checked={isInterState}
                      onChange={() => setIsInterState(true)}
                      className="text-teal-600"
                    />
                    <span className="text-slate-800">Inter-State (IGST 18%)</span>
                  </label>
                </div>
                <p className="text-[10px] text-slate-500">
                  Place of supply: <strong>{billToState} (Code {billToStateCode})</strong>.
                  {!isInterState ? ' Standard CGST/SGST applies for Maharashtra.' : ' IGST applies for outside Maharashtra.'}
                </p>
              </div>

              {/* Totals Summary */}
              <div className="md:col-span-6 flex justify-end">
                <div className="w-72 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-white">
                    <span className="font-semibold text-slate-600">Subtotal Taxable Amount</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(taxableAmount)}</span>
                  </div>

                  {isInterState ? (
                    <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-white">
                      <span className="text-slate-600">IGST @ {taxRate}%</span>
                      <span className="font-mono text-slate-800">{formatCurrency(igstAmount)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-white">
                        <span className="text-slate-600">CGST @ {halfTaxRate}%</span>
                        <span className="font-mono text-slate-800">{formatCurrency(cgstAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-white">
                        <span className="text-slate-600">SGST @ {halfTaxRate}%</span>
                        <span className="font-mono text-slate-800">{formatCurrency(sgstAmount)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between items-center p-3 bg-teal-50 border-t border-teal-200 text-teal-950 font-bold">
                    <span className="text-xs uppercase">Total Invoice Value (INR)</span>
                    <span className="font-mono text-base font-black text-red-600">
                      ₹ {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount in Words */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-900">Amount in Words: </span>
              <span className="font-semibold text-slate-700 italic">
                INR {amountInWords} Only
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Format strictly preserved as Empty Container Bill across ERP</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('DRAFT')}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('FINALIZED')}
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Generate & Finalize Bill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
