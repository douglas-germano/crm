'use client';

import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Plus, Pencil, Trash2, Loader2, GripVertical, Check, X, ChevronRight,
  GitBranch, Circle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';

const fetcher = (url: string) => api.get(url).then(r => r.data);

const CORES_PRESET = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#78716c',
];

interface Estagio {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
}

interface Pipeline {
  id: number;
  nome: string;
  descricao?: string;
  estagios?: Estagio[];
}

// ─── Inline edit de estágio ───────────────────────────────────────────────────

function EstagioRow({
  estagio,
  onSave,
  onDelete,
}: {
  estagio: Estagio;
  onSave: (id: number, nome: string, cor: string) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(estagio.nome);
  const [cor, setCor] = useState(estagio.cor || '#6366f1');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    await onSave(estagio.id, nome.trim(), cor);
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setNome(estagio.nome);
    setCor(estagio.cor || '#6366f1');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-primary/20">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        <div className="w-4 h-4 rounded-full shrink-0 ring-2 ring-border" style={{ backgroundColor: cor }} />
        <Input
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
          className="h-7 text-sm flex-1"
          autoFocus
        />
        <div className="flex gap-1 shrink-0">
          {CORES_PRESET.map(c => (
            <button
              key={c}
              type="button"
              aria-label={`Selecionar cor ${c}`}
              className={cn(
                'w-4 h-4 rounded-full transition-transform hover:scale-110',
                cor === c && 'ring-2 ring-foreground ring-offset-1 ring-offset-background'
              )}
              style={{ backgroundColor: c }}
              onClick={() => setCor(c)}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleSave}
          disabled={saving}
          className="h-7 w-7 shrink-0"
          aria-label="Salvar estágio"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="h-7 w-7 shrink-0"
          aria-label="Cancelar edição"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group transition-colors">
      <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: estagio.cor || '#64748b' }} />
      <span className="text-sm flex-1 truncate text-foreground">{estagio.nome}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          className="h-7 w-7 text-muted-foreground"
          aria-label="Editar estágio"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(estagio.id)}
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          aria-label="Excluir estágio"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PipelineSettingsPage() {
  const { data, isLoading, mutate } = useSWR('/api/pipelines', fetcher);
  const pipelines: Pipeline[] = data?.pipelines ?? data ?? [];

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const activePipeline = selectedId
    ? pipelines.find(p => p.id === selectedId)
    : pipelines[0];
  const selected = activePipeline ?? null;

  const { data: detailData, isLoading: loadingDetail, mutate: mutateDetail } = useSWR(
    selected ? `/api/pipelines/${selected.id}` : null,
    fetcher
  );
  const estagios: Estagio[] = (detailData?.estagios ?? []).sort((a: Estagio, b: Estagio) => a.ordem - b.ordem);

  // ── Pipeline modal ──────────────────────────────────────────────────────────
  const [pipelineModal, setPipelineModal] = useState<{ open: boolean; editing?: Pipeline }>({ open: false });
  const [pNome, setPNome] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pSaving, setPSaving] = useState(false);

  const openNewPipeline = () => { setPNome(''); setPDesc(''); setPipelineModal({ open: true }); };
  const openEditPipeline = (p: Pipeline) => { setPNome(p.nome); setPDesc(p.descricao ?? ''); setPipelineModal({ open: true, editing: p }); };

  const handleSavePipeline = async () => {
    if (!pNome.trim()) return;
    setPSaving(true);
    try {
      if (pipelineModal.editing) {
        await api.put(`/api/pipelines/${pipelineModal.editing.id}`, { nome: pNome.trim(), descricao: pDesc.trim() });
      } else {
        const res = await api.post('/api/pipelines', { nome: pNome.trim(), descricao: pDesc.trim() });
        setSelectedId(res.data.pipeline?.id ?? null);
      }
      await mutate();
      setPipelineModal({ open: false });
    } finally {
      setPSaving(false);
    }
  };

  // ── Delete pipeline ─────────────────────────────────────────────────────────
  const [deletePipelineId, setDeletePipelineId] = useState<number | null>(null);
  const [deletingPipeline, setDeletingPipeline] = useState(false);

  const handleDeletePipeline = async () => {
    if (!deletePipelineId) return;
    setDeletingPipeline(true);
    try {
      await api.delete(`/api/pipelines/${deletePipelineId}`);
      if (selected?.id === deletePipelineId) setSelectedId(null);
      await mutate();
    } finally {
      setDeletingPipeline(false);
      setDeletePipelineId(null);
    }
  };

  // ── Novo estágio ────────────────────────────────────────────────────────────
  const [addingEstagio, setAddingEstagio] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaCor, setNovaCor] = useState('#6366f1');
  const [savingEstagio, setSavingEstagio] = useState(false);

  const handleCreateEstagio = async () => {
    if (!novoNome.trim() || !selected) return;
    setSavingEstagio(true);
    try {
      await api.post(`/api/pipelines/${selected.id}/estagios`, {
        nome: novoNome.trim(),
        cor: novaCor,
        ordem: estagios.length,
      });
      await mutateDetail();
      setNovoNome('');
      setNovaCor('#6366f1');
      setAddingEstagio(false);
    } finally {
      setSavingEstagio(false);
    }
  };

  const handleSaveEstagio = async (id: number, nome: string, cor: string) => {
    await api.put(`/api/pipelines/estagios/${id}`, { nome, cor });
    await mutateDetail();
  };

  // ── Delete estágio ──────────────────────────────────────────────────────────
  const [deleteEstagioId, setDeleteEstagioId] = useState<number | null>(null);
  const [deletingEstagio, setDeletingEstagio] = useState(false);

  const handleDeleteEstagio = async () => {
    if (!deleteEstagioId) return;
    setDeletingEstagio(true);
    try {
      await api.delete(`/api/pipelines/estagios/${deleteEstagioId}`);
      await mutateDetail();
    } finally {
      setDeletingEstagio(false);
      setDeleteEstagioId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Pipelines do CRM</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Crie funis e configure os estágios de cada um.</p>
        </div>
        <Button size="sm" onClick={openNewPipeline}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo pipeline
        </Button>
      </div>

      {pipelines.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GitBranch className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum pipeline criado</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Crie seu primeiro funil para organizar leads no CRM.</p>
            <Button size="sm" onClick={openNewPipeline} variant="outline">
              <Plus className="h-4 w-4 mr-1.5" />
              Criar pipeline
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-[220px_1fr] gap-4">

          {/* Lista lateral de pipelines */}
          <div className="space-y-1">
            {pipelines.map(p => {
              const active = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors border',
                    active
                      ? 'bg-muted text-foreground border-border font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground border-transparent'
                  )}
                >
                  <GitBranch className={cn('h-4 w-4 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} />
                  <span className="flex-1 truncate">{p.nome}</span>
                  <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground', active && 'rotate-90')} />
                </button>
              );
            })}
          </div>

          {/* Detalhes do pipeline selecionado */}
          {selected && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">{selected.nome}</CardTitle>
                    {selected.descricao && (
                      <CardDescription className="text-xs mt-0.5">{selected.descricao}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => openEditPipeline(selected)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                      onClick={() => setDeletePipelineId(selected.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                    Estágios
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{estagios.length}</Badge>
                  </Label>
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => { setAddingEstagio(true); setNovoNome(''); setNovaCor('#6366f1'); }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Adicionar estágio
                  </Button>
                </div>

                {loadingDetail ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {estagios.map(e => (
                      <EstagioRow
                        key={e.id}
                        estagio={e}
                        onSave={handleSaveEstagio}
                        onDelete={setDeleteEstagioId}
                      />
                    ))}

                    {estagios.length === 0 && !addingEstagio && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Circle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">Nenhum estágio. Adicione o primeiro acima.</p>
                      </div>
                    )}

                    {/* Formulário novo estágio inline */}
                    {addingEstagio && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-primary/20 mt-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                        <div className="w-4 h-4 rounded-full shrink-0 ring-2 ring-border" style={{ backgroundColor: novaCor }} />
                        <Input
                          value={novoNome}
                          onChange={e => setNovoNome(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleCreateEstagio(); if (e.key === 'Escape') setAddingEstagio(false); }}
                          placeholder="Nome do estágio..."
                          className="h-7 text-sm flex-1"
                          autoFocus
                        />
                        <div className="flex gap-1 shrink-0">
                          {CORES_PRESET.map(c => (
                            <button
                              key={c}
                              type="button"
                              aria-label={`Selecionar cor ${c}`}
                              className={cn(
                                'w-4 h-4 rounded-full transition-transform hover:scale-110',
                                novaCor === c && 'ring-2 ring-foreground ring-offset-1 ring-offset-background'
                              )}
                              style={{ backgroundColor: c }}
                              onClick={() => setNovaCor(c)}
                            />
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleCreateEstagio}
                          disabled={savingEstagio}
                          className="h-7 w-7 shrink-0"
                          aria-label="Salvar estágio"
                        >
                          {savingEstagio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setAddingEstagio(false)}
                          className="h-7 w-7 shrink-0"
                          aria-label="Cancelar novo estágio"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal criar/editar pipeline */}
      <Dialog open={pipelineModal.open} onOpenChange={o => !o && setPipelineModal({ open: false })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{pipelineModal.editing ? 'Editar pipeline' : 'Novo pipeline'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-nome">Nome <span className="text-destructive">*</span></Label>
              <Input
                id="p-nome"
                value={pNome}
                onChange={e => setPNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSavePipeline()}
                placeholder="Ex: Vendas, Pós-venda..."
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Descrição <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                id="p-desc"
                value={pDesc}
                onChange={e => setPDesc(e.target.value)}
                placeholder="Breve descrição do funil..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPipelineModal({ open: false })}>Cancelar</Button>
            <Button onClick={handleSavePipeline} disabled={!pNome.trim() || pSaving}>
              {pSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {pipelineModal.editing ? 'Salvar' : 'Criar pipeline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar excluir pipeline */}
      <Dialog open={!!deletePipelineId} onOpenChange={o => !o && setDeletePipelineId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir pipeline?</DialogTitle>
            <DialogDescription>
              Todos os estágios e posições de leads neste pipeline serão removidos. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePipelineId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeletePipeline} disabled={deletingPipeline}>
              {deletingPipeline && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar excluir estágio */}
      <Dialog open={!!deleteEstagioId} onOpenChange={o => !o && setDeleteEstagioId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir estágio?</DialogTitle>
            <DialogDescription>
              Os leads neste estágio serão removidos do pipeline. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEstagioId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteEstagio} disabled={deletingEstagio}>
              {deletingEstagio && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
