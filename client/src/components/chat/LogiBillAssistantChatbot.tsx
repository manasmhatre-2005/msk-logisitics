import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, AlertTriangle, ArrowRight, Loader2, Check } from 'lucide-react';
import { api } from '../../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actionRequired?: {
    type: string;
    title: string;
    description: string;
    targetId: string;
    payload?: any;
  };
  suggestedActions?: string[];
}

interface LogiBillAssistantChatbotProps {
  onNavigateToInvoice?: (invNumber: string) => void;
  onNavigateToParty?: (gstin: string) => void;
}

export const LogiBillAssistantChatbot: React.FC<LogiBillAssistantChatbotProps> = ({
  onNavigateToInvoice,
  onNavigateToParty,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hi! I am **MSK AI Assistant**. I can query parties, invoices, containers, outstanding payments, and today’s jobs in real-time.\n\nHow can I help you today?',
      suggestedActions: [
        'Find invoice MSK/HT5/SEP26',
        'Search GSTIN 27AABCG6715G2ZO',
        'Show unpaid invoices',
        'Find container TGBU3802319',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: Message = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendChatMessage(
        query,
        messages.map((m) => ({ role: m.role, content: m.content }))
      );

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          actionRequired: res.actionRequired,
          suggestedActions: res.suggestedActions,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error processing request: ${err.message || 'Server communication failed'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (action: any, confirmed: boolean) => {
    if (!confirmed) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Action cancelled. The invoice remains active.' },
      ]);
      return;
    }

    if (action.type === 'CANCEL_INVOICE') {
      try {
        await api.cancelInvoice(action.targetId, 'Cancelled via LogiBill AI Assistant');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `✅ Successfully cancelled invoice **${action.payload.invoiceNumber}**. Outstanding balances have been updated.`,
          },
        ]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `❌ Failed to cancel invoice: ${err.message}`,
          },
        ]);
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 rounded-full bg-red-600 px-4 py-3 text-white shadow-xl hover:bg-red-700 hover:shadow-2xl transition-all group"
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <span className="text-xs font-bold tracking-wide">MSK Assistant</span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="flex flex-col w-96 h-[540px] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">MSK AI Assistant</h3>
                <p className="text-[10px] text-slate-500">MSK Logistic Solution AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-slate-50/30">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed shadow-xs whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white font-medium rounded-br-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {m.content}
                </div>

                {/* Destructive Action Confirmation Card */}
                {m.actionRequired && (
                  <div className="mt-2 w-full max-w-[88%] rounded-xl border border-rose-300 bg-rose-50/50 p-3 shadow-xs">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs mb-1">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{m.actionRequired.title}</span>
                    </div>
                    <p className="text-[11px] text-rose-700 mb-3">{m.actionRequired.description}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleConfirmAction(m.actionRequired, true)}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700 shadow-2xs"
                      >
                        Yes, Cancel Invoice
                      </button>
                      <button
                        onClick={() => handleConfirmAction(m.actionRequired, false)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Keep Invoice
                      </button>
                    </div>
                  </div>
                )}

                {/* Suggested Action Chips */}
                {m.suggestedActions && m.suggestedActions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 max-w-[90%]">
                    {m.suggestedActions.map((s, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSendMessage(s)}
                        className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition-colors text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>LogiBill Assistant is querying records...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-slate-200 p-2.5 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about invoice, party GSTIN, containers..."
                className="flex-1 rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-2xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
