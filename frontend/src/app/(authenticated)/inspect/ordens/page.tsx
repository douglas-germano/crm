'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import api from '@/lib/api';
import { Ativo, Empresa, OrdemServico } from '@/types';
import { useToast } from '@/contexts/toast-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList, Eye, Loader2, MapPin, Play, Plus, Search, SquareCheckBig, Wrench } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  planejada: 'Planejada',
  em_campo: 'Em campo',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const TIPO_LABEL: Record<string, string> = {
  inspecao: 'Inspeção',
  manutencao: 'Manutenção',
  servico: 'Serviço',
  visita_tecnica: 'Visita técnica',
};

const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  critica: 'Crítica',
};

const STATUS_CLASS: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700 border-gray-200',
  planejada: 'bg-blue-50 text-blue-700 border-blue-200',
  em_campo: 'bg-amber-50 text-amber-700 border-amber-200',
  pausada: 'bg-orange-50 text-orange-700 border-orange-200',
  concluida: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelada: 'bg-red-50 text-red-700 border-red-200',
};

const EMPTY_FORM = {
  titulo: '',
  empresa_id: '',
  ativo_id: '',
  tipo: 'inspecao',
  prioridade: 'normal',
  data_agendada: '',
  endereco_atendimento: '',
  descricao: '',
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

export default function OrdensCampoPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [apiError, setApiError] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [acaoId, setAcaoId] = useState<number | null>(null);

  const { data: ordensRaw, mutate, isLoading } = useSWR('/api/v1/inspect/ordens', fetcher);
  const { data: empresasResp } = useSWR('/api/v1/crm/empresas?per_page=200', fetcher);
  const { data: ativosRaw } = useSWR('/api/v1/inspect/ativos', fetcher);

  const ordens: OrdemServico[] = Array.isArray(ordensRaw) ? ordensRaw : [];
  const empresas: Empresa[] = empresasResp?.empresas ?? [];
  const ativos: Ativo[] = Array.isArray(ativosRaw) ? ativosRaw : ativosRaw?.ativos ?? [];

  const ativosFiltrados = useMemo(() => {
    if (!form.empresa_id) return ativos;
    return ativos.filter((ativo) => ativo.empresa_id === Number(form.empresa_id));
  }, [ativos, form.empresa_id]);

  const filtered = useMemo(() => {
    const termo = search.trim().toLowerCase();
    return ordens.filter((ordem) => {
      const matchesStatus = statusFilter === 'todos' || ordem.status === statusFilter;
      const matchesSearch = !termo || [
        ordem.codigo,
        ordem.titulo,
        ordem.empresa_nome,
        ordem.ativo_nome,
        ordem.ativo_tag,
        ordem.responsavel_nome,
      ].some((valor) => valor?.toLowerCase().includes(termo));
      return matchesStatus && matchesSearch;
    });
  }, [ordens, search, statusFilter]);

  const totalEmCampo = ordens.filter((ordem) => ordem.status === 'em_campo').length;
  const totalPlanejadas = ordens.filter((ordem) => ordem.status === 'planejada').length;
  const totalConcluidas = ordens.filter((ordem) => ordem.status === 'concluida').length;

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setApiError('');
  };

  const handleCriar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.titulo || !form.empresa_id) {
      setApiError('Título e empresa são obrigatórios');
      return;
    }

    setSalvando(true);
    setApiError('');

    try {
      await api.post('/api/v1/inspect/ordens', {
        titulo: form.titulo,
        empresa_id: Number(form.empresa_id),
        ativo_id: form.ativo_id ? Number(form.ativo_id) : null,
        tipo: form.tipo,
        prioridade: form.prioridade,
        data_agendada: form.data_agendada || null,
        endereco_atendimento: form.endereco_atendimento || null,
        descricao: form.descricao || null,
      });
      toast('Ordem de campo criada com sucesso!');
      resetForm();
      setOpenModal(false);
      mutate();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } };
      setApiError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao criar ordem');
    } finally {
      setSalvando(false);
    }
  };

  const executarAcao = async (ordem: OrdemServico, acao: 'iniciar' | 'finalizar') => {
    setAcaoId(ordem.id);
    try {
      await api.post(`/api/v1/inspect/ordens/${ordem.id}/${acao}`, {});
      toast(acao === 'iniciar' ? 'Execução em campo iniciada!' : 'Ordem finalizada com sucesso!');
      mutate();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } };
      toast(error.response?.data?.erro || error.response?.data?.message || 'Erro ao atualizar ordem');
    } finally {
      setAcaoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Apex Inspect</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ordens de campo para inspeções, serviços técnicos e manutenções
          </p>
        </div>
        <Button onClick={() => { resetForm(); setOpenModal(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Ordem
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Planejadas
              </p>
            </div>
            <p className="text-[1.875rem] font-semibold leading-none tracking-tight">{totalPlanejadas}</p>
            <p className="mt-2 text-xs text-muted-foreground">Fila aguardando execução</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Em campo
              </p>
            </div>
            <p className="text-[1.875rem] font-semibold leading-none tracking-tight">{totalEmCampo}</p>
            <p className="mt-2 text-xs text-muted-foreground">Execuções em andamento</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <SquareCheckBig className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Concluídas
              </p>
            </div>
            <p className="text-[1.875rem] font-semibold leading-none tracking-tight">{totalConcluidas}</p>
            <p className="mt-2 text-xs text-muted-foreground">Serviços prontos para relatório</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Ordens de Campo</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar ordem, cliente ou ativo"
                  className="w-full pl-9 sm:w-[280px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full bg-white sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="planejada">Planejada</SelectItem>
                  <SelectItem value="em_campo">Em campo</SelectItem>
                  <SelectItem value="pausada">Pausada</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando ordens...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Nenhuma ordem encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Cliente / Ativo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Agenda</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ordem) => (
                    <TableRow key={ordem.id}>
                      <TableCell>
                        <div className="font-medium">{ordem.titulo}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {ordem.codigo} · {PRIORIDADE_LABEL[ordem.prioridade] ?? ordem.prioridade}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{ordem.empresa_nome}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {ordem.ativo_tag ? `${ordem.ativo_tag} · ${ordem.ativo_nome}` : ordem.endereco_atendimento || 'Sem ativo vinculado'}
                        </div>
                      </TableCell>
                      <TableCell>{TIPO_LABEL[ordem.tipo] ?? ordem.tipo}</TableCell>
                      <TableCell>{formatDateTime(ordem.data_agendada)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_CLASS[ordem.status] ?? STATUS_CLASS.rascunho}>
                          {STATUS_LABEL[ordem.status] ?? ordem.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/inspect/ordens/detalhe?id=${ordem.id}`}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver detalhes</span>
                            </Link>
                          </Button>
                          {ordem.status !== 'em_campo' && ordem.status !== 'concluida' && ordem.status !== 'cancelada' && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={acaoId === ordem.id}
                              onClick={() => executarAcao(ordem, 'iniciar')}
                            >
                              {acaoId === ordem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                              <span className="sr-only">Iniciar</span>
                            </Button>
                          )}
                          {ordem.status === 'em_campo' && (
                            <Button
                              size="sm"
                              disabled={acaoId === ordem.id}
                              onClick={() => executarAcao(ordem, 'finalizar')}
                            >
                              {acaoId === ordem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <SquareCheckBig className="h-4 w-4" />}
                              <span className="sr-only">Finalizar</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Campo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriar} className="space-y-4">
            {apiError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))}
                  placeholder="Inspeção NR13 - Caldeira principal"
                />
              </div>

              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select
                  value={form.empresa_id}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, empresa_id: value, ativo_id: '' }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={String(empresa.id)}>
                        {empresa.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ativo</Label>
                <Select
                  value={form.ativo_id || 'sem_ativo'}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, ativo_id: value === 'sem_ativo' ? '' : value }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione um ativo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem_ativo">Sem ativo vinculado</SelectItem>
                    {ativosFiltrados.map((ativo) => (
                      <SelectItem key={ativo.id} value={String(ativo.id)}>
                        {ativo.tag_identificacao} · {ativo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(value) => setForm((prev) => ({ ...prev, tipo: value }))}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspecao">Inspeção</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                    <SelectItem value="visita_tecnica">Visita técnica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={(value) => setForm((prev) => ({ ...prev, prioridade: value }))}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_agendada">Data agendada</Label>
                <Input
                  id="data_agendada"
                  type="datetime-local"
                  value={form.data_agendada}
                  onChange={(event) => setForm((prev) => ({ ...prev, data_agendada: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco_atendimento">Local de atendimento</Label>
                <Input
                  id="endereco_atendimento"
                  value={form.endereco_atendimento}
                  onChange={(event) => setForm((prev) => ({ ...prev, endereco_atendimento: event.target.value }))}
                  placeholder="Unidade, setor ou endereço"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={form.descricao}
                  onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                  placeholder="Escopo inicial, orientações para campo ou observações do cliente"
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Ordem
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
