'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import type { Ativo } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Box, Building2, Loader2, MapPin, Search } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo',
  manutencao: 'Manutenção',
  inativo: 'Inativo',
};

const STATUS_CLASS: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700',
  manutencao: 'bg-amber-50 text-amber-700',
  inativo: 'bg-steel-100 text-steel-600',
};

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'ativo', label: 'Ativos' },
  { key: 'manutencao', label: 'Manutenção' },
] as const;

type Filter = (typeof FILTERS)[number]['key'];

function normalizeAtivos(raw: Ativo[] | { ativos?: Ativo[] } | undefined): Ativo[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : raw.ativos ?? [];
}

export default function MobileAtivosInspectPage() {
  const [filter, setFilter] = useState<Filter>('todos');
  const [search, setSearch] = useState('');
  const { data: raw, isLoading } = useSWR<Ativo[] | { ativos?: Ativo[] }>('/api/v1/inspect/ativos?per_page=200', fetcher);
  const ativos = normalizeAtivos(raw);

  const filtered = useMemo(() => {
    const termo = search.trim().toLowerCase();
    return ativos.filter((ativo) => {
      const matchesFilter = filter === 'todos' || ativo.status === filter;
      const matchesSearch = !termo || [
        ativo.nome,
        ativo.tag_identificacao,
        ativo.empresa_nome,
        ativo.fabricante,
        ativo.modelo,
        ativo.localizacao,
      ].some((value) => value?.toLowerCase().includes(termo));
      return matchesFilter && matchesSearch;
    });
  }, [ativos, filter, search]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-steel-100 bg-white px-4 pb-3 pt-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ativo, tag ou cliente"
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
            <Box size={44} strokeWidth={1} className="mb-3" />
            <p className="text-sm">Nenhum ativo encontrado</p>
          </div>
        ) : (
          filtered.map((ativo) => (
            <Card key={ativo.id} className="bg-white">
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-steel-950">{ativo.nome}</p>
                    <p className="mt-1 font-mono text-xs text-steel-400">#{ativo.tag_identificacao}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 ${STATUS_CLASS[ativo.status] ?? STATUS_CLASS.inativo}`}>
                    {STATUS_LABEL[ativo.status] ?? ativo.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-steel-500">
                  <div className="flex items-center gap-1">
                    <Building2 size={12} />
                    <span className="truncate">{ativo.empresa_nome || 'Cliente não informado'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    <span className="truncate">{ativo.localizacao || 'Sem localização'}</span>
                  </div>
                </div>
                {(ativo.fabricante || ativo.modelo) && (
                  <p className="mt-3 text-xs text-steel-400">
                    {[ativo.fabricante, ativo.modelo].filter(Boolean).join(' · ')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
