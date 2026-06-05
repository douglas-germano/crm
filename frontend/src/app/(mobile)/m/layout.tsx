'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import BottomNav from '@/components/mobile/bottom-nav';

const TITLES: Record<string, string> = {
  '/m/dashboard': 'Dashboard',
  '/m/leads': 'Leads',
  '/m/inspecoes': 'Inspeções',
  '/m/projetos': 'Projetos',
  '/m/negocios': 'Negócios',
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
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
    <div className="flex flex-col h-[100dvh] bg-gray-50 overflow-hidden">
      <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200 shrink-0">
        <span className="text-base font-semibold text-gray-900">
          {TITLES[pathname] ?? 'Apex CRM'}
        </span>
        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
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
