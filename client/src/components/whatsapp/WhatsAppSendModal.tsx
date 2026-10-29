import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle2, AlertCircle, Loader2, Phone, FileText, ExternalLink, Info } from 'lucide-react';
import { api } from '../../services/api';
import { Invoice, WhatsAppTemplate } from '../../types/index';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

interface WhatsAppSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  onSuccess?: () => void;
}

export const WhatsAppSendModal: React.FC<WhatsAppSendModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const [phone, setPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState('invoice_ready_v1');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string; details?: any } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStatusMsg(null);
      return;
    }

    const init = async () => {
      setLoading(true);
      try {
        const tpls = await api.getWhatsAppTemplates();
        setTemplates(tpls);

        if (invoice) {
          // Auto-retrieve saved party phone without hardcoded fallback
          const partyPhone = invoice.party?.mobile || '';
          setPhone(partyPhone);
          setRecipientName(invoice.party?.contactPerson || invoice.billToName);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [isOpen, invoice]);

  const selectedTemplate = templates.find((t) => t.templateName === selectedTemplateName);

  // Generate preview of message body
  const getPreviewText = () => {
    if (!selectedTemplate) return '';
    let text = selectedTemplate.bodyText;
    if (invoice) {
      const curr = invoice.currency || 'INR';
      const formattedTotal = `${curr === 'USD' ? '$ ' : '₹ '}${invoice.grandTotal.toLocaleString(curr === 'USD' ? 'en-US' : 'en-IN', { minimumFractionDigits: 2 })}`;
      text = text
        .replace('{{1}}', recipientName || invoice.billToName)
        .replace('{{2}}', invoice.invoiceNumber)
        .replace('{{3}}', formattedTotal)
        .replace('{{4}}', invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : 'Due on receipt');
    }
    return text;
  };

  const handleSend = async () => {
    if (!phone.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid recipient phone number.' });
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setStatusMsg({ type: 'error', text: 'Phone number must have at least 10 digits.' });
      return;
    }

    setSending(true);
    setStatusMsg(null);
    try {
      const res = await api.sendWhatsApp({
        recipientPhone: cleanPhone,
        recipientName: recipientName.trim(),
        invoiceId: invoice?.id,
        messageType: 'INVOICE_PDF',
        templateName: selectedTemplateName,
        parameters: {
          party_name: recipientName || invoice?.billToName || 'Valued Customer',
          invoice_number: invoice?.invoiceNumber || 'INV-001',
          grand_total: invoice?.grandTotal ? String(invoice.grandTotal) : '0',
          due_date: invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : 'Due on receipt',
        },
      });

      setStatusMsg({
        type: 'success',
        text: `Message dispatched via WhatsApp Cloud API! Status: ${res.status}.`,
        details: res,
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to dispatch WhatsApp notification.',
      });
    } finally {
      setSending(false);
    }
  };

  // Open direct WhatsApp Web chat with pre-composed text
  const handleOpenWhatsAppWeb = () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      setStatusMsg({ type: 'error', text: 'Enter a valid phone number to open WhatsApp Web.' });
      return;
    }

    const message = `Dear ${recipientName || invoice?.billToName || 'Customer'},\n\nYour Tax Invoice ${invoice?.invoiceNumber} for ₹ ${invoice?.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} has been issued by MSK LOGISTIC SOLUTION.\n\nPlease find the details and remittance information in your client portal.\n\nThank you,\nMSK LOGISTIC SOLUTION`;
    const waUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Tax Invoice via WhatsApp"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Missing Phone Alert */}
        {!invoice?.party?.mobile && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">No saved mobile number in Party Master</span>
              <p className="text-[11px] text-amber-700 mt-0.5">
                The selected party <strong>{invoice?.billToName}</strong> does not have a mobile number saved on file. Please enter the recipient phone number manually below.
              </p>
            </div>
          </div>
        )}

        {/* Invoice Summary Card */}
        {invoice && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">{invoice.invoiceNumber}</div>
                <div className="text-[11px] text-slate-500">
                  Recipient: <span className="font-semibold text-slate-700">{invoice.billToName}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-emerald-700">
                ₹ {invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <Badge variant="emerald">WhatsApp Ready</Badge>
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient Phone Number (with Country Code) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98201 44552"
                className="w-full text-xs rounded-lg border border-slate-300 pl-9 p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient Contact Name
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Accounts Dept / Mr. Rajesh Sharma"
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp Message Template
            </label>
            <select
              value={selectedTemplateName}
              onChange={(e) => setSelectedTemplateName(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.templateName}>
                  {t.templateName} ({t.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Message Preview */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Message Preview (Meta WhatsApp Template)
          </label>
          <div className="p-3 rounded-lg border border-slate-200 bg-emerald-50/50 text-slate-800 text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
            {getPreviewText() || 'Template preview loading...'}
          </div>
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
                  Message ID: {statusMsg.details.metaMessageId || statusMsg.details.messageId}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleOpenWhatsAppWeb}
            disabled={!phone.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs disabled:opacity-40 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            <span>Open in WhatsApp Web</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !phone.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-colors"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send via API</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
