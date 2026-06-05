'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { Usuario } from '@/types';
import { initAmplitude, identifyUser, resetAnalytics, trackEvent } from '@/lib/analytics';

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, senha: string, workspace: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await api.get('/api/usuarios/perfil');
      const u: Usuario = response.data;
      setUser(u);
      identifyUser(String(u.id), {
        nome: u.nome,
        email: u.email,
        perfil: u.perfil_id ? String(u.perfil_id) : '',
        workspace: localStorage.getItem('workspace_nome') ?? '',
      });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAmplitude();
    loadUser();
  }, [loadUser]);

  const login = async (email: string, senha: string, workspace: string) => {
    const response = await api.post('/api/usuarios/login', { email, senha, workspace });
    const { access_token, refresh_token, usuario } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('workspace_nome', response.data.workspace?.nome_fantasia || workspace);
    setUser(usuario);
    identifyUser(String(usuario.id), {
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil_id ? String(usuario.perfil_id) : '',
      workspace: response.data.workspace?.nome_fantasia || workspace,
    });
    trackEvent('user_logged_in', { workspace: response.data.workspace?.nome_fantasia || workspace });
  };

  const logout = async () => {
    try {
      await api.post('/api/usuarios/logout');
    } catch {
      // ignore
    }
    trackEvent('user_logged_out');
    resetAnalytics();
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('workspace_nome');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
