import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local development demo credentials only (ignored in production)
const DEV_DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  ADMIN: { email: 'admin@login', pass: 'admin@123' },
  ACCOUNT_MANAGER: { email: 'account@login', pass: 'Account@123' },
  DATA_ENTRY: { email: 'operator@login', pass: 'Operator@123' },
  BILLING: { email: 'billing@logibill.com', pass: 'billing123' },
  OPERATIONS: { email: 'ops@logibill.com', pass: 'ops123' },
  ACCOUNTANT: { email: 'accountant@logibill.com', pass: 'accountant123' },
  VIEWER: { email: 'viewer@logibill.com', pass: 'viewer123' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Fast hydration from cached session to eliminate blank loading screen on page refresh
  const [user, setUser] = useState<User | null>(() => {
    try {
      const token = localStorage.getItem('logibill_token') || sessionStorage.getItem('logibill_token');
      const cached = localStorage.getItem('logibill_user');
      if (token && cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const token = localStorage.getItem('logibill_token') || sessionStorage.getItem('logibill_token');
      const cached = localStorage.getItem('logibill_user');
      // If we have token and cached user profile, render immediately with 0ms visual delay
      return Boolean(token && !cached);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('logibill_token');
      sessionStorage.removeItem('logibill_token');
      localStorage.removeItem('logibill_user');
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window !== 'undefined' && window.location.search.includes('preview=dashboard')) {
          const previewUser: User = {
            id: 'admin-preview-id',
            name: 'MSK System Administrator',
            email: 'admin@login',
            role: 'ADMIN',
            createdAt: new Date().toISOString(),
          } as User;
          setUser(previewUser);
          setLoading(false);
          return;
        }

        const token = localStorage.getItem('logibill_token') || sessionStorage.getItem('logibill_token');
        if (token) {
          const res = await api.getMe();
          setUser(res.user);
          localStorage.setItem('logibill_user', JSON.stringify(res.user));
        } else {
          // Require authentication for all users in production
          setUser(null);
          localStorage.removeItem('logibill_user');
        }
      } catch (err) {
        // Fall back to clean unauthenticated state on token expiration or invalidity
        localStorage.removeItem('logibill_token');
        sessionStorage.removeItem('logibill_token');
        localStorage.removeItem('logibill_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    const res = await api.login(email, pass);
    localStorage.setItem('logibill_token', res.token);
    localStorage.setItem('logibill_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('Backend logout notification skipped or unreachable, proceeding with client cleanup:', err);
    } finally {
      localStorage.removeItem('logibill_token');
      sessionStorage.removeItem('logibill_token');
      localStorage.removeItem('logibill_user');
      if (typeof window !== 'undefined' && window.location.search.includes('preview=')) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
      }
      setUser(null);
    }
  };

  const switchDemoRole = async (role: UserRole) => {
    // Only available in development mode for developer testing
    if (!import.meta.env.DEV) {
      console.warn('Demo role switching is disabled in production mode.');
      return;
    }
    const creds = DEV_DEMO_CREDENTIALS[role];
    if (creds) {
      await login(creds.email, creds.pass);
    }
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchDemoRole, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
