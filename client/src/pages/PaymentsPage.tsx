import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Calendar,
  Loader2,
  Save,
} from 'lucide-react';
import { api } from '../services/api';
import { Payment, Invoice } from '../types/index';
import { Modal } from '../components/common/Modal';
import { StatCard } from '../components/common/StatCard';
import { formatCurrencyWithSymbol, getCurrencySymbol } from '../utils/currency';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'NEFT/RTGS',
    referenceNumber: '',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pList, invList] = await Promise.all([
        api.getPayments(),
        api.getInvoices(),
      ]);
      setPayments(pList);
      setInvoices(invList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const inrCollected = payments.filter((p) => (p.currency || p.invoice?.currency || 'INR') === 'INR').reduce((sum, p) => sum + p.amount, 0);
  const usdCollected = payments.filter((p) => (p.currency || p.invoice?.currency) === 'USD').reduce((sum, p) => sum + p.amount, 0);
  const totalCollectedDisplay = usdCollected > 0 
    ? `₹${inrCollected.toLocaleString('en-IN')} / $${usdCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : `₹${inrCollected.toLocaleString('en-IN')}`;

  const pendingInvoices = invoices.filter((i) => i.balanceAmount > 0 && i.status !== 'CANCELLED');
  const inrOutstanding = pendingInvoices.filter((i) => (i.currency || 'INR') === 'INR').reduce((sum, i) => sum + i.balanceAmount, 0);
  const usdOutstanding = pendingInvoices.filter((i) => i.currency === 'USD').reduce((sum, i) => sum + i.balanceAmount, 0);
  const totalOutstandingDisplay = usdOutstanding > 0
    ? `₹${inrOutstanding.toLocaleString('en-IN')} / $${usdOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : `₹${inrOutstanding.toLocaleString('en-IN')}`;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceId || !formData.amount) {
      alert('Please select an invoice and enter amount');
      return;
    }
    setSaving(true);
    try {
      await api.recordPayment({
        invoiceId: formData.invoiceId,
        amount: parseFloat(formData.amount) || 0,
        paymentDate: formData.paymentDate,
        paymentMode: formData.paymentMode,
        referenceNumber: formData.referenceNumber,
        notes: formData.notes,
      });
      setIsModalOpen(false);
      setFormData({
        invoiceId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMode: 'NEFT/RTGS',
        referenceNumber: '',
        notes: '',
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedInvoice = invoices.find((i) => i.id === formData.invoiceId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payments & Collections</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track bank remittances, NEFT/RTGS transactions, and outstanding invoice balances.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Record New Payment</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Collections Received"
          value={totalCollectedDisplay}
          subtext="Processed payments"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Outstanding Receivables"
          value={totalOutstandingDisplay}
          subtext="Pending payment balance"
          icon={TrendingDown}
          variant="amber"
        />
        <StatCard
          title="Unpaid Invoices"
          value={`${pendingInvoices.length} Invoices`}
          subtext="Require collection follow-up"
          icon={CreditCard}
          variant="blue"
        />
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Remittance Transaction History
          </h2>
          <span className="text-xs text-slate-500">
            Showing <strong className="text-slate-900">{payments.length}</strong> Transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Payment Date</th>
                <th className="p-3.5">Invoice No</th>
                <th className="p-3.5">Party / Customer</th>
                <th className="p-3.5 text-right">Amount Paid</th>
                <th className="p-3.5">Payment Mode</th>
                <th className="p-3.5">Reference / UTR</th>
                <th className="p-3.5">Recorded By</th>
                <th className="p-3.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 text-slate-600">
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-blue-700">
                      {p.invoice?.invoiceNumber || 'N/A'}
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-900">{p.party?.legalName}</p>
                      <p className="text-[10px] font-mono text-slate-500">{p.party?.gstin}</p>
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-700 text-sm">
                      {formatCurrencyWithSymbol(p.amount, p.currency || p.invoice?.currency || 'INR')}
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">{p.paymentMode}</td>
                    <td className="p-3.5 font-mono text-slate-600">{p.referenceNumber || '-'}</td>
                    <td className="p-3.5 text-slate-500">{p.recordedBy || 'System'}</td>
                    <td className="p-3.5 text-slate-500 truncate max-w-xs">{p.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Customer Payment"
        subtitle="Apply remittance to an invoice to update outstanding balances"
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Select Invoice <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.invoiceId}
              onChange={(e) => {
                const inv = invoices.find((i) => i.id === e.target.value);
                setFormData({
                  ...formData,
                  invoiceId: e.target.value,
                  amount: inv ? String(inv.balanceAmount) : formData.amount,
                });
              }}
              className="w-full rounded border border-slate-300 p-2 bg-white"
            >
              <option value="">-- Choose Pending Invoice --</option>
              {pendingInvoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNumber} - {i.billToName} (Bal: {formatCurrencyWithSymbol(i.balanceAmount, i.currency)})
                </option>
              ))}
            </select>
          </div>

          {selectedInvoice && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Grand Total:</span>
                <span className="font-semibold text-slate-900">{formatCurrencyWithSymbol(selectedInvoice.grandTotal, selectedInvoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Already Paid:</span>
                <span className="font-semibold text-emerald-700">{formatCurrencyWithSymbol(selectedInvoice.paidAmount, selectedInvoice.currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-600 border-t border-slate-200 pt-1">
                <span>Current Balance Due:</span>
                <span>{formatCurrencyWithSymbol(selectedInvoice.balanceAmount, selectedInvoice.currency)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Payment Amount ({getCurrencySymbol(selectedInvoice?.currency || 'INR')}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full rounded border border-slate-300 p-2 text-sm font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 bg-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Mode</label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 bg-white"
              >
                <option value="NEFT/RTGS">NEFT / RTGS</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Reference / UTR / Cheque No</label>
            <input
              type="text"
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              placeholder="e.g. HDFCR98231049281"
              className="w-full rounded border border-slate-300 p-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Comments..."
              className="w-full rounded border border-slate-300 p-2"
            />
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
              <span>Save Payment</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
