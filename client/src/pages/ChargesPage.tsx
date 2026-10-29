import React, { useState, useEffect } from 'react';
import {
  BadgePercent,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Loader2,
  Save,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { ChargeMaster } from '../types/index';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const ChargesPage: React.FC = () => {
  const [charges, setCharges] = useState<ChargeMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    code: '',
    name: '',
    category: 'LOGISTICS',
    hsnSacCode: '996719',
    unit: 'PER_CONTAINER',
    defaultRate: 0,
    gstRate: 18.0,
    isActive: true,
    description: '',
  });

  const fetchCharges = async () => {
    setLoading(true);
    try {
      const data = await api.getCharges();
      setCharges(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharges();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      id: '',
      code: '',
      name: '',
      category: 'LOGISTICS',
      hsnSacCode: '996719',
      unit: 'PER_CONTAINER',
      defaultRate: 1000,
      gstRate: 18.0,
      isActive: true,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: ChargeMaster) => {
    setIsEditing(true);
    setFormData({ ...c, description: c.description || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        await api.updateCharge(formData.id, formData);
      } else {
        await api.createCharge(formData);
      }
      setIsModalOpen(false);
      fetchCharges();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete charge ${name}?`)) return;
    try {
      await api.deleteCharge(id);
      fetchCharges();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = charges.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.hsnSacCode.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BadgePercent className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Charges & Rate Master</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standard logistics services, HSN/SAC classifications, default billing tariffs, and GST rates.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Charge Tariff</span>
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
            placeholder="Search charges by name, code, HSN/SAC..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900"
          />
        </div>
        <span className="text-xs text-slate-500">
          Showing <strong className="text-slate-900">{filtered.length}</strong> Charges
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Charge Name & Description</th>
                <th className="p-3.5 text-center">HSN/SAC</th>
                <th className="p-3.5">Unit</th>
                <th className="p-3.5 text-right">Default Rate</th>
                <th className="p-3.5 text-center">GST Rate</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading charges...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No charges found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-700">{c.code}</td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      {c.description && <p className="text-[11px] text-slate-500">{c.description}</p>}
                    </td>
                    <td className="p-3.5 text-center font-mono font-semibold text-slate-700">
                      {c.hsnSacCode}
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{c.unit.replace('_', ' ')}</td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      ₹{c.defaultRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant="blue" size="sm">
                        {c.gstRate}%
                      </Badge>
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant={c.isActive ? 'green' : 'slate'} size="sm">
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
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
        title={isEditing ? `Edit Charge: ${formData.name}` : 'Add Charge Tariff'}
        subtitle="Define logistics service name, SAC code, and default GST rate"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Charge Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Handling & Transportation Loaded Container"
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">HSN / SAC Code</label>
              <input
                type="text"
                required
                value={formData.hsnSacCode}
                onChange={(e) => setFormData({ ...formData, hsnSacCode: e.target.value })}
                placeholder="e.g. 996511"
                className="w-full rounded border border-slate-300 p-2 font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 bg-white"
              >
                <option value="PER_CONTAINER">PER CONTAINER</option>
                <option value="PER_DAY">PER DAY</option>
                <option value="PER_PIECE">PER PIECE</option>
                <option value="LUMPSUM">LUMPSUM</option>
                <option value="PER_CBM">PER CBM</option>
                <option value="PER_MT">PER MT</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Default Rate (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.defaultRate}
                onChange={(e) => setFormData({ ...formData, defaultRate: parseFloat(e.target.value) || 0 })}
                className="w-full rounded border border-slate-300 p-2 font-medium"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">GST Rate (%)</label>
              <input
                type="number"
                min="0"
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: parseFloat(e.target.value) || 0 })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description for invoice footnotes..."
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
              <span>Save Charge</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
