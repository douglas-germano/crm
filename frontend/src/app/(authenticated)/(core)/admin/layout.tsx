'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isPlatformSession, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [forcar2fa, setForcar2fa] = useState(false);

  useEffect(() => {
    // Guard: somente sessões de plataforma (Super Admin) acessam o painel global.
    if (!loading && !isPlatformSession) {
      router.replace('/dashboard');
    }
  }, [loading, isPlatformSession, router]);

  useEffect(() => {
    // Política global: se 2FA é obrigatório e o operador ainda não configurou,
    // força a ida para a página de Segurança antes de operar.
    if (!isPlatformSession) return;
    api.get('/api/v1/core/super-admin/config')
      .then(r => setForcar2fa(!!r.data.config?.forcar_2fa))
      .catch(() => setForcar2fa(false));
  }, [isPlatformSession]);

  const precisaConfigurar2fa = !!(forcar2fa && user && !user.mfa_habilitado);

  useEffect(() => {
    if (precisaConfigurar2fa && pathname !== '/admin/seguranca') {
      router.replace('/admin/seguranca');
    }
  }, [precisaConfigurar2fa, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-steel-200 border-t-accent-500" />
      </div>
    );
  }

  if (!isPlatformSession) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Banner de contexto — deixa explícito que o operador está no modo plataforma */}
      <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-amber-900">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm font-medium">
          Modo plataforma (Super Admin){user?.email ? ` — ${user.email}` : ''}. Ações aqui afetam todos os workspaces e são auditadas.
        </p>
      </div>
      {precisaConfigurar2fa && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800">
          A política da plataforma exige 2FA. Configure abaixo para liberar o restante do painel.
        </div>
      )}
      {children}
    </div>
  );
}
