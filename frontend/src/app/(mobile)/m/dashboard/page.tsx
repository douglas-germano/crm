'use client';

import useSWR from 'swr';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { DashboardStats } from '@/types';
import {
  Users, Briefcase, Wallet, TrendingUp,
  ClipboardCheck, FolderKanban, Loader2,
} from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const SHORTCUTS = [
  { href: '/m/leads', label: 'Leads', icon: Users, bg: 'bg-blue-50', fg: 'text-blue-600' },
  { href: '/m/negocios', label: 'Negócios', icon: Briefcase, bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  { href: '/m/inspecoes', label: 'Inspeções', icon: ClipboardCheck, bg: 'bg-orange-50', fg: 'text-orange-600' },
  { href: '/m/projetos', label: 'Projetos', icon: FolderKanban, bg: 'bg-purple-50', fg: 'text-purple-600' },
] as const;

export default function MobileDashboardPage() {
  const { data: stats, isLoading } = useSWR<DashboardStats>('/api/v1/crm/dashboard/stats', fetcher);

  return (
    <div className="p-4 space-y-6">
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Resumo</h2>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-gray-300" size={28} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total Leads"
              value={stats?.total_leads ?? 0}
              icon={<Users size={18} className="text-blue-500" />}
              bg="bg-blue-50"
            />
            <StatCard
              label="Neg. Abertos"
              value={stats?.total_abertos ?? 0}
              icon={<Briefcase size={18} className="text-emerald-500" />}
              bg="bg-emerald-50"
            />
            <StatCard
              label="Valor Aberto"
              value={formatCurrency(stats?.valor_aberto ?? 0)}
              icon={<Wallet size={18} className="text-indigo-500" />}
              bg="bg-indigo-50"
              small
            />
            <StatCard
              label="Conversão"
              value={`${(stats?.taxa_conversao ?? 0).toFixed(1)}%`}
              icon={<TrendingUp size={18} className="text-green-500" />}
              bg="bg-green-50"
            />
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 gap-3">
          {SHORTCUTS.map(({ href, label, icon: Icon, bg, fg }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-transform"
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg} ${fg}`}>
                <Icon size={20} />
              </div>
              <span className="text-sm font-medium text-gray-800">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label, value, icon, bg, small = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bg: string;
  small?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${bg} mb-3`}>{icon}</div>
      <p className={`font-bold text-gray-900 leading-none ${small ? 'text-base' : 'text-2xl'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
