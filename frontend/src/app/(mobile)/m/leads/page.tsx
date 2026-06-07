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
  novo: 'bg-blue-100 text-blue-700',
  contatado: 'bg-yellow-100 text-yellow-700',
  qualificado: 'bg-purple-100 text-purple-700',
  convertido: 'bg-green-100 text-green-700',
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
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lead..."
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

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-gray-300" size={24} />
          </div>
        ) : leads.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">Nenhum lead encontrado</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {leads.map((lead) => (
              <li key={lead.id} className="flex items-center px-4 py-3 gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
                  {lead.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{lead.nome}</p>
                  {lead.empresa && (
                    <p className="text-xs text-gray-500 truncate">{lead.empresa}</p>
                  )}
                  {lead.telefone && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
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
