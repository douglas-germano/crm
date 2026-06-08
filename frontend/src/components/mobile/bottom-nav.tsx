'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  FolderKanban,
  Grid2X2,
  LayoutDashboard,
  Users,
} from 'lucide-react';

const CRM_TABS = [
  { href: '/m/crm/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/m/crm/leads', label: 'Leads', icon: Users },
  { href: '/m/crm/negocios', label: 'Negócios', icon: Briefcase },
  { href: '/m/modulos', label: 'Módulos', icon: Grid2X2 },
] as const;

const INSPECT_TABS = [
  { href: '/m/inspect/ordens', label: 'Ordens', icon: ClipboardList },
  { href: '/m/inspect/inspecoes', label: 'Inspeções', icon: ClipboardCheck },
  { href: '/m/inspect/projetos', label: 'Projetos', icon: FolderKanban },
  { href: '/m/inspect/ativos', label: 'Ativos', icon: Box },
  { href: '/m/modulos', label: 'Módulos', icon: Grid2X2 },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const isModuleSelector = pathname === '/m/modulos' || pathname === '/m';
  const tabs = pathname.startsWith('/m/inspect') ? INSPECT_TABS : CRM_TABS;

  if (isModuleSelector) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-steel-200 bg-white">
      <div className="flex h-full">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 transition-colors ${
                active ? 'border-brand-500 text-brand-500' : 'border-transparent text-steel-400'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
