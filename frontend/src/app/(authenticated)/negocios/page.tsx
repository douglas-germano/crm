'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import api from '@/lib/api'
import { formatCurrency, statusColor } from '@/lib/utils'
import { Plus, Loader2, Pencil, Trash2, Search } from 'lucide-react'
import { useToast } from '@/contexts/toast-context'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const fetcher = (url: string) => api.get(url).then(r => r.data)

const STATUS_OPTIONS = ['aberto', 'ganho', 'perdido']
const PER_PAGE = 12

interface Negocio {
  id: number
  nome: string
  valor: number
  tipo: string
  probabilidade: number
  status: string
  estagio?: string | { nome: string; cor?: string }
  data_previsao_fechamento: string
  lead_id?: number
  pipeline_id?: number
  servico_id?: number
  lead?: { nome: string }
  responsavel?: string | { nome: string }
}

interface FormData {
  nome: string
  lead_id: string
  pipeline_id: string
  servico_id: string
  valor: string
  tipo: string
  status: string
  probabilidade: number
  data_previsao_fechamento: string
}

interface FormErrors {
  nome?: string
  lead_id?: string
  pipeline_id?: string
}

const EMPTY_FORM: FormData = {
  nome: '', lead_id: '', pipeline_id: '', servico_id: '', valor: '',
  tipo: '', status: 'aberto', probabilidade: 50, data_previsao_fechamento: ''
}

