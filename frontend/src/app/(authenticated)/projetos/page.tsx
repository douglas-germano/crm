'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import {
  Plus, Loader2, Pencil, Trash2, Calendar, Users as UsersIcon,
  FolderKanban, Search, Filter
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

const fetcher = (url: string) => api.get(url).then(r => r.data)

const STATUS_LABELS: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  planejamento: 'bg-blue-100 text-blue-700 border-blue-200',
  em_andamento: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pausado: 'bg-amber-100 text-amber-700 border-amber-200',
  concluido: 'bg-green-100 text-green-700 border-green-200',
  cancelado: 'bg-red-100 text-red-700 border-red-200',
}

const PRIORIDADE_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
}

const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: 'bg-slate-100 text-slate-600',
  media: 'bg-blue-100 text-blue-600',
  alta: 'bg-orange-100 text-orange-600',
  critica: 'bg-red-100 text-red-600',
}

interface Projeto {
  id: number
  uuid: string
  nome: string
  descricao: string
  status: string
  prioridade: string
  data_inicio: string | null
  data_previsao_fim: string | null
  data_fim: string | null
  valor_contrato: number
  percentual_concluido: number
  empresa_id: number | null
  empresa_nome: string | null
  gerente_id: number | null
  gerente_nome: string | null
  negocio_id: number | null
  negocio_nome: string | null
  total_tarefas: number
  total_tarefas_concluidas: number
  data_criacao: string
}

interface FormData {
  nome: string
  descricao: string
  status: string
  prioridade: string
  data_inicio: string
  data_previsao_fim: string
  valor_contrato: string
  empresa_id: string
  gerente_id: string
  negocio_id: string
}

const EMPTY_FORM: FormData = {
  nome: '', descricao: '', status: 'planejamento', prioridade: 'media',
  data_inicio: '', data_previsao_fim: '', valor_contrato: '',
  empresa_id: '', gerente_id: '', negocio_id: '',
}

