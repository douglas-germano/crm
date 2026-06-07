'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import api from '@/lib/api';
import { OrdemServico } from '@/types';
import { useToast } from '@/contexts/toast-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Camera, Clock, FileText, Loader2, Package, Pause, PenLine, SquareCheckBig, XCircle } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  planejada: 'Planejada',
  em_campo: 'Em campo',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

function formatDate(value?: string) {
  if (!value) return 'Sem registro';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function OrdemDetalhePage() {
  const router = useRouter();
  const params = useSearchParams();
  const ordemId = params.get('id');
  const { toast } = useToast();
  const [modal, setModal] = useState<'evidencia' | 'hora' | 'material' | 'assinatura' | 'relatorio' | null>(null);
  const [loadingAction, setLoadingAction] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: ordem, mutate, isLoading } = useSWR<OrdemServico>(
    ordemId ? `/api/v1/inspect/ordens/${ordemId}` : null,
    fetcher,
  );

  const runAction = async (action: 'pausar' | 'finalizar' | 'cancelar') => {
    if (!ordem) return;
    setLoadingAction(action);
    try {
      await api.post(`/api/v1/inspect/ordens/${ordem.id}/${action}`, action === 'cancelar' ? { motivo: 'Cancelada pela operação' } : {});
      toast(action === 'finalizar' ? 'Ordem finalizada com sucesso!' : action === 'pausar' ? 'Execução pausada!' : 'Ordem cancelada!');
      mutate();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } };
      toast(error.response?.data?.erro || 'Erro ao atualizar ordem');
    } finally {
      setLoadingAction('');
    }
  };

  const openModal = (nextModal: typeof modal) => {
    setForm({});
    setModal(nextModal);
  };

  const submitModal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ordem || !modal) return;
    setLoadingAction(modal);
    try {
      if (modal === 'evidencia') {
        await api.post(`/api/v1/inspect/ordens/${ordem.id}/evidencias`, {
          tipo: form.tipo || 'foto',
          url: form.url,
          legenda: form.legenda,
          item_referencia: form.item_referencia,
        });
      }
      if (modal === 'hora') {
        await api.post(`/api/v1/inspect/ordens/${ordem.id}/apontamentos-hora`, {
          data_inicio: form.data_inicio,
          data_fim: form.data_fim || null,
          horas: form.horas ? Number(form.horas) : undefined,
          tipo: form.tipo || 'campo',
          descricao: form.descricao,
        });
      }
      if (modal === 'material') {
        await api.post(`/api/v1/inspect/ordens/${ordem.id}/materiais`, {
          nome: form.nome,
          quantidade: Number(form.quantidade || 1),
          unidade: form.unidade || 'un',
          valor_unitario: Number(form.valor_unitario || 0),
          observacao: form.observacao,
        });
      }
      if (modal === 'assinatura') {
        await api.post(`/api/v1/inspect/ordens/${ordem.id}/assinaturas`, {
          nome: form.nome,
          documento: form.documento,
          cargo: form.cargo,
          tipo: form.tipo || 'cliente',
          assinatura_url: form.assinatura_url,
          aceite_texto: form.aceite_texto,
        });
      }
      if (modal === 'relatorio') {
        await api.post(`/api/v1/inspect/ordens/${ordem.id}/relatorios`, {
          titulo: form.titulo,
          status: form.status || 'rascunho',
          conteudo: {
            resumo: form.resumo,
            conclusao: form.conclusao,
          },
        });
      }
      toast('Registro salvo com sucesso!');
      setModal(null);
      mutate();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } };
      toast(error.response?.data?.erro || 'Erro ao salvar registro');
    } finally {
      setLoadingAction('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando ordem...
      </div>
    );
  }

  if (!ordem) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push('/inspect/ordens')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card><CardContent className="p-8 text-sm text-muted-foreground">Ordem não encontrada.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/inspect/ordens')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">{ordem.titulo}</h2>
              <Badge variant="outline">{ordem.codigo}</Badge>
              <Badge variant="outline">{STATUS_LABEL[ordem.status] ?? ordem.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {ordem.empresa_nome} {ordem.ativo_tag ? `· ${ordem.ativo_tag} · ${ordem.ativo_nome}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ordem.status === 'em_campo' && (
            <Button variant="outline" disabled={!!loadingAction} onClick={() => runAction('pausar')}>
              <Pause className="mr-2 h-4 w-4" /> Pausar
            </Button>
          )}
          {ordem.status !== 'concluida' && ordem.status !== 'cancelada' && (
            <Button disabled={!!loadingAction} onClick={() => runAction('finalizar')}>
              <SquareCheckBig className="mr-2 h-4 w-4" /> Finalizar
            </Button>
          )}
          {ordem.status !== 'cancelada' && (
            <Button variant="outline" disabled={!!loadingAction} onClick={() => runAction('cancelar')}>
              <XCircle className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white"><CardContent className="p-5"><p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Execuções</p><p className="mt-3 text-2xl font-semibold">{ordem.execucoes?.length ?? 0}</p></CardContent></Card>
        <Card className="bg-white"><CardContent className="p-5"><p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Evidências</p><p className="mt-3 text-2xl font-semibold">{ordem.evidencias?.length ?? 0}</p></CardContent></Card>
        <Card className="bg-white"><CardContent className="p-5"><p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Materiais</p><p className="mt-3 text-2xl font-semibold">{ordem.materiais?.length ?? 0}</p></CardContent></Card>
        <Card className="bg-white"><CardContent className="p-5"><p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Relatórios</p><p className="mt-3 text-2xl font-semibold">{ordem.relatorios?.length ?? 0}</p></CardContent></Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Operação de campo</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => openModal('evidencia')}><Camera className="mr-2 h-4 w-4" /> Evidência</Button>
              <Button variant="outline" size="sm" onClick={() => openModal('hora')}><Clock className="mr-2 h-4 w-4" /> Horas</Button>
              <Button variant="outline" size="sm" onClick={() => openModal('material')}><Package className="mr-2 h-4 w-4" /> Material</Button>
              <Button variant="outline" size="sm" onClick={() => openModal('assinatura')}><PenLine className="mr-2 h-4 w-4" /> Assinatura</Button>
              <Button variant="outline" size="sm" onClick={() => openModal('relatorio')}><FileText className="mr-2 h-4 w-4" /> Relatório</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <Tabs defaultValue="evidencias">
            <TabsList className="mb-4">
              <TabsTrigger value="evidencias">Evidências</TabsTrigger>
              <TabsTrigger value="horas">Horas</TabsTrigger>
              <TabsTrigger value="materiais">Materiais</TabsTrigger>
              <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
              <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            </TabsList>
            <TabsContent value="evidencias" className="space-y-2">
              {(ordem.evidencias ?? []).map((item) => <div key={item.id} className="rounded-md border p-3 text-sm"><div className="font-medium">{item.legenda || item.tipo}</div><div className="text-xs text-muted-foreground">{item.url}</div></div>)}
            </TabsContent>
            <TabsContent value="horas" className="space-y-2">
              {(ordem.apontamentos_hora ?? []).map((item) => <div key={item.id} className="rounded-md border p-3 text-sm"><div className="font-medium">{item.horas}h · {item.tipo}</div><div className="text-xs text-muted-foreground">{formatDate(item.data_inicio)} até {formatDate(item.data_fim)}</div></div>)}
            </TabsContent>
            <TabsContent value="materiais" className="space-y-2">
              {(ordem.materiais ?? []).map((item) => <div key={item.id} className="rounded-md border p-3 text-sm"><div className="font-medium">{item.nome}</div><div className="text-xs text-muted-foreground">{item.quantidade} {item.unidade}</div></div>)}
            </TabsContent>
            <TabsContent value="assinaturas" className="space-y-2">
              {(ordem.assinaturas ?? []).map((item) => <div key={item.id} className="rounded-md border p-3 text-sm"><div className="font-medium">{item.nome}</div><div className="text-xs text-muted-foreground">{item.tipo} · {item.cargo || 'Sem cargo'}</div></div>)}
            </TabsContent>
            <TabsContent value="relatorios" className="space-y-2">
              {(ordem.relatorios ?? []).map((item) => <div key={item.id} className="rounded-md border p-3 text-sm"><div className="font-medium">{item.titulo}</div><div className="text-xs text-muted-foreground">{item.status} · {formatDate(item.data_criacao)}</div></div>)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!modal} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Novo registro</DialogTitle></DialogHeader>
          <form onSubmit={submitModal} className="space-y-4">
            {modal === 'evidencia' && (
              <>
                <Field label="URL" value={form.url} onChange={(url) => setForm((prev) => ({ ...prev, url }))} required />
                <Field label="Legenda" value={form.legenda} onChange={(legenda) => setForm((prev) => ({ ...prev, legenda }))} />
                <Field label="Item de referência" value={form.item_referencia} onChange={(item_referencia) => setForm((prev) => ({ ...prev, item_referencia }))} />
              </>
            )}
            {modal === 'hora' && (
              <>
                <Field label="Início" type="datetime-local" value={form.data_inicio} onChange={(data_inicio) => setForm((prev) => ({ ...prev, data_inicio }))} required />
                <Field label="Fim" type="datetime-local" value={form.data_fim} onChange={(data_fim) => setForm((prev) => ({ ...prev, data_fim }))} />
                <Field label="Horas" type="number" value={form.horas} onChange={(horas) => setForm((prev) => ({ ...prev, horas }))} />
                <TextArea label="Descrição" value={form.descricao} onChange={(descricao) => setForm((prev) => ({ ...prev, descricao }))} />
              </>
            )}
            {modal === 'material' && (
              <>
                <Field label="Material" value={form.nome} onChange={(nome) => setForm((prev) => ({ ...prev, nome }))} required />
                <Field label="Quantidade" type="number" value={form.quantidade} onChange={(quantidade) => setForm((prev) => ({ ...prev, quantidade }))} />
                <Field label="Unidade" value={form.unidade} onChange={(unidade) => setForm((prev) => ({ ...prev, unidade }))} />
                <TextArea label="Observação" value={form.observacao} onChange={(observacao) => setForm((prev) => ({ ...prev, observacao }))} />
              </>
            )}
            {modal === 'assinatura' && (
              <>
                <Field label="Nome" value={form.nome} onChange={(nome) => setForm((prev) => ({ ...prev, nome }))} required />
                <Field label="Documento" value={form.documento} onChange={(documento) => setForm((prev) => ({ ...prev, documento }))} />
                <Field label="Cargo" value={form.cargo} onChange={(cargo) => setForm((prev) => ({ ...prev, cargo }))} />
                <TextArea label="Aceite" value={form.aceite_texto} onChange={(aceite_texto) => setForm((prev) => ({ ...prev, aceite_texto }))} />
              </>
            )}
            {modal === 'relatorio' && (
              <>
                <Field label="Título" value={form.titulo} onChange={(titulo) => setForm((prev) => ({ ...prev, titulo }))} required />
                <TextArea label="Resumo" value={form.resumo} onChange={(resumo) => setForm((prev) => ({ ...prev, resumo }))} />
                <TextArea label="Conclusão" value={form.conclusao} onChange={(conclusao) => setForm((prev) => ({ ...prev, conclusao }))} />
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
              <Button type="submit" disabled={!!loadingAction}>{loadingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value?: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value ?? ''} required={required} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
