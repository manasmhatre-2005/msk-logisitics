import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, Loader2, Clock, User } from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types/index';
import { Badge } from '../components/common/Badge';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('ALL');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const data = await api.getAuditLogs(entityFilter !== 'ALL' ? entityFilter : undefined);
        setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [entityFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Audit Trail & Compliance Log</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of all party updates, financial overrides, invoice finalizations, and payment recordings.
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Entity Filter:</label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-slate-300 p-2 text-xs bg-white text-slate-900"
          >
            <option value="ALL">All Entities</option>
            <option value="PARTY">Parties</option>
            <option value="INVOICE">Invoices</option>
            <option value="CONTAINER">Containers</option>
            <option value="JOB">Jobs</option>
            <option value="PAYMENT">Payments</option>
            <option value="SETTINGS">Settings</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5">Activity Description</th>
                <th className="p-3.5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-900">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.userName || 'System'}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          log.action === 'CREATE'
                            ? 'green'
                            : log.action === 'UPDATE'
                            ? 'blue'
                            : log.action === 'OVERRIDE'
                            ? 'amber'
                            : log.action === 'DELETE' || log.action === 'CANCEL'
                            ? 'red'
                            : 'purple'
                        }
                        size="sm"
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{log.entityType}</td>
                    <td className="p-3.5 text-slate-700 leading-relaxed max-w-md">{log.details}</td>
                    <td className="p-3.5 font-mono text-slate-400 text-[11px]">{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
