import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Truck,
  PlusCircle,
  List,
  Search,
  Filter,
  Download,
  Mail,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  RefreshCw,
  Send,
  X,
  Calendar,
  Shield,
  FileSpreadsheet,
  ArrowRight,
  ChevronRight,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DataEntryRecord, DataEntryReferenceData } from '../types/index';

interface DataEntryModuleProps {
  onSignOut: () => void;
}

export const DataEntryModule: React.FC<DataEntryModuleProps> = ({ onSignOut }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'form' | 'records'>('form');

  // Reference data state
  const [refData, setRefData] = useState<DataEntryReferenceData>({
    containerSizes: ['20 FT', '40 FT'],
    containerTypes: ['DRY', 'REEFER', 'OPEN_TOP', 'FLAT_RACK', 'TANK'],
    movementTypes: ['IN', 'OUT'],
    operationTypes: ['STUFFING', 'CARTING', 'CARTING_AND_STUFFING'],
    shippingLines: [],
    exporters: [],
  });

  // Form State (8 Exact Operational Fields)
  const [operationType, setOperationType] = useState<'CARTING' | 'STUFFING' | 'CARTING_AND_STUFFING'>('STUFFING');
  const [operationDate, setOperationDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [containerType, setContainerType] = useState<string>('DRY');
  const [containerSize, setContainerSize] = useState<'20 FT' | '40 FT'>('20 FT');
  const [containerNumber, setContainerNumber] = useState<string>('');
  const [sealNumber, setSealNumber] = useState<string>('');
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const [shippingLine, setShippingLine] = useState<string>('');
  const [customShippingLine, setCustomShippingLine] = useState<string>('');
  const [exporterName, setExporterName] = useState<string>('');
  const [customExporter, setCustomExporter] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Submission Status
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastSavedRecord, setLastSavedRecord] = useState<DataEntryRecord | null>(null);

  // Records Table State
  const [records, setRecords] = useState<DataEntryRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSize, setFilterSize] = useState<string>('');
  const [filterMovement, setFilterMovement] = useState<string>('');
  const [filterOperation, setFilterOperation] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Modals State
  const [editingRecord, setEditingRecord] = useState<DataEntryRecord | null>(null);
  const [updatingRecord, setUpdatingRecord] = useState<boolean>(false);
  const [deleteConfirmRecord, setDeleteConfirmRecord] = useState<DataEntryRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<boolean>(false);

  // Email Modal State
  const [emailModalRecord, setEmailModalRecord] = useState<DataEntryRecord | null>(null);
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [emailCustomNote, setEmailCustomNote] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load reference data on mount
  useEffect(() => {
    let mounted = true;
    api.getDataEntryReferenceData()
      .then((data) => {
        if (mounted && data) {
          setRefData(data);
          if (data.shippingLines && data.shippingLines.length > 0) {
            setShippingLine(data.shippingLines[0]);
          }
          if (data.exporters && data.exporters.length > 0) {
            setExporterName(data.exporters[0].name);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load reference data:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch records whenever activeTab switches to 'records' or filters change
  const fetchRecords = async () => {
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await api.getDataEntries({
        search: searchQuery,
        size: filterSize,
        movement: filterMovement,
        operationType: filterOperation,
        startDate: filterStartDate,
        endDate: filterEndDate,
        limit: 100,
      });
      setRecords(res.records || []);
      setTotalRecords(res.total || 0);
    } catch (err: any) {
      setRecordsError(err.message || 'Failed to load entry records.');
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'records') {
      fetchRecords();
    }
  }, [activeTab, searchQuery, filterSize, filterMovement, filterOperation, filterStartDate, filterEndDate]);

  // Handle Form Submission
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanContainer = containerNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanContainer || cleanContainer.length < 7) {
      setFormError('Please enter a valid container number (e.g., MSKU1234567, 7-15 alphanumeric characters).');
      return;
    }

    if (!sealNumber.trim()) {
      setFormError('Please provide the SED / Seal Number.');
      return;
    }

    const effectiveShippingLine = shippingLine === '__CUSTOM__' ? customShippingLine.trim() : shippingLine.trim();
    if (!effectiveShippingLine) {
      setFormError('Please select or specify a shipping line.');
      return;
    }

    const effectiveExporter = exporterName === '__CUSTOM__' ? customExporter.trim() : exporterName.trim();
    if (!effectiveExporter) {
      setFormError('Please select or specify an exporter.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        operationType,
        operationDate: operationDate ? new Date(operationDate).toISOString() : new Date().toISOString(),
        containerType,
        containerSize,
        containerNumber: cleanContainer,
        sealNumber: sealNumber.trim(),
        movementType,
        shippingLine: effectiveShippingLine,
        exporterName: effectiveExporter,
        remarks: remarks.trim() || undefined,
      };

      const res = await api.createDataEntry(payload);
      if (res.success && res.record) {
        setLastSavedRecord(res.record);
        // Reset form for next entry while preserving shipping line / date
        setContainerNumber('');
        setSealNumber('');
        setRemarks('');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save operational entry.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Update Record
  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setUpdatingRecord(true);
    try {
      const res = await api.updateDataEntry(editingRecord.id, {
        operationType: editingRecord.operationType,
        operationDate: editingRecord.operationDate,
        containerType: editingRecord.containerType,
        containerSize: editingRecord.containerSize,
        containerNumber: editingRecord.containerNumber,
        sealNumber: editingRecord.sealNumber,
        movementType: editingRecord.movementType,
        shippingLine: editingRecord.shippingLine,
        exporterName: editingRecord.exporterName,
        remarks: editingRecord.remarks,
        version: editingRecord.version,
      });

      if (res.success && res.record) {
        setRecords((prev) => prev.map((r) => (r.id === res.record.id ? res.record : r)));
        setEditingRecord(null);
      }
    } catch (err: any) {
      alert('Update failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUpdatingRecord(false);
    }
  };

  // Handle Delete Record
  const handleDeleteRecord = async () => {
    if (!deleteConfirmRecord) return;
    setDeletingRecord(true);
    try {
      const res = await api.deleteDataEntry(deleteConfirmRecord.id);
      if (res.success) {
        setRecords((prev) => prev.filter((r) => r.id !== deleteConfirmRecord.id));
        setTotalRecords((prev) => Math.max(0, prev - 1));
        setDeleteConfirmRecord(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete record.');
    } finally {
      setDeletingRecord(false);
    }
  };

  // Handle Send Email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailModalRecord) return;
    if (!emailRecipient.trim() || !emailRecipient.includes('@')) {
      setEmailResult({ success: false, message: 'Please enter a valid recipient email address.' });
      return;
    }

    setSendingEmail(true);
    setEmailResult(null);
    try {
      const res = await api.sendDataEntryEmail(emailModalRecord.id, {
        recipientEmail: emailRecipient.trim(),
        customNote: emailCustomNote.trim() || undefined,
      });
      if (res.success) {
        setEmailResult({ success: true, message: res.message });
        setRecords((prev) =>
          prev.map((r) =>
            r.id === emailModalRecord.id
              ? { ...r, emailSentCount: r.emailSentCount + 1, lastEmailSentAt: new Date().toISOString() }
              : r
          )
        );
      }
    } catch (err: any) {
      setEmailResult({ success: false, message: err.message || 'Failed to dispatch email.' });
    } finally {
      setSendingEmail(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const token = localStorage.getItem('logibill_token') || sessionStorage.getItem('logibill_token');
    const qs = new URLSearchParams();
    if (searchQuery) qs.append('search', searchQuery);
    if (filterSize) qs.append('size', filterSize);
    if (filterMovement) qs.append('movement', filterMovement);
    if (filterOperation) qs.append('operationType', filterOperation);
    if (filterStartDate) qs.append('startDate', filterStartDate);
    if (filterEndDate) qs.append('endDate', filterEndDate);

    // Stream download via fetch with auth header
    fetch(`/api/data-entry/export/csv?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('CSV export failed');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `msk-data-entries-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        alert('CSV export error: ' + err.message);
      });
  };

  return (
    <div className="min-h-screen bg-[#F2F6FA] flex flex-col font-sans text-slate-800">
      {/* Top Professional Header (Strictly Operator Branded — No Invoices or Finance shortcuts) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* MSK Logo & Module Title */}
          <div className="flex items-center gap-3">
            <img
              src="/images/msk-logo.png"
              alt="MSK Logistic Solution"
              className="h-9 w-auto object-contain"
            />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-xs font-bold text-red-600 tracking-wider uppercase block">
                MSK Logistic Solution
              </span>
              <h1 className="text-sm sm:text-base font-black text-[#102A43] tracking-tight">
                Data Entry Operator Module
              </h1>
            </div>
          </div>

          {/* User Badge & Sign Out Button */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700">{user?.name || 'Operator'}</span>
              <span className="text-slate-400">|</span>
              <span className="text-red-600 font-bold uppercase text-[10px] tracking-wide">
                OPERATOR ACCESS
              </span>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-semibold border border-slate-200 hover:border-red-200 transition-all cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (Only 2 Allowed Screens: New Entry & My Entries) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'form'
                ? 'border-red-600 text-red-600 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Operational Entry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('records')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'records'
                ? 'border-red-600 text-red-600 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <List className="w-4 h-4" />
            <span>My Entries / Entry Records</span>
            {totalRecords > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-slate-200 text-slate-700 rounded-full font-bold">
                {totalRecords}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* ============================================================== */}
        {/* TAB 1: NEW DATA ENTRY FORM (ALL 8 EXACT OPERATIONAL FIELDS)   */}
        {/* ============================================================== */}
        {activeTab === 'form' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Success Notification on Record Save */}
            {lastSavedRecord && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      Record Saved: {lastSavedRecord.entryNumber}
                    </h4>
                    <p className="text-xs text-emerald-700">
                      Container <span className="font-mono font-bold">{lastSavedRecord.containerNumber}</span> ({lastSavedRecord.containerSize} &bull; {lastSavedRecord.movementType}) permanently stored in database.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailModalRecord(lastSavedRecord);
                      setEmailRecipient('');
                      setEmailResult(null);
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send by Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('records')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <span>View in Entries</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Error Notification */}
            {formError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5 shadow-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Main Data Entry Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#102A43] to-[#1A365D] p-5 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight">
                    Operational Container Movement Entry
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Enter physical container carting, stuffing, gate movements, and seal details
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Box className="w-5 h-5 text-white" />
                </div>
              </div>

              <form onSubmit={handleSaveEntry} className="p-6 space-y-6">
                {/* GRID 1: Activity, Dates & Movement */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Field 1: Carting / Stuffing Data */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Field 1 — Activity Process (Carting / Stuffing) <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'STUFFING', label: 'Stuffing' },
                        { id: 'CARTING', label: 'Carting' },
                        { id: 'CARTING_AND_STUFFING', label: 'Carting & Stuffing' },
                      ].map((act) => (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => setOperationType(act.id as any)}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                            operationType === act.id
                              ? 'bg-red-50 border-red-500 text-red-700 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Operation Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Operation Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={operationDate}
                        onChange={(e) => setOperationDate(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* GRID 2: Container Details & Movement */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Container Specifications & Movement
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Field 3: Container Size */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Field 3 — Container Size <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['20 FT', '40 FT'].map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setContainerSize(sz as any)}
                            className={`py-2 rounded-lg border text-xs font-black transition-all cursor-pointer text-center ${
                              containerSize === sz
                                ? 'bg-red-600 border-red-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Field 2: Container Type */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Field 2 — Container Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={containerType}
                        onChange={(e) => setContainerType(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:border-red-500 outline-none"
                      >
                        {refData.containerTypes.map((t) => (
                          <option key={t} value={t}>
                            {t} (General Cargo)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Field 6: Container In / Out */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Field 6 — Movement (In / Out) <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setMovementType('IN')}
                          className={`py-2 rounded-lg border text-xs font-black transition-all cursor-pointer text-center ${
                            movementType === 'IN'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          🟢 GATE IN
                        </button>
                        <button
                          type="button"
                          onClick={() => setMovementType('OUT')}
                          className={`py-2 rounded-lg border text-xs font-black transition-all cursor-pointer text-center ${
                            movementType === 'OUT'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          🔵 GATE OUT
                        </button>
                      </div>
                    </div>

                    {/* Field 4: Container Number */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Field 4 — Container Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. MSKU1234567"
                        value={containerNumber}
                        onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                        className="w-full h-10 px-3 font-mono rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white placeholder-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* GRID 3: Seal, Line, and Exporter */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {/* Field 5: Seal Number (SED / Seal No.) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Field 5 — Seal Number (SED / Seal No.) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. SL-884920 / SED-994"
                        value={sealNumber}
                        onChange={(e) => setSealNumber(e.target.value.toUpperCase())}
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white placeholder-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Field 7: Shipped / Shipping Line */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Field 7 — Shipped / Shipping Line <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={shippingLine}
                      onChange={(e) => setShippingLine(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:border-red-500 outline-none"
                    >
                      {refData.shippingLines.map((line) => (
                        <option key={line} value={line}>
                          {line}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ Other / Enter Custom Line</option>
                    </select>
                    {shippingLine === '__CUSTOM__' && (
                      <input
                        type="text"
                        required
                        placeholder="Enter shipping line name"
                        value={customShippingLine}
                        onChange={(e) => setCustomShippingLine(e.target.value.toUpperCase())}
                        className="w-full h-9 px-3 mt-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:border-red-500"
                      />
                    )}
                  </div>

                  {/* Field 8: Exporter */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Field 8 — Exporter Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={exporterName}
                      onChange={(e) => setExporterName(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:border-red-500 outline-none"
                    >
                      {refData.exporters.map((exp) => (
                        <option key={exp.id} value={exp.name}>
                          {exp.name}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ Other / Enter Custom Exporter</option>
                    </select>
                    {exporterName === '__CUSTOM__' && (
                      <input
                        type="text"
                        required
                        placeholder="Enter exporter name"
                        value={customExporter}
                        onChange={(e) => setCustomExporter(e.target.value.toUpperCase())}
                        className="w-full h-9 px-3 mt-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:border-red-500"
                      />
                    )}
                  </div>
                </div>

                {/* Optional Operational Remarks */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Operational Remarks / Location / Yard Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter any trailer number, driver contact, yard bay, or inspection remarks..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white placeholder-slate-400 focus:border-red-500 outline-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setContainerNumber('');
                      setSealNumber('');
                      setRemarks('');
                      setFormError(null);
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Clear Form
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Entry...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>Save Entry Permanently</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MY ENTRIES / ENTRY RECORDS TABLE (WITH ACTIONS)         */}
        {/* ============================================================== */}
        {activeTab === 'records' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by Container No, Entry Ref, Exporter, Shipping Line, or Seal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 bg-white focus:border-red-500 outline-none"
                  />
                </div>

                {/* Actions: Refresh & Export CSV */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchRecords}
                    disabled={loadingRecords}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                    title="Refresh records"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingRecords ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="font-bold text-slate-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filters:
                </span>

                {/* Size */}
                <select
                  value={filterSize}
                  onChange={(e) => setFilterSize(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium outline-none"
                >
                  <option value="">All Sizes</option>
                  <option value="20 FT">20 FT</option>
                  <option value="40 FT">40 FT</option>
                </select>

                {/* Movement */}
                <select
                  value={filterMovement}
                  onChange={(e) => setFilterMovement(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium outline-none"
                >
                  <option value="">All Movements</option>
                  <option value="IN">IN (Gate In)</option>
                  <option value="OUT">OUT (Gate Out)</option>
                </select>

                {/* Operation */}
                <select
                  value={filterOperation}
                  onChange={(e) => setFilterOperation(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium outline-none"
                >
                  <option value="">All Activities</option>
                  <option value="STUFFING">Stuffing</option>
                  <option value="CARTING">Carting</option>
                  <option value="CARTING_AND_STUFFING">Carting & Stuffing</option>
                </select>

                {(searchQuery || filterSize || filterMovement || filterOperation || filterStartDate || filterEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterSize('');
                      setFilterMovement('');
                      setFilterOperation('');
                      setFilterStartDate('');
                      setFilterEndDate('');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-bold ml-auto cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Records Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {loadingRecords ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
                  <span className="text-xs font-semibold">Loading operational entries...</span>
                </div>
              ) : recordsError ? (
                <div className="p-6 text-center text-red-600 text-xs">
                  {recordsError}
                </div>
              ) : records.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <Box className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-700">No Entries Found</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery || filterSize || filterMovement
                        ? 'No records match the applied filters.'
                        : 'You have not saved any operational entries yet.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('form')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create First Entry</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Entry Ref</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Container No</th>
                        <th className="py-3 px-4">Size & Type</th>
                        <th className="py-3 px-4">Movement</th>
                        <th className="py-3 px-4">Activity</th>
                        <th className="py-3 px-4">Seal Number</th>
                        <th className="py-3 px-4">Shipping Line</th>
                        <th className="py-3 px-4">Exporter</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {r.entryNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {new Date(r.operationDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-red-600">
                            {r.containerNumber}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">{r.containerSize}</span>{' '}
                            <span className="text-[10px] text-slate-500 font-medium">({r.containerType})</span>
                          </td>
                          <td className="py-3 px-4">
                            {r.movementType === 'IN' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                🟢 IN
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                                🔵 OUT
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {r.operationType}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                            {r.sealNumber || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-semibold max-w-[140px] truncate" title={r.shippingLine}>
                            {r.shippingLine}
                          </td>
                          <td className="py-3 px-4 text-slate-800 max-w-[160px] truncate font-medium" title={r.exporterName}>
                            {r.exporterName}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Email Summary */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEmailModalRecord(r);
                                  setEmailRecipient('');
                                  setEmailResult(null);
                                }}
                                className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Send summary by email"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Record */}
                              <button
                                type="button"
                                onClick={() => setEditingRecord({ ...r })}
                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                title="Edit entry"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Record */}
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmRecord(r)}
                                className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: SEND ENTRY SUMMARY BY EMAIL                            */}
      {/* ============================================================== */}
      {emailModalRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-fadeIn">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold">Send Operational Entry Summary</h3>
              </div>
              <button
                type="button"
                onClick={() => setEmailModalRecord(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">Entry Reference:</span>
                  <span className="font-mono text-slate-900">{emailModalRecord.entryNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Container:</span>
                  <span className="font-mono font-bold text-red-600">{emailModalRecord.containerNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Movement / Activity:</span>
                  <span className="font-semibold text-slate-800">{emailModalRecord.movementType} &bull; {emailModalRecord.operationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Shipping Line:</span>
                  <span className="text-slate-800">{emailModalRecord.shippingLine}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Exporter:</span>
                  <span className="text-slate-800">{emailModalRecord.exporterName}</span>
                </div>
              </div>

              {emailResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    emailResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {emailResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{emailResult.message}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Recipient Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. operations@shippingline.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Operator Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Container stuffed and ready for carting inspection..."
                  value={emailCustomNote}
                  onChange={(e) => setEmailCustomNote(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEmailModalRecord(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Summary</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT OPERATIONAL ENTRY                                */}
      {/* ============================================================== */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-fadeIn">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold">Edit Operational Entry: {editingRecord.entryNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">Activity</label>
                  <select
                    value={editingRecord.operationType}
                    onChange={(e) => setEditingRecord({ ...editingRecord, operationType: e.target.value as any })}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-white outline-none"
                  >
                    <option value="STUFFING">Stuffing</option>
                    <option value="CARTING">Carting</option>
                    <option value="CARTING_AND_STUFFING">Carting & Stuffing</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">Movement</label>
                  <select
                    value={editingRecord.movementType}
                    onChange={(e) => setEditingRecord({ ...editingRecord, movementType: e.target.value as any })}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-white outline-none"
                  >
                    <option value="IN">IN (Gate In)</option>
                    <option value="OUT">OUT (Gate Out)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">Container Size</label>
                  <select
                    value={editingRecord.containerSize}
                    onChange={(e) => setEditingRecord({ ...editingRecord, containerSize: e.target.value as any })}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-white outline-none"
                  >
                    <option value="20 FT">20 FT</option>
                    <option value="40 FT">40 FT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">Container Type</label>
                  <select
                    value={editingRecord.containerType}
                    onChange={(e) => setEditingRecord({ ...editingRecord, containerType: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-white outline-none"
                  >
                    {refData.containerTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">Container Number</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.containerNumber}
                    onChange={(e) => setEditingRecord({ ...editingRecord, containerNumber: e.target.value.toUpperCase() })}
                    className="w-full h-9 px-2.5 font-mono rounded-lg border border-slate-200 text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">Seal Number</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.sealNumber}
                    onChange={(e) => setEditingRecord({ ...editingRecord, sealNumber: e.target.value.toUpperCase() })}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">Shipping Line</label>
                <input
                  type="text"
                  required
                  value={editingRecord.shippingLine}
                  onChange={(e) => setEditingRecord({ ...editingRecord, shippingLine: e.target.value.toUpperCase() })}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">Exporter Name</label>
                <input
                  type="text"
                  required
                  value={editingRecord.exporterName}
                  onChange={(e) => setEditingRecord({ ...editingRecord, exporterName: e.target.value.toUpperCase() })}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">Remarks</label>
                <textarea
                  rows={2}
                  value={editingRecord.remarks || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, remarks: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRecord}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {updatingRecord ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION DIALOG                             */}
      {/* ============================================================== */}
      {deleteConfirmRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-fadeIn p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Operational Entry?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to permanently delete entry <span className="font-mono font-bold text-slate-800">{deleteConfirmRecord.entryNumber}</span> (Container: <span className="font-mono font-bold text-red-600">{deleteConfirmRecord.containerNumber}</span>)?
                </p>
              </div>
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              Note: Entries that are linked to billing invoices cannot be deleted.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmRecord(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingRecord}
                onClick={handleDeleteRecord}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {deletingRecord ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
