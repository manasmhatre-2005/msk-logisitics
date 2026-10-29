import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Send,
  Phone,
  RefreshCw,
  Loader2,
  FileText,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { WhatsAppMessage, WhatsAppTemplate } from '../types/index';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const WhatsAppPage: React.FC = () => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('+919820144552');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [msgList, tplList, conn] = await Promise.all([
        api.getWhatsAppMessages(),
        api.getWhatsAppTemplates(),
        api.testWhatsAppConnection(),
      ]);
      setMessages(msgList);
      setTemplates(tplList);
      setConnectionStatus(conn);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const conn = await api.testWhatsAppConnection();
      setConnectionStatus(conn);
      alert(`Connection Check: ${conn.connected ? 'ONLINE' : 'OFFLINE'}\nMode: ${conn.mode}`);
    } catch (e: any) {
      alert(`Connection failed: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await api.sendWhatsApp({
        recipientPhone: testPhone,
        recipientName: 'Valued Logistics Partner',
        messageType: 'CUSTOM',
        templateName: 'invoice_ready_v1',
        parameters: {
          party_name: 'Greenwich Maridian Logistics',
          invoice_number: 'MSK/HT5/SEP26',
          grand_total: '1,45,848',
          due_date: '2026-09-17',
        },
      });
      setTestResult(`Message sent! Status: ${res.status}. ID: ${res.metaMessageId || res.messageId}`);
      fetchData();
    } catch (e: any) {
      setTestResult(`Failed: ${e.message}`);
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">WhatsApp Business Cloud API</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deliver tax invoice PDFs, payment reminders, and container gate-in notifications automatically to customer mobile phones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
            <span>Test Connection</span>
          </button>
          <button
            onClick={() => setTestModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Test Notification</span>
          </button>
        </div>
      </div>

      {/* Connection Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connection State</span>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-base font-bold text-slate-900">
              {connectionStatus?.connected ? 'ACTIVE & CONNECTED' : 'INITIALIZING'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Provider: {connectionStatus?.mode || 'MOCK_SANDBOX'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sender Phone ID</span>
          <div className="flex items-center gap-2 mt-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span className="text-base font-mono font-bold text-slate-900">+91 98200 12345</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Verified: LOGIBILL LOGISTICS</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Webhook Status</span>
          <div className="flex items-center gap-2 mt-2">
            <CheckCheck className="w-4 h-4 text-blue-600" />
            <span className="text-base font-bold text-slate-900">/api/whatsapp/webhook</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Listening for Sent / Delivered / Read events</p>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Approved WhatsApp Business Templates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div key={tpl.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 font-mono text-[11px]">{tpl.templateName}</span>
                <Badge variant="green" size="sm">
                  {tpl.category}
                </Badge>
              </div>
              <p className="text-slate-700 whitespace-pre-line text-[11px] leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                {tpl.bodyText}
              </p>
              <p className="text-[10px] text-slate-400 italic">Footer: {tpl.footerText}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Message Dispatch History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Outbound WhatsApp Dispatch History
          </h2>
          <span className="text-xs text-slate-500">
            Total Messages: <strong className="text-slate-900">{messages.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Recipient Phone</th>
                <th className="p-3.5">Recipient Name</th>
                <th className="p-3.5">Invoice Ref</th>
                <th className="p-3.5">Template</th>
                <th className="p-3.5">External Message ID</th>
                <th className="p-3.5">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading messages...
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No WhatsApp messages logged yet.
                  </td>
                </tr>
              ) : (
                messages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="p-3.5 text-slate-600">{new Date(m.sentAt).toLocaleString()}</td>
                    <td className="p-3.5 font-mono font-medium text-slate-900">{m.recipientPhone}</td>
                    <td className="p-3.5">{m.recipientName || '-'}</td>
                    <td className="p-3.5 font-mono text-blue-700 font-bold">{m.invoice?.invoiceNumber || '-'}</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">{m.templateName}</td>
                    <td className="p-3.5 font-mono text-[10px] text-slate-500 max-w-[150px] truncate">{m.externalMessageId || '-'}</td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          m.status === 'DELIVERED' || m.status === 'READ'
                            ? 'green'
                            : m.status === 'SENT'
                            ? 'blue'
                            : m.status === 'FAILED'
                            ? 'red'
                            : 'amber'
                        }
                        size="sm"
                      >
                        {m.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Test Modal */}
      <Modal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title="Send Test WhatsApp Message"
        subtitle="Simulates delivery through the WhatsApp Business API provider"
        maxWidth="sm"
      >
        <form onSubmit={handleSendTestMessage} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Mobile Number</label>
            <input
              type="text"
              required
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+919820144552"
              className="w-full rounded border border-slate-300 p-2 font-mono"
            />
          </div>

          {testResult && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              {testResult}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setTestModalOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={testSending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
            >
              {testSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send Now</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
