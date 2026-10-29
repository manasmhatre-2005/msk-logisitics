import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  FileSpreadsheet,
  Users,
  Box,
  FileText,
  CreditCard,
  Loader2,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrencyWithSymbol } from '../utils/currency';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'party' | 'gst' | 'containers' | 'outstanding'>('party');
  const [partyData, setPartyData] = useState<any[]>([]);
  const [gstData, setGstData] = useState<any[]>([]);
  const [containersData, setContainersData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const [pReport, gReport, cReport] = await Promise.all([
          api.getPartyBillingReport(),
          api.getGstReport(),
          api.getContainers(),
        ]);
        setPartyData(pReport);
        setGstData(gReport);
        setContainersData(cReport);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const exportCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }
    const headers = Object.keys(data[0]).filter((k) => typeof data[0][k] !== 'object');
    const rows = data.map((row) =>
      headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate and export financial, tax audit, container movement, and customer billing reports.
          </p>
        </div>

        <button
          onClick={() => {
            if (reportType === 'party') exportCSV(partyData, 'Party_Billing_Report');
            if (reportType === 'gst') exportCSV(gstData, 'GSTR1_Tax_Report');
            if (reportType === 'containers') exportCSV(containersData, 'Containers_Operations_Report');
            if (reportType === 'outstanding') exportCSV(partyData.filter((p) => p.balanceAmount > 0), 'Outstanding_Balance_Report');
          }}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Excel / CSV</span>
        </button>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 rounded-xl shadow-xs text-xs overflow-x-auto">
        <button
          onClick={() => setReportType('party')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition-colors ${
            reportType === 'party' ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Party-wise Billing Report</span>
        </button>
        <button
          onClick={() => setReportType('gst')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition-colors ${
            reportType === 'gst' ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>GSTR-1 Tax Summary</span>
        </button>
        <button
          onClick={() => setReportType('containers')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition-colors ${
            reportType === 'containers' ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Container Operations Report</span>
        </button>
        <button
          onClick={() => setReportType('outstanding')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition-colors ${
            reportType === 'outstanding' ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Outstanding Balances</span>
        </button>
      </div>

      {/* Report Tables */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Generating report data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            {reportType === 'party' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Party Legal Name</th>
                    <th className="p-3.5">GSTIN</th>
                    <th className="p-3.5">State</th>
                    <th className="p-3.5 text-center">Invoices</th>
                    <th className="p-3.5 text-center">Containers</th>
                    <th className="p-3.5 text-right">Taxable Amount</th>
                    <th className="p-3.5 text-right">GST Liability</th>
                    <th className="p-3.5 text-right">Total Invoiced</th>
                    <th className="p-3.5 text-right">Paid</th>
                    <th className="p-3.5 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partyData.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900">{p.legalName}</td>
                      <td className="p-3.5 font-mono text-blue-700">{p.gstin}</td>
                      <td className="p-3.5 text-slate-600">{p.state}</td>
                      <td className="p-3.5 text-center">{p.invoiceCount}</td>
                      <td className="p-3.5 text-center">{p.containerCount}</td>
                      <td className="p-3.5 text-right">₹{p.taxableAmount.toLocaleString('en-IN')}</td>
                      <td className="p-3.5 text-right">₹{p.gstAmount.toLocaleString('en-IN')}</td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        ₹{p.totalBilled.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-right text-emerald-700 font-semibold">
                        ₹{p.paidAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-right text-rose-600 font-bold">
                        ₹{p.balanceAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'gst' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Invoice No</th>
                    <th className="p-3.5">Invoice Date</th>
                    <th className="p-3.5">Customer GSTIN</th>
                    <th className="p-3.5">Place of Supply</th>
                    <th className="p-3.5 text-right">Taxable Value</th>
                    <th className="p-3.5 text-right">CGST</th>
                    <th className="p-3.5 text-right">SGST</th>
                    <th className="p-3.5 text-right">IGST</th>
                    <th className="p-3.5 text-right">Total Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gstData.map((inv, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono font-bold text-blue-700">{inv.invoiceNumber}</td>
                      <td className="p-3.5">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                      <td className="p-3.5 font-mono">{inv.billToGstin}</td>
                      <td className="p-3.5">{inv.billToState} ({inv.billToStateCode})</td>
                      <td className="p-3.5 text-right">{formatCurrencyWithSymbol(inv.taxableAmount, inv.currency)}</td>
                      <td className="p-3.5 text-right text-blue-700">{formatCurrencyWithSymbol(inv.cgstAmount, inv.currency)}</td>
                      <td className="p-3.5 text-right text-blue-700">{formatCurrencyWithSymbol(inv.sgstAmount, inv.currency)}</td>
                      <td className="p-3.5 text-right text-purple-700 font-semibold">{formatCurrencyWithSymbol(inv.igstAmount, inv.currency)}</td>
                      <td className="p-3.5 text-right font-bold text-slate-900">{formatCurrencyWithSymbol(inv.grandTotal, inv.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'containers' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Container No</th>
                    <th className="p-3.5">Size / Type</th>
                    <th className="p-3.5">Party</th>
                    <th className="p-3.5">Empty Ground Days</th>
                    <th className="p-3.5">Days After Carting</th>
                    <th className="p-3.5">Loaded Ground Days</th>
                    <th className="p-3.5">Override Status</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {containersData.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono font-bold">{c.containerNumber}</td>
                      <td className="p-3.5">{c.size} {c.type}</td>
                      <td className="p-3.5">{c.party?.legalName}</td>
                      <td className="p-3.5">{c.emptyGroundRentDays} days</td>
                      <td className="p-3.5">{c.daysAfterCarting} days</td>
                      <td className="p-3.5">{c.loadedGroundDays} days</td>
                      <td className="p-3.5">
                        {c.isOverride ? (
                          <span className="text-amber-700 font-semibold">Overridden</span>
                        ) : (
                          <span className="text-emerald-700">Calculated</span>
                        )}
                      </td>
                      <td className="p-3.5">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'outstanding' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Party Name</th>
                    <th className="p-3.5">GSTIN</th>
                    <th className="p-3.5 text-right">Total Invoiced</th>
                    <th className="p-3.5 text-right">Paid Amount</th>
                    <th className="p-3.5 text-right">Overdue Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partyData
                    .filter((p) => p.balanceAmount > 0)
                    .map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3.5 font-bold text-slate-900">{p.legalName}</td>
                        <td className="p-3.5 font-mono">{p.gstin}</td>
                        <td className="p-3.5 text-right">₹{p.totalBilled.toLocaleString('en-IN')}</td>
                        <td className="p-3.5 text-right text-emerald-700">₹{p.paidAmount.toLocaleString('en-IN')}</td>
                        <td className="p-3.5 text-right text-rose-600 font-black text-sm">
                          ₹{p.balanceAmount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
