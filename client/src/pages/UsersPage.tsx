import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldCheck, Check, Key, LogIn, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { User, UserRole } from '../types/index';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser, switchDemoRole } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.getUsers();
        setUsers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const rolesMatrix = [
    {
      role: 'ADMIN',
      title: 'Administrator',
      email: 'admin@logibill.com',
      pass: 'admin123',
      permissions: ['All Modules', 'Financial Overrides', 'User Roles', 'Settings', 'Audit Trail'],
      color: 'purple',
    },
    {
      role: 'BILLING',
      title: 'Billing Executive',
      email: 'billing@logibill.com',
      pass: 'billing123',
      permissions: ['Tax Invoices', 'Party Master', 'Charges & Rates', 'PDF Generation', 'Email Dispatch'],
      color: 'blue',
    },
    {
      role: 'OPERATIONS',
      title: 'Operations Executive',
      email: 'ops@logibill.com',
      pass: 'ops123',
      permissions: ['Jobs & Shipments', 'Container Operations', 'Ground Day Tracking', 'CFS Movements'],
      color: 'amber',
    },
    {
      role: 'ACCOUNTANT',
      title: 'Senior Accountant',
      email: 'accountant@logibill.com',
      pass: 'accountant123',
      permissions: ['Invoices', 'Payment Collections', 'GST Reports (GSTR-1)', 'Financial Summaries'],
      color: 'emerald',
    },
    {
      role: 'VIEWER',
      title: 'Audit Viewer',
      email: 'viewer@logibill.com',
      pass: 'viewer123',
      permissions: ['Read-only Invoices', 'Read-only Containers', 'Activity Log Review'],
      color: 'slate',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Users & Role-Based Access Control</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Manage system users and test different privilege levels with 1-click active role switching.
        </p>
      </div>

      {/* Role Switcher Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rolesMatrix.map((r) => {
          const isCurrent = currentUser?.role === r.role;
          return (
            <div
              key={r.role}
              className={`rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-red-600 bg-red-50/20 ring-2 ring-red-600/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={r.color as any} size="sm">
                    {r.role}
                  </Badge>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      Active User
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{r.title}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{r.email}</p>

                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Granted Permissions
                  </span>
                  {r.permissions.map((p, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">Pass: {r.pass}</span>
                <button
                  onClick={() => switchDemoRole(r.role as UserRole)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-red-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isCurrent ? 'Current Role' : 'Switch Role'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
