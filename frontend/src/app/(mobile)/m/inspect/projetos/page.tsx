'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Calendar } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

interface Projeto {
  id: number;
  nome: string;
  empresa_nome: string | null;
  status: string;
  prioridade: string;
  percentual_concluido: number;
  data_previsao_fim: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  planejamento: 'bg-brand-500/10 text-brand-700',
  em_andamento: 'bg-emerald-100 text-emerald-700',
  pausado: 'bg-amber-100 text-amber-700',
  concluido: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
};

const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: 'bg-steel-100 text-steel-600',
  media: 'bg-brand-500/10 text-brand-700',
  alta: 'bg-orange-100 text-orange-600',
  critica: 'bg-red-100 text-red-700',
};

const FILTERS = ['todos', 'planejamento', 'em_andamento', 'pausado', 'concluido'] as const;
type Filter = (typeof FILTERS)[number];

export default function MobileProjetosPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Filter>('todos');

  const { data: raw, isLoading } = useSWR('/api/v1/crm/projetos', fetcher);
  const all: Projeto[] = Array.isArray(raw) ? raw : [];

  const projetos = all.filter((p) => {
    const matchStatus = status === 'todos' || p.status === status;
    const matchSearch =
      !search ||
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.empresa_nome ?? '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-steel-100 bg-white px-4 pb-3 pt-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar projeto..."
            className="h-10 bg-steel-50 pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {FILTERS.map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={status === f ? 'default' : 'secondary'}
              onClick={() => setStatus(f)}
              className="h-7 shrink-0 rounded-md px-3 text-xs"
            >
              {f === 'todos' ? 'Todos' : STATUS_LABELS[f]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-brand-500" size={24} />
          </div>
        ) : projetos.length === 0 ? (
          <p className="py-12 text-center text-sm text-steel-400">Nenhum projeto encontrado</p>
        ) : (
          projetos.map((p) => (
            <Link
              key={p.id}
              href={`/inspect/projetos/detalhe?id=${p.id}`}
              className="block transition-transform active:scale-[0.99]"
            >
              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight text-steel-950">{p.nome}</p>
                    <Badge variant="outline" className={`shrink-0 ${STATUS_COLORS[p.status] ?? 'bg-steel-100 text-steel-600'}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </div>
                  {p.empresa_nome && (
                    <p className="mb-3 text-xs text-steel-500">{p.empresa_nome}</p>
                  )}
                  <div className="mb-1">
                    <div className="mb-1 flex justify-between text-xs text-steel-400">
                      <span>Progresso</span>
                      <span>{p.percentual_concluido}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-steel-100">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${p.percentual_concluido}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className={PRIORIDADE_COLORS[p.prioridade] ?? 'bg-steel-100 text-steel-500'}>
                      {p.prioridade ? p.prioridade.charAt(0).toUpperCase() + p.prioridade.slice(1) : '—'}
                    </Badge>
                    {p.data_previsao_fim && (
                      <span className="flex items-center gap-1 text-xs text-steel-400">
                        <Calendar size={11} />
                        {new Date(p.data_previsao_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    )}
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
