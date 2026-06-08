'use client';

import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Negocio } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Loader2, TrendingUp } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const STATUS_LABELS: Record<string, string> = {
  aberto: 'Aberto',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

const STATUS_COLORS: Record<string, string> = {
  aberto: 'bg-brand-500/10 text-brand-700',
  ganho: 'bg-green-100 text-green-700',
  perdido: 'bg-red-100 text-red-700',
};

const FILTERS = ['todos', 'aberto', 'ganho', 'perdido'] as const;
type Filter = (typeof FILTERS)[number];

export default function MobileNegociosPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Filter>('todos');

  const { data: raw, isLoading } = useSWR('/api/v1/crm/negocios', fetcher);
  const all: Negocio[] = Array.isArray(raw) ? raw : [];

  const negocios = all.filter((n) => {
    const matchStatus = status === 'todos' || n.status === status;
    const matchSearch =
      !search ||
      n.nome.toLowerCase().includes(search.toLowerCase()) ||
      (n.lead?.nome ?? '').toLowerCase().includes(search.toLowerCase());
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
            placeholder="Buscar negócio..."
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
        ) : negocios.length === 0 ? (
          <p className="py-12 text-center text-sm text-steel-400">Nenhum negócio encontrado</p>
        ) : (
          negocios.map((n) => (
            <Card key={n.id} className="bg-white">
              <CardContent className="p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight text-steel-950">{n.nome}</p>
                  <Badge variant="outline" className={`shrink-0 ${STATUS_COLORS[n.status]}`}>
                    {STATUS_LABELS[n.status]}
                  </Badge>
                </div>
                {n.lead?.nome && (
                  <p className="mb-2 text-xs text-steel-500">{n.lead.nome}</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm font-bold text-steel-900">
                    <TrendingUp size={14} className="text-emerald-500" />
                    {formatCurrency(n.valor)}
                  </div>
                  {n.estagio?.nome && (
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${n.estagio.cor}20`,
                        color: n.estagio.cor,
                        borderColor: `${n.estagio.cor}40`,
                      }}
                    >
                      {n.estagio.nome}
                    </Badge>
                  )}
                </div>
                {n.probabilidade > 0 && (
                  <div className="mt-3">
                    <div className="h-1 overflow-hidden rounded-full bg-steel-100">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${n.probabilidade}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-steel-400">{n.probabilidade}% probabilidade</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
