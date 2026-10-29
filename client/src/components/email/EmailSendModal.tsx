import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, Loader2, FileText, Info } from 'lucide-react';
import { api } from '../../services/api';
import { Invoice, BillFormatId, BILL_FORMAT_SLOTS } from '../../types/index';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

interface EmailSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  templateId?: BillFormatId;
  onSuccess?: () => void;
}

export const EmailSendModal: React.FC<EmailSendModalProps> = ({
  isOpen,
  onClose,
  invoice,
  templateId = 'format-1',
  onSuccess,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<BillFormatId>(templateId);
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string; details?: any } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStatusMsg(null);
      return;
    }

    // Auto-populate from party saved details
    const partyEmail = invoice.party?.email || '';
    const partyName = invoice.party?.contactPerson || invoice.billToName;
    setRecipientEmail(partyEmail);
    setRecipientName(partyName);
    setCcEmail('');
    setSubject(`Tax Invoice ${invoice.invoiceNumber} - MSK LOGISTIC SOLUTION`);
    setCustomMessage(`Please find attached the official Tax Invoice for your container movement and logistics services.`);
    setSelectedTemplate(templateId);
  }, [isOpen, invoice, templateId]);

  const validateEmail = (val: string) => {
    const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return re.test(val.trim());
  };

  const handleSend = async () => {
    if (!recipientEmail.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid recipient email address.' });
      return;
    }

    if (!validateEmail(recipientEmail)) {
      setStatusMsg({ type: 'error', text: `"${recipientEmail}" is not a valid email address format.` });
      return;
    }

    if (ccEmail.trim() && !validateEmail(ccEmail)) {
      setStatusMsg({ type: 'error', text: `CC address "${ccEmail}" is not a valid email address.` });
      return;
    }

    setSending(true);
    setStatusMsg(null);

    try {
      const res = await api.sendInvoiceEmail(invoice.id, {
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim(),
        ccEmail: ccEmail.trim() || undefined,
        subject: subject.trim(),
        customMessage: customMessage.trim() || undefined,
        templateId: selectedTemplate,
      });

      setStatusMsg({
        type: 'success',
        text: `Invoice PDF successfully dispatched to ${recipientEmail}!`,
        details: res,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to dispatch email. Please check network/service status.',
      });
    } finally {
      setSending(false);
    }
  };

  const activeSlot = BILL_FORMAT_SLOTS.find((s) => s.id === selectedTemplate);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Email Tax Invoice PDF"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Missing Email Alert */}
        {!invoice.party?.email && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">No saved email in Party Master</span>
              <p className="text-[11px] text-amber-700 mt-0.5">
                The selected party <strong>{invoice.billToName}</strong> does not have an email saved on file. Please enter the recipient address manually below.
              </p>
            </div>
          </div>
        )}

        {/* Invoice Summary Card */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-100 text-red-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">{invoice.invoiceNumber}</div>
              <div className="text-[11px] text-slate-500">
                Billed To: <span className="font-semibold text-slate-700">{invoice.billToName}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-red-600">
              ₹ {invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <Badge variant="green">PDF Attachment Ready</Badge>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="e.g. accounts@clientcompany.com"
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipient Contact Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Finance Head / Mr. Sharma"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CC Email (Optional)
              </label>
              <input
                type="email"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="e.g. logistics@clientcompany.com"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invoice Template Slot
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as BillFormatId)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            >
              {BILL_FORMAT_SLOTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.referenceTag})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Message (Optional)
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add any specific payment reminders, container instructions, or remarks..."
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            />
          </div>
        </div>

        {/* Attached File Preview */}
        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-600" />
            <span className="font-mono text-slate-800">
              Tax_Invoice_{invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            {activeSlot?.name.split(' (')[0]}
          </span>
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div
            className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{statusMsg.text}</p>
              {statusMsg.details && (
                <p className="text-[11px] text-slate-600 mt-0.5 font-mono">
                  Message ID: {statusMsg.details.messageId} | Status: {statusMsg.details.status}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !recipientEmail.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-colors"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Dispatching Email...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Invoice Email</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
