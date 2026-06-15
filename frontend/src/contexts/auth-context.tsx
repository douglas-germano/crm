'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { Usuario } from '@/types';
import { initAmplitude, identifyUser, resetAnalytics, trackEvent } from '@/lib/analytics';

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, senha: string, workspace: string) => Promise<void>;
  loginSuperAdmin: (email: string, senha: string) => Promise<void>;
  aplicarSessaoImpersonada: (data: { access_token: string; refresh_token: string; usuario: Usuario; workspace?: { nome_fantasia?: string } }) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isPlatformSession: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isPlatformSession, setIsPlatformSession] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const tokenType = localStorage.getItem('auth_tipo');
      const response = tokenType === 'platform'
        ? await api.get('/api/v1/core/super-admin/me')
        : await api.get('/api/v1/core/usuarios/perfil');
      const u: Usuario = tokenType === 'platform' ? response.data.usuario : response.data;
      setUser(u);
      setIsPlatformSession(tokenType === 'platform');
      identifyUser(String(u.id), {
        nome: u.nome,
        email: u.email,
        perfil: u.perfil_id ? String(u.perfil_id) : '',
        workspace: localStorage.getItem('workspace_nome') ?? '',
      });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_tipo');
      setUser(null);
      setIsPlatformSession(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAmplitude();
    loadUser();
  }, [loadUser]);

  const login = async (email: string, senha: string, workspace: string) => {
    const response = await api.post('/api/v1/core/usuarios/login', { email, senha, workspace });
    const { access_token, refresh_token, usuario } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('auth_tipo', 'tenant');
    localStorage.setItem('workspace_nome', response.data.workspace?.nome_fantasia || workspace);
    setUser(usuario);
    setIsPlatformSession(false);
    identifyUser(String(usuario.id), {
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil_id ? String(usuario.perfil_id) : '',
      workspace: response.data.workspace?.nome_fantasia || workspace,
    });
    trackEvent('user_logged_in', { workspace: response.data.workspace?.nome_fantasia || workspace });
  };

  const loginSuperAdmin = async (email: string, senha: string) => {
    const response = await api.post('/api/v1/core/super-admin/login', { email, senha });
    const { access_token, refresh_token, usuario } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('auth_tipo', 'platform');
    localStorage.setItem('workspace_nome', 'Super Admin');
    setUser(usuario);
    setIsPlatformSession(true);
    identifyUser(String(usuario.id), {
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.papel || 'super_admin',
      workspace: 'platform',
    });
    trackEvent('platform_user_logged_in', { email: usuario.email });
  };

  const aplicarSessaoImpersonada: AuthContextType['aplicarSessaoImpersonada'] = (data) => {
    // Super Admin assume a sessão de um usuário do tenant (suporte). Substitui a
    // sessão de plataforma por uma sessão de tenant impersonada.
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('auth_tipo', 'tenant');
    localStorage.setItem('workspace_nome', data.workspace?.nome_fantasia || 'Impersonação');
    localStorage.setItem('impersonacao', '1');
    setUser(data.usuario);
    setIsPlatformSession(false);
    trackEvent('platform_impersonate', { usuario: data.usuario.email });
  };

  const logout = async () => {
    try {
      await api.post('/api/v1/core/usuarios/logout');
    } catch {
      // ignore
    }
    trackEvent('user_logged_out');
    resetAnalytics();
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_tipo');
    localStorage.removeItem('workspace_nome');
    localStorage.removeItem('impersonacao');
    setUser(null);
    setIsPlatformSession(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginSuperAdmin,
        aplicarSessaoImpersonada,
        logout,
        isAuthenticated: !!user,
        isPlatformSession,
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
