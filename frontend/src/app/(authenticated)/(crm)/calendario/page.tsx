'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2, XCircle,
  FolderKanban, Activity, Loader2,
} from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(r => r.data);

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

export default function CalendarioPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const { data: negociosRaw, isLoading: loadingNeg } = useSWR('/api/v1/crm/negocios', fetcher);
  const { data: projetosRaw, isLoading: loadingProj } = useSWR('/api/v1/crm/projetos', fetcher);

  const negocios: Array<{ id: number; nome: string }> = Array.isArray(negociosRaw) ? negociosRaw : [];
  const projetos: Array<{ id: number; nome: string; data_inicio?: string; data_previsao_fim?: string; data_fim?: string; status: string }> =
    Array.isArray(projetosRaw) ? projetosRaw : [];

  // Fetch atividades for each negocio
  const negocioIds = negocios.map(n => n.id);
  const { data: atividadesByNegocio } = useSWR(
    negocioIds.length > 0 ? ['atividades-all', ...negocioIds] : null,
    async () => {
      const results = await Promise.all(
        negocioIds.map(id =>
          api.get(`/api/v1/crm/negocios/${id}/atividades`).then(r => ({
            negocioId: id,
            negocioNome: negocios.find(n => n.id === id)?.nome ?? '',
            atividades: Array.isArray(r.data) ? r.data : [],
          })).catch(() => ({ negocioId: id, negocioNome: '', atividades: [] }))
        )
      );
      return results;
    }
  );

  const isLoading = loadingNeg || loadingProj;

  const events = useMemo<CalEvent[]>(() => {
    const list: CalEvent[] = [];

    // Atividades
    if (atividadesByNegocio) {
      for (const { negocioId, negocioNome, atividades } of atividadesByNegocio) {
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

    // Projetos — data_previsao_fim
    for (const p of projetos) {
      if (p.data_previsao_fim) {
        list.push({
          date: p.data_previsao_fim,
          title: p.nome,
          type: 'tarefa',
          status: p.status,
          href: `/inspect/projetos/detalhe?id=${p.id}`,
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
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const thisMonthEvents = events.filter(e => {
    const [ey, em] = e.date.split('-').map(Number);
    return ey === year && em === month + 1;
  });

  const pendentes = thisMonthEvents.filter(e => e.status === 'pendente' || e.status === 'a_fazer' || e.status === 'em_andamento').length;
  const concluidas = thisMonthEvents.filter(e => e.status === 'concluida' || e.status === 'concluido').length;

  return (
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
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-semibold min-w-[140px] text-center">{MONTHS[month]} {year}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
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

      {isLoading ? (
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
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
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
                      <span className={cn(
                        'text-xs font-semibold flex items-center justify-center w-6 h-6 rounded-full mb-1',
                        isToday ? 'bg-primary text-white' : 'text-muted-foreground'
                      )}>
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
                        const StatusIcon = e.status === 'concluida' || e.status === 'concluido'
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
                                {e.subtitle && <p className="text-[10px] text-muted-foreground truncate">{e.subtitle}</p>}
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
                ].map(l => (
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
  );
}
