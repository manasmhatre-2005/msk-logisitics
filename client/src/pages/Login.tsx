import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  Box,
  FileText,
  BarChart3,
  CheckCircle2,
  X,
} from 'lucide-react';
import { UserRole } from '../types/index';

interface LoginProps {
  onSuccess?: (role: UserRole) => void;
  logoutMessage?: string | null;
  onClearLogoutMessage?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, logoutMessage, onClearLogoutMessage }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please provide both username/email and password.');
      return;
    }

    if (onClearLogoutMessage) onClearLogoutMessage();
    setLoading(true);
    setError(null);
    try {
      const user = await login(cleanEmail, password);
      if (onSuccess) {
        onSuccess(user.role);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8 xl:p-10 relative overflow-x-hidden bg-[#EDF4FA] bg-cover bg-center select-none"
      style={{ backgroundImage: "url('/images/login-page-backdrop.png')" }}
    >
      {/* Unified Master Sign-In Card (Centered, Scale-Independent) */}
      <div className="w-full max-w-[1000px] xl:max-w-[1080px] 2xl:max-w-[1140px] bg-white rounded-2xl sm:rounded-3xl lg:rounded-[32px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-100 flex flex-col lg:flex-row overflow-hidden relative z-10 my-auto">
        {/* Left Half: Branding & Logistics Hero Section */}
        <div className="w-full lg:w-[55%] relative overflow-hidden bg-white flex items-center justify-center">
          <img
            src="/images/login-card-left-panel.png"
            alt="MSK Logistic Solution - Integrated Logistics Management ERP. Management, Invoicing & Container Operations"
            loading="eager"
            decoding="async"
            className="w-full h-auto lg:h-full max-h-[300px] sm:max-h-[380px] lg:max-h-none object-contain lg:object-cover object-center"
          />
          <h1 className="sr-only">
            MSK Logistic Solution - Integrated Logistics Management ERP
          </h1>
          <p className="sr-only">
            Management, Invoicing & Container Operations
          </p>
        </div>

        {/* Right Half: Sign-In Form & Feature Badges */}
        <div className="w-full lg:w-[45%] bg-white flex flex-col justify-between p-6 sm:p-7 xl:p-8">
          {/* Card Header */}
          <div className="text-center pt-0.5 sm:pt-1">
            <p className="text-sm sm:text-base text-slate-600 font-medium">
              Welcome to
            </p>
            <h2 className="text-xl sm:text-2xl lg:text-[26px] font-black text-[#102A43] tracking-tight mt-0.5">
              MSK Logistic Solution
            </h2>
            <div className="w-10 sm:w-12 h-1 bg-[#E11D2A] rounded-full mx-auto my-2 sm:my-2.5" />
            <p className="text-xs sm:text-[13px] text-slate-400 font-normal">
              Sign in to access your account
            </p>
          </div>

          {/* Sign Out / Status Notification */}
          {logoutMessage && !error && (
            <div className="mt-3 flex items-center justify-between gap-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">{logoutMessage}</span>
              </div>
              {onClearLogoutMessage && (
                <button
                  type="button"
                  onClick={onClearLogoutMessage}
                  className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-3 flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2A]" />
              <span>{error}</span>
            </div>
          )}

          {/* Interactive Form */}
          <form onSubmit={handleLogin} className="mt-4 space-y-3 sm:space-y-3.5">
            {/* Email / Username Field */}
            <div>
              <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1">
                Email / Username
              </label>
              <div className="relative rounded-xl border border-slate-200 focus-within:border-[#E11D2A] focus-within:ring-2 focus-within:ring-red-100 transition-all bg-white">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Enter your email or username"
                  value={email}
                  onChange={(e) => {
                    if (onClearLogoutMessage) onClearLogoutMessage();
                    setEmail(e.target.value);
                  }}
                  className="w-full h-11 sm:h-11.5 pl-10 pr-3.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent rounded-xl outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative rounded-xl border border-slate-200 focus-within:border-[#E11D2A] focus-within:ring-2 focus-within:ring-red-100 transition-all bg-white">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    if (onClearLogoutMessage) onClearLogoutMessage();
                    setPassword(e.target.value);
                  }}
                  className="w-full h-11 sm:h-11.5 pl-10 pr-10 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent rounded-xl outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Red Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 sm:h-11.5 mt-1 sm:mt-1.5 flex items-center justify-center gap-2 rounded-xl bg-[#E11D2A] hover:bg-[#c91823] active:bg-[#b0141e] text-white font-bold text-sm sm:text-base shadow-md shadow-red-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Feature Badges Footer */}
          <div className="pt-4 sm:pt-5 mt-4 sm:mt-5 border-t border-slate-100 grid grid-cols-3 divide-x divide-slate-100">
            <div className="flex flex-col items-center text-center px-1">
              <Box className="w-4 sm:w-5 h-4 sm:h-5 text-slate-700 stroke-[1.8]" />
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-tight mt-1.5 block">
                Container<br />Operations
              </span>
            </div>
            <div className="flex flex-col items-center text-center px-1">
              <FileText className="w-4 sm:w-5 h-4 sm:h-5 text-slate-700 stroke-[1.8]" />
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-tight mt-1.5 block">
                Invoicing &<br />Billing
              </span>
            </div>
            <div className="flex flex-col items-center text-center px-1">
              <BarChart3 className="w-4 sm:w-5 h-4 sm:h-5 text-slate-700 stroke-[1.8]" />
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-tight mt-1.5 block">
                Reports &<br />Analytics
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
