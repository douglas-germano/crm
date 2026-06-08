'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import api from '@/lib/api';
import type { OrdemServico } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calendar, Loader2, MapPin, Pause, Play, SquareCheckBig, XCircle } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  planejada: 'Planejada',
  em_campo: 'Em campo',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

function formatDateTime(value?: string) {
  if (!value) return 'Sem agenda';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function MobileOrdemDetalhePage() {
  const router = useRouter();
  const params = useSearchParams();
  const ordemId = params.get('id');
  const [loadingAction, setLoadingAction] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const { data: ordem, mutate, isLoading } = useSWR<OrdemServico>(
    ordemId ? `/api/v1/inspect/ordens/${ordemId}` : null,
    fetcher,
  );

  const runAction = async (action: 'iniciar' | 'pausar' | 'finalizar' | 'cancelar') => {
    if (!ordem) return;
    setLoadingAction(action);
    try {
      await api.post(
        `/api/v1/inspect/ordens/${ordem.id}/${action}`,
        action === 'finalizar' ? { observacoes_cliente: observacoes } : {},
      );
      mutate();
    } finally {
      setLoadingAction('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={24} />
      </div>
    );
  }

  if (!ordem) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => router.push('/m/inspect/ordens')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card className="mt-4 bg-white">
          <CardContent className="p-4 text-sm text-steel-500">Ordem não encontrada.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-24">
      <Button variant="ghost" size="sm" onClick={() => router.push('/m/inspect/ordens')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <section className="rounded-lg bg-brand-900 p-4 text-white">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="font-mono text-xs text-apex-orange">{ordem.codigo || `OS #${ordem.id}`}</p>
          <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
            {STATUS_LABEL[ordem.status] ?? ordem.status}
          </Badge>
        </div>
        <h2 className="text-lg font-semibold leading-tight">{ordem.titulo}</h2>
        <p className="mt-2 text-sm text-steel-300">{ordem.empresa_nome}</p>
      </section>

      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Atendimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-steel-600">
            <Calendar className="h-4 w-4" />
            {formatDateTime(ordem.data_agendada)}
          </div>
          <div className="flex items-center gap-2 text-steel-600">
            <MapPin className="h-4 w-4" />
            <span>{ordem.ativo_tag ? `${ordem.ativo_tag} · ${ordem.ativo_nome}` : ordem.endereco_atendimento || 'Local não informado'}</span>
          </div>
          {ordem.descricao && <p className="rounded-md bg-steel-50 p-3 text-steel-600">{ordem.descricao}</p>}
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Finalização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            placeholder="Observações do atendimento"
          />
          <div className="grid grid-cols-2 gap-2">
            {ordem.status !== 'em_campo' && ordem.status !== 'concluida' && ordem.status !== 'cancelada' && (
              <Button disabled={!!loadingAction} onClick={() => runAction('iniciar')}>
                {loadingAction === 'iniciar' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Iniciar
              </Button>
            )}
            {ordem.status === 'em_campo' && (
              <Button variant="outline" disabled={!!loadingAction} onClick={() => runAction('pausar')}>
                {loadingAction === 'pausar' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pause className="mr-2 h-4 w-4" />}
                Pausar
              </Button>
            )}
            {ordem.status !== 'concluida' && ordem.status !== 'cancelada' && (
              <Button disabled={!!loadingAction} onClick={() => runAction('finalizar')}>
                {loadingAction === 'finalizar' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SquareCheckBig className="mr-2 h-4 w-4" />}
                Finalizar
              </Button>
            )}
            {ordem.status !== 'cancelada' && (
              <Button variant="outline" disabled={!!loadingAction} onClick={() => runAction('cancelar')}>
                {loadingAction === 'cancelar' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
