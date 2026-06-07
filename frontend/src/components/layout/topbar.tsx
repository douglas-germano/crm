'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useEffect, useState } from 'react';

const pageTitles: Record<string, string> = {
  '/modulos': 'Selecionar Módulo',
  '/dashboard': 'Dashboard',
  '/leads':     'Leads',
  '/pipeline':  'Pipeline',
  '/negocios':  'Negócios',
  '/projetos':  'Projetos',
  '/empresas':  'Empresas',
  '/usuarios':  'Usuários',
  '/perfil':    'Meu Perfil',
  '/inspect/ordens': 'Apex Inspect',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path)) return title;
  }
  return 'Dashboard';
}

/** Gera uma cor de gradiente consistente baseada no nome do usuário */
function nameToGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 55%, 42%), hsl(${h2}, 65%, 52%))`;
}

export default function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWorkspace(localStorage.getItem('workspace_nome'));
    }
  }, []);

  const title = getPageTitle(pathname);
  const avatarGradient = user?.nome ? nameToGradient(user.nome) : undefined;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-6">
      {/* Título da página */}
      <h1 className="text-base font-semibold text-brand-900">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Badge do workspace ativo */}
        {workspace && (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-steel-200 bg-steel-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-steel-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            {workspace}
          </span>
        )}

        {/* Link de perfil com avatar */}
        <Link
          href="/perfil"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-steel-50"
        >
          <span className="hidden text-sm font-medium text-steel-600 md:block">
            {user?.nome || ''}
          </span>
          <Avatar className="h-8 w-8">
            <AvatarFallback
              className="text-xs font-bold text-white"
              style={{ background: avatarGradient ?? 'hsl(213, 53%, 24%)' }}
            >
              {user ? getInitials(user.nome) : '??'}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
