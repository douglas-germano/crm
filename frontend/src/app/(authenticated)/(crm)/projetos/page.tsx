'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import {
  Plus, Loader2, Pencil, Trash2,
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const fetcher = (url: string) => api.get(url).then(r => r.data)

const PER_PAGE = 9

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
  const [page, setPage] = useState(1)
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
    `/api/v1/crm/projetos${params.toString() ? '?' + params : ''}`,
    fetcher
  )

  const { data: empresasResp } = useSWR('/api/v1/crm/empresas?per_page=100', fetcher)
  const { data: usuariosData } = useSWR('/api/v1/core/usuarios', fetcher)
  const { data: negocios = [] } = useSWR('/api/v1/crm/negocios', fetcher)
  const empresas: { id: number; razao_social: string; nome_fantasia?: string }[] = empresasResp?.empresas ?? []
  const usuarios = usuariosData?.usuarios ?? []

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
      await api.post('/api/v1/crm/projetos', payload)
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
      await api.delete(`/api/v1/crm/projetos/${deletingProjeto.id}`)
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
  const totalPages = Math.max(1, Math.ceil(projetosList.length / PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginated = projetosList.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

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
            onChange={e => { setBusca(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
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

      {/* Projects List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : projetosList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <FolderKanban className="h-12 w-12 opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium">Nenhum projeto encontrado</p>
              <p className="text-xs mt-1">{busca || statusFilter ? 'Tente ajustar os filtros' : 'Crie seu primeiro projeto para começar'}</p>
            </div>
            {!busca && !statusFilter && (
              <Button size="sm" onClick={() => { setForm({ ...EMPTY_FORM }); setApiError(''); setShowCreateModal(true) }}>
                <Plus className="h-4 w-4 mr-1" /> Criar primeiro projeto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((projeto) => (
                  <TableRow
                    key={projeto.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/projetos/detalhe?id=${projeto.id}`)}
                  >
                    <TableCell className="min-w-[260px]">
                      <div>
                        <div className="font-medium text-foreground">{projeto.nome}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {projeto.empresa_nome || 'Sem empresa vinculada'}
                          {projeto.gerente_nome ? ` · ${projeto.gerente_nome}` : ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[projeto.status] || ''}>
                        {STATUS_LABELS[projeto.status] || projeto.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PRIORIDADE_COLORS[projeto.prioridade] || ''}>
                        {PRIORIDADE_LABELS[projeto.prioridade] || projeto.prioridade}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-steel-100">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all duration-500"
                            style={{ width: `${projeto.percentual_concluido}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-brand-700">
                          {Math.round(projeto.percentual_concluido)}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {projeto.total_tarefas_concluidas}/{projeto.total_tarefas}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(projeto.data_previsao_fim)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {projeto.valor_contrato > 0 ? formatCurrency(projeto.valor_contrato) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/projetos/detalhe?id=${projeto.id}`)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Abrir</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingProjeto(projeto)
                            setApiError('')
                            setShowDeleteModal(true)
                          }}
                        >
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
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages} ({projetosList.length} projetos)
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Próximo
            </Button>
          </div>
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
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.nome_fantasia || e.razao_social}</SelectItem>
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
                    {usuarios.map((u: { id: number; nome: string }) => (
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
