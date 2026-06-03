'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { ToastProvider } from '@/contexts/toast-context';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <div
        className="flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out"
        style={{ paddingLeft: collapsed ? 72 : 260 }}
      >
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

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

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
