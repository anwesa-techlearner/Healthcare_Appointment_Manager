import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/endpoints';

interface User {
  id: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  name: string;
  phone?: string;
  doctorProfile?: {
    id: string;
    specialization: string;
    slotDurationMinutes: number;
    timezone: string;
  };
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  // Returns the user's role so callers can redirect without re-reading localStorage
  login: (email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  register: (data: { email: string; password: string; name: string; phone?: string }) => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authApi.getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  async function login(email: string, password: string): Promise<string> {
    const res = await authApi.login(email, password);
    const { accessToken, refreshToken } = res.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    const meRes = await authApi.getMe();
    const userData: User = meRes.data;
    setUser(userData);
    // Return role so the caller can navigate immediately — no setTimeout, no JWT decode
    return userData.role;
  }

  async function logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch {}
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }

  async function register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }): Promise<string> {
    await authApi.register(data);
    return login(data.email, data.password);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
