'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import type { OrdemServico } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar, ChevronRight, ClipboardList, Loader2, MapPin, Play, Search, SquareCheckBig } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  planejada: 'Planejada',
  em_campo: 'Em campo',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const STATUS_CLASS: Record<string, string> = {
  rascunho: 'bg-steel-100 text-steel-600',
  planejada: 'bg-brand-500/10 text-brand-700',
  em_campo: 'bg-amber-50 text-amber-700',
  pausada: 'bg-orange-50 text-orange-700',
  concluida: 'bg-emerald-50 text-emerald-700',
  cancelada: 'bg-red-50 text-red-700',
};

const FILTERS = [
  { key: 'ativas', label: 'Ativas' },
  { key: 'em_campo', label: 'Em campo' },
  { key: 'concluida', label: 'Concluídas' },
] as const;

type Filter = (typeof FILTERS)[number]['key'];

function formatDateTime(value?: string) {
  if (!value) return 'Sem agenda';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function MobileOrdensInspectPage() {
  const [filter, setFilter] = useState<Filter>('ativas');
  const [search, setSearch] = useState('');
  const [acaoId, setAcaoId] = useState<number | null>(null);
  const { data: raw, mutate, isLoading } = useSWR('/api/v1/inspect/ordens', fetcher);

  const ordens: OrdemServico[] = Array.isArray(raw) ? raw : [];

  const filtered = useMemo(() => {
    const termo = search.trim().toLowerCase();
    return ordens.filter((ordem) => {
      const matchesFilter =
        filter === 'ativas'
          ? ['rascunho', 'planejada', 'em_campo', 'pausada'].includes(ordem.status)
          : ordem.status === filter;
      const matchesSearch = !termo || [
        ordem.codigo,
        ordem.titulo,
        ordem.empresa_nome,
        ordem.ativo_nome,
        ordem.ativo_tag,
      ].some((value) => value?.toLowerCase().includes(termo));
      return matchesFilter && matchesSearch;
    });
  }, [filter, ordens, search]);

  const executarAcao = async (ordem: OrdemServico, acao: 'iniciar' | 'finalizar') => {
    setAcaoId(ordem.id);
    try {
      await api.post(`/api/v1/inspect/ordens/${ordem.id}/${acao}`, {});
      mutate();
    } finally {
      setAcaoId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-steel-100 bg-white px-4 pb-3 pt-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ordem, cliente ou ativo"
            className="h-10 bg-steel-50 pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {FILTERS.map((item) => (
            <Button
              key={item.key}
              type="button"
              size="sm"
              variant={filter === item.key ? 'default' : 'secondary'}
              onClick={() => setFilter(item.key)}
              className="h-7 shrink-0 rounded-md px-3 text-xs"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-brand-500" size={24} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-steel-300">
            <ClipboardList size={44} strokeWidth={1} className="mb-3" />
            <p className="text-sm">Nenhuma ordem encontrada</p>
          </div>
        ) : (
          filtered.map((ordem) => (
            <Card key={ordem.id} className="bg-white">
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-steel-950">{ordem.titulo}</p>
                    <p className="mt-1 text-xs text-steel-400">{ordem.codigo || `OS #${ordem.id}`}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 ${STATUS_CLASS[ordem.status] ?? STATUS_CLASS.rascunho}`}>
                    {STATUS_LABEL[ordem.status] ?? ordem.status}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-steel-500">
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    <span className="truncate">{ordem.empresa_nome || 'Cliente não informado'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{formatDateTime(ordem.data_agendada)}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <Link
                    href={`/m/inspect/ordens/detalhe?id=${ordem.id}`}
                    className="flex items-center gap-1 text-xs font-medium text-brand-500"
                  >
                    Detalhes
                    <ChevronRight size={13} />
                  </Link>
                  <div className="flex gap-2">
                    {ordem.status !== 'em_campo' && ordem.status !== 'concluida' && ordem.status !== 'cancelada' && (
                      <Button size="sm" variant="outline" disabled={acaoId === ordem.id} onClick={() => executarAcao(ordem, 'iniciar')}>
                        {acaoId === ordem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        <span className="sr-only">Iniciar</span>
                      </Button>
                    )}
                    {ordem.status === 'em_campo' && (
                      <Button size="sm" disabled={acaoId === ordem.id} onClick={() => executarAcao(ordem, 'finalizar')}>
                        {acaoId === ordem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <SquareCheckBig className="h-4 w-4" />}
                        <span className="sr-only">Finalizar</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
