import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Ship,
  Box,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Save,
  X,
  Phone,
  Mail,
  MapPin,
  Building2,
} from 'lucide-react';
import { api } from '../services/api';
import { Party } from '../types/index';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

interface PartiesPageProps {
  onSelectParty: (id: string) => void;
  onCreateInvoiceForParty: (party: Party) => void;
}

export const PartiesPage: React.FC<PartiesPageProps> = ({
  onSelectParty,
  onCreateInvoiceForParty,
}) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<any>(null);
  const [editSection, setEditSection] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Party Form
  const [newParty, setNewParty] = useState({
    legalName: '',
    tradeName: '',
    gstin: '',
    registeredAddress: '',
    billingAddress: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '400001',
    contactPerson: '',
    mobile: '',
    email: '',
    vendorCode: '',
    notes: '',
  });

  const fetchParties = async () => {
    setLoading(true);
    try {
      const data = await api.getParties(search);
      setParties(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [search]);

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createParty(newParty);
      setIsAddModalOpen(false);
      setNewParty({
        legalName: '',
        tradeName: '',
        gstin: '',
        registeredAddress: '',
        billingAddress: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        stateCode: '27',
        pincode: '400001',
        contactPerson: '',
        mobile: '',
        email: '',
        vendorCode: '',
        notes: '',
      });
      fetchParties();
    } catch (err: any) {
      setError(err.message || 'Failed to create party');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParty) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateParty(editingParty.id, editingParty);
      setIsEditModalOpen(false);
      fetchParties();
    } catch (err: any) {
      setError(err.message || 'Failed to update party');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteParty = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await api.deleteParty(id);
      fetchParties();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openSectionEditor = (party: Party, section: string) => {
    setEditingParty({ ...party });
    setEditSection(section);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Party Master Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain freight forwarders, consignees, GST credentials, billing addresses, and payment balances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Party</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party by name, GSTIN, city, contact..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing <span className="font-bold text-slate-900">{parties.length}</span> Parties
        </div>
      </div>

      {/* Parties Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Party & Legal Name</th>
                <th className="p-3.5">GSTIN & Status</th>
                <th className="p-3.5">Contact Person</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5 text-center">Invoices</th>
                <th className="p-3.5 text-center">Containers</th>
                <th className="p-3.5 text-right">Outstanding</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading parties...
                  </td>
                </tr>
              ) : parties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No parties found. Click "+ Add New Party" or search via GSTIN.
                  </td>
                </tr>
              ) : (
                parties.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer" onClick={() => onSelectParty(p.id)}>
                        {p.legalName}
                      </div>
                      {p.tradeName && <p className="text-[11px] text-slate-500">{p.tradeName}</p>}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-blue-700">{p.gstin}</span>
                        {p.isGstVerified && (
                          <span title="GST Verified via Portal">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant={p.gstStatus === 'Active' ? 'green' : 'amber'} size="sm">
                          {p.gstStatus}
                        </Badge>
                        {p.hasManualOverride && (
                          <Badge variant="amber" size="sm">
                            Manually Updated
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-slate-800">{p.contactPerson || 'N/A'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{p.mobile || p.email || '-'}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="text-slate-800">{p.city}</p>
                      <p className="text-[10px] text-slate-500">
                        {p.state} ({p.stateCode})
                      </p>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-800">
                      {p.invoicesCount || 0}
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-800">
                      {p.containersCount || 0}
                    </td>
                    <td className="p-3.5 text-right font-bold text-rose-600">
                      ₹{(p.outstanding || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectParty(p.id)}
                          title="View Details"
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openSectionEditor(p, 'all')}
                          title="Edit Party"
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onCreateInvoiceForParty(p)}
                          title="Create Invoice"
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-emerald-600"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteParty(p.id, p.legalName)}
                          title="Delete Party"
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

      {/* Add Party Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Party to Master"
        subtitle="Register customer details, GST credentials, and billing terms"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateParty} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Legal Business Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newParty.legalName}
                onChange={(e) => setNewParty({ ...newParty, legalName: e.target.value })}
                placeholder="e.g. GREENWICH MARIDIAN LOGISTICS INDIA PVT. LTD."
                className="w-full rounded border border-slate-300 p-2 text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Trade Name</label>
              <input
                type="text"
                value={newParty.tradeName}
                onChange={(e) => setNewParty({ ...newParty, tradeName: e.target.value })}
                placeholder="e.g. GREENWICH MARIDIAN"
                className="w-full rounded border border-slate-300 p-2 text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                GSTIN <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={15}
                value={newParty.gstin}
                onChange={(e) => {
                  const g = e.target.value.toUpperCase();
                  setNewParty({
                    ...newParty,
                    gstin: g,
                    stateCode: g.length >= 2 ? g.substring(0, 2) : newParty.stateCode,
                  });
                }}
                placeholder="e.g. 27AABCG6715G2ZO"
                className="w-full rounded border border-slate-300 p-2 text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Vendor Code</label>
              <input
                type="text"
                value={newParty.vendorCode}
                onChange={(e) => setNewParty({ ...newParty, vendorCode: e.target.value })}
                placeholder="e.g. VND-GML-09"
                className="w-full rounded border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">
                Registered Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={newParty.registeredAddress}
                onChange={(e) =>
                  setNewParty({
                    ...newParty,
                    registeredAddress: e.target.value,
                    billingAddress: e.target.value,
                  })
                }
                placeholder="Complete official address with building and street..."
                className="w-full rounded border border-slate-300 p-2 text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={newParty.city}
                onChange={(e) => setNewParty({ ...newParty, city: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={newParty.state}
                onChange={(e) => setNewParty({ ...newParty, state: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">State Code</label>
              <input
                type="text"
                value={newParty.stateCode}
                onChange={(e) => setNewParty({ ...newParty, stateCode: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Pincode</label>
              <input
                type="text"
                value={newParty.pincode}
                onChange={(e) => setNewParty({ ...newParty, pincode: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={newParty.contactPerson}
                onChange={(e) => setNewParty({ ...newParty, contactPerson: e.target.value })}
                placeholder="e.g. Sanjay Varma"
                className="w-full rounded border border-slate-300 p-2 text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Mobile</label>
              <input
                type="text"
                value={newParty.mobile}
                onChange={(e) => setNewParty({ ...newParty, mobile: e.target.value })}
                placeholder="+91 98200 12345"
                className="w-full rounded border border-slate-300 p-2 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Party</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Party Modal */}
      {editingParty && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Party: ${editingParty.legalName}`}
          subtitle="Modifications will update system records and be logged in the audit trail"
          maxWidth="3xl"
        >
          <form onSubmit={handleUpdateParty} className="space-y-4 text-xs">
            {editingParty.isGstVerified && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  This party is GST Verified. Manual edits will be recorded with a <strong>"Manually Updated"</strong> status tag.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Legal Name</label>
                <input
                  type="text"
                  required
                  value={editingParty.legalName}
                  onChange={(e) => setEditingParty({ ...editingParty, legalName: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Trade Name</label>
                <input
                  type="text"
                  value={editingParty.tradeName || ''}
                  onChange={(e) => setEditingParty({ ...editingParty, tradeName: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  required
                  value={editingParty.gstin}
                  onChange={(e) => setEditingParty({ ...editingParty, gstin: e.target.value.toUpperCase() })}
                  className="w-full rounded border border-slate-300 p-2 text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Vendor Code</label>
                <input
                  type="text"
                  value={editingParty.vendorCode || ''}
                  onChange={(e) => setEditingParty({ ...editingParty, vendorCode: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  value={editingParty.billingAddress || editingParty.registeredAddress}
                  onChange={(e) => setEditingParty({ ...editingParty, billingAddress: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editingParty.contactPerson || ''}
                  onChange={(e) => setEditingParty({ ...editingParty, contactPerson: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Mobile</label>
                <input
                  type="text"
                  value={editingParty.mobile || ''}
                  onChange={(e) => setEditingParty({ ...editingParty, mobile: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
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
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
