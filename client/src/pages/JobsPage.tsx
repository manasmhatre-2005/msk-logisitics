import React, { useState, useEffect } from 'react';
import { Ship, Search, Plus, Edit, Trash2, Eye, Loader2, Save } from 'lucide-react';
import { api } from '../services/api';
import { Job, Party, Exporter } from '../types/index';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    jobNumber: '',
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
        api.getJobs(),
        api.getParties(),
        api.getExporters(),
      ]);
      setJobs(jList);
      setParties(pList);
      setExporters(eList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      id: '',
      jobNumber: '',
      partyId: parties[0]?.id || '',
      exporterId: exporters[0]?.id || '',
      sbNumber: '',
      bookingDetails: '',
      shipmentRef: '',
      shipmentDate: new Date().toISOString().split('T')[0],
      port: 'Nhava Sheva (JNPT)',
      destination: '',
      remarks: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (j: Job) => {
    setIsEditing(true);
    setFormData({
      id: j.id,
      jobNumber: j.jobNumber,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        await api.updateJob(formData.id, formData);
      } else {
        await api.createJob(formData);
      }
      setIsModalOpen(false);
      fetchJobs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!window.confirm(`Delete job ${num}?`)) return;
    try {
      await api.deleteJob(id);
      fetchJobs();
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
            <Ship className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Jobs & Shipments Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Organize shipment bookings, shipping bills, ports of loading, destinations, and container assignments.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Job / Shipment</span>
        </button>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Job Number</th>
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
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading jobs...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No active jobs found. Click "+ Add Job / Shipment" to create one.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      {j.jobNumber}
                      {j.bookingDetails && (
                        <p className="text-[10px] text-slate-500 font-mono">Bk: {j.bookingDetails}</p>
                      )}
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-900">{j.party?.legalName}</p>
                      <p className="text-[10px] text-blue-700 font-mono">{j.party?.gstin}</p>
                    </td>
                    <td className="p-3.5 text-slate-700">{j.exporter?.name || 'N/A'}</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                      {j.sbNumber || '-'}
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-slate-800">{j.port}</p>
                      <p className="text-[10px] text-slate-400">→ {j.destination || 'Port of Discharge'}</p>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-800">
                      <Badge variant="blue" size="sm">
                        {j._count?.containers || 0} Containers
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={j.status === 'ACTIVE' ? 'green' : 'slate'} size="sm">
                        {j.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(j)}
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(j.id, j.jobNumber)}
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

      {/* Add / Edit Job Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Edit Job: ${formData.jobNumber}` : 'Create New Job / Shipment'}
        subtitle="Associate freight customer, exporter, and shipping bills"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Remarks</label>
              <textarea
                rows={2}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Cargo description and handling instructions..."
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
          </div>

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
              <span>{isEditing ? 'Update Job' : 'Save Job'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
