'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import api from '@/lib/api';
import type { Inspecao } from '@/types';
import { ClipboardCheck, Loader2, Building2, Calendar, ChevronRight } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const STATUS_LABELS: Record<string, string> = {
  agendada: 'Agendada',
  em_campo: 'Em Campo',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-700',
  em_campo: 'bg-orange-100 text-orange-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-500',
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
    `/api/inspecoes?status=${statusParam}&per_page=30`,
    fetcher
  );
  const inspecoes: Inspecao[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.inspecoes)
    ? raw.inspecoes
    : [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-gray-300" size={24} />
          </div>
        ) : inspecoes.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-300">
            <ClipboardCheck size={44} strokeWidth={1} className="mb-3" />
            <p className="text-sm">Nenhuma inspeção encontrada</p>
          </div>
        ) : (
          inspecoes.map((ins) => (
            <Link
              key={ins.id}
              href={`/inspecoes/campo?id=${ins.id}`}
              className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {ins.ativo_nome ?? 'Equipamento'}
                </p>
                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[ins.status]}`}>
                  {STATUS_LABELS[ins.status]}
                </span>
              </div>
              {ins.ativo_tag && (
                <p className="text-xs text-gray-400 font-mono mb-1">#{ins.ativo_tag}</p>
              )}
              {ins.ativo_empresa_nome && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                  <Building2 size={11} />
                  {ins.ativo_empresa_nome}
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar size={11} />
                  {new Date(ins.data_inspecao).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex items-center gap-0.5 text-xs font-medium text-blue-600">
                  {ins.status === 'em_campo' ? 'Continuar' : 'Abrir'}
                  <ChevronRight size={13} />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
