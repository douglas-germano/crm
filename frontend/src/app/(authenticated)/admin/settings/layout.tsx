'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings2, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsNav = [
  { href: '/admin/settings', label: 'Geral', icon: Settings2 },
  { href: '/admin/settings/pipelines', label: 'Pipelines', icon: GitBranch },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie as configurações da plataforma e do CRM.
        </p>
      </div>

      <div className="flex items-center border-b">
        {settingsNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
