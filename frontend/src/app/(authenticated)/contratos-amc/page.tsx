'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import { ContratoAMC, Empresa } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/contexts/toast-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Handshake, CircleDollarSign, AlertCircle, Plus, Search, Loader2, RefreshCw, Pencil, Trash2 } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(r => r.data);
const PER_PAGE = 10;

const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  cancelado: 'Cancelado',
  finalizado: 'Finalizado',
};

const PLANO_LABEL: Record<string, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

function calcMRR(contrato: ContratoAMC): number {
  const v = contrato.valor_recorrente;
  if (contrato.plano === 'trimestral') return v / 3;
  if (contrato.plano === 'semestral') return v / 6;
  if (contrato.plano === 'anual') return v / 12;
  return v;
}

const EMPTY_FORM = {
  titulo: '',
  empresa_id: '',
  plano: 'mensal' as ContratoAMC['plano'],
  valor_recorrente: '',
  data_inicio: '',
  data_fim: '',
};

export default function ContratosAmcPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [editingContrato, setEditingContrato] = useState<ContratoAMC | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [apiError, setApiError] = useState('');

  const { data: contratosRaw, mutate, isLoading } = useSWR('/api/inspecoes/contratos-amc', fetcher);
  const { data: empresasResp } = useSWR('/api/empresas?per_page=200', fetcher);

  const contratos: ContratoAMC[] = Array.isArray(contratosRaw) ? contratosRaw : [];
  const empresas: Empresa[] = empresasResp?.empresas ?? [];

  const filtered = useMemo(() => {
    let list = contratos;
    if (statusFilter) list = list.filter(c => c.status === statusFilter);
    if (search.trim()) {
      const t = search.toLowerCase();
      list = list.filter(c =>
        c.titulo?.toLowerCase().includes(t) ||
        c.empresa_nome?.toLowerCase().includes(t)
      );
    }
    return list;
  }, [contratos, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const totalAtivos = contratos.filter(c => c.status === 'ativo').length;
  const totalSuspensos = contratos.filter(c => c.status === 'suspenso').length;
  const mrr = contratos.filter(c => c.status === 'ativo').reduce((acc, c) => acc + calcMRR(c), 0);

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setApiError(''); setEditingContrato(null); };

  const abrirEditar = (contrato: ContratoAMC) => {
    setEditingContrato(contrato);
    setForm({
      titulo: contrato.titulo,
      empresa_id: String(contrato.empresa_id),
      plano: contrato.plano,
      valor_recorrente: String(contrato.valor_recorrente),
      data_inicio: contrato.data_inicio,
      data_fim: contrato.data_fim ?? '',
    });
    setApiError('');
    setOpenModal(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo || !form.empresa_id || !form.data_inicio) {
      setApiError('Título, empresa e data de início são obrigatórios');
      return;
    }
    setSalvando(true);
    setApiError('');
    try {
      const payload = {
        titulo: form.titulo,
        empresa_id: parseInt(form.empresa_id),
        plano: form.plano,
        valor_recorrente: parseFloat(form.valor_recorrente) || 0,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
      };
      if (editingContrato) {
        await api.put(`/api/inspecoes/contratos-amc/${editingContrato.id}`, payload);
        toast('Contrato AMC atualizado com sucesso!');
      } else {
        await api.post('/api/inspecoes/contratos-amc', { ...payload, status: 'ativo' });
        toast('Contrato AMC criado com sucesso!');
      }
      resetForm();
      setOpenModal(false);
      mutate();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } };
      setApiError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao salvar contrato');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/inspecoes/contratos-amc/${deleteId}`);
      mutate();
      toast('Contrato excluído com sucesso!');
    } catch {
      toast('Erro ao excluir contrato');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Contratos AMC</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestão de contratos de manutenção e receita recorrente (MRR)
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditingContrato(null); setOpenModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white transition-colors hover:border-gray-300">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <CircleDollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">
                MRR — Receita Mensal Recorrente
              </p>
            </div>
            <p className="text-[1.875rem] font-semibold text-foreground tabular-nums tracking-tight leading-none">
              {formatCurrency(mrr)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Calculado proporcionalmente ao plano de cada contrato ativo
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Handshake className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">
                Contratos Ativos
              </p>
            </div>
            <p className="text-[1.875rem] font-semibold text-foreground tabular-nums tracking-tight leading-none">
              {totalAtivos}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Acordos vigentes em execução</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">
                Contratos Suspensos
              </p>
            </div>
            <p className={cn(
              'text-[1.875rem] font-semibold tabular-nums tracking-tight leading-none',
              totalSuspensos > 0 ? 'text-amber-600' : 'text-foreground'
            )}>
              {totalSuspensos}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Contratos com pendência ou suspensos temporariamente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou cliente..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || statusFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}>
            Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold text-foreground">
            Contratos Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm font-medium">Nenhum contrato encontrado</p>
              {(search || statusFilter) && <p className="text-xs mt-1">Ajuste os filtros</p>}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.titulo}</TableCell>
                    <TableCell className="text-muted-foreground">{c.empresa_nome ?? '—'}</TableCell>
                    <TableCell>{PLANO_LABEL[c.plano] ?? c.plano}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(c.valor_recorrente)}</TableCell>
                    <TableCell className="text-right font-mono text-green-600">{formatCurrency(calcMRR(c))}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(c.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          c.status === 'ativo' ? 'bg-green-50 text-green-700 border-green-200' :
                          c.status === 'suspenso' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-muted text-muted-foreground'
                        }
                      >
                        {STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => abrirEditar(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            {filtered.length} contrato{filtered.length !== 1 ? 's' : ''} · Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Próximo</Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={openModal} onOpenChange={open => { if (!open) { setOpenModal(false); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContrato ? 'Editar Contrato AMC' : 'Novo Contrato AMC'}</DialogTitle>
            <DialogDescription>{editingContrato ? 'Atualize os dados do contrato.' : 'Cadastre um novo contrato de manutenção recorrente.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4 pt-2">
            {apiError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{apiError}</div>
            )}
            <div className="space-y-1.5">
              <Label>Título do Contrato *</Label>
              <Input
                placeholder="Ex: Manutenção PMOC Shopping"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente (Empresa) *</Label>
              <Select value={form.empresa_id} onValueChange={v => setForm(f => ({ ...f, empresa_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {empresas.map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.nome_fantasia || e.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select value={form.plano} onValueChange={v => setForm(f => ({ ...f, plano: v as ContratoAMC['plano'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLANO_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1500.00"
                  value={form.valor_recorrente}
                  onChange={e => setForm(f => ({ ...f, valor_recorrente: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Início *</Label>
                <Input
                  type="date"
                  value={form.data_inicio}
                  onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Término</Label>
                <Input
                  type="date"
                  value={form.data_fim}
                  onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpenModal(false); resetForm(); }}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingContrato ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir contrato?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita. O contrato será removido permanentemente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleExcluir}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
