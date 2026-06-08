'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import BottomNav from '@/components/mobile/bottom-nav';
import { useMobileToDesktopRedirect } from '@/hooks/use-device-redirect';

const TITLES: Record<string, string> = {
  '/m/dashboard': 'Dashboard',
  '/m/leads': 'Leads',
  '/m/inspecoes': 'Inspeções',
  '/m/inspecoes/campo': 'Inspeção de Campo',
  '/m/projetos': 'Projetos',
  '/m/negocios': 'Negócios',
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useMobileToDesktopRedirect();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-steel-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-steel-200 border-t-brand-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const initials = user?.nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') ?? '?';

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-steel-50">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-steel-200 bg-white px-4">
        <span className="text-base font-semibold text-brand-900">
          {TITLES[pathname] ?? 'Apex CRM'}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
          {initials}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
