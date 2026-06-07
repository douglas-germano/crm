'use client';

import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Negocio } from '@/types';
import { Search, Loader2, TrendingUp } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const STATUS_LABELS: Record<string, string> = {
  aberto: 'Aberto',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

const STATUS_COLORS: Record<string, string> = {
  aberto: 'bg-blue-100 text-blue-700',
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
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar negócio..."
            className="w-full h-10 pl-9 pr-4 text-sm rounded-lg border border-gray-200 bg-gray-50 outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                status === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f === 'todos' ? 'Todos' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-gray-300" size={24} />
          </div>
        ) : negocios.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">Nenhum negócio encontrado</p>
        ) : (
          negocios.map((n) => (
            <div key={n.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{n.nome}</p>
                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[n.status]}`}>
                  {STATUS_LABELS[n.status]}
                </span>
              </div>
              {n.lead?.nome && (
                <p className="text-xs text-gray-500 mb-2">{n.lead.nome}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                  <TrendingUp size={14} className="text-emerald-500" />
                  {formatCurrency(n.valor)}
                </div>
                {n.estagio?.nome && (
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: `${n.estagio.cor}20`,
                      color: n.estagio.cor,
                      borderColor: `${n.estagio.cor}40`,
                    }}
                  >
                    {n.estagio.nome}
                  </span>
                )}
              </div>
              {n.probabilidade > 0 && (
                <div className="mt-3">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${n.probabilidade}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{n.probabilidade}% probabilidade</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
