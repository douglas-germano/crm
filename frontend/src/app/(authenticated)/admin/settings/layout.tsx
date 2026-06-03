'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings2, GitBranch, ShieldCheck, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsNav = [
  {
    href: '/admin/settings',
    label: 'Geral',
    icon: Settings2,
    description: 'Segurança e operações da plataforma',
  },
  {
    href: '/admin/settings/pipelines',
    label: 'Pipelines',
    icon: GitBranch,
    description: 'Funis e estágios do CRM',
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-display font-bold tracking-tight text-white flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-brand-500 shrink-0" />
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie as configurações da plataforma e do CRM.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar nav */}
        <aside className="md:w-52 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1">
            {settingsNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-brand-500/10 text-white border border-brand-500/20'
                      : 'text-steel-400 hover:bg-white/5 hover:text-white border border-transparent'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-brand-500' : 'text-steel-500'
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
