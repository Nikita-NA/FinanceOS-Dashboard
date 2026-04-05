import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '@/api/auth';
import { clearAuth, getStoredToken, getStoredUser, persistAuth } from '@/api/client';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isReady: boolean;
  isAdmin: boolean;
  canViewAnalytics: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const t = getStoredToken();
    const u = getStoredUser();
    setToken(t);
    setUserState(u);
    setIsReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    persistAuth(res.accessToken, res.user);
    setToken(res.accessToken);
    setUserState(res.user);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUserState(null);
  }, []);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('finance_user', JSON.stringify(u));
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isReady,
      isAdmin: user?.role === 'ADMIN',
      canViewAnalytics: user?.role === 'ANALYST' || user?.role === 'ADMIN',
      login,
      logout,
      setUser,
    }),
    [user, token, isReady, login, logout, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
