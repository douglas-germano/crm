'use client';

import useSWR from 'swr';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp, TrendingDown, Users, Briefcase, FolderKanban,
  Target, ArrowRight, Loader2,
} from 'lucide-react';
import type { DashboardStats, FunilData } from '@/types';

const fetcher = (url: string) => api.get(url).then(r => r.data);

const COLORS = ['#3860be', '#22c55e', '#ac1811', '#e60000', '#7e7e7e', '#f59e0b'];

function KPICard({
  label, value, sub, trend, color = '#3860be',
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">{label}</p>
        <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
        {sub && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name?: string; color?: string }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold mb-1 text-foreground">{label}</p>}
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color }} className="font-mono">
          {e.name === 'valor' ? formatCurrency(e.value) : `${e.value}`}
        </p>
      ))}
    </div>
  );
}

export default function RelatoriosPage() {
  const { data: stats, isLoading: loadingStats } = useSWR<DashboardStats>('/api/dashboard/stats', fetcher);
  const { data: funil, isLoading: loadingFunil } = useSWR<FunilData>('/api/dashboard/funil', fetcher);
  const { data: projStats, isLoading: loadingProj } = useSWR('/api/projetos/estatisticas', fetcher);
  const { data: negStats, isLoading: loadingNeg } = useSWR('/api/negocios/estatisticas', fetcher);

  const isLoading = loadingStats || loadingFunil || loadingProj || loadingNeg;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusPieData = stats ? [
    { name: 'Abertos', value: stats.total_abertos, color: '#3860be' },
    { name: 'Ganhos', value: stats.total_ganhos, color: '#22c55e' },
    { name: 'Perdidos', value: stats.total_perdidos, color: '#ac1811' },
  ] : [];

  const leadsByOrigin: Array<{ origem: string; total: number }> = stats?.leads_por_origem ?? [];

  const taxaConversao = stats?.taxa_conversao ?? 0;
  const ticketMedio = stats && stats.total_ganhos > 0
    ? stats.valor_ganho / stats.total_ganhos
    : 0;

  const projPorStatus: Array<{ status: string; total: number }> = projStats
    ? Object.entries(projStats.por_status ?? {}).map(([status, total]) => ({
        status: status.replace('_', ' '),
        total: total as number,
      }))
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Relatórios</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visão consolidada de performance comercial e operacional
        </p>
      </div>

      {/* ── Seção: Negócios ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Performance Comercial
          </h3>
          <Link href="/negocios" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
            Ver negócios <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Receita Ganha"
            value={formatCurrency(stats?.valor_ganho ?? 0)}
            color="#22c55e"
            trend="up"
          />
          <KPICard
            label="Negócios Abertos"
            value={formatCurrency(stats?.valor_aberto ?? 0)}
            color="#3860be"
          />
          <KPICard
            label="Taxa de Conversão"
            value={`${taxaConversao.toFixed(1)}%`}
            sub={`${stats?.total_ganhos ?? 0} de ${stats?.total_negocios ?? 0} negócios`}
            color={taxaConversao >= 30 ? '#22c55e' : '#e60000'}
            trend={taxaConversao >= 30 ? 'up' : 'down'}
          />
          <KPICard
            label="Ticket Médio (Ganhos)"
            value={formatCurrency(ticketMedio)}
            color="#7e7e7e"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Funil por estágio */}
          {funil?.funil?.length ? (
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Pipeline por Estágio</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={funil.funil} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <XAxis dataKey="estagio" tick={{ fontSize: 11, fill: '#8e9baa' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8e9baa' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={28}>
                      {funil.funil.map((e, i) => (
                        <Cell key={i} fill={e.cor || COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : null}

          {/* Status pie */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Status dos Negócios</CardTitle>
            </CardHeader>
            <CardContent>
              {statusPieData.some(d => d.value > 0) ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                        paddingAngle={2} dataKey="value" stroke="none">
                        {statusPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={v => [`${v}`]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 justify-center mt-2">
                    {statusPieData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="font-mono font-medium">{d.value}</span>
                        <span>{d.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* ── Seção: Leads ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Captação de Leads
          </h3>
          <Link href="/leads" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
            Ver leads <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KPICard label="Total de Leads" value={stats?.total_leads ?? 0} color="#3860be" />
          <KPICard label="Total de Empresas" value={stats?.total_empresas ?? 0} color="#7e7e7e" />
          <KPICard
            label="Leads Convertidos"
            value={stats ? `${((stats.total_ganhos / Math.max(stats.total_leads, 1)) * 100).toFixed(1)}%` : '—'}
            sub="ganhos / total leads"
            color="#22c55e"
          />
        </div>

        {leadsByOrigin.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Leads por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leadsByOrigin} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#8e9baa' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="origem" type="category" width={90} tick={{ fontSize: 11, fill: '#8e9baa' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" fill="#3860be" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Seção: Projetos ── */}
      {projStats && (
        <>
          <Separator />
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                Projetos
              </h3>
              <Link href="/projetos" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                Ver projetos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Total de Projetos" value={projStats.total ?? 0} color="#3860be" />
              <KPICard
                label="Em Andamento"
                value={projStats.por_status?.em_andamento ?? 0}
                color="#f59e0b"
                trend="neutral"
              />
              <KPICard
                label="Concluídos"
                value={projStats.por_status?.concluido ?? 0}
                color="#22c55e"
                trend="up"
              />
              <KPICard
                label="Atrasados"
                value={projStats.atrasados ?? 0}
                color="#ac1811"
                trend={projStats.atrasados > 0 ? 'down' : 'neutral'}
              />
            </div>

            {projPorStatus.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Projetos por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={projPorStatus} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                      <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#8e9baa' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8e9baa' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={28}>
                        {projPorStatus.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </section>
        </>
      )}

      {/* ── Seção: Metas ── */}
      <Separator />
      <section className="space-y-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Resumo Geral
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">Pipeline Total</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(stats?.valor_total ?? 0)}</p>
              <div className="mt-4 space-y-2">
                {[
                  { label: 'Aberto', value: stats?.valor_aberto ?? 0, color: '#3860be' },
                  { label: 'Ganho', value: stats?.valor_ganho ?? 0, color: '#22c55e' },
                  { label: 'Perdido', value: stats?.valor_perdido ?? 0, color: '#ac1811' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="font-mono font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
                Indicadores de Eficiência
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Taxa de Conversão', value: `${taxaConversao.toFixed(1)}%`, good: taxaConversao >= 30 },
                  { label: 'Ticket Médio', value: formatCurrency(ticketMedio), good: ticketMedio > 0 },
                  { label: 'Leads vs Ganhos', value: `${stats?.total_ganhos ?? 0} / ${stats?.total_leads ?? 0}`, good: true },
                  { label: 'Negócios Perdidos', value: stats?.total_perdidos ?? 0, good: (stats?.total_perdidos ?? 0) === 0 },
                ].map(item => (
                  <div key={item.label} className="flex items-start justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-bold tabular-nums mt-0.5">{item.value}</p>
                    </div>
                    <Badge variant="outline" className={item.good ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                      {item.good ? 'OK' : 'Atenção'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
