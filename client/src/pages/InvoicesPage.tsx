import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Plus,
  Eye,
  Edit,
  Download,
  Printer,
  MessageSquare,
  Mail,
  Copy,
  XCircle,
  Filter,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { Invoice } from '../types/index';
import { Badge } from '../components/common/Badge';
import { EmailSendModal } from '../components/email/EmailSendModal';
import { formatCurrencyWithSymbol } from '../utils/currency';

interface InvoicesPageProps {
  onCreateInvoice: () => void;
  onViewInvoice: (id: string) => void;
  onPrintInvoice: (inv: Invoice) => void;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({
  onCreateInvoice,
  onViewInvoice,
  onPrintInvoice,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Email Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await api.getInvoices(statusFilter, undefined, search);
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, search]);

  const handleOpenEmail = (inv: Invoice) => {
    setSelectedInvoiceForEmail(inv);
    setEmailModalOpen(true);
  };

  const handleCancelInvoice = async (id: string, num: string) => {
    const reason = window.prompt(`Enter reason to cancel invoice ${num}:`);
    if (!reason) return;
    try {
      await api.cancelInvoice(id, reason);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDuplicateInvoice = async (inv: Invoice) => {
    try {
      const full = await api.getInvoice(inv.id);
      const payload = {
        partyId: full.partyId,
        exporterId: full.exporterId,
        jobId: full.jobId,
        sbNumbers: full.sbNumbers,
        consigneeName: full.consigneeName,
        consigneeAddress: full.consigneeAddress,
        items: full.items?.map((item) => ({
          description: item.description,
          hsnSacCode: item.hsnSacCode,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          discount: item.discount,
        })),
        containers: full.containers?.map((c) => ({
          containerNumber: c.containerNumber,
          size: c.size,
          type: c.type,
          emptyGroundDays: c.emptyGroundDays,
          loadedGroundDays: c.loadedGroundDays,
        })),
        currency: full.currency || 'INR',
        status: 'DRAFT',
      };
      await api.createInvoice(payload);
      fetchInvoices();
      alert('Invoice duplicated as a new DRAFT!');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const statusTabs = [
    { id: 'ALL', label: 'All Invoices' },
    { id: 'EMPTY_CONTAINER', label: 'Empty Container Bills' },
    { id: 'HT_BILL', label: 'H & T Bills' },
    { id: 'CREDIT_NOTE', label: 'Credit Notes' },
    { id: 'DRAFT', label: 'Drafts' },
    { id: 'FINALIZED', label: 'Finalized' },
    { id: 'SENT', label: 'Sent' },
    { id: 'PAID', label: 'Paid' },
    { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { id: 'OVERDUE', label: 'Overdue' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoice Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete tax invoice register, lifecycle status transitions, PDF downloads, and Email dispatch.
          </p>
        </div>
        <button
          onClick={onCreateInvoice}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Create New Invoice</span>
        </button>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-red-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice no, GSTIN, party name, container..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900"
            />
          </div>
          <span className="text-xs text-slate-500">
            Found <strong className="text-slate-900">{invoices.length}</strong> Invoices
          </span>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Invoice No</th>
                <th className="p-3.5">Date & Due</th>
                <th className="p-3.5">Party & GSTIN</th>
                <th className="p-3.5">Containers</th>
                <th className="p-3.5 text-right">Taxable</th>
                <th className="p-3.5 text-right">GST</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-right">Balance</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-red-600" />
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    No invoices found matching your filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-red-700">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="hover:underline text-left"
                        >
                          {inv.invoiceNumber}
                        </button>
                        {inv.billType === 'EMPTY_CONTAINER' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-teal-100 text-teal-800 border border-teal-300">
                            Empty Container
                          </span>
                        )}
                        {inv.billType === 'CREDIT_NOTE' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                            Credit Note
                          </span>
                        )}
                        {inv.billType === 'HT_BILL' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                            H & T Bill
                          </span>
                        )}
                      </div>
                      {inv.originalInvoiceNumber && (
                        <p className="text-[10px] text-slate-500 font-normal font-sans mt-0.5">
                          Adj Ref: <span className="font-mono text-slate-700 font-semibold">{inv.originalInvoiceNumber}</span>
                        </p>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <p>{new Date(inv.invoiceDate).toLocaleDateString()}</p>
                      {inv.dueDate && (
                        <p className="text-[10px] text-slate-400">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-900 truncate max-w-[170px]">
                        {inv.party?.legalName || inv.billToName}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">{inv.billToGstin}</p>
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        {inv.containers && inv.containers.length > 0 ? (
                          inv.containers.map((c, i) => (
                            <span key={i} className="inline-block font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                              {c.containerNumber}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">General</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-medium text-slate-700">
                      {formatCurrencyWithSymbol(inv.taxableAmount, inv.currency)}
                    </td>
                    <td className="p-3.5 text-right text-slate-600">
                      {formatCurrencyWithSymbol(inv.totalGst, inv.currency)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      {formatCurrencyWithSymbol(inv.grandTotal, inv.currency)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-rose-600">
                      {formatCurrencyWithSymbol(inv.balanceAmount, inv.currency)}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          inv.status === 'PAID'
                            ? 'green'
                            : inv.status === 'FINALIZED'
                            ? 'blue'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'amber'
                            : inv.status === 'CANCELLED'
                            ? 'red'
                            : 'slate'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          title="View Details"
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-red-600"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          title="Download Official PDF"
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-red-600"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => onPrintInvoice(inv)}
                          title="Print Invoice"
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-red-600 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEmail(inv)}
                          title="Send Email"
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-red-600 cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicateInvoice(inv)}
                          title="Duplicate Invoice"
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-purple-600"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {inv.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancelInvoice(inv.id, inv.invoiceNumber)}
                            title="Cancel Invoice"
                            className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-rose-600"
                          >
                            <XCircle className="w-3.5 h-3.5" />
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

      {/* Email Modal */}
      <EmailSendModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        invoice={selectedInvoiceForEmail}
        onSuccess={() => fetchInvoices()}
      />
    </div>
  );
};
