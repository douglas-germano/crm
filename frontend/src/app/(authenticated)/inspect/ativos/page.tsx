'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import { Ativo, Empresa } from '@/types';
import { useToast } from '@/contexts/toast-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Box, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const EMPTY_FORM = {
  nome: '',
  tag_identificacao: '',
  empresa_id: '',
  categoria: 'outro',
  fabricante: '',
  modelo: '',
  numero_serie: '',
  localizacao: '',
  status: 'ativo',
};

const STATUS_CLASS: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inativo: 'bg-gray-100 text-gray-700 border-gray-200',
  manutencao: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function AtivosInspectPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [openModal, setOpenModal] = useState(false);
  const [editingAtivo, setEditingAtivo] = useState<Ativo | null>(null);
  const [deleteAtivo, setDeleteAtivo] = useState<Ativo | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: rawAtivos, mutate, isLoading } = useSWR('/api/v1/inspect/ativos', fetcher);
  const { data: empresasResp } = useSWR('/api/v1/crm/empresas?per_page=200', fetcher);

  const ativos: Ativo[] = Array.isArray(rawAtivos) ? rawAtivos : rawAtivos?.ativos ?? [];
  const empresas: Empresa[] = empresasResp?.empresas ?? [];

  const filtered = useMemo(() => {
    const termo = search.trim().toLowerCase();
    return ativos.filter((ativo) => {
      const matchesStatus = statusFilter === 'todos' || ativo.status === statusFilter;
      const matchesSearch = !termo || [
        ativo.nome,
        ativo.tag_identificacao,
        ativo.empresa_nome,
        ativo.fabricante,
        ativo.modelo,
        ativo.localizacao,
      ].some((value) => value?.toLowerCase().includes(termo));
      return matchesStatus && matchesSearch;
    });
  }, [ativos, search, statusFilter]);

  const resetForm = () => {
    setEditingAtivo(null);
    setForm({ ...EMPTY_FORM });
    setApiError('');
  };

  const openCreate = () => {
    resetForm();
    setOpenModal(true);
  };

  const openEdit = (ativo: Ativo) => {
    setEditingAtivo(ativo);
    setForm({
      nome: ativo.nome,
      tag_identificacao: ativo.tag_identificacao,
      empresa_id: String(ativo.empresa_id),
      categoria: ativo.categoria,
      fabricante: ativo.fabricante ?? '',
      modelo: ativo.modelo ?? '',
      numero_serie: ativo.numero_serie ?? '',
      localizacao: ativo.localizacao ?? '',
      status: ativo.status,
    });
    setApiError('');
    setOpenModal(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nome || !form.tag_identificacao || !form.empresa_id) {
      setApiError('Nome, tag e empresa são obrigatórios');
      return;
    }
    setSaving(true);
    setApiError('');
    try {
      const payload = {
        ...form,
        empresa_id: Number(form.empresa_id),
      };
      if (editingAtivo) {
        await api.put(`/api/v1/inspect/ativos/${editingAtivo.id}`, payload);
        toast('Ativo atualizado com sucesso!');
      } else {
        await api.post('/api/v1/inspect/ativos', payload);
        toast('Ativo criado com sucesso!');
      }
      setOpenModal(false);
      resetForm();
      mutate();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } };
      setApiError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao salvar ativo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAtivo) return;
    try {
      await api.delete(`/api/v1/inspect/ativos/${deleteAtivo.id}`);
      toast('Ativo excluído com sucesso!');
      mutate();
    } catch {
      toast('Erro ao excluir ativo');
    } finally {
      setDeleteAtivo(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Ativos</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Cadastro técnico de máquinas, equipamentos e pontos de inspeção
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Ativo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white">
          <CardContent className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
            <p className="mt-3 text-[1.875rem] font-semibold leading-none">{ativos.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Ativos operacionais</p>
            <p className="mt-3 text-[1.875rem] font-semibold leading-none">{ativos.filter((ativo) => ativo.status === 'ativo').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Em manutenção</p>
            <p className="mt-3 text-[1.875rem] font-semibold leading-none">{ativos.filter((ativo) => ativo.status === 'manutencao').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Inventário técnico</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar ativo, tag ou cliente"
                  className="w-full pl-9 sm:w-[280px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full bg-white sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando ativos...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Nenhum ativo encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ativo) => (
                    <TableRow key={ativo.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{ativo.nome}</div>
                            <div className="text-xs text-muted-foreground">{ativo.tag_identificacao}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{ativo.empresa_nome}</TableCell>
                      <TableCell>{ativo.categoria}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_CLASS[ativo.status] ?? STATUS_CLASS.inativo}>
                          {ativo.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(ativo)}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setDeleteAtivo(ativo)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                          </Button>
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
            <DialogTitle>{editingAtivo ? 'Editar Ativo' : 'Novo Ativo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {apiError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{apiError}</div>}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tag</Label>
                <Input value={form.tag_identificacao} onChange={(event) => setForm((prev) => ({ ...prev, tag_identificacao: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={form.empresa_id} onValueChange={(value) => setForm((prev) => ({ ...prev, empresa_id: value }))}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => <SelectItem key={empresa.id} value={String(empresa.id)}>{empresa.razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(value) => setForm((prev) => ({ ...prev, categoria: value }))}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hvac">HVAC</SelectItem>
                    <SelectItem value="nr12">NR12</SelectItem>
                    <SelectItem value="nr13">NR13</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fabricante</Label>
                <Input value={form.fabricante} onChange={(event) => setForm((prev) => ({ ...prev, fabricante: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input value={form.modelo} onChange={(event) => setForm((prev) => ({ ...prev, modelo: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Número de série</Label>
                <Input value={form.numero_serie} onChange={(event) => setForm((prev) => ({ ...prev, numero_serie: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Localização</Label>
                <Input value={form.localizacao} onChange={(event) => setForm((prev) => ({ ...prev, localizacao: event.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteAtivo} onOpenChange={(open) => !open && setDeleteAtivo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir ativo</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirma a exclusão de {deleteAtivo?.nome}? Essa ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAtivo(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
