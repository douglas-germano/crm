'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isPlatformSession, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Guard: somente sessões de plataforma (Super Admin) acessam o painel global.
    if (!loading && !isPlatformSession) {
      router.replace('/dashboard');
    }
  }, [loading, isPlatformSession, router]);

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
      {children}
    </div>
  );
}
