'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardSignature, Eye, FileText, Loader2, Plus } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function RelatoriosInspectPage() {
  const { toast } = useToast();
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemServico | null>(null);
  const [form, setForm] = useState({ titulo: '', resumo: '', conclusao: '' });
  const [saving, setSaving] = useState(false);

  const { data: ordensRaw, mutate, isLoading } = useSWR('/api/v1/inspect/ordens', fetcher);
  const ordens: OrdemServico[] = Array.isArray(ordensRaw) ? ordensRaw : [];
  const ordensRelatorio = useMemo(
    () => ordens.filter((ordem) => ordem.status === 'concluida' || ordem.status === 'em_campo'),
    [ordens],
  );

  const openCreate = (ordem: OrdemServico) => {
    setSelectedOrdem(ordem);
    setForm({ titulo: `Relatório técnico - ${ordem.codigo || ordem.titulo}`, resumo: '', conclusao: '' });
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOrdem) return;
    setSaving(true);
    try {
      await api.post(`/api/v1/inspect/ordens/${selectedOrdem.id}/relatorios`, {
        titulo: form.titulo,
        status: 'rascunho',
        conteudo: {
          resumo: form.resumo,
          conclusao: form.conclusao,
        },
      });
      toast('Relatório técnico criado com sucesso!');
      setSelectedOrdem(null);
      mutate();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } };
      toast(error.response?.data?.erro || 'Erro ao criar relatório');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Relatórios Técnicos</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Emissão e acompanhamento de relatórios vinculados às ordens de campo
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white">
          <CardContent className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Ordens elegíveis</p>
            <p className="mt-3 text-[1.875rem] font-semibold leading-none">{ordensRelatorio.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Concluídas</p>
            <p className="mt-3 text-[1.875rem] font-semibold leading-none">{ordens.filter((ordem) => ordem.status === 'concluida').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Em campo</p>
            <p className="mt-3 text-[1.875rem] font-semibold leading-none">{ordens.filter((ordem) => ordem.status === 'em_campo').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="border-b">
          <CardTitle>Ordens para relatório</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando relatórios...
            </div>
          ) : ordensRelatorio.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Nenhuma ordem elegível para relatório
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordensRelatorio.map((ordem) => (
                    <TableRow key={ordem.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ClipboardSignature className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{ordem.titulo}</div>
                            <div className="text-xs text-muted-foreground">{ordem.codigo}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{ordem.empresa_nome}</TableCell>
                      <TableCell><Badge variant="outline">{ordem.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/inspect/ordens/detalhe?id=${ordem.id}`}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Detalhes</span>
                            </Link>
                          </Button>
                          <Button size="sm" onClick={() => openCreate(ordem)}>
                            <Plus className="h-4 w-4" />
                            <span className="sr-only">Criar relatório</span>
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

      <Dialog open={!!selectedOrdem} onOpenChange={(open) => !open && setSelectedOrdem(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Novo Relatório Técnico</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.titulo} onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Resumo</Label>
              <Textarea value={form.resumo} onChange={(event) => setForm((prev) => ({ ...prev, resumo: event.target.value }))} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Conclusão</Label>
              <Textarea value={form.conclusao} onChange={(event) => setForm((prev) => ({ ...prev, conclusao: event.target.value }))} rows={4} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelectedOrdem(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Criar Relatório
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
