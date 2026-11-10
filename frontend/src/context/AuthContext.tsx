import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, setAuthToken, getAuthToken } from '../services/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'ACCOUNT_HOLDER' | 'AUDITOR';
  onboardingStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
}

export interface Account {
  id: string;
  accountNumber: string;
  balance: number;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'FROZEN' | 'CLOSED';
}

interface AuthContextType {
  user: User | null;
  accounts: Account[];
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (payload: any) => Promise<void>;
  bootstrapAdmin: (payload: any) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiRequest('/api/auth/me');
      setUser(data.user);
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Session expired or invalid:', err);
      setAuthToken(null);
      setUser(null);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (credentials: any) => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    setAuthToken(res.token);
    setUser(res.user);
    setAccounts(res.accounts || []);
  };

  const register = async (payload: any) => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setAuthToken(res.token);
    setUser(res.user);
    if (res.account) {
      setAccounts([res.account]);
    }
  };

  const bootstrapAdmin = async (payload: any) => {
    const res = await apiRequest('/api/auth/bootstrap-admin', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setAuthToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setAccounts([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accounts,
        isLoading,
        login,
        register,
        bootstrapAdmin,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
