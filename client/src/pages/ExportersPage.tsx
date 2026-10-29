import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Edit, Trash2, Loader2, Save } from 'lucide-react';
import { api } from '../services/api';
import { Exporter } from '../types/index';
import { Modal } from '../components/common/Modal';

export const ExportersPage: React.FC = () => {
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    gstin: '',
    iecCode: '',
    address: '',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '410208',
    contactPerson: '',
    phone: '',
    email: '',
    notes: '',
  });

  const fetchExporters = async () => {
    setLoading(true);
    try {
      const data = await api.getExporters();
      setExporters(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExporters();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      id: '',
      name: '',
      gstin: '',
      iecCode: '',
      address: '',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '410208',
      contactPerson: '',
      phone: '',
      email: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: Exporter) => {
    setIsEditing(true);
    setFormData({ ...exp });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        await api.updateExporter(formData.id, formData);
      } else {
        await api.createExporter(formData);
      }
      setIsModalOpen(false);
      fetchExporters();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete exporter ${name}?`)) return;
    try {
      await api.deleteExporter(id);
      fetchExporters();
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
            <Truck className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Exporter Master</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain consignees, cargo manufacturers, Import Export Codes (IEC), and shipping bill contacts.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Exporter</span>
        </button>
      </div>

      {/* Exporters Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Exporter Name</th>
                <th className="p-3.5">IEC Code</th>
                <th className="p-3.5">GSTIN</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">Contact Person</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading exporters...
                  </td>
                </tr>
              ) : exporters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No exporters found. Click "+ Add Exporter" to add one.
                  </td>
                </tr>
              ) : (
                exporters.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70">
                    <td className="p-3.5 font-bold text-slate-900">{exp.name}</td>
                    <td className="p-3.5 font-mono font-semibold text-blue-700">{exp.iecCode || 'N/A'}</td>
                    <td className="p-3.5 font-mono text-slate-600">{exp.gstin || '-'}</td>
                    <td className="p-3.5 text-slate-600">
                      {exp.city}, {exp.state}
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-slate-800">{exp.contactPerson || '-'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{exp.phone}</p>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id, exp.name)}
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Edit Exporter: ${formData.name}` : 'Add Exporter'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Exporter Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded border border-slate-300 p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">IEC Code</label>
              <input
                type="text"
                value={formData.iecCode}
                onChange={(e) => setFormData({ ...formData, iecCode: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full rounded border border-slate-300 p-2 font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Registered Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded border border-slate-300 p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Exporter</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
