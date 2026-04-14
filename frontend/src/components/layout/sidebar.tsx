'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Briefcase,
  Building2,
  UserCog,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  ShieldAlert,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useSidebar } from '@/contexts/sidebar-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { href: '/negocios', label: 'Negocios', icon: Briefcase },
  { href: '/projetos', label: 'Projetos', icon: FolderKanban },
  { href: '/empresas', label: 'Empresas', icon: Building2 },
  { href: '/usuarios', label: 'Usuarios', icon: UserCog },
];

const adminNavLinks = [
  { href: '/admin', label: 'Matrix (Tenants)', icon: LayoutDashboard },
  { href: '/admin/settings', label: 'Configurações SaaS', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ws = localStorage.getItem('workspace_nome');
      if (ws === 'engetch') setIsSuperAdmin(true);
    }
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/admin') return pathname === href;
    return pathname.startsWith(href);
  };

  const isAdminPanel = pathname.startsWith('/admin');
  const renderLinks = isAdminPanel ? adminNavLinks : navLinks;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col bg-brand-900 transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center border-b border-white/10 px-3">
        <div className={cn(
          'flex items-center overflow-hidden transition-all duration-300',
          collapsed ? 'w-0 opacity-0' : 'w-full opacity-100 px-3'
        )}>
          <span className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap">
            ENGETCH
          </span>
          <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.2em] text-steel-400 whitespace-nowrap">
            CRM
          </span>
        </div>

        {/* Toggle button */}
        <Button
          variant="ghost"
          onClick={toggle}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md p-0',
            'text-steel-400 hover:bg-white/10 hover:text-white transition-colors',
            collapsed ? 'mx-auto' : 'ml-auto'
          )}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {renderLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);

          return (
            <Button
              key={link.href}
              variant="ghost"
              asChild
              className={cn(
                'w-full rounded-md py-2.5 text-sm font-medium transition-all duration-200',
                collapsed
                  ? 'justify-center px-0'
                  : 'justify-start gap-3 px-3 border-l-[3px]',
                'hover:bg-white/5',
                active
                  ? collapsed
                    ? 'bg-accent-500/10 text-white hover:bg-accent-500/15 hover:text-white'
                    : 'border-accent-500 bg-accent-500/10 text-white hover:bg-accent-500/15 hover:text-white'
                  : collapsed
                    ? 'text-steel-300 hover:text-white'
                    : 'border-transparent text-steel-300 hover:text-white'
              )}
              title={collapsed ? link.label : undefined}
            >
              <Link href={link.href}>
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0',
                    active ? 'text-accent-500' : 'text-steel-400'
                  )}
                />
                <span
                  className={cn(
                    'overflow-hidden whitespace-nowrap transition-all duration-300',
                    collapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100'
                  )}
                >
                  {link.label}
                </span>
              </Link>
            </Button>
          );
        })}

        {isSuperAdmin && !isAdminPanel && (
          <div className="pt-6 mt-4 border-t border-white/10">
            <Button
              variant="ghost"
              asChild
              className={cn(
                'w-full rounded-md py-2.5 text-sm font-medium transition-all duration-200',
                collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3 border-l-[3px]',
                'hover:bg-brand-500/20 text-brand-300',
                'border-transparent'
              )}
            >
              <Link href="/admin">
                <ShieldAlert className={cn('h-4 w-4 shrink-0')} />
                {!collapsed && <span>Painel Super Admin</span>}
              </Link>
            </Button>
          </div>
        )}

        {isSuperAdmin && isAdminPanel && (
          <div className="pt-6 mt-4 border-t border-white/10">
            <Button
              variant="ghost"
              asChild
              className={cn(
                'w-full rounded-md py-2.5 text-sm font-medium transition-all duration-200',
                collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3 border-l-[3px]',
                'hover:bg-white/10 text-steel-300',
                'border-transparent'
              )}
            >
              <Link href="/dashboard">
                <ArrowLeft className={cn('h-4 w-4 shrink-0')} />
                {!collapsed && <span>Voltar ao CRM Global</span>}
              </Link>
            </Button>
          </div>
        )}
      </nav>

      {/* Logout */}
      <Separator className="mx-2 bg-white/10" />
      <div className="px-2 py-4">
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            'w-full text-steel-400 hover:text-red-400 hover:bg-white/5 transition-all duration-200',
            collapsed ? 'justify-center px-0' : 'justify-start gap-3'
          )}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span
            className={cn(
              'text-sm overflow-hidden whitespace-nowrap transition-all duration-300',
              collapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100'
            )}
          >
            Sair
          </span>
        </Button>
      </div>
    </aside>
  );
}
