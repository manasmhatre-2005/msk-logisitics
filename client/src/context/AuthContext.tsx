import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  ADMIN: { email: 'admin@logibill.com', pass: 'admin123' },
  BILLING: { email: 'billing@logibill.com', pass: 'billing123' },
  OPERATIONS: { email: 'ops@logibill.com', pass: 'ops123' },
  ACCOUNTANT: { email: 'accountant@logibill.com', pass: 'accountant123' },
  VIEWER: { email: 'viewer@logibill.com', pass: 'viewer123' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('logibill_token');
        if (token) {
          const res = await api.getMe();
          setUser(res.user);
        } else {
          // Default to Admin demo user on first launch for zero friction
          await switchDemoRole('ADMIN');
        }
      } catch (err) {
        // Fall back to login
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    localStorage.setItem('logibill_token', res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('logibill_token');
    setUser(null);
  };

  const switchDemoRole = async (role: UserRole) => {
    const creds = DEMO_CREDENTIALS[role];
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
