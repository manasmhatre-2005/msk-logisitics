import React, { useState } from 'react';
import { Search, CheckCircle2, Building, ShieldCheck, FileText, ArrowRight, Loader2, AlertCircle, Edit, Save } from 'lucide-react';
import { api } from '../../services/api';
import { GSTVerificationResult, Party } from '../../types/index';
import { Badge } from '../common/Badge';

interface GSTINSearchWidgetProps {
  onPartySelected?: (party: Partial<Party>) => void;
  onCreateInvoiceFromGstin?: (partyData: Partial<Party>) => void;
  onViewParty?: (partyId: string) => void;
}

export const GSTINSearchWidget: React.FC<GSTINSearchWidgetProps> = ({
  onPartySelected,
  onCreateInvoiceFromGstin,
  onViewParty,
}) => {
  const [gstinInput, setGstinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GSTVerificationResult | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editedParty, setEditedParty] = useState<any>(null);
  const [savingParty, setSavingParty] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  const demoGstins = [
    { label: 'Greenwich Maridian (Demo Party)', gstin: '27AABCG6715G2ZO' },
    { label: 'GSA Industries (Exporter)', gstin: '27AABCG8899K1Z4' },
    { label: 'Gujarat Maritime (Inter-State IGST)', gstin: '24AACCA9876K1Z1' },
  ];

  const handleSearch = async (gstToSearch?: string) => {
    const targetGstin = (gstToSearch || gstinInput).trim().toUpperCase();
    if (!targetGstin) {
      setError('Please enter a 15-character GSTIN');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSavedSuccess(null);
    setEditingDetails(false);

    try {
      const data = await api.lookupGSTIN(targetGstin);
      setResult(data);
      setEditedParty({
        legalName: data.legalName,
        tradeName: data.tradeName,
        gstin: data.gstin,
        registeredAddress: data.registeredAddress,
        billingAddress: data.registeredAddress,
        city: data.city,
        state: data.state,
        stateCode: data.stateCode,
        pincode: data.pincode,
        gstStatus: data.gstStatus,
        isGstVerified: true,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to verify GSTIN');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveParty = async () => {
    if (!editedParty) return;
    setSavingParty(true);
    setError(null);
    try {
      const created = await api.createParty(editedParty);
      setSavedSuccess(`Party "${created.legalName}" successfully saved to database!`);
      // Update result to show party now exists
      setResult((prev) =>
        prev
          ? {
              ...prev,
              partyExists: true,
              existingParty: {
                id: created.id,
                legalName: created.legalName,
                tradeName: created.tradeName,
                gstin: created.gstin,
                invoicesCount: 0,
                jobsCount: 0,
                containersCount: 0,
                outstandingAmount: 0,
              },
            }
          : null
      );
    } catch (err: any) {
      setError(err.message || 'Failed to save party');
    } finally {
      setSavingParty(false);
    }
  };

  const handleCreateInvoice = () => {
    if (!result) return;
    const partyData = result.partyExists && result.existingParty
      ? {
          id: result.existingParty.id,
          legalName: result.existingParty.legalName,
          gstin: result.existingParty.gstin,
          billingAddress: result.existingParty.billingAddress || result.registeredAddress,
          state: result.state,
          stateCode: result.stateCode,
        }
      : editedParty || {
          legalName: result.legalName,
          gstin: result.gstin,
          registeredAddress: result.registeredAddress,
          billingAddress: result.registeredAddress,
          state: result.state,
          stateCode: result.stateCode,
        };

    if (onCreateInvoiceFromGstin) {
      onCreateInvoiceFromGstin(partyData);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input Box */}
      <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-red-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            GSTIN-First Verification & Automatic Population
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Enter any 15-digit Indian GSTIN to instantly verify registration status and retrieve taxpayer records directly from the GST registry without manual typing.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              maxLength={15}
              value={gstinInput}
              onChange={(e) => {
                setGstinInput(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. 27AABCG6715G2ZO"
              className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm font-mono uppercase tracking-wider text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading || !gstinInput.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Verify & Search GSTIN</span>
          </button>
        </div>

        {/* Demo GSTIN Quick Pickers */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400">Quick Test Samples:</span>
          {demoGstins.map((d) => (
            <button
              key={d.gstin}
              type="button"
              onClick={() => {
                setGstinInput(d.gstin);
                handleSearch(d.gstin);
              }}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
            >
              {d.gstin} <span className="text-[10px] text-slate-400 font-sans">({d.label.split(' ')[0]})</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{savedSuccess}</span>
          </div>
        )}
      </div>

      {/* Result Card: Existing Party Found */}
      {result && result.partyExists && result.existingParty && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/20 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="green" size="md">
                <CheckCircle2 className="w-3.5 h-3.5" /> PARTY FOUND IN DATABASE
              </Badge>
              <Badge variant="blue" size="sm">
                GST Verified
              </Badge>
            </div>
            <span className="text-xs text-slate-500">
              Verified: {new Date(result.verifiedAt).toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Party Name</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{result.existingParty.legalName}</p>
              <p className="text-xs text-slate-500 mt-2">GSTIN</p>
              <p className="text-xs font-mono font-semibold text-blue-700">{result.existingParty.gstin}</p>
              <p className="text-xs text-slate-500 mt-2">Registered State</p>
              <p className="text-xs font-medium text-slate-800">{result.state} (Code: {result.stateCode})</p>
            </div>

            <div className="bg-white rounded-lg p-3.5 border border-slate-200 grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-[11px] text-slate-500 uppercase">Invoices</p>
                <p className="text-lg font-bold text-slate-900">{result.existingParty.invoicesCount}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase">Active Jobs</p>
                <p className="text-lg font-bold text-slate-900">{result.existingParty.jobsCount}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase">Containers</p>
                <p className="text-lg font-bold text-slate-900">{result.existingParty.containersCount}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase">Outstanding</p>
                <p className="text-base font-bold text-rose-600">
                  ₹{result.existingParty.outstandingAmount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
            {onViewParty && (
              <button
                onClick={() => onViewParty(result.existingParty!.id)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                View Party Profile
              </button>
            )}
            <button
              onClick={handleCreateInvoice}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Create Invoice for this Party</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Result Card: New Party (GSTIN Verified via Registry) */}
      {result && !result.partyExists && (
        <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="blue" size="md">
                <CheckCircle2 className="w-3.5 h-3.5" /> GSTIN VERIFIED
              </Badge>
              <Badge variant="emerald" size="sm">
                Status: {result.gstStatus}
              </Badge>
              <span className="text-xs text-slate-400">
                Source: {result.verificationSource}
              </span>
            </div>
            <button
              onClick={() => setEditingDetails(!editingDetails)}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{editingDetails ? 'Close Editor' : 'Edit Details Before Saving'}</span>
            </button>
          </div>

          {editingDetails ? (
            /* Editable Fields Form */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Party Name</label>
                <input
                  type="text"
                  value={editedParty.legalName}
                  onChange={(e) => setEditedParty({ ...editedParty, legalName: e.target.value })}
                  placeholder="e.g. MSK Logistics"
                  className="w-full text-xs rounded border border-slate-300 p-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Exporter Name</label>
                <input
                  type="text"
                  value={editedParty.tradeName || ''}
                  onChange={(e) => setEditedParty({ ...editedParty, tradeName: e.target.value })}
                  placeholder="e.g. MSK Logistics Exporter"
                  className="w-full text-xs rounded border border-slate-300 p-2 bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Registered Address</label>
                <textarea
                  rows={2}
                  value={editedParty.registeredAddress}
                  onChange={(e) => setEditedParty({ ...editedParty, registeredAddress: e.target.value, billingAddress: e.target.value })}
                  className="w-full text-xs rounded border border-slate-300 p-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={editedParty.city}
                  onChange={(e) => setEditedParty({ ...editedParty, city: e.target.value })}
                  className="w-full text-xs rounded border border-slate-300 p-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={editedParty.pincode}
                  onChange={(e) => setEditedParty({ ...editedParty, pincode: e.target.value })}
                  className="w-full text-xs rounded border border-slate-300 p-2 bg-white"
                />
              </div>
            </div>
          ) : (
            /* Read-only Display */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-medium text-slate-400">Party Name</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{editedParty?.legalName || result.legalName}</p>
              </div>
              <div>
                <p className="font-medium text-slate-400">Exporter Name</p>
                <p className="font-semibold text-slate-800 mt-0.5">{editedParty?.tradeName || result.tradeName || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-400">GSTIN</p>
                <p className="font-mono font-bold text-red-700 mt-0.5">{result.gstin}</p>
              </div>
              <div>
                <p className="font-medium text-slate-400">State / State Code</p>
                <p className="font-medium text-slate-800 mt-0.5">{result.state} ({result.stateCode})</p>
              </div>
              <div className="sm:col-span-2">
                <p className="font-medium text-slate-400">Registered Address</p>
                <p className="font-medium text-slate-800 mt-0.5">{editedParty?.registeredAddress || result.registeredAddress}, {result.city} - {result.pincode}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={handleSaveParty}
              disabled={savingParty}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5 text-red-600" />
              <span>{savingParty ? 'Saving...' : 'Save Party to Master'}</span>
            </button>
            <button
              onClick={handleCreateInvoice}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Create Invoice Directly</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setResult(null)}
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
