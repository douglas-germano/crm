'use client';

import { useState, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Building2,
  Wallet,
  TrendingUp,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FolderKanban,
  Activity,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import type { DashboardStats, FunilData } from '@/types';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

// ---- Dashboard colours ----
const COLORS = {
  brand: '#25282b',
  orange: '#e60000',
  steel: '#7e7e7e',
  green: '#22c55e',
  red: '#ac1811',
  blue: '#3860be',
};

// ---- Calendar constants ----
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface CalEvent {
  date: string; // YYYY-MM-DD
  title: string;
  type: 'atividade' | 'tarefa';
  status: string;
  href: string;
  subtitle?: string;
}

const STATUS_DOT: Record<string, string> = {
  pendente: 'bg-amber-400',
  concluida: 'bg-green-500',
  cancelada: 'bg-red-400',
  a_fazer: 'bg-blue-400',
  em_andamento: 'bg-amber-400',
  concluido: 'bg-green-500',
};

// ---- Dashboard sub-components ----

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
  // ---- Dashboard data ----
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

  // ---- Calendar state & data ----
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const { data: negociosRaw, isLoading: loadingNeg } = useSWR('/api/negocios', fetcher);
  const { data: projetosRaw, isLoading: loadingProj } = useSWR('/api/projetos', fetcher);

  const negocios: Array<{ id: number; nome: string }> = Array.isArray(negociosRaw) ? negociosRaw : [];
  const projetos: Array<{ id: number; nome: string; data_inicio?: string; data_previsao_fim?: string; data_fim?: string; status: string }> =
    Array.isArray(projetosRaw) ? projetosRaw : [];

  const negocioIds = negocios.map((n) => n.id);
  const { data: atividadesByNegocio } = useSWR(
    negocioIds.length > 0 ? ['atividades-all', ...negocioIds] : null,
    async () => {
      const results = await Promise.all(
        negocioIds.map((id) =>
          api
            .get(`/api/negocios/${id}/atividades`)
            .then((r) => ({
              negocioId: id,
              negocioNome: negocios.find((n) => n.id === id)?.nome ?? '',
              atividades: Array.isArray(r.data) ? r.data : [],
            }))
            .catch(() => ({ negocioId: id, negocioNome: '', atividades: [] }))
        )
      );
      return results;
    }
  );

  const calIsLoading = loadingNeg || loadingProj;

  const events = useMemo<CalEvent[]>(() => {
    const list: CalEvent[] = [];

    if (atividadesByNegocio) {
      for (const { negocioNome, atividades } of atividadesByNegocio) {
        for (const a of atividades) {
          if (!a.data_agendada) continue;
          const date = a.data_agendada.slice(0, 10);
          list.push({
            date,
            title: a.titulo,
            type: 'atividade',
            status: a.status,
            href: '/atividades',
            subtitle: negocioNome,
          });
        }
      }
    }

    for (const p of projetos) {
      if (p.data_previsao_fim) {
        list.push({
          date: p.data_previsao_fim,
          title: p.nome,
          type: 'tarefa',
          status: p.status,
          href: `/projetos/detalhe?id=${p.id}`,
          subtitle: 'Prazo previsto',
        });
      }
    }

    return list;
  }, [atividadesByNegocio, projetos]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const e of events) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [events]);

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const thisMonthEvents = events.filter((e) => {
    const [ey, em] = e.date.split('-').map(Number);
    return ey === year && em === month + 1;
  });

  const pendentes = thisMonthEvents.filter(
    (e) => e.status === 'pendente' || e.status === 'a_fazer' || e.status === 'em_andamento'
  ).length;
  const concluidas = thisMonthEvents.filter(
    (e) => e.status === 'concluida' || e.status === 'concluido'
  ).length;

  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-6">
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        <TabsTrigger value="calendario">Calendário</TabsTrigger>
      </TabsList>

      {/* ===== OVERVIEW TAB ===== */}
      <TabsContent value="overview">
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
      </TabsContent>

      {/* ===== CALENDÁRIO TAB ===== */}
      <TabsContent value="calendario">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Calendário</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Atividades de negócios e prazos de projetos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold min-w-[140px] text-center">
                {MONTHS[month]} {year}
              </span>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Summary */}
          {thisMonthEvents.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                <strong>{thisMonthEvents.length}</strong>
                <span className="text-muted-foreground">eventos em {MONTHS[month]}</span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-600">
                <Clock className="h-3.5 w-3.5" /> {pendentes} pendentes
              </span>
              <span className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> {concluidas} concluídas
              </span>
            </div>
          )}

          {calIsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Calendar Grid */}
              <Card className="lg:col-span-3">
                <CardContent className="p-4">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {WEEKDAYS.map((d) => (
                      <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Days */}
                  <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                    {cells.map((day, i) => {
                      if (!day) return <div key={i} className="bg-background min-h-[90px]" />;
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayEvents = eventsByDate[dateStr] ?? [];
                      const isToday = dateStr === todayStr;
                      return (
                        <div
                          key={i}
                          className={cn(
                            'bg-background min-h-[90px] p-1.5 transition-colors',
                            isToday && 'bg-primary/5'
                          )}
                        >
                          <span
                            className={cn(
                              'text-xs font-semibold flex items-center justify-center w-6 h-6 rounded-full mb-1',
                              isToday ? 'bg-primary text-white' : 'text-muted-foreground'
                            )}
                          >
                            {day}
                          </span>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map((e, idx) => (
                              <Link key={idx} href={e.href}>
                                <div className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] hover:bg-muted transition-colors cursor-pointer group">
                                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[e.status] ?? 'bg-gray-400')} />
                                  <span className="truncate font-medium group-hover:text-primary">{e.title}</span>
                                </div>
                              </Link>
                            ))}
                            {dayEvents.length > 3 && (
                              <p className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} mais</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar: upcoming events */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Próximos Eventos</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {thisMonthEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground px-4">
                        <Calendar className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-xs text-center">Sem eventos em {MONTHS[month]}</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {thisMonthEvents
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .slice(0, 8)
                          .map((e, i) => {
                            const [, , dd] = e.date.split('-');
                            const StatusIcon =
                              e.status === 'concluida' || e.status === 'concluido'
                                ? CheckCircle2
                                : e.status === 'cancelada'
                                ? XCircle
                                : Clock;
                            return (
                              <Link key={i} href={e.href}>
                                <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                                  <div className="flex flex-col items-center text-center min-w-[32px]">
                                    <span className="text-xs font-bold text-primary">{dd}</span>
                                    <span className="text-[10px] text-muted-foreground">{MONTHS[month].slice(0, 3)}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{e.title}</p>
                                    {e.subtitle && (
                                      <p className="text-[10px] text-muted-foreground truncate">{e.subtitle}</p>
                                    )}
                                    <div className="flex items-center gap-1 mt-1">
                                      {e.type === 'atividade'
                                        ? <Activity className="h-2.5 w-2.5 text-muted-foreground" />
                                        : <FolderKanban className="h-2.5 w-2.5 text-muted-foreground" />
                                      }
                                      <StatusIcon className={cn('h-2.5 w-2.5', STATUS_DOT[e.status]?.replace('bg-', 'text-') ?? 'text-gray-400')} />
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Legend */}
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Legenda</p>
                    {[
                      { label: 'Pendente / Em andamento', color: 'bg-amber-400' },
                      { label: 'Concluído', color: 'bg-green-500' },
                      { label: 'Cancelado', color: 'bg-red-400' },
                    ].map((l) => (
                      <div key={l.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', l.color)} />
                        {l.label}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
