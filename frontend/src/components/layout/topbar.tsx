'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/pipeline': 'Pipeline',
  '/negocios': 'Negocios',
  '/projetos': 'Projetos',
  '/empresas': 'Empresas',
  '/usuarios': 'Usuarios',
  '/perfil': 'Meu Perfil',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path)) return title;
  }
  return 'Dashboard';
}

export default function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const title = getPageTitle(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-6">
      <h1 className="text-base font-semibold text-brand-900">{title}</h1>

      <Link href="/perfil" className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-steel-50">
        <span className="hidden text-sm font-medium text-steel-600 md:block">
          {user?.nome || ''}
        </span>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-brand-900 text-xs font-bold text-white">
            {user ? getInitials(user.nome) : '??'}
          </AvatarFallback>
        </Avatar>
      </Link>
    </header>
  );
}
