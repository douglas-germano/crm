'use client';

import useSWR from 'swr';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { DashboardStats } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, Briefcase, Wallet, TrendingUp,
  Grid2X2, Loader2,
} from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const SHORTCUTS = [
  { href: '/m/crm/leads', label: 'Leads', icon: Users, bg: 'bg-brand-500/10', fg: 'text-brand-600' },
  { href: '/m/crm/negocios', label: 'Negócios', icon: Briefcase, bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  { href: '/m/modulos', label: 'Módulos', icon: Grid2X2, bg: 'bg-amber-50', fg: 'text-amber-700' },
] as const;

export default function MobileDashboardPage() {
  const { data: stats, isLoading } = useSWR<DashboardStats>('/api/v1/crm/dashboard/stats', fetcher);

  return (
    <div className="space-y-6 p-4">
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel-400">Resumo</h2>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-brand-500" size={28} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total Leads"
              value={stats?.total_leads ?? 0}
              icon={<Users size={18} className="text-brand-500" />}
              bg="bg-brand-500/10"
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
              icon={<Wallet size={18} className="text-brand-700" />}
              bg="bg-steel-100"
              small
            />
            <StatCard
              label="Conversão"
              value={`${(stats?.taxa_conversao ?? 0).toFixed(1)}%`}
              icon={<TrendingUp size={18} className="text-emerald-500" />}
              bg="bg-emerald-50"
            />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel-400">Acesso Rápido</h2>
        <div className="grid grid-cols-2 gap-3">
          {SHORTCUTS.map(({ href, label, icon: Icon, bg, fg }) => (
            <Link
              key={href}
              href={href}
              className="block transition-transform active:scale-95"
            >
              <Card className="bg-white">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${fg}`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-sm font-medium text-steel-900">{label}</span>
                </CardContent>
              </Card>
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
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
        <p className={`font-bold leading-none text-steel-950 ${small ? 'text-base' : 'text-2xl'}`}>{value}</p>
        <p className="mt-1 text-xs text-steel-400">{label}</p>
      </CardContent>
    </Card>
  );
}
