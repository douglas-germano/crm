'use client';

import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import type { Lead } from '@/types';
import { Search, Loader2, Phone } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  qualificado: 'Qualificado',
  convertido: 'Convertido',
  perdido: 'Perdido',
};

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-brand-500/10 text-brand-700',
  contatado: 'bg-amber-50 text-amber-700',
  qualificado: 'bg-steel-100 text-brand-900',
  convertido: 'bg-emerald-50 text-emerald-700',
  perdido: 'bg-red-100 text-red-700',
};

const FILTERS = ['todos', 'novo', 'contatado', 'qualificado', 'convertido', 'perdido'] as const;
type Filter = (typeof FILTERS)[number];

export default function MobileLeadsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Filter>('todos');

  const params = new URLSearchParams({ per_page: '30', page: '1' });
  if (status !== 'todos') params.set('status', status);
  if (search) params.set('search', search);

  const { data, isLoading } = useSWR<{ leads: Lead[] }>(`/api/v1/crm/leads?${params}`, fetcher);
  const leads: Lead[] = data?.leads ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-steel-100 bg-white px-4 pb-3 pt-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lead..."
            className="h-10 w-full rounded-lg border border-steel-200 bg-steel-50 pl-9 pr-4 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                status === f ? 'bg-brand-500 text-white' : 'bg-steel-100 text-steel-600'
              }`}
            >
              {f === 'todos' ? 'Todos' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-brand-500" size={24} />
          </div>
        ) : leads.length === 0 ? (
          <p className="py-12 text-center text-sm text-steel-400">Nenhum lead encontrado</p>
        ) : (
          <ul className="divide-y divide-steel-100">
            {leads.map((lead) => (
              <li key={lead.id} className="flex items-center px-4 py-3 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm font-semibold text-brand-600">
                  {lead.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-steel-950">{lead.nome}</p>
                  {lead.empresa && (
                    <p className="truncate text-xs text-steel-500">{lead.empresa}</p>
                  )}
                  {lead.telefone && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-steel-400">
                      <Phone size={10} />
                      {lead.telefone}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status]}`}>
                  {STATUS_LABELS[lead.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
