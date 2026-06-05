'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ClipboardCheck, FolderKanban, Briefcase } from 'lucide-react';

const TABS = [
  { href: '/m/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/m/leads', label: 'Leads', icon: Users },
  { href: '/m/inspecoes', label: 'Inspeções', icon: ClipboardCheck },
  { href: '/m/projetos', label: 'Projetos', icon: FolderKanban },
  { href: '/m/negocios', label: 'Negócios', icon: Briefcase },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 h-16">
      <div className="flex h-full">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 border-t-2 transition-colors ${
                active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
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
