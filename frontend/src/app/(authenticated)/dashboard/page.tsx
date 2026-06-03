'use client';

import useSWR from 'swr';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Users, Building2, Wallet, TrendingUp, ArrowRight, type LucideIcon } from 'lucide-react';
import type { DashboardStats, FunilData } from '@/types';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const COLORS = {
  brand: '#25282b',
  orange: '#e60000',
  steel: '#7e7e7e',
  green: '#22c55e',
  red: '#ac1811',
  blue: '#3860be',
};

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="skeleton h-3 w-20 rounded mb-3" />
        <div className="skeleton h-7 w-28 rounded" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="p-4 pb-2 flex-none">
        <div className="skeleton h-4 w-32 rounded" />
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 min-h-0">
        <div className="skeleton h-full w-full rounded" />
      </CardContent>
    </Card>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-900 text-white text-xs rounded px-2.5 py-1.5 shadow-lg border border-brand-700">
      <p className="font-medium mb-0.5">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-steel-200 font-mono">
          {entry.name === 'valor' ? formatCurrency(entry.value) : `${entry.value}`}
        </p>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  accentColor,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  accentColor: string;
  icon: LucideIcon;
  href?: string;
}) {
  const inner = (
    <Card className="relative overflow-hidden group hover:[box-shadow:var(--card-shadow-hover)] transition-shadow">
      <div
        className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-200 group-hover:w-1.5"
        style={{ backgroundColor: accentColor }}
      />
      <CardContent className="p-4 pl-5">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {label}
          </p>
          <div
            className="flex items-center justify-center w-7 h-7 rounded-md opacity-80"
            style={{ backgroundColor: accentColor + '18' }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
          </div>
        </div>
        <p className="text-2xl font-display font-semibold text-foreground tabular-nums">
          {value}
        </p>
        {href && (
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-0.5 group-hover:text-primary transition-colors">
            Ver detalhes <ArrowRight className="h-2.5 w-2.5" />
          </p>
        )}
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
}

export default function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = useSWR<DashboardStats>(
    '/api/dashboard/stats',
    fetcher,
  );

  const { data: funil, isLoading: loadingFunil } = useSWR<FunilData>(
    '/api/dashboard/funil',
    fetcher,
  );

  const isLoading = loadingStats || loadingFunil;

  const statusData = stats
    ? [
        { name: 'Abertos', value: stats.total_abertos, color: COLORS.blue },
        { name: 'Ganhos', value: stats.total_ganhos, color: COLORS.green },
        { name: 'Perdidos', value: stats.total_perdidos, color: COLORS.red },
      ]
    : [];

  const taxaConversao = stats?.taxa_conversao ?? 0;

  return (
    <div className="h-full flex flex-col gap-3 animate-fade-in overflow-hidden">
      {/* ---- Stat Cards ---- */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-none stagger-children">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-none stagger-children">
          <StatCard
            label="Total Leads"
            value={stats?.total_leads ?? 0}
            accentColor={COLORS.blue}
            icon={Users}
            href="/leads"
          />
          <StatCard
            label="Empresas"
            value={stats?.total_empresas ?? 0}
            accentColor={COLORS.steel}
            icon={Building2}
            href="/empresas"
          />
          <StatCard
            label="Negócios Abertos"
            value={stats ? formatCurrency(stats.valor_aberto) : 'R$ 0,00'}
            accentColor={COLORS.orange}
            icon={Wallet}
            href="/negocios"
          />
          <StatCard
            label="Receita Ganha"
            value={stats ? formatCurrency(stats.valor_ganho) : 'R$ 0,00'}
            accentColor={COLORS.green}
            icon={TrendingUp}
            href="/relatorios"
          />
        </div>
      )}

      {/* ---- Charts Row: Pipeline + Status ---- */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1 min-h-0">
          <ChartSkeleton className="lg:col-span-3" />
          <ChartSkeleton className="lg:col-span-2" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1 min-h-0">
          <Card className="lg:col-span-3 flex flex-col h-full">
            <CardHeader className="p-4 pb-3 flex-none">
              <CardTitle className="text-base font-display font-semibold text-foreground">
                Pipeline por Estágio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1 min-h-0">
              {funil?.funil?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={funil.funil}
                    margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="estagio"
                      tick={{ fontSize: 11, fill: '#8e9baa' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#8e9baa' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={32}>
                      {funil.funil.map((entry, index) => (
                        <Cell key={index} fill={entry.cor || COLORS.brand} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 flex flex-col h-full">
            <CardHeader className="p-4 pb-3 flex-none">
              <CardTitle className="text-base font-display font-semibold text-foreground">
                Status dos Negócios
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1 min-h-0 flex flex-col items-center">
              {statusData.some((d) => d.value > 0) ? (
                <>
                  <div className="flex-1 min-h-0 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius="35%"
                          outerRadius="60%"
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${value}`]}
                          contentStyle={{
                            backgroundColor: '#0c192d',
                            border: '1px solid #152a46',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                          itemStyle={{ color: '#d8dde2' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center gap-4 flex-none pb-2">
                    {statusData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="font-mono">{d.value}</span>
                        <span>{d.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---- Bottom Row: Origem dos Leads + Conversao ---- */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
          <ChartSkeleton className="lg:col-span-2" />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
          <Card className="lg:col-span-2 flex flex-col h-full">
            <CardHeader className="p-4 pb-3 flex-none">
              <CardTitle className="text-base font-display font-semibold text-foreground">
                Origem dos Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1 min-h-0">
              {stats?.leads_por_origem?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.leads_por_origem}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
                  >
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#8e9baa' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="origem"
                      type="category"
                      width={90}
                      tick={{ fontSize: 11, fill: '#8e9baa' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}`, 'Leads']}
                      contentStyle={{
                        backgroundColor: '#0c192d',
                        border: '1px solid #152a46',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      itemStyle={{ color: '#d8dde2' }}
                    />
                    <Bar
                      dataKey="total"
                      fill={COLORS.brand}
                      radius={[0, 4, 4, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
            <CardHeader className="p-4 pb-3 flex-none">
              <CardTitle className="text-base font-display font-semibold text-foreground">
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1 min-h-0 flex flex-col items-center justify-center">
              <p className="text-5xl font-display font-bold tabular-nums" style={{ color: COLORS.orange }}>
                {taxaConversao.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-2">
                taxa de conversao
              </p>
              <Separator className="my-4 w-16" />
              <div className="grid grid-cols-3 gap-4 text-center w-full">
                <div>
                  <p className="text-lg font-display font-semibold tabular-nums text-foreground">
                    {stats?.total_abertos ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Abertos
                  </p>
                </div>
                <div>
                  <p className="text-lg font-display font-semibold tabular-nums text-green-500">
                    {stats?.total_ganhos ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Ganhos
                  </p>
                </div>
                <div>
                  <p className="text-lg font-display font-semibold tabular-nums text-red-500">
                    {stats?.total_perdidos ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Perdidos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
