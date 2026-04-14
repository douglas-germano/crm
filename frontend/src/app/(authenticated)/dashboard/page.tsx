'use client';

import useSWR from 'swr';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { DashboardStats, FunilData } from '@/types';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const COLORS = {
  brand: '#1e3a5f',
  orange: '#e87c1e',
  steel: '#8e9baa',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#538fd7',
};

// ---------------------------------------------------------------------------
// Skeleton helpers
// ---------------------------------------------------------------------------

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
    <Card className={className}>
      <CardHeader className="p-4 pb-2">
        <div className="skeleton h-4 w-32 rounded" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="skeleton h-56 w-full rounded" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: string | number;
  accentColor: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: accentColor }}
      />
      <CardContent className="p-4 pl-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
          {label}
        </p>
        <p className="text-2xl font-display font-semibold text-foreground tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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

  // Pie data
  const statusData = stats
    ? [
        { name: 'Abertos', value: stats.total_abertos, color: COLORS.blue },
        { name: 'Ganhos', value: stats.total_ganhos, color: COLORS.green },
        { name: 'Perdidos', value: stats.total_perdidos, color: COLORS.red },
      ]
    : [];

  const taxaConversao = stats?.taxa_conversao ?? 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ---- Header ---- */}
      <h2 className="text-xl font-display font-semibold text-foreground">Dashboard</h2>

      {/* ---- Stat Cards ---- */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Leads"
            value={stats?.total_leads ?? 0}
            accentColor={COLORS.blue}
          />
          <StatCard
            label="Empresas"
            value={stats?.total_empresas ?? 0}
            accentColor={COLORS.steel}
          />
          <StatCard
            label="Negocios Abertos"
            value={stats ? formatCurrency(stats.valor_aberto) : 'R$ 0,00'}
            accentColor={COLORS.orange}
          />
          <StatCard
            label="Receita Ganha"
            value={stats ? formatCurrency(stats.valor_ganho) : 'R$ 0,00'}
            accentColor={COLORS.green}
          />
        </div>
      )}

      {/* ---- Charts Row: Pipeline + Status ---- */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <ChartSkeleton className="lg:col-span-3" />
          <ChartSkeleton className="lg:col-span-2" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* Pipeline */}
          <Card className="lg:col-span-3">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-display font-semibold text-foreground">
                Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {funil?.funil?.length ? (
                <ResponsiveContainer width="100%" height={260}>
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
                <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="lg:col-span-2">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-display font-semibold text-foreground">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {statusData.some((d) => d.value > 0) ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
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
                  <div className="flex items-center gap-4 mt-1">
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
                </div>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---- Bottom Row: Origem dos Leads + Conversao ---- */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ChartSkeleton className="lg:col-span-2" />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Origem dos Leads */}
          <Card className="lg:col-span-2">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-display font-semibold text-foreground">
                Origem dos Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {stats?.leads_por_origem?.length ? (
                <ResponsiveContainer width="100%" height={240}>
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
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversao */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-display font-semibold text-foreground">
                Conversao
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex flex-col items-center justify-center h-[240px]">
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
