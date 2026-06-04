'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Briefcase,
  Building2,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  ShieldAlert,
  Settings,
  ArrowLeft,
  ClipboardCheck,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useSidebar } from '@/contexts/sidebar-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ---------------------------------------------------------------------------
// Nav sections (agrupadas semanticamente)
// ---------------------------------------------------------------------------

const navSections = [
  {
    label: 'Vendas',
    links: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/leads',     label: 'Leads',     icon: Users           },
      { href: '/pipeline',  label: 'Pipeline',  icon: GitBranch       },
      { href: '/negocios',  label: 'Negócios',  icon: Briefcase       },
    ],
  },
  {
    label: 'Relacionamento',
    links: [
      { href: '/projetos',   label: 'Projetos',   icon: FolderKanban },
      { href: '/empresas',   label: 'Empresas',   icon: Building2    },
      { href: '/calendario', label: 'Calendário', icon: Calendar     },
    ],
  },
  {
    label: 'Inspeções',
    links: [
      { href: '/contratos-amc',  label: 'Contratos AMC',     icon: ShieldCheck    },
      { href: '/portal-cliente', label: 'Portal do Cliente', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Configuração',
    links: [
      { href: '/perfil', label: 'Configurações', icon: Settings },
    ],
  },
];

const adminNavLinks = [
  { href: '/admin',          label: 'Matrix (Tenants)',   icon: LayoutDashboard },
  { href: '/admin/settings', label: 'Configurações SaaS', icon: Settings        },
];

// ---------------------------------------------------------------------------
// NavLink component (with tooltip when collapsed)
// ---------------------------------------------------------------------------

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
}) {
  const btn = (
    <Button
      variant="ghost"
      asChild
      className={cn(
        'w-full rounded-md py-2.5 text-sm font-medium transition-all duration-200',
        collapsed
          ? 'justify-center px-0'
          : 'justify-start gap-3 px-3 border-l-[3px]',
        active
          ? collapsed
            ? 'bg-[#e60000] text-white hover:bg-[#cc0000] hover:text-white'
            : 'border-[#e60000] bg-[#e60000] text-white hover:bg-[#cc0000] hover:text-white'
          : collapsed
            ? 'text-steel-300 hover:bg-white/8 hover:text-white'
            : 'border-transparent text-steel-300 hover:bg-white/8 hover:text-white'
      )}
    >
      <Link href={href}>
        <Icon
          className={cn(
            'h-[18px] w-[18px] shrink-0 transition-colors',
            active ? 'text-white' : 'text-steel-400'
          )}
        />
        <span
          className={cn(
            'overflow-hidden whitespace-nowrap transition-all duration-300',
            collapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100'
          )}
        >
          {label}
        </span>
      </Link>
    </Button>
  );

  if (!collapsed) return btn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ws = localStorage.getItem('workspace_nome');
      if (ws === 'apex') setIsSuperAdmin(true);
    }
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/admin' || href === '/perfil') return pathname === href;
    return pathname.startsWith(href);
  };

  const isAdminPanel = isSuperAdmin && pathname === '/admin';

  const logoutBtn = (
    <Button
      variant="ghost"
      onClick={logout}
      className={cn(
        'w-full text-steel-400 hover:text-red-400 hover:bg-white/5 transition-all duration-200',
        collapsed ? 'justify-center px-0' : 'justify-start gap-3'
      )}
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
  );

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col bg-brand-900 transition-all duration-300 ease-in-out',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        {/* ---- Brand ---- */}
        <div className="flex h-14 items-center border-b border-white/10 px-3">
          {/* Logo / ícone colapsado */}
          <div
            className={cn(
              'flex items-center justify-center transition-all duration-300 shrink-0',
              collapsed ? 'w-8 mx-auto' : 'w-0 overflow-hidden opacity-0 pointer-events-none'
            )}
          >
            <div className="w-7 h-7 rounded-lg bg-apex-orange flex items-center justify-center">
              <span className="text-white font-display font-bold text-xs leading-none">A</span>
            </div>
          </div>

          {/* Wordmark expandido */}
          <div
            className={cn(
              'flex items-center overflow-hidden transition-all duration-300',
              collapsed ? 'w-0 opacity-0' : 'w-full opacity-100 px-1'
            )}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-apex-orange flex items-center justify-center shrink-0">
                <span className="text-white font-display font-bold text-xs leading-none">A</span>
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap">
                APEX
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-steel-400 whitespace-nowrap">
                CRM
              </span>
            </div>
          </div>

          {/* Toggle button */}
          <Button
            variant="ghost"
            onClick={toggle}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md p-0',
              'text-steel-400 hover:bg-white/10 hover:text-white transition-colors',
              collapsed ? 'hidden' : 'ml-auto'
            )}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Toggle flutuante quando colapsado */}
        {collapsed && (
          <button
            onClick={toggle}
            className="absolute -right-3 top-[52px] z-50 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-brand-800 text-steel-300 shadow hover:text-white transition-colors"
          >
            <ChevronsRight className="h-3 w-3" />
          </button>
        )}

        {/* ---- Navigation ---- */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
          {isAdminPanel ? (
            <div className="space-y-0.5">
              {adminNavLinks.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  active={isActive(link.href)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ) : (
            navSections.map((section) => (
              <div key={section.label}>
                {/* Label de seção — só visível expandido */}
                <p
                  className={cn(
                    'px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-steel-500 transition-all duration-300',
                    collapsed ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100 h-auto'
                  )}
                >
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.links.map((link) => (
                    <NavLink
                      key={link.href}
                      href={link.href}
                      label={link.label}
                      icon={link.icon}
                      active={isActive(link.href)}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Super Admin transition links */}
          {isSuperAdmin && !isAdminPanel && (
            <div className="pt-2 border-t border-white/10">
              <NavLink
                href="/admin"
                label="Painel Super Admin"
                icon={ShieldAlert}
                active={false}
                collapsed={collapsed}
              />
            </div>
          )}
          {isSuperAdmin && isAdminPanel && (
            <div className="pt-2 border-t border-white/10">
              <NavLink
                href="/dashboard"
                label="Voltar ao CRM Global"
                icon={ArrowLeft}
                active={false}
                collapsed={collapsed}
              />
            </div>
          )}
        </nav>

        {/* ---- Logout ---- */}
        <Separator className="mx-2 bg-white/10" />
        <div className="px-2 py-4">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>{logoutBtn}</TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-medium">
                Sair
              </TooltipContent>
            </Tooltip>
          ) : (
            logoutBtn
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
