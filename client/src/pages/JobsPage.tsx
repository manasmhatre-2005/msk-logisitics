import React, { useState, useEffect, useMemo } from 'react';
import {
  Ship,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  Hash,
  Lock,
  Unlock,
  Check,
  Copy,
  AlertCircle,
  Calendar,
  Layers,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { Job, Party, Exporter, JobFormatType } from '../types/index';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

interface FormatOption {
  type: JobFormatType;
  title: string;
  example: string;
  badge: string;
  resetRule: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    type: 'FORMAT_1',
    title: 'Format 1 — Job Number',
    example: 'jobNo-0001-26-27',
    badge: 'Standard FY',
    resetRule: 'Resets annually on 1 April (Indian FY)',
  },
  {
    type: 'FORMAT_2',
    title: 'Format 2 — Job Number / MSK',
    example: 'JONNo./MSK/0001',
    badge: 'Continuous MSK',
    resetRule: 'Continuous global sequence (does not reset)',
  },
  {
    type: 'FORMAT_3',
    title: 'Format 3 — Financial Year Job Number',
    example: 'JOb No/26-27/0001',
    badge: 'FY Prefix',
    resetRule: 'Resets annually on 1 April (Indian FY)',
  },
];

export const JobsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Job Number generation state in modal
  const [selectedFormat, setSelectedFormat] = useState<JobFormatType>('FORMAT_1');
  const [previewNumber, setPreviewNumber] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [adminUnlockJobNo, setAdminUnlockJobNo] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    jobNumber: '',
    formatType: 'FORMAT_1' as JobFormatType,
    partyId: '',
    exporterId: '',
    sbNumber: '',
    bookingDetails: '',
    shipmentRef: '',
    shipmentDate: '',
    port: 'Nhava Sheva (JNPT)',
    destination: '',
    remarks: '',
    status: 'ACTIVE' as 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
  });

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const [jList, pList, eList] = await Promise.all([
        api.getJobs({ search: searchQuery.trim() || undefined, status: statusFilter === 'ALL' ? undefined : statusFilter }),
        api.getParties(),
        api.getExporters(),
      ]);
      setJobs(jList);
      setParties(pList);
      setExporters(eList);
    } catch (e) {
      console.error('Error fetching jobs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

  // Handle live search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch next job number preview when format changes or modal opens
  const fetchNextNumberPreview = async (format: JobFormatType, dateStr?: string) => {
    setLoadingPreview(true);
    try {
      const res = await api.getNextJobNumber(format, dateStr);
      setPreviewNumber(res.nextNumber);
      setFormData((prev) => ({
        ...prev,
        jobNumber: res.nextNumber,
        formatType: format,
      }));
    } catch (err) {
      console.error('Failed to preview next job number:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setAdminUnlockJobNo(false);
    const today = new Date().toISOString().split('T')[0];
    const initialFormat: JobFormatType = 'FORMAT_1';
    setSelectedFormat(initialFormat);

    setFormData({
      id: '',
      jobNumber: '',
      formatType: initialFormat,
      partyId: parties[0]?.id || '',
      exporterId: exporters[0]?.id || '',
      sbNumber: '',
      bookingDetails: '',
      shipmentRef: '',
      shipmentDate: today,
      port: 'Nhava Sheva (JNPT)',
      destination: '',
      remarks: '',
      status: 'ACTIVE',
    });

    setIsModalOpen(true);
    fetchNextNumberPreview(initialFormat, today);
  };

  const handleOpenEdit = (j: Job) => {
    setIsEditing(true);
    setAdminUnlockJobNo(false);
    setPreviewNumber(j.jobNumber);
    setFormData({
      id: j.id,
      jobNumber: j.jobNumber,
      formatType: (j.formatType as JobFormatType) || 'FORMAT_1',
      partyId: j.partyId,
      exporterId: j.exporterId || '',
      sbNumber: j.sbNumber || '',
      bookingDetails: j.bookingDetails || '',
      shipmentRef: j.shipmentRef || '',
      shipmentDate: j.shipmentDate ? new Date(j.shipmentDate).toISOString().split('T')[0] : '',
      port: j.port || 'Nhava Sheva (JNPT)',
      destination: j.destination || '',
      remarks: j.remarks || '',
      status: j.status,
    });
    setIsModalOpen(true);
  };

  const handleFormatChange = (fmt: JobFormatType) => {
    setSelectedFormat(fmt);
    fetchNextNumberPreview(fmt, formData.shipmentDate || undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        await api.updateJob(formData.id, formData);
      } else {
        await api.createJob({
          ...formData,
          formatType: selectedFormat,
        });
      }
      setIsModalOpen(false);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!window.confirm(`Are you sure you want to delete job "${num}"?\nAll associated container assignments and records will be unlinked.`)) {
      return;
    }
    try {
      await api.deleteJob(id);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete job');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(text);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Filtered jobs in memory for immediate UI responsiveness
  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return jobs;

    return jobs.filter((j) => {
      const matchNum = j.jobNumber?.toLowerCase().includes(q);
      const matchParty = j.party?.legalName?.toLowerCase().includes(q) || j.party?.gstin?.toLowerCase().includes(q);
      const matchExp = j.exporter?.name?.toLowerCase().includes(q);
      const matchSb = j.sbNumber?.toLowerCase().includes(q);
      const matchBk = j.bookingDetails?.toLowerCase().includes(q);
      const matchDest = j.destination?.toLowerCase().includes(q);
      const matchPort = j.port?.toLowerCase().includes(q);
      return matchNum || matchParty || matchExp || matchSb || matchBk || matchDest || matchPort;
    });
  }, [jobs, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <Ship className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Jobs & Shipments Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Organize shipment bookings, sequential job numbering (3 Indian FY & MSK formats), shipping bills, and container assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Job / Shipment</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input supporting all 3 formats */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Job Number (e.g. jobNo-0001-26-27, JONNo./MSK/..., JOb No/...), SB No, Customer, Route..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {/* Format Quick Reference Badge Strip */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-red-500" /> Supported Job Number Formats:
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-semibold border border-slate-200">
            Format 1: jobNo-0001-26-27
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-semibold border border-slate-200">
            Format 2: JONNo./MSK/0001
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-semibold border border-slate-200">
            Format 3: JOb No/26-27/0001
          </span>
          <span className="ml-auto text-xs font-bold text-slate-500">
            Total Jobs: <span className="text-slate-900">{filteredJobs.length}</span>
          </span>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Job Number</th>
                <th className="p-3.5">Job Date</th>
                <th className="p-3.5">Party / Customer</th>
                <th className="p-3.5">Exporter</th>
                <th className="p-3.5">Shipping Bill(s)</th>
                <th className="p-3.5">Route</th>
                <th className="p-3.5 text-center">Containers</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
                    Loading jobs & shipments...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Ship className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No matching jobs found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery
                        ? `No records matched "${searchQuery}". Try searching by another format or number.`
                        : 'Click "+ Add Job / Shipment" above to create your first job.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Job Number with Copy button */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200 inline-block tracking-tight">
                          {j.jobNumber}
                        </span>
                        <button
                          onClick={() => copyToClipboard(j.jobNumber)}
                          title="Copy Job Number"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                        >
                          {copyFeedback === j.jobNumber ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {j.bookingDetails && (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Bk: {j.bookingDetails}</p>
                      )}
                    </td>

                    {/* Job / Shipment Date */}
                    <td className="p-3.5 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>
                          {j.shipmentDate
                            ? new Date(j.shipmentDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : new Date(j.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                        </span>
                      </div>
                    </td>

                    {/* Party / Customer */}
                    <td className="p-3.5 max-w-[200px]">
                      <p className="font-semibold text-slate-900 truncate" title={j.party?.legalName}>
                        {j.party?.legalName}
                      </p>
                      <p className="text-[10px] text-blue-700 font-mono">{j.party?.gstin}</p>
                    </td>

                    {/* Exporter */}
                    <td className="p-3.5 text-slate-700 max-w-[150px] truncate" title={j.exporter?.name || 'N/A'}>
                      {j.exporter?.name || 'N/A'}
                    </td>

                    {/* Shipping Bill */}
                    <td className="p-3.5 font-mono text-[11px] text-slate-600 max-w-[180px] truncate" title={j.sbNumber || ''}>
                      {j.sbNumber || '-'}
                    </td>

                    {/* Route */}
                    <td className="p-3.5 whitespace-nowrap">
                      <p className="font-medium text-slate-800">{j.port || 'Nhava Sheva (JNPT)'}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                        → {j.destination || 'Port of Discharge'}
                      </p>
                    </td>

                    {/* Containers count */}
                    <td className="p-3.5 text-center font-bold text-slate-800">
                      <Badge variant="blue" size="sm">
                        {j._count?.containers || 0} Containers
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      <Badge
                        variant={
                          j.status === 'ACTIVE'
                            ? 'green'
                            : j.status === 'COMPLETED'
                            ? 'blue'
                            : j.status === 'CANCELLED'
                            ? 'red'
                            : 'slate'
                        }
                        size="sm"
                      >
                        {j.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(j)}
                          title="Edit Job"
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(j.id, j.jobNumber)}
                            title="Delete Job (Admin Only)"
                            className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Job Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Edit Job: ${formData.jobNumber}` : 'Create New Job / Shipment'}
        subtitle="Configure sequential Job Number, customer, exporter, and route details"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* ============================================================== */}
          {/* SECTION 1: JOB NUMBER CONFIGURATION & PREVIEW                */}
          {/* ============================================================== */}
          <div className="p-3.5 rounded-lg border border-red-100 bg-red-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-red-600" />
                <span className="font-bold text-slate-900">Job Number Assignment</span>
              </div>
              {!isEditing && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Auto-Sequential Concurrency Safe
                </span>
              )}
            </div>

            {/* In Create Mode: Format Selector Tiles */}
            {!isEditing ? (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Select Job Numbering Format:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {FORMAT_OPTIONS.map((fmt) => {
                    const isSelected = selectedFormat === fmt.type;
                    return (
                      <button
                        type="button"
                        key={fmt.type}
                        onClick={() => handleFormatChange(fmt.type)}
                        className={`text-left p-2.5 rounded-lg border transition ${
                          isSelected
                            ? 'border-red-600 bg-white ring-2 ring-red-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-red-600' : 'text-slate-500'}`}>
                            {fmt.badge}
                          </span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </span>
                        </div>
                        <p className="font-mono font-bold text-[11px] text-slate-900 truncate">
                          {fmt.example}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                          {fmt.resetRule}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Live Preview Box */}
                <div className="mt-3 p-2.5 rounded bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Next Allocated Number Preview:
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-base font-bold text-red-600">
                        {loadingPreview ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-400 text-xs">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating next number...
                          </span>
                        ) : (
                          previewNumber || formData.jobNumber || 'Generating...'
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 sm:text-right">
                    <p>Financial Year: <strong className="text-slate-800">26-27</strong></p>
                    <p className="text-slate-400">Atomic database sequence lock</p>
                  </div>
                </div>
              </div>
            ) : (
              /* In Edit Mode: Immutable / Admin unlock */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Assigned Job Number:</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setAdminUnlockJobNo(!adminUnlockJobNo)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {adminUnlockJobNo ? (
                        <>
                          <Lock className="w-3 h-3" /> Lock Number
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3" /> Admin Unlock
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled={!adminUnlockJobNo}
                    value={formData.jobNumber}
                    onChange={(e) => setFormData({ ...formData, jobNumber: e.target.value })}
                    className={`font-mono font-bold text-sm rounded border p-2 w-full ${
                      adminUnlockJobNo
                        ? 'bg-amber-50 border-amber-300 text-amber-900 focus:ring-amber-500'
                        : 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                    }`}
                  />
                  {!adminUnlockJobNo && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-200 text-slate-700 font-semibold whitespace-nowrap">
                      <Lock className="w-3.5 h-3.5" /> Immutable
                    </span>
                  )}
                </div>

                {adminUnlockJobNo ? (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Modifying assigned job numbers should only be done for critical corrections. This action will be recorded in the security audit log.
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Job numbers are permanent identifiers linked to shipments, containers, and invoices.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* SECTION 2: OPERATIONAL SHIPMENT FIELDS                         */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Party / Forwarder <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.partyId}
                onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 bg-white"
              >
                <option value="">-- Select Party --</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.legalName} ({p.gstin})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Exporter</label>
              <select
                value={formData.exporterId}
                onChange={(e) => setFormData({ ...formData, exporterId: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 bg-white"
              >
                <option value="">-- None / Direct --</option>
                {exporters.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Shipment / Job Date</label>
              <input
                type="date"
                value={formData.shipmentDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setFormData({ ...formData, shipmentDate: newDate });
                  if (!isEditing) {
                    fetchNextNumberPreview(selectedFormat, newDate);
                  }
                }}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Booking Details</label>
              <input
                type="text"
                value={formData.bookingDetails}
                onChange={(e) => setFormData({ ...formData, bookingDetails: e.target.value })}
                placeholder="e.g. MSK-BK-882194"
                className="w-full rounded border border-slate-300 p-2 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Port of Loading</label>
              <input
                type="text"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                placeholder="Nhava Sheva (JNPT)"
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Destination Port</label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="e.g. Jebel Ali, UAE"
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Shipment Ref</label>
              <input
                type="text"
                value={formData.shipmentRef}
                onChange={(e) => setFormData({ ...formData, shipmentRef: e.target.value })}
                placeholder="e.g. SHP/AUG/2026/GSA-01"
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full rounded border border-slate-300 p-2 bg-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">
                Shipping Bill Number(s)
              </label>
              <input
                type="text"
                value={formData.sbNumber}
                onChange={(e) => setFormData({ ...formData, sbNumber: e.target.value })}
                placeholder="e.g. 6010085/18.08.2026, 6007882/17.08.2026"
                className="w-full rounded border border-slate-300 p-2 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Remarks</label>
              <textarea
                rows={2}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Consignment notes, cargo description, or handling instructions..."
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 transition"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isEditing ? 'Update Job' : 'Create Job with Sequence'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
