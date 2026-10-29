import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { UserRole } from '../types/index';

export const Login: React.FC = () => {
  const { login, switchDemoRole } = useAuth();
  const [email, setEmail] = useState('admin@logibill.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoLogins: { role: UserRole; title: string; email: string; color: string }[] = [
    { role: 'ADMIN', title: 'Admin (All Access)', email: 'admin@logibill.com', color: 'bg-red-50 text-red-700 border-red-200' },
    { role: 'BILLING', title: 'Billing Executive', email: 'billing@logibill.com', color: 'bg-slate-100 text-slate-800 border-slate-300' },
    { role: 'OPERATIONS', title: 'Operations Executive', email: 'ops@logibill.com', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    { role: 'ACCOUNTANT', title: 'Accountant', email: 'accountant@logibill.com', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { role: 'VIEWER', title: 'Viewer (Read Only)', email: 'viewer@logibill.com', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-5">
          <img
            src="/images/iso-logo.png"
            alt="ISO 9001:2015 Certified"
            className="h-14 w-auto object-contain"
          />
          <img
            src="/images/msk-logo.png"
            alt="MSK LOGISTIC SOLUTION"
            className="h-20 w-auto object-contain drop-shadow-md"
          />
        </div>
        <h2 className="mt-4 text-center text-2xl font-black tracking-tight text-slate-900">
          MSK LOGISTIC SOLUTION
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600 font-semibold uppercase tracking-wider">
          Logistics Management, Billing & Container ERP System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-10 space-y-6">
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-red-600 focus:border-red-600"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-red-600 focus:border-red-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>Sign In</span>
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              1-Click Instant Demo Logins
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {demoLogins.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => switchDemoRole(d.role)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold transition-all hover:scale-[1.01] ${d.color}`}
                >
                  <span>{d.title}</span>
                  <span className="font-mono text-[10px] font-normal opacity-75">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
