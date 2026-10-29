import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Loader2,
  Building,
  FileText,
  CreditCard,
  Box,
  Image as ImageIcon,
  CheckCircle2,
  PenTool,
  Award,
} from 'lucide-react';
import { api } from '../services/api';
import { CompanySettings } from '../types/index';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSavedSuccess(false);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      alert('Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
        <span>Loading Settings...</span>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">System & Company Settings</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure MSK LOGISTIC SOLUTION branding, logos, ISO stamp, banking credentials, and operational rules.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Company Branding & Asset Logos Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ImageIcon className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-slate-900">Branding & Official Certificate Assets</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* MSK Logo Field & Preview */}
            <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              <label className="block font-bold text-slate-800">MSK Company Logo Asset</label>
              <input
                type="text"
                value={settings.logoUrl || '/images/msk-logo.png'}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 font-mono text-[11px]"
                placeholder="/images/msk-logo.png"
              />
              <div className="h-20 bg-white border border-slate-200 rounded flex items-center justify-center p-2">
                <img
                  src={settings.logoUrl || '/images/msk-logo.png'}
                  alt="MSK Logo Preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-500">Official MSK LOGISTIC SOLUTION logo asset</p>
            </div>

            {/* ISO 9001:2015 Logo Field & Preview */}
            <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              <label className="block font-bold text-slate-800 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-blue-600" />
                <span>ISO 9001:2015 Certification</span>
              </label>
              <input
                type="text"
                value={settings.isoLogoUrl || '/images/iso-logo.png'}
                onChange={(e) => setSettings({ ...settings, isoLogoUrl: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 font-mono text-[11px]"
                placeholder="/images/iso-logo.png"
              />
              <div className="h-20 bg-white border border-slate-200 rounded flex items-center justify-center p-2">
                <img
                  src={settings.isoLogoUrl || '/images/iso-logo.png'}
                  alt="ISO Logo Preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-500">Appears on tax invoice header & official PDF</p>
            </div>

            {/* Authorized Signature Field & Preview */}
            <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              <label className="block font-bold text-slate-800 flex items-center gap-1">
                <PenTool className="w-3.5 h-3.5 text-amber-600" />
                <span>Authorized Signature</span>
              </label>
              <input
                type="text"
                value={settings.signatureUrl || ''}
                onChange={(e) => setSettings({ ...settings, signatureUrl: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 font-mono text-[11px]"
                placeholder="/images/signature.png (optional)"
              />
              <div className="h-20 bg-white border border-slate-200 rounded flex items-center justify-center p-2 text-slate-400">
                {settings.signatureUrl ? (
                  <img
                    src={settings.signatureUrl}
                    alt="Signature Preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="italic text-[11px]">No signature asset configured</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500">Configurable company authorized signatory image</p>
            </div>
          </div>

          <div className="pt-2">
            <label className="block font-medium text-slate-700 mb-1">Tax Invoice Official Title</label>
            <input
              type="text"
              value={settings.invoiceTitle || 'TAX INVOICE (EXPORT STUFFING CONTAINER)'}
              onChange={(e) => setSettings({ ...settings, invoiceTitle: e.target.value })}
              className="w-full rounded border border-slate-300 p-2 font-semibold"
            />
          </div>
        </div>

        {/* Company Profile Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-slate-900">Company Information & Tax Credentials</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Company Legal Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Trade Brand Name</label>
              <input
                type="text"
                value={settings.tradeName}
                onChange={(e) => setSettings({ ...settings, tradeName: e.target.value })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Company GSTIN</label>
              <input
                type="text"
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                className="w-full rounded border border-slate-300 p-2 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Permanent Account Number (PAN)</label>
              <input
                type="text"
                value={settings.pan}
                onChange={(e) => setSettings({ ...settings, pan: e.target.value.toUpperCase() })}
                className="w-full rounded border border-slate-300 p-2 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Tax Deduction Account Number (TAN)</label>
              <input
                type="text"
                value={settings.tan || 'PNES72845D'}
                onChange={(e) => setSettings({ ...settings, tan: e.target.value.toUpperCase() })}
                className="w-full rounded border border-slate-300 p-2 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Phone / Mobile</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Billing Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Website</label>
              <input
                type="text"
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Registered Office Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={settings.city}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">PIN Code</label>
              <input
                type="text"
                value={settings.pincode}
                onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Home State</label>
              <input
                type="text"
                value={settings.state}
                onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">State Code</label>
              <input
                type="text"
                value={settings.stateCode}
                onChange={(e) => setSettings({ ...settings, stateCode: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Invoice & Bank Settings */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-slate-900">Invoice Numbering & Banking Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Invoice Prefix (supports auto-increment format e.g. MSK/HT)</label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-500">Produces: MSK/HT001/OCT26, MSK/HT002/OCT26, etc.</span>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Next Sequence Number</label>
              <input
                type="number"
                value={settings.nextInvoiceSeq}
                onChange={(e) => setSettings({ ...settings, nextInvoiceSeq: parseInt(e.target.value) || 1 })}
                className="w-full rounded border border-slate-300 p-2 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Default Billing Currency</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, defaultCurrency: 'INR' })}
                  className={`p-2 rounded border text-xs font-bold transition-all ${
                    (settings.defaultCurrency || 'INR') === 'INR'
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  INR (₹) - Indian Rupee
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, defaultCurrency: 'USD' })}
                  className={`p-2 rounded border text-xs font-bold transition-all ${
                    settings.defaultCurrency === 'USD'
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  USD ($) - US Dollar
                </button>
              </div>
              <span className="text-[10px] text-slate-500">Default currency pre-selected when creating new invoices</span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={settings.bankName}
                onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Company / Account Name</label>
              <input
                type="text"
                value={settings.bankAccountName || settings.companyName}
                onChange={(e) => setSettings({ ...settings, bankAccountName: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                value={settings.bankAccountNo}
                onChange={(e) => setSettings({ ...settings, bankAccountNo: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Bank IFSC Code</label>
              <input
                type="text"
                value={settings.bankIfsc}
                onChange={(e) => setSettings({ ...settings, bankIfsc: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 font-mono uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Branch Name</label>
              <input
                type="text"
                value={settings.bankBranch}
                onChange={(e) => setSettings({ ...settings, bankBranch: e.target.value })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Invoice Terms & Conditions</label>
              <textarea
                rows={3}
                value={settings.termsAndConditions}
                onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
          </div>
        </div>

        {/* Operational Business Rules: Free Days & Taxes */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Box className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-slate-900">Container Ground Rent Rules & Default Tax Rates</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Free Empty Ground Days Allowance</label>
              <input
                type="number"
                min="0"
                value={settings.freeEmptyGroundDays}
                onChange={(e) => setSettings({ ...settings, freeEmptyGroundDays: parseInt(e.target.value) || 0 })}
                className="w-full rounded border border-slate-300 p-2"
              />
              <span className="text-[10px] text-slate-400">Deducted from Empty Gate-In to Stuffing period</span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Free Loaded Ground Days Allowance</label>
              <input
                type="number"
                min="0"
                value={settings.freeLoadedGroundDays}
                onChange={(e) => setSettings({ ...settings, freeLoadedGroundDays: parseInt(e.target.value) || 0 })}
                className="w-full rounded border border-slate-300 p-2"
              />
              <span className="text-[10px] text-slate-400">Deducted from Stuffing to LDD Gate-Out period</span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Default CGST Rate (%)</label>
              <input
                type="number"
                value={settings.cgstDefaultRate}
                onChange={(e) => setSettings({ ...settings, cgstDefaultRate: parseFloat(e.target.value) || 0 })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Default SGST Rate (%)</label>
              <input
                type="number"
                value={settings.sgstDefaultRate}
                onChange={(e) => setSettings({ ...settings, sgstDefaultRate: parseFloat(e.target.value) || 0 })}
                className="w-full rounded border border-slate-300 p-2"
              />
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings successfully saved and applied to all invoice templates and calculations!</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 shadow-sm transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
