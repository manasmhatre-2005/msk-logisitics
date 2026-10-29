import React, { useState, useEffect } from 'react';
import { Search, Users, FileText, Box, Ship, ArrowRight, Loader2, X } from 'lucide-react';
import { api } from '../../services/api';
import { Party, Invoice, Container, Job } from '../../types/index';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, id?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    parties: Party[];
    invoices: Invoice[];
    containers: Container[];
    jobs: Job[];
  }>({ parties: [], invoices: [], containers: [], jobs: [] });

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ parties: [], invoices: [], containers: [], jobs: [] });
      return;
    }

    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const res = await api.search(query.trim());
          setResults(res);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setResults({ parties: [], invoices: [], containers: [], jobs: [] });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const totalResults =
    results.parties.length +
    results.invoices.length +
    results.containers.length +
    results.jobs.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="relative mx-auto max-w-2xl transform divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition-all">
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3 bg-white">
          <Search className="pointer-events-none h-5 w-5 text-slate-400 mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GSTIN, party name, invoice number, container, job..."
            className="h-9 w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-2" />}
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {query.length < 2 && (
            <div className="text-center py-8 text-xs text-slate-400">
              Type at least 2 characters to search across parties, containers, invoices and jobs.
            </div>
          )}

          {query.length >= 2 && !loading && totalResults === 0 && (
            <div className="text-center py-8 text-xs text-slate-500">
              No matching records found for "{query}".
            </div>
          )}

          {/* Parties */}
          {results.parties.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>Parties ({results.parties.length})</span>
              </div>
              <div className="space-y-1">
                {results.parties.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onNavigate('parties', p.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{p.legalName}</p>
                      <p className="text-[11px] text-slate-500">
                        GSTIN: <span className="font-mono font-medium text-blue-600">{p.gstin}</span> • {p.city}, {p.state}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Invoices */}
          {results.invoices.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Invoices ({results.invoices.length})</span>
              </div>
              <div className="space-y-1">
                {results.invoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => {
                      onNavigate('invoices', inv.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                        <span>{inv.invoiceNumber}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-medium">
                          {inv.status}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {inv.billToName} • ₹{inv.grandTotal.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Containers */}
          {results.containers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <Box className="w-3.5 h-3.5" />
                <span>Containers ({results.containers.length})</span>
              </div>
              <div className="space-y-1">
                {results.containers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onNavigate('containers', c.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div>
                      <p className="text-xs font-mono font-bold text-slate-900">{c.containerNumber}</p>
                      <p className="text-[11px] text-slate-500">
                        {c.size} {c.type} • Status: {c.status}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Jobs */}
          {results.jobs.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <Ship className="w-3.5 h-3.5" />
                <span>Jobs & Shipments ({results.jobs.length})</span>
              </div>
              <div className="space-y-1">
                {results.jobs.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => {
                      onNavigate('jobs', j.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{j.jobNumber}</p>
                      <p className="text-[11px] text-slate-500">
                        {j.port} → {j.destination || 'Port'} • SB: {j.sbNumber || 'N/A'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