export default function ProjetosPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('')
  const [busca, setBusca] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingProjeto, setDeletingProjeto] = useState<Projeto | null>(null)
  const [apiError, setApiError] = useState('')
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM })

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  if (busca) params.set('busca', busca)

  const { data: projetos = [], mutate, isLoading } = useSWR(
    `/api/projetos${params.toString() ? '?' + params : ''}`,
    fetcher
  )

  const { data: empresas = [] } = useSWR('/api/empresas', fetcher)
  const { data: usuariosData } = useSWR('/api/usuarios', fetcher)
  const { data: negocios = [] } = useSWR('/api/negocios', fetcher)
  const usuarios = usuariosData?.usuarios ?? usuariosData ?? []

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      setApiError('Nome é obrigatório')
      return
    }
    setLoading(true)
    setApiError('')
    try {
      const payload = {
        ...form,
        valor_contrato: form.valor_contrato ? Number(form.valor_contrato) : 0,
        empresa_id: form.empresa_id ? Number(form.empresa_id) : undefined,
        gerente_id: form.gerente_id ? Number(form.gerente_id) : undefined,
        negocio_id: form.negocio_id ? Number(form.negocio_id) : undefined,
      }
      await api.post('/api/projetos', payload)
      setForm({ ...EMPTY_FORM })
      setShowCreateModal(false)
      mutate()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } }
      setApiError(error.response?.data?.erro || 'Erro ao criar projeto')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingProjeto) return
    setLoading(true)
    setApiError('')
    try {
      await api.delete(`/api/projetos/${deletingProjeto.id}`)
      setShowDeleteModal(false)
      setDeletingProjeto(null)
      mutate()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } }
      setApiError(error.response?.data?.erro || 'Erro ao excluir projeto')
    } finally {
      setLoading(false)
    }
  }

  const projetosList: Projeto[] = Array.isArray(projetos) ? projetos : []

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Projetos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seus projetos e acompanhe o progresso
          </p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY_FORM }); setApiError(''); setShowCreateModal(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar projetos..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : projetosList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FolderKanban className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">Nenhum projeto encontrado</p>
            <p className="text-xs mt-1">Crie seu primeiro projeto para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projetosList.map((projeto) => (
            <Card
              key={projeto.id}
              className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-brand-300"
              onClick={() => router.push(`/projetos/${projeto.id}`)}
            >
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="font-semibold text-sm truncate group-hover:text-brand-700 transition-colors">
                      {projeto.nome}
                    </h3>
                    {projeto.empresa_nome && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {projeto.empresa_nome}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={PRIORIDADE_COLORS[projeto.prioridade] || ''}>
                      {PRIORIDADE_LABELS[projeto.prioridade] || projeto.prioridade}
                    </Badge>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  <Badge variant="outline" className={STATUS_COLORS[projeto.status] || ''}>
                    {STATUS_LABELS[projeto.status] || projeto.status}
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Progresso</span>
                    <span className="text-xs font-semibold text-brand-700">
                      {Math.round(projeto.percentual_concluido)}%
                    </span>
                  </div>
                  <div className="h-2 bg-steel-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-brand-500 to-accent-500"
                      style={{ width: `${projeto.percentual_concluido}%` }}
                    />
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    {projeto.data_previsao_fim && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(projeto.data_previsao_fim)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-3 w-3" />
                      {projeto.total_tarefas_concluidas}/{projeto.total_tarefas}
                    </span>
                  </div>
                  {projeto.gerente_nome && (
                    <span className="flex items-center gap-1">
                      <UsersIcon className="h-3 w-3" />
                      {projeto.gerente_nome}
                    </span>
                  )}
                </div>

                {/* Value */}
                {projeto.valor_contrato > 0 && (
                  <div className="mt-3 pt-3 border-t border-steel-100">
                    <span className="text-sm font-semibold text-brand-700">
                      {formatCurrency(projeto.valor_contrato)}
                    </span>
                  </div>
                )}

                {/* Actions (on hover) */}
                <div className="mt-3 pt-3 border-t border-steel-100 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingProjeto(projeto)
                      setApiError('')
                      setShowDeleteModal(true)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => { if (!open) { setShowCreateModal(false); setApiError('') } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
            <DialogDescription>Preencha os dados para criar um novo projeto.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {apiError && (
              <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {apiError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORIDADE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={form.data_inicio}
                  onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_previsao_fim">Previsão de Fim</Label>
                <Input
                  id="data_previsao_fim"
                  type="date"
                  value={form.data_previsao_fim}
                  onChange={e => setForm(f => ({ ...f, data_previsao_fim: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor_contrato">Valor do Contrato (R$)</Label>
                <Input
                  id="valor_contrato"
                  type="number"
                  step="0.01"
                  value={form.valor_contrato}
                  onChange={e => setForm(f => ({ ...f, valor_contrato: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select
                  value={form.empresa_id || 'none'}
                  onValueChange={v => setForm(f => ({ ...f, empresa_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {(Array.isArray(empresas) ? empresas : []).map((e: { id: number; razao_social: string }) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gerente do Projeto</Label>
                <Select
                  value={form.gerente_id || 'none'}
                  onValueChange={v => setForm(f => ({ ...f, gerente_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Eu mesmo</SelectItem>
                    {(Array.isArray(usuarios) ? usuarios : []).map((u: { id: number; nome: string }) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Negócio Vinculado</Label>
                <Select
                  value={form.negocio_id || 'none'}
                  onValueChange={v => setForm(f => ({ ...f, negocio_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {(Array.isArray(negocios) ? negocios : []).map((n: { id: number; nome: string; valor: number }) => (
                      <SelectItem key={n.id} value={String(n.id)}>
                        {n.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); setApiError('') }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Projeto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteModal && deletingProjeto !== null} onOpenChange={(open) => { if (!open) { setShowDeleteModal(false); setDeletingProjeto(null); setApiError('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o projeto <strong>{deletingProjeto?.nome}</strong>?
              Todas as tarefas associadas também serão excluídas. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {apiError && (
            <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              {apiError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeletingProjeto(null); setApiError('') }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
