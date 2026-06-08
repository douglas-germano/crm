'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import api from '@/lib/api';
import type { Inspecao } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardCheck, Loader2, Building2, Calendar, ChevronRight } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const STATUS_LABELS: Record<string, string> = {
  agendada: 'Agendada',
  em_campo: 'Em Campo',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  agendada: 'bg-brand-500/10 text-brand-700',
  em_campo: 'bg-amber-50 text-amber-700',
  concluida: 'bg-emerald-50 text-emerald-700',
  cancelada: 'bg-steel-100 text-steel-500',
};

const FILTERS = [
  { key: 'ativas', label: 'Ativas', param: 'agendada,em_campo' },
  { key: 'concluida', label: 'Concluídas', param: 'concluida' },
  { key: 'cancelada', label: 'Canceladas', param: 'cancelada' },
] as const;
type Filter = (typeof FILTERS)[number]['key'];

export default function MobileInspecoesPage() {
  const [filter, setFilter] = useState<Filter>('ativas');

  const statusParam = FILTERS.find((f) => f.key === filter)?.param ?? 'agendada,em_campo';
  const { data: raw, isLoading } = useSWR(
    `/api/v1/inspect/inspecoes?status=${statusParam}&per_page=30`,
    fetcher
  );
  const inspecoes: Inspecao[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.inspecoes)
    ? raw.inspecoes
    : [];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-steel-100 bg-white px-4 pb-3 pt-4">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              type="button"
              size="sm"
              variant={filter === f.key ? 'default' : 'secondary'}
              onClick={() => setFilter(f.key)}
              className="h-8 rounded-md px-3 text-xs"
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-brand-500" size={24} />
          </div>
        ) : inspecoes.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-steel-300">
            <ClipboardCheck size={44} strokeWidth={1} className="mb-3" />
            <p className="text-sm">Nenhuma inspeção encontrada</p>
          </div>
        ) : (
          inspecoes.map((ins) => (
            <Link
              key={ins.id}
              href={`/m/inspect/inspecoes/campo?id=${ins.id}`}
              className="block transition-transform active:scale-[0.99]"
            >
              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight text-steel-950">
                      {ins.ativo_nome ?? 'Equipamento'}
                    </p>
                    <Badge variant="outline" className={`shrink-0 ${STATUS_COLORS[ins.status]}`}>
                      {STATUS_LABELS[ins.status]}
                    </Badge>
                  </div>
                  {ins.ativo_tag && (
                    <p className="mb-1 font-mono text-xs text-steel-400">#{ins.ativo_tag}</p>
                  )}
                  {ins.ativo_empresa_nome && (
                    <div className="mb-2 flex items-center gap-1 text-xs text-steel-500">
                      <Building2 size={11} />
                      {ins.ativo_empresa_nome}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-steel-400">
                      <Calendar size={11} />
                      {new Date(ins.data_inspecao).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="flex items-center gap-0.5 text-xs font-medium text-brand-500">
                      {ins.status === 'em_campo' ? 'Continuar' : 'Abrir'}
                      <ChevronRight size={13} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
