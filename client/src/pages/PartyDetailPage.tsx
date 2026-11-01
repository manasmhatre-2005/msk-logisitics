import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Ship,
  Box,
  Edit,
  ArrowLeft,
  Plus,
  Loader2,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { api } from '../services/api';
import { Party } from '../types/index';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrencyWithSymbol } from '../utils/currency';

interface PartyDetailPageProps {
  partyId: string;
  onBack: () => void;
  onCreateInvoice: (party: Party) => void;
  onViewInvoice: (invoiceId: string) => void;
}

export const PartyDetailPage: React.FC<PartyDetailPageProps> = ({
  partyId,
  onBack,
  onCreateInvoice,
  onViewInvoice,
}) => {
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'jobs' | 'containers' | 'payments'>('overview');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSection, setEditSection] = useState<'party' | 'contact' | 'billing' | 'gst' | 'address'>('party');
  const [editFormData, setEditFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchParty = async () => {
    setLoading(true);
    try {
      const data = await api.getParty(partyId);
      setParty(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParty();
  }, [partyId]);

  const openEditor = (section: 'party' | 'contact' | 'billing' | 'gst' | 'address') => {
    if (!party) return;
    setEditSection(section);
    setEditFormData({ ...party });
    setIsEditModalOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!party) return;
    setSaving(true);
    try {
      await api.updateParty(party.id, editFormData);
      setIsEditModalOpen(false);
      fetchParty();
    } catch (e) {
      alert('Error updating party details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span>Loading Party Profile...</span>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
        <p className="text-slate-600 mb-4">Party not found or was removed.</p>
        <button onClick={onBack} className="text-xs text-blue-600 font-semibold hover:underline">
          Return to Parties Master
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Parties List</span>
        </button>

        <button
          onClick={() => onCreateInvoice(party)}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Create Invoice for this Party</span>
        </button>
      </div>

      {/* Main Party Profile Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{party.legalName}</h1>
              {party.isGstVerified && (
                <Badge variant="blue" size="sm">
                  <ShieldCheck className="w-3.5 h-3.5" /> GST Verified
                </Badge>
              )}
              {party.hasManualOverride && (
                <Badge variant="amber" size="sm">
                  Manually Updated
                </Badge>
              )}
              <Badge variant={party.gstStatus === 'Active' ? 'green' : 'amber'} size="sm">
                {party.gstStatus}
              </Badge>
            </div>
            {party.tradeName && <p className="text-xs text-slate-500 mt-0.5">Exporter Name: {party.tradeName}</p>}
            <p className="text-xs font-mono font-semibold text-blue-700 mt-1">GSTIN: {party.gstin}</p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center min-w-[320px]">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Invoices</p>
              <p className="text-base font-bold text-slate-900">{party.invoices?.length || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Jobs</p>
              <p className="text-base font-bold text-slate-900">{party.jobs?.length || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Containers</p>
              <p className="text-base font-bold text-slate-900">{party.containers?.length || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Outstanding</p>
              <p className="text-base font-bold text-rose-600">
                ₹{(party.outstanding || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-t border-slate-100 pt-3 text-xs">
          {(['overview', 'invoices', 'jobs', 'containers', 'payments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg font-semibold uppercase tracking-wider text-[11px] transition-colors ${
                activeTab === tab
                  ? 'bg-red-50 text-red-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Overview (Detailed Sections with individual Edit buttons) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Party Details [Edit] */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Party Details
              </h3>
              <button
                onClick={() => openEditor('party')}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p><span className="text-slate-400">Party Name:</span> <strong className="text-slate-900">{party.legalName}</strong></p>
              <p><span className="text-slate-400">Exporter Name:</span> <span className="text-slate-800">{party.tradeName || 'N/A'}</span></p>
              <p><span className="text-slate-400">Vendor Code:</span> <span className="font-mono text-slate-800">{party.vendorCode || 'N/A'}</span></p>
              <p><span className="text-slate-400">Notes:</span> <span className="text-slate-600">{party.notes || 'None'}</span></p>
            </div>
          </div>

          {/* Section 2: Contact Details [Edit] */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Contact Details
              </h3>
              <button
                onClick={() => openEditor('contact')}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p><span className="text-slate-400">Contact Person:</span> <strong className="text-slate-900">{party.contactPerson || 'N/A'}</strong></p>
              <p><span className="text-slate-400">Mobile Phone:</span> <span className="font-mono text-slate-800">{party.mobile || 'N/A'}</span></p>
              <p><span className="text-slate-400">Email Address:</span> <span className="text-slate-800">{party.email || 'N/A'}</span></p>
            </div>
          </div>

          {/* Section 3: Billing & Shipping Details [Edit] */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Billing & Shipping Details
              </h3>
              <button
                onClick={() => openEditor('billing')}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p><span className="text-slate-400">Billing Address:</span></p>
              <p className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">{party.billingAddress || party.registeredAddress}</p>
              <p className="mt-2"><span className="text-slate-400">Shipping / Delivery CFS Yard:</span></p>
              <p className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">{party.shippingAddress || 'Same as billing'}</p>
            </div>
          </div>

          {/* Section 4: GST & Tax Details [Edit] */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                GST Registration Details
              </h3>
              <button
                onClick={() => openEditor('gst')}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>View / Edit</span>
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p><span className="text-slate-400">GSTIN:</span> <strong className="font-mono text-blue-700">{party.gstin}</strong></p>
              <p><span className="text-slate-400">State / Code:</span> <span className="text-slate-800">{party.state} (Code: {party.stateCode})</span></p>
              <p><span className="text-slate-400">Registration Status:</span> <span className="text-emerald-700 font-semibold">{party.gstStatus}</span></p>
              <p><span className="text-slate-400">Last GST Verification:</span> <span className="text-slate-600">{party.gstVerifiedAt ? new Date(party.gstVerifiedAt).toLocaleDateString() : 'Manual Entry'}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Invoice No</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Taxable Amount</th>
                <th className="p-3 text-right">GST</th>
                <th className="p-3 text-right">Total Amount</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {party.invoices?.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-blue-700">{inv.invoiceNumber}</td>
                  <td className="p-3 text-slate-600">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="p-3 text-right font-medium">{formatCurrencyWithSymbol(inv.taxableAmount, inv.currency)}</td>
                  <td className="p-3 text-right text-slate-600">{formatCurrencyWithSymbol(inv.totalGst, inv.currency)}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{formatCurrencyWithSymbol(inv.grandTotal, inv.currency)}</td>
                  <td className="p-3 text-right font-bold text-rose-600">{formatCurrencyWithSymbol(inv.balanceAmount, inv.currency)}</td>
                  <td className="p-3">
                    <Badge variant={inv.status === 'PAID' ? 'green' : inv.status === 'FINALIZED' ? 'blue' : 'amber'}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onViewInvoice(inv.id)}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Jobs */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Job Number</th>
                <th className="p-3">Port</th>
                <th className="p-3">Destination</th>
                <th className="p-3">Shipping Bill(s)</th>
                <th className="p-3 text-center">Containers</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {party.jobs?.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{j.jobNumber}</td>
                  <td className="p-3 text-slate-600">{j.port}</td>
                  <td className="p-3 text-slate-600">{j.destination || '-'}</td>
                  <td className="p-3 text-slate-600 font-mono text-[11px]">{j.sbNumber || '-'}</td>
                  <td className="p-3 text-center font-bold text-slate-800">{j._count?.containers || 0}</td>
                  <td className="p-3">
                    <Badge variant={j.status === 'ACTIVE' ? 'blue' : 'slate'}>{j.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Containers */}
      {activeTab === 'containers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Container Number</th>
                <th className="p-3">Size / Type</th>
                <th className="p-3">Carting Date</th>
                <th className="p-3">Empty Gate-In</th>
                <th className="p-3">Stuffing Date</th>
                <th className="p-3">LDD Out Date</th>
                <th className="p-3">Ground Days</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {party.containers?.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-slate-900">{c.containerNumber}</td>
                  <td className="p-3">{c.size} {c.type}</td>
                  <td className="p-3 text-slate-600">{c.cartingDate ? new Date(c.cartingDate).toLocaleDateString() : '-'}</td>
                  <td className="p-3 text-slate-600">{c.emptyGateInDate ? new Date(c.emptyGateInDate).toLocaleDateString() : '-'}</td>
                  <td className="p-3 text-slate-600">{c.stuffingDate ? new Date(c.stuffingDate).toLocaleDateString() : '-'}</td>
                  <td className="p-3 text-slate-600">{c.lddOutDate ? new Date(c.lddOutDate).toLocaleDateString() : '-'}</td>
                  <td className="p-3 font-semibold text-slate-800">Empty: {c.emptyGroundRentDays}d | LDD: {c.loadedGroundDays}d</td>
                  <td className="p-3">
                    <Badge variant="blue">{c.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Payments */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Reference No</th>
                <th className="p-3">Recorded By</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {party.payments?.map((pmt) => (
                <tr key={pmt.id} className="hover:bg-slate-50">
                  <td className="p-3 text-slate-600">{new Date(pmt.paymentDate).toLocaleDateString()}</td>
                  <td className="p-3 font-bold text-emerald-700">{formatCurrencyWithSymbol(pmt.amount, pmt.currency || 'INR')}</td>
                  <td className="p-3">{pmt.paymentMode}</td>
                  <td className="p-3 font-mono text-[11px]">{pmt.referenceNumber || '-'}</td>
                  <td className="p-3 text-slate-600">{pmt.recordedBy || 'System'}</td>
                  <td className="p-3 text-slate-500">{pmt.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Section Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit ${editSection.toUpperCase()} Details`}
        subtitle={`Update ${editSection} parameters for ${party.legalName}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSection} className="space-y-4 text-xs">
          {editSection === 'party' && (
            <>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Party Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.legalName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, legalName: e.target.value })}
                  placeholder="e.g. MSK Logistics"
                  className="w-full rounded border border-slate-300 p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Exporter Name</label>
                <input
                  type="text"
                  value={editFormData.tradeName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, tradeName: e.target.value })}
                  placeholder="e.g. MSK Logistics Exporter"
                  className="w-full rounded border border-slate-300 p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Vendor Code</label>
                <input
                  type="text"
                  value={editFormData.vendorCode || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, vendorCode: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2"
                />
              </div>
            </>
          )}

          {editSection === 'contact' && (
            <>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editFormData.contactPerson || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Mobile Phone</label>
                <input
                  type="text"
                  value={editFormData.mobile || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2"
                />
              </div>
            </>
          )}

          {editSection === 'billing' && (
            <>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Billing Address</label>
                <textarea
                  rows={3}
                  value={editFormData.billingAddress || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, billingAddress: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Shipping / Yard Address</label>
                <textarea
                  rows={2}
                  value={editFormData.shippingAddress || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, shippingAddress: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2"
                />
              </div>
            </>
          )}

          {editSection === 'gst' && (
            <>
              <div>
                <label className="block font-medium text-slate-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  required
                  value={editFormData.gstin || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value.toUpperCase() })}
                  className="w-full rounded border border-slate-300 p-2 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={editFormData.state || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">State Code</label>
                <input
                  type="text"
                  value={editFormData.stateCode || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, stateCode: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 font-mono"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
    </div>
  );
};
