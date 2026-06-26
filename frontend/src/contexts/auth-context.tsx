'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { Usuario } from '@/types';
import { initAmplitude, identifyUser, resetAnalytics, trackEvent } from '@/lib/analytics';

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, senha: string, workspace: string) => Promise<void>;
  loginSuperAdmin: (email: string, senha: string, codigoMfa?: string) => Promise<{ mfaRequired?: boolean; mfaSetupRequired?: boolean }>;
  aplicarSessaoImpersonada: (data: { usuario: Usuario; workspace?: { nome_fantasia?: string } }) => void;
  encerrarImpersonacao: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isPlatformSession: boolean;
  isImpersonating: boolean;
}

// Chaves não sensíveis (apenas UI/roteamento; os tokens vivem em cookies httpOnly).
const SCOPE_KEY = 'auth_scope';
const WORKSPACE_KEY = 'workspace_nome';

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isPlatformSession, setIsPlatformSession] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [loading, setLoading] = useState(true);

  const limparEstado = () => {
    localStorage.removeItem(SCOPE_KEY);
    localStorage.removeItem(WORKSPACE_KEY);
    setUser(null);
    setIsPlatformSession(false);
    setIsImpersonating(false);
  };

  const loadUser = useCallback(async () => {
    try {
      // O cookie httpOnly é enviado automaticamente; se não houver sessão, 401.
      const { data } = await api.get('/api/v1/core/auth/me');
      const u: Usuario = data.usuario;
      const platform = data.scope === 'platform';
      setUser(u);
      setIsPlatformSession(platform);
      setIsImpersonating(!!data.impersonacao);
      localStorage.setItem(SCOPE_KEY, platform ? 'platform' : 'tenant');
      if (data.workspace?.nome_fantasia) localStorage.setItem(WORKSPACE_KEY, data.workspace.nome_fantasia);
      identifyUser(String(u.id), {
        nome: u.nome,
        email: u.email,
        perfil: platform ? (u.papel || 'super_admin') : (u.perfil_id ? String(u.perfil_id) : ''),
        workspace: platform ? 'platform' : (localStorage.getItem(WORKSPACE_KEY) ?? ''),
      });
    } catch {
      limparEstado();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAmplitude();
    loadUser();
  }, [loadUser]);

  const login = async (email: string, senha: string, workspace: string) => {
    const { data } = await api.post('/api/v1/core/usuarios/login', { email, senha, workspace });
    const workspaceNome = data.workspace?.nome_fantasia || workspace;
    localStorage.setItem(SCOPE_KEY, 'tenant');
    localStorage.setItem(WORKSPACE_KEY, workspaceNome);
    setUser(data.usuario);
    setIsPlatformSession(false);
    setIsImpersonating(false);
    identifyUser(String(data.usuario.id), {
      nome: data.usuario.nome,
      email: data.usuario.email,
      perfil: data.usuario.perfil_id ? String(data.usuario.perfil_id) : '',
      workspace: workspaceNome,
    });
    trackEvent('user_logged_in', { workspace: workspaceNome });
  };

  const loginSuperAdmin: AuthContextType['loginSuperAdmin'] = async (email, senha, codigoMfa) => {
    const { data } = await api.post('/api/v1/core/super-admin/login', { email, senha, codigo_mfa: codigoMfa });
    if (data.mfa_requerido) {
      return { mfaRequired: true };
    }
    localStorage.setItem(SCOPE_KEY, 'platform');
    localStorage.setItem(WORKSPACE_KEY, 'Super Admin');
    setUser(data.usuario);
    setIsPlatformSession(true);
    setIsImpersonating(false);
    identifyUser(String(data.usuario.id), {
      nome: data.usuario.nome,
      email: data.usuario.email,
      perfil: data.usuario.papel || 'super_admin',
      workspace: 'platform',
    });
    trackEvent('platform_user_logged_in', { email: data.usuario.email });
    return { mfaSetupRequired: !!data.mfa_setup_requerido };
  };

  const aplicarSessaoImpersonada: AuthContextType['aplicarSessaoImpersonada'] = (data) => {
    // O backend já trocou os cookies (sessão de plataforma → tenant impersonado).
    localStorage.setItem(SCOPE_KEY, 'tenant');
    localStorage.setItem(WORKSPACE_KEY, data.workspace?.nome_fantasia || 'Impersonação');
    setUser(data.usuario);
    setIsPlatformSession(false);
    setIsImpersonating(true);
    trackEvent('platform_impersonate', { usuario: data.usuario.email });
  };

  const logout = async () => {
    try {
      await api.post('/api/v1/core/auth/logout');
    } catch {
      // ignore
    }
    trackEvent('user_logged_out');
    resetAnalytics();
    limparEstado();
  };

  const encerrarImpersonacao = async () => {
    // Modelo de cookie: a sessão de plataforma foi sobrescrita ao impersonar.
    // "Voltar" = encerrar e reautenticar como Super Admin.
    await logout();
    if (typeof window !== 'undefined') window.location.href = '/super-admin/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginSuperAdmin,
        aplicarSessaoImpersonada,
        encerrarImpersonacao,
        logout,
        isAuthenticated: !!user,
        isPlatformSession,
        isImpersonating,
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
