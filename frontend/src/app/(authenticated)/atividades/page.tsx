'use client';

import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import { useToast } from '@/contexts/toast-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, Pencil, Trash2, CheckCircle2, Clock, XCircle, Activity } from 'lucide-react';
import type { Negocio, AtividadeNegocio } from '@/types';

const fetcher = (url: string) => api.get(url).then(r => r.data);

const TIPO_OPTIONS = ['ligacao', 'email', 'reuniao', 'visita', 'proposta', 'follow_up', 'outro'];
const TIPO_LABEL: Record<string, string> = {
  ligacao: 'Ligação', email: 'E-mail', reuniao: 'Reunião',
  visita: 'Visita', proposta: 'Proposta', follow_up: 'Follow-up', outro: 'Outro',
};

const STATUS_STYLES: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  concluida: 'bg-green-50 text-green-700 border-green-200',
  cancelada: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_ICON = {
  pendente: Clock,
  concluida: CheckCircle2,
  cancelada: XCircle,
};

const EMPTY_FORM = {
  tipo: 'ligacao',
  titulo: '',
  descricao: '',
  data_agendada: '',
  status: 'pendente' as AtividadeNegocio['status'],
  resultado: '',
};

export default function AtividadesPage() {
  const { toast } = useToast();
  const [negocioId, setNegocioId] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAtividade, setDeletingAtividade] = useState<AtividadeNegocio | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: negociosRaw } = useSWR('/api/negocios', fetcher);
  const negocios: Negocio[] = Array.isArray(negociosRaw) ? negociosRaw : [];

  const { data: atividadesRaw, mutate, isLoading } = useSWR(
    negocioId ? `/api/negocios/${negocioId}/atividades` : null,
    fetcher
  );
  const atividades: AtividadeNegocio[] = Array.isArray(atividadesRaw) ? atividadesRaw : [];

  const pendentes = atividades.filter(a => a.status === 'pendente').length;
  const concluidas = atividades.filter(a => a.status === 'concluida').length;

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setApiError('');
    setShowModal(true);
  };

  const openEdit = (a: AtividadeNegocio) => {
    setForm({
      tipo: a.tipo,
      titulo: a.titulo,
      descricao: a.descricao ?? '',
      data_agendada: a.data_agendada?.slice(0, 16) ?? '',
      status: a.status,
      resultado: a.resultado ?? '',
    });
    setEditingId(a.id);
    setApiError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!negocioId) return;
    if (!form.titulo.trim() || !form.data_agendada) {
      setApiError('Título e data são obrigatórios');
      return;
    }
    setLoading(true);
    setApiError('');
    try {
      if (editingId) {
        await api.put(`/api/negocios/${negocioId}/atividades/${editingId}`, form);
        toast('Atividade atualizada!');
      } else {
        await api.post(`/api/negocios/${negocioId}/atividades`, form);
        toast('Atividade criada!');
      }
      setShowModal(false);
      mutate();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } };
      setApiError(error.response?.data?.erro || 'Erro ao salvar atividade');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAtividade || !negocioId) return;
    setLoading(true);
    try {
      await api.delete(`/api/negocios/${negocioId}/atividades/${deletingAtividade.id}`);
      setShowDeleteModal(false);
      setDeletingAtividade(null);
      mutate();
      toast('Atividade removida.', 'info');
    } catch {
      toast('Erro ao remover atividade.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Atividades</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie ligações, reuniões, e-mails e follow-ups por negócio
          </p>
        </div>
        <Button onClick={openCreate} disabled={!negocioId}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      {/* Negocio Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px] space-y-1">
              <Label className="text-xs">Selecione o Negócio</Label>
              <Select value={negocioId} onValueChange={setNegocioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um negócio para ver as atividades..." />
                </SelectTrigger>
                <SelectContent>
                  {negocios.map(n => (
                    <SelectItem key={n.id} value={String(n.id)}>
                      {n.nome} {n.lead?.nome ? `— ${n.lead.nome}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {negocioId && (
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{pendentes}</span>
                  <span className="text-muted-foreground">pendentes</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{concluidas}</span>
                  <span className="text-muted-foreground">concluídas</span>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      {!negocioId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">Selecione um negócio acima</p>
            <p className="text-xs mt-1">As atividades do negócio serão exibidas aqui</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : atividades.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">Nenhuma atividade registrada</p>
            <p className="text-xs mt-1">Crie a primeira atividade para este negócio</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">
              {atividades.length} atividade{atividades.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Data Agendada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atividades.map(a => {
                  const StatusIcon = STATUS_ICON[a.status] ?? Clock;
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {TIPO_LABEL[a.tipo] ?? a.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{a.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(a.data_agendada)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLES[a.status] ?? ''}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {a.status === 'pendente' ? 'Pendente' : a.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {typeof a.responsavel === 'string' ? a.responsavel : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => { setDeletingAtividade(a); setShowDeleteModal(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={open => { if (!open) setShowModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
            <DialogDescription>Registre uma atividade para este negócio.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {apiError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{apiError}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map(t => (
                      <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as AtividadeNegocio['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Ligação de follow-up"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data e Hora *</Label>
              <Input
                type="datetime-local"
                value={form.data_agendada}
                onChange={e => setForm(f => ({ ...f, data_agendada: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Detalhes da atividade..."
                rows={3}
              />
            </div>
            {form.status === 'concluida' && (
              <div className="space-y-1.5">
                <Label>Resultado</Label>
                <Textarea
                  value={form.resultado}
                  onChange={e => setForm(f => ({ ...f, resultado: e.target.value }))}
                  placeholder="Descreva o resultado da atividade..."
                  rows={2}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={open => { if (!open) { setShowDeleteModal(false); setDeletingAtividade(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Atividade</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{deletingAtividade?.titulo}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeletingAtividade(null); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