export default function NegociosPage() {
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingNegocio, setDeletingNegocio] = useState<Negocio | null>(null)
  const [apiError, setApiError] = useState('')
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM })

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)

  const { data: negociosRaw = [], mutate, isLoading } = useSWR(
    `/api/negocios${params.toString() ? '?' + params : ''}`,
    fetcher
  )

  const { data: leadsData } = useSWR('/api/leads?per_page=100', fetcher)
  const { data: pipelinesData } = useSWR('/api/pipelines', fetcher)
  const { data: servicos = [] } = useSWR('/api/servicos', fetcher)

  const leads = leadsData?.leads ?? []
  const pipelines = pipelinesData?.pipelines ?? pipelinesData ?? []

  const allNegocios: Negocio[] = Array.isArray(negociosRaw) ? negociosRaw : []

  const filtered = useMemo(() => {
    if (!search.trim()) return allNegocios
    const term = search.toLowerCase()
    return allNegocios.filter(n =>
      n.nome?.toLowerCase().includes(term) ||
      n.lead?.nome?.toLowerCase().includes(term) ||
      (typeof n.responsavel === 'string' ? n.responsavel : n.responsavel?.nome ?? '')
        .toLowerCase().includes(term)
    )
  }, [allNegocios, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1) }
  const handleStatusChange = (v: string) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}
    if (!form.nome.trim()) errors.nome = 'Nome é obrigatório'
    if (!form.lead_id) errors.lead_id = 'Lead é obrigatório'
    if (!form.pipeline_id) errors.pipeline_id = 'Pipeline é obrigatório'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const buildPayload = () => ({
    ...form,
    lead_id: form.lead_id ? Number(form.lead_id) : undefined,
    pipeline_id: form.pipeline_id ? Number(form.pipeline_id) : undefined,
    servico_id: form.servico_id ? Number(form.servico_id) : undefined,
    valor: form.valor ? Number(form.valor) : 0,
    probabilidade: form.probabilidade,
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError('')
    if (!validateForm()) return
    setLoading(true)
    try {
      await api.post('/api/negocios', buildPayload())
      setForm({ ...EMPTY_FORM })
      setFormErrors({})
      setShowCreateModal(false)
      mutate()
      toast('Negócio criado com sucesso!')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } }
      setApiError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao criar negócio')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError('')
    if (!validateForm()) return
    if (!editingId) return
    setLoading(true)
    try {
      await api.put(`/api/negocios/${editingId}`, buildPayload())
      setForm({ ...EMPTY_FORM })
      setFormErrors({})
      setShowEditModal(false)
      setEditingId(null)
      mutate()
      toast('Negócio atualizado!')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } }
      setApiError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao atualizar negócio')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingNegocio) return
    setLoading(true)
    setApiError('')
    try {
      await api.delete(`/api/negocios/${deletingNegocio.id}`)
      setShowDeleteModal(false)
      setDeletingNegocio(null)
      mutate()
      toast('Negócio excluído.', 'info')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } }
      setApiError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao excluir negócio')
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (negocio: Negocio) => {
    setForm({
      nome: negocio.nome || '',
      lead_id: negocio.lead_id ? String(negocio.lead_id) : '',
      pipeline_id: negocio.pipeline_id ? String(negocio.pipeline_id) : '',
      servico_id: negocio.servico_id ? String(negocio.servico_id) : '',
      valor: negocio.valor ? String(negocio.valor) : '',
      tipo: negocio.tipo || '',
      status: negocio.status || 'aberto',
      probabilidade: negocio.probabilidade ?? 50,
      data_previsao_fechamento: negocio.data_previsao_fechamento || '',
    })
    setEditingId(negocio.id)
    setFormErrors({})
    setApiError('')
    setShowEditModal(true)
  }

  const openCreateModal = () => {
    setForm({ ...EMPTY_FORM })
    setFormErrors({})
    setApiError('')
    setShowCreateModal(true)
  }

  const openDeleteModal = (negocio: Negocio) => {
    setDeletingNegocio(negocio)
    setApiError('')
    setShowDeleteModal(true)
  }

  const getEstagioDisplay = (estagio: Negocio['estagio']) => {
    if (!estagio) return '-'
    return typeof estagio === 'object' ? estagio?.nome : estagio
  }

  const getResponsavelDisplay = (responsavel: Negocio['responsavel']) => {
    if (!responsavel) return '-'
    return typeof responsavel === 'string' ? responsavel : responsavel?.nome ?? '-'
  }

  const renderFormFields = () => (
    <>
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
          onChange={e => {
            setForm(f => ({ ...f, nome: e.target.value }))
            if (formErrors.nome) setFormErrors(fe => ({ ...fe, nome: undefined }))
          }}
          className={formErrors.nome ? 'border-destructive' : ''}
        />
        {formErrors.nome && <p className="text-destructive text-sm">{formErrors.nome}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Lead *</Label>
          <Select
            value={form.lead_id || 'none'}
            onValueChange={v => {
              setForm(f => ({ ...f, lead_id: v === 'none' ? '' : v }))
              if (formErrors.lead_id) setFormErrors(fe => ({ ...fe, lead_id: undefined }))
            }}
          >
            <SelectTrigger className={formErrors.lead_id ? 'border-destructive' : ''}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione...</SelectItem>
              {leads.map((l: { id: number; nome: string }) => (
                <SelectItem key={l.id} value={String(l.id)}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formErrors.lead_id && <p className="text-destructive text-sm">{formErrors.lead_id}</p>}
        </div>
        <div className="space-y-2">
          <Label>Pipeline *</Label>
          <Select
            value={form.pipeline_id || 'none'}
            onValueChange={v => {
              setForm(f => ({ ...f, pipeline_id: v === 'none' ? '' : v }))
              if (formErrors.pipeline_id) setFormErrors(fe => ({ ...fe, pipeline_id: undefined }))
            }}
          >
            <SelectTrigger className={formErrors.pipeline_id ? 'border-destructive' : ''}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione...</SelectItem>
              {pipelines.map((p: { id: number; nome: string }) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formErrors.pipeline_id && <p className="text-destructive text-sm">{formErrors.pipeline_id}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            value={form.valor}
            onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.tipo || 'none'} onValueChange={v => setForm(f => ({ ...f, tipo: v === 'none' ? '' : v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione...</SelectItem>
              <SelectItem value="unico">Único</SelectItem>
              <SelectItem value="recorrente">Recorrente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Serviço</Label>
        <Select
          value={form.servico_id || 'none'}
          onValueChange={v => setForm(f => ({ ...f, servico_id: v === 'none' ? '' : v }))}
        >
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecione...</SelectItem>
            {(Array.isArray(servicos) ? servicos : []).map((s: { id: number; nome: string }) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={form.status || 'aberto'} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="ganho">Ganho</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Probabilidade: {form.probabilidade}%</Label>
        <input
          type="range"
          min="0"
          max="100"
          value={form.probabilidade}
          onChange={e => setForm(f => ({ ...f, probabilidade: Number(e.target.value) }))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="data_previsao">Previsão de Fechamento</Label>
        <Input
          id="data_previsao"
          type="date"
          value={form.data_previsao_fechamento}
          onChange={e => setForm(f => ({ ...f, data_previsao_fechamento: e.target.value }))}
        />
      </div>
    </>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Negócios</h2>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Negócio
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, lead..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || statusFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setStatusFilter(''); setPage(1) }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-sm">Nenhum negócio encontrado</p>
              {(search || statusFilter) && (
                <p className="text-xs mt-1">Tente ajustar os filtros</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Probabilidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((negocio) => (
                  <TableRow key={negocio.id} className="cursor-pointer" onClick={() => openEditModal(negocio)}>
                    <TableCell className="font-medium">{negocio.nome}</TableCell>
                    <TableCell>{negocio.lead?.nome ?? '-'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(negocio.valor)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getEstagioDisplay(negocio.estagio)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[80px]">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${negocio.probabilidade}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium w-8">{negocio.probabilidade}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor(negocio.status)}>
                        {negocio.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{getResponsavelDisplay(negocio.responsavel)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); openEditModal(negocio) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); openDeleteModal(negocio) }}>
                          <Trash2 className="h-4 w-4" />
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
            {filtered.length} negócio{filtered.length !== 1 ? 's' : ''} · Página {currentPage} de {totalPages}
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
      <Dialog open={showCreateModal} onOpenChange={open => { if (!open) { setShowCreateModal(false); setApiError(''); setFormErrors({}) } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Negócio</DialogTitle>
            <DialogDescription>Preencha os dados para criar um novo negócio.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {renderFormFields()}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); setApiError(''); setFormErrors({}) }}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={open => { if (!open) { setShowEditModal(false); setApiError(''); setFormErrors({}) } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Negócio</DialogTitle>
            <DialogDescription>Atualize as informações do negócio.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            {renderFormFields()}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setApiError(''); setFormErrors({}) }}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal && deletingNegocio !== null} onOpenChange={open => { if (!open) { setShowDeleteModal(false); setDeletingNegocio(null); setApiError('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deletingNegocio?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {apiError && (
            <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{apiError}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeletingNegocio(null); setApiError('') }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
