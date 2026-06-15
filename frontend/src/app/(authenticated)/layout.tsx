'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { trackEvent } from '@/lib/analytics';
import { useDesktopToMobileRedirect } from '@/hooks/use-device-redirect';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { ToastProvider } from '@/contexts/toast-context';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';

function ImpersonationBanner() {
  const { isImpersonating, encerrarImpersonacao, user } = useAuth();
  if (!isImpersonating) return null;
  return (
    <div className="flex items-center justify-between gap-3 bg-purple-700 px-4 py-2 text-sm text-white">
      <span className="font-medium">
        Você está impersonando {user?.email ? <b>{user.email}</b> : 'um usuário'} — toda ação é auditada.
      </span>
      <button
        onClick={() => { if (encerrarImpersonacao()) window.location.href = '/admin'; }}
        className="rounded bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25 transition-colors"
      >
        Voltar ao Super Admin
      </button>
    </div>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();

  if (pathname === '/modulos') {
    return (
      <div className="min-h-screen bg-steel-50">
        <ImpersonationBanner />
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <div
        className="flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out"
        style={{ paddingLeft: collapsed ? 72 : 260 }}
      >
        <ImpersonationBanner />
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-steel-50 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useDesktopToMobileRedirect();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && pathname) {
      const page = pathname.split('/').filter(Boolean)[0] ?? 'home';
      trackEvent('page_viewed', { page, path: pathname });
    }
  }, [pathname, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-steel-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-steel-200 border-t-accent-500" />
          <p className="text-sm font-medium text-steel-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ToastProvider>
      <SidebarProvider>
        <LayoutContent>{children}</LayoutContent>
      </SidebarProvider>
    </ToastProvider>
  );
}
