import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    // Safety fallback timeout to ensure app never hangs indefinitely on loading
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2500);

    const fetchMe = async () => {
      if (!token) {
        if (isMounted) setLoading(false);
        clearTimeout(safetyTimeout);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (isMounted) setUser(res.data);
      } catch (err) {
        console.error('Session verification error:', err);
        try {
          localStorage.removeItem('token');
        } catch (e) {
          // Ignore
        }
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
        clearTimeout(safetyTimeout);
      }
    };

    fetchMe();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    try {
      localStorage.setItem('token', newToken);
    } catch (e) {
      // Ignore
    }
    setToken(newToken);
    setUser(userData);
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await api.post('/auth/register', { email, password, name });
    const { token: newToken, user: userData } = res.data;
    try {
      localStorage.setItem('token', newToken);
    } catch (e) {
      // Ignore
    }
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
    } catch (e) {
      // Ignore
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
