import React, { useState, useEffect } from 'react';
import {
  Box,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Loader2,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { Container, Party, Job, Exporter } from '../types/index';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { DateCalculationBox } from '../components/common/DateCalculationBox';

export const ContainersPage: React.FC = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({
    containerNumber: '',
    size: '20 FT',
    type: 'DRY',
    partyId: '',
    jobId: '',
    exporterId: '',
    cartingDate: '',
    emptyGateInDate: '',
    stuffingDate: '',
    lddOutDate: '',
    emptyGroundRentDays: 0,
    daysAfterCarting: 0,
    loadedGroundDays: 0,
    isOverride: false,
    overrideReason: '',
    htCharges: 0,
    logisticsCharges: 0,
    emptyTransportCharges: 0,
    otherCharges: 0,
    status: 'ACTIVE',
    remarks: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cList, pList, jList, eList] = await Promise.all([
        api.getContainers(search),
        api.getParties(),
        api.getJobs(),
        api.getExporters(),
      ]);
      setContainers(cList);
      setParties(pList);
      setJobs(jList);
      setExporters(eList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      containerNumber: '',
      size: '20 FT',
      type: 'DRY',
      partyId: parties[0]?.id || '',
      jobId: jobs[0]?.id || '',
      exporterId: exporters[0]?.id || '',
      cartingDate: new Date().toISOString().split('T')[0],
      emptyGateInDate: new Date().toISOString().split('T')[0],
      stuffingDate: '',
      lddOutDate: '',
      emptyGroundRentDays: 0,
      daysAfterCarting: 0,
      loadedGroundDays: 0,
      isOverride: false,
      overrideReason: '',
      htCharges: 9500,
      logisticsCharges: 3500,
      emptyTransportCharges: 4500,
      otherCharges: 1000,
      status: 'ACTIVE',
      remarks: '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cont: Container) => {
    setIsEditing(true);
    setFormData({
      ...cont,
      cartingDate: cont.cartingDate ? new Date(cont.cartingDate).toISOString().split('T')[0] : '',
      emptyGateInDate: cont.emptyGateInDate ? new Date(cont.emptyGateInDate).toISOString().split('T')[0] : '',
      stuffingDate: cont.stuffingDate ? new Date(cont.stuffingDate).toISOString().split('T')[0] : '',
      lddOutDate: cont.lddOutDate ? new Date(cont.lddOutDate).toISOString().split('T')[0] : '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleDateChange = async (field: string, val: string) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);

    if (!updated.isOverride) {
      try {
        const calc = await api.calculateContainerDates({
          cartingDate: updated.cartingDate,
          emptyGateInDate: updated.emptyGateInDate,
          stuffingDate: updated.stuffingDate,
          lddOutDate: updated.lddOutDate,
          isOverride: false,
        });
        setFormData({
          ...updated,
          emptyGroundRentDays: calc.emptyGroundRentDays,
          daysAfterCarting: calc.daysAfterCarting,
          loadedGroundDays: calc.loadedGroundDays,
        });
      } catch (e) {
        // ignore
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.containerNumber || !formData.partyId) {
      setError('Container number and party are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEditing) {
        await api.updateContainer(formData.id, formData);
      } else {
        await api.createContainer(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save container');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!window.confirm(`Are you sure you want to delete container ${num}? This action cannot be undone.`)) return;
    try {
      await api.deleteContainer(id);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Container Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track gate-in, carting, stuffing, and LDD movements with automated ground rent calculations and overrides.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Container</span>
        </button>
      </div>

      {/* Filter and Table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search container number (e.g. TGBU3802319)..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 uppercase font-mono"
          />
        </div>
        <span className="text-xs text-slate-500">
          Total Containers: <strong className="text-slate-900">{containers.length}</strong>
        </span>
      </div>

      {/* Containers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Container No</th>
                <th className="p-3.5">Size / Type</th>
                <th className="p-3.5">Party / Customer</th>
                <th className="p-3.5">Movement Dates</th>
                <th className="p-3.5">Calculated Ground Days</th>
                <th className="p-3.5">Job Ref</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading containers...
                  </td>
                </tr>
              ) : containers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No containers found. Click "+ Add Container" to register one.
                  </td>
                </tr>
              ) : (
                containers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {c.containerNumber}
                      </span>
                      {c.isOverride && (
                        <div className="mt-0.5">
                          <Badge variant="amber" size="sm">
                            Manual Override
                          </Badge>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">
                      {c.size} {c.type}
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {c.party?.legalName}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">{c.party?.gstin}</p>
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-600 space-y-0.5">
                      <p>
                        <span className="text-slate-400">Carting:</span>{' '}
                        {c.cartingDate ? new Date(c.cartingDate).toLocaleDateString() : '-'}
                      </p>
                      <p>
                        <span className="text-slate-400">Gate-In:</span>{' '}
                        {c.emptyGateInDate ? new Date(c.emptyGateInDate).toLocaleDateString() : '-'}
                      </p>
                      <p>
                        <span className="text-slate-400">Stuffing:</span>{' '}
                        {c.stuffingDate ? new Date(c.stuffingDate).toLocaleDateString() : '-'}
                      </p>
                      <p>
                        <span className="text-slate-400">LDD Out:</span>{' '}
                        {c.lddOutDate ? new Date(c.lddOutDate).toLocaleDateString() : '-'}
                      </p>
                    </td>
                    <td className="p-3.5">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 space-y-0.5 text-[11px]">
                        <p>
                          Empty Rent: <strong>{c.emptyGroundRentDays} days</strong>
                        </p>
                        <p>
                          After Carting: <strong>{c.daysAfterCarting} days</strong>
                        </p>
                        <p>
                          Loaded Rent: <strong>{c.loadedGroundDays} days</strong>
                        </p>
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {c.job?.jobNumber || 'N/A'}
                    </td>
                    <td className="p-3.5">
                      <Badge variant="blue">{c.status}</Badge>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Container"
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.containerNumber)}
                          title="Delete Container"
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Container Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Edit Container: ${formData.containerNumber}` : 'Add Container Operations'}
        subtitle="Operational movements, stuffing records, and automated ground calculations"
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Container Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.containerNumber}
                onChange={(e) => setFormData({ ...formData, containerNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. TGBU3802319"
                className="w-full rounded border border-slate-300 p-2 uppercase font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Size</label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 bg-white"
              >
                <option value="20 FT">20 FT</option>
                <option value="40 FT">40 FT</option>
                <option value="40 FT HC">40 FT HC</option>
                <option value="45 FT">45 FT</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 bg-white"
              >
                <option value="DRY">DRY</option>
                <option value="REEFER">REEFER</option>
                <option value="FLAT RACK">FLAT RACK</option>
                <option value="OPEN TOP">OPEN TOP</option>
              </select>
            </div>

            <div className="sm:col-span-2">
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
              <label className="block font-medium text-slate-700 mb-1">Associated Job</label>
              <select
                value={formData.jobId}
                onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 bg-white"
              >
                <option value="">-- None --</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jobNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Operational Dates */}
          <div className="border-t border-slate-100 pt-3">
            <h4 className="font-bold text-slate-800 mb-2">Movement Dates</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">Carting Date</label>
                <input
                  type="date"
                  value={formData.cartingDate}
                  onChange={(e) => handleDateChange('cartingDate', e.target.value)}
                  className="w-full rounded border border-slate-300 p-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Empty Gate-In</label>
                <input
                  type="date"
                  value={formData.emptyGateInDate}
                  onChange={(e) => handleDateChange('emptyGateInDate', e.target.value)}
                  className="w-full rounded border border-slate-300 p-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Stuffing Date</label>
                <input
                  type="date"
                  value={formData.stuffingDate}
                  onChange={(e) => handleDateChange('stuffingDate', e.target.value)}
                  className="w-full rounded border border-slate-300 p-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">LDD Out Date</label>
                <input
                  type="date"
                  value={formData.lddOutDate}
                  onChange={(e) => handleDateChange('lddOutDate', e.target.value)}
                  className="w-full rounded border border-slate-300 p-2 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Automatic Date Calculations Box with Overrides */}
          <DateCalculationBox
            emptyDays={formData.emptyGroundRentDays}
            cartingDays={formData.daysAfterCarting}
            loadedDays={formData.loadedGroundDays}
            isOverride={formData.isOverride}
            overrideReason={formData.overrideReason}
            onToggleOverride={(ov) => setFormData({ ...formData, isOverride: ov })}
            onOverrideChange={(field, val) => {
              if (field === 'empty') setFormData({ ...formData, emptyGroundRentDays: val });
              if (field === 'carting') setFormData({ ...formData, daysAfterCarting: val });
              if (field === 'loaded') setFormData({ ...formData, loadedGroundDays: val });
              if (field === 'reason') setFormData({ ...formData, overrideReason: val });
            }}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isEditing ? 'Update Container' : 'Save Container'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
