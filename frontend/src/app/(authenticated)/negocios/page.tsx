'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import api from '@/lib/api'
import { formatCurrency, statusColor } from '@/lib/utils'
import { Plus, Loader2, Pencil, Trash2, Search, ChevronRight, CheckCircle2, Clock, XCircle, Activity } from 'lucide-react'
import { useToast } from '@/contexts/toast-context'
import { AtividadeNegocio } from '@/types'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

const fetcher = (url: string) => api.get(url).then(r => r.data)

const STATUS_OPTIONS = ['aberto', 'ganho', 'perdido']
const PER_PAGE = 12

const TIPO_ATIVIDADE_OPTIONS = [
  { value: 'ligacao', label: 'Ligação' },
  { value: 'email', label: 'E-mail' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'visita', label: 'Visita' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'outro', label: 'Outro' },
]

const STATUS_ATIVIDADE_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
]

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

interface AtividadeFormData {
  tipo: string
  titulo: string
  data_agendada: string
  status: string
  descricao: string
  resultado: string
}

const EMPTY_FORM: FormData = {
  nome: '', lead_id: '', pipeline_id: '', servico_id: '', valor: '',
  tipo: '', status: 'aberto', probabilidade: 50, data_previsao_fechamento: ''
}

const EMPTY_ATIVIDADE_FORM: AtividadeFormData = {
  tipo: 'ligacao',
  titulo: '',
  data_agendada: '',
  status: 'pendente',
  descricao: '',
  resultado: '',
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

  // Sheet / detail panel state
  const [selectedNegocio, setSelectedNegocio] = useState<Negocio | null>(null)

  // Atividades state
  const [showAtividadeModal, setShowAtividadeModal] = useState(false)
  const [editingAtividadeId, setEditingAtividadeId] = useState<number | null>(null)
  const [atividadeForm, setAtividadeForm] = useState<AtividadeFormData>({ ...EMPTY_ATIVIDADE_FORM })
  const [atividadeApiError, setAtividadeApiError] = useState('')
  const [atividadeLoading, setAtividadeLoading] = useState(false)
  const [deletingAtividade, setDeletingAtividade] = useState<AtividadeNegocio | null>(null)
  const [showDeleteAtividadeModal, setShowDeleteAtividadeModal] = useState(false)

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)

  const { data: negociosRaw = [], mutate, isLoading } = useSWR(
    `/api/negocios${params.toString() ? '?' + params : ''}`,
    fetcher
  )

  const { data: leadsData } = useSWR('/api/leads?per_page=100', fetcher)
  const { data: pipelinesData } = useSWR('/api/pipelines', fetcher)
  const { data: servicos = [] } = useSWR('/api/servicos', fetcher)

  // Atividades SWR — key is null when no negocio selected
  const { data: atividadesRaw = [], mutate: mutateAtividades, isLoading: atividadesLoading } = useSWR(
    selectedNegocio ? `/api/negocios/${selectedNegocio.id}/atividades` : null,
    fetcher
  )
  const atividades: AtividadeNegocio[] = Array.isArray(atividadesRaw) ? atividadesRaw : []

  // Global atividades tab state (independent from sheet)
  const [tabNegId, setTabNegId] = useState<string>('')
  const [tabShowModal, setTabShowModal] = useState(false)
  const [tabEditingId, setTabEditingId] = useState<number | null>(null)
  const [tabAtivForm, setTabAtivForm] = useState<AtividadeFormData>({ ...EMPTY_ATIVIDADE_FORM })
  const [tabAtivError, setTabAtivError] = useState('')
  const [tabAtivLoadingState, setTabAtivLoadingState] = useState(false)
  const [tabDeletingAtiv, setTabDeletingAtiv] = useState<AtividadeNegocio | null>(null)
  const [tabShowDeleteModal, setTabShowDeleteModal] = useState(false)

  const { data: tabAtivRaw = [], mutate: mutateTabAtiv, isLoading: tabAtivIsLoading } = useSWR(
    tabNegId ? `/api/negocios/${tabNegId}/atividades` : null, fetcher
  )
  const tabAtividades: AtividadeNegocio[] = Array.isArray(tabAtivRaw) ? tabAtivRaw : []

  const tabOpenCreate = () => { setTabAtivForm({ ...EMPTY_ATIVIDADE_FORM }); setTabEditingId(null); setTabAtivError(''); setTabShowModal(true) }
  const tabOpenEdit = (a: AtividadeNegocio) => {
    setTabAtivForm({ tipo: a.tipo, titulo: a.titulo, descricao: a.descricao ?? '', data_agendada: a.data_agendada?.slice(0, 16) ?? '', status: a.status, resultado: a.resultado ?? '' })
    setTabEditingId(a.id); setTabAtivError(''); setTabShowModal(true)
  }
  const handleTabAtivSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tabNegId) return
    if (!tabAtivForm.titulo.trim() || !tabAtivForm.data_agendada) { setTabAtivError('Título e data são obrigatórios'); return }
    setTabAtivLoadingState(true); setTabAtivError('')
    try {
      if (tabEditingId) { await api.put(`/api/negocios/${tabNegId}/atividades/${tabEditingId}`, tabAtivForm); toast('Atividade atualizada!') }
      else { await api.post(`/api/negocios/${tabNegId}/atividades`, tabAtivForm); toast('Atividade criada!') }
      setTabShowModal(false); mutateTabAtiv()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } }
      setTabAtivError(error.response?.data?.erro || 'Erro ao salvar atividade')
    } finally { setTabAtivLoadingState(false) }
  }
  const handleTabAtivDelete = async () => {
    if (!tabDeletingAtiv || !tabNegId) return
    setTabAtivLoadingState(true)
    try {
      await api.delete(`/api/negocios/${tabNegId}/atividades/${tabDeletingAtiv.id}`)
      setTabShowDeleteModal(false); setTabDeletingAtiv(null); mutateTabAtiv(); toast('Atividade removida.', 'info')
    } catch { toast('Erro ao remover atividade.', 'error') }
    finally { setTabAtivLoadingState(false) }
  }

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

  // ---- Atividades helpers ----

  const openCreateAtividadeModal = () => {
    setAtividadeForm({ ...EMPTY_ATIVIDADE_FORM })
    setEditingAtividadeId(null)
    setAtividadeApiError('')
    setShowAtividadeModal(true)
  }

  const openEditAtividadeModal = (at: AtividadeNegocio) => {
    setAtividadeForm({
      tipo: at.tipo,
      titulo: at.titulo,
      data_agendada: at.data_agendada ? at.data_agendada.slice(0, 16) : '',
      status: at.status,
      descricao: at.descricao || '',
      resultado: at.resultado || '',
    })
    setEditingAtividadeId(at.id)
    setAtividadeApiError('')
    setShowAtividadeModal(true)
  }

  const handleSaveAtividade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedNegocio) return
    setAtividadeApiError('')
    setAtividadeLoading(true)
    const payload = {
      tipo: atividadeForm.tipo,
      titulo: atividadeForm.titulo,
      data_agendada: atividadeForm.data_agendada,
      status: atividadeForm.status,
      descricao: atividadeForm.descricao || undefined,
      resultado: atividadeForm.status === 'concluida' ? atividadeForm.resultado || undefined : undefined,
    }
    try {
      if (editingAtividadeId) {
        await api.put(`/api/negocios/${selectedNegocio.id}/atividades/${editingAtividadeId}`, payload)
        toast('Atividade atualizada!')
      } else {
        await api.post(`/api/negocios/${selectedNegocio.id}/atividades`, payload)
        toast('Atividade criada!')
      }
      setShowAtividadeModal(false)
      setEditingAtividadeId(null)
      mutateAtividades()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } }
      setAtividadeApiError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao salvar atividade')
    } finally {
      setAtividadeLoading(false)
    }
  }

  const handleDeleteAtividade = async () => {
    if (!selectedNegocio || !deletingAtividade) return
    setAtividadeLoading(true)
    try {
      await api.delete(`/api/negocios/${selectedNegocio.id}/atividades/${deletingAtividade.id}`)
      setShowDeleteAtividadeModal(false)
      setDeletingAtividade(null)
      mutateAtividades()
      toast('Atividade excluída.', 'info')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } }
      toast(error.response?.data?.erro || error.response?.data?.message || 'Erro ao excluir atividade', 'error')
    } finally {
      setAtividadeLoading(false)
    }
  }

  const formatDateDisplay = (d?: string) => {
    if (!d) return '-'
    try {
      return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    } catch {
      return d
    }
  }

  const atividadeStatusBadge = (status: string) => {
    if (status === 'concluida') return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Concluída</Badge>
    if (status === 'cancelada') return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>
  }

  const tipoLabel = (tipo: string) => TIPO_ATIVIDADE_OPTIONS.find(t => t.value === tipo)?.label ?? tipo

  const pendentes = atividades.filter(a => a.status === 'pendente').length
  const concluidas = atividades.filter(a => a.status === 'concluida').length

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
      <Tabs defaultValue="negocios">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="negocios">Negócios</TabsTrigger>
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
          </TabsList>
          <div>
            <TabsContent value="negocios" className="mt-0">
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Negócio
              </Button>
            </TabsContent>
            <TabsContent value="atividades" className="mt-0">
              <Button onClick={tabOpenCreate} disabled={!tabNegId}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Atividade
              </Button>
            </TabsContent>
          </div>
        </div>

      {/* ── Tab: Negócios ── */}
      <TabsContent value="negocios" className="mt-0">
      <div className="space-y-6">

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
                  <TableRow key={negocio.id} className="cursor-pointer" onClick={() => setSelectedNegocio(negocio)}>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          title="Ver detalhes"
                          onClick={(e) => { e.stopPropagation(); setSelectedNegocio(negocio) }}>
                          <ChevronRight className="h-4 w-4" />
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

      {/* ── Detail Sheet ── */}
      <Sheet open={selectedNegocio !== null} onOpenChange={open => { if (!open) setSelectedNegocio(null) }}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto flex flex-col gap-0 p-0">
          {selectedNegocio && (
            <>
              <SheetHeader className="px-6 py-5 border-b">
                <div className="flex items-start justify-between gap-3">
                  <SheetTitle className="text-lg font-semibold leading-tight">{selectedNegocio.nome}</SheetTitle>
                  <Badge variant="outline" className={statusColor(selectedNegocio.status) + ' shrink-0'}>
                    {selectedNegocio.status}
                  </Badge>
                </div>
              </SheetHeader>

              <Tabs defaultValue="dados" className="flex-1 flex flex-col">
                <TabsList className="mx-6 mt-4 w-fit">
                  <TabsTrigger value="dados">Dados</TabsTrigger>
                  <TabsTrigger value="atividades" className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Atividades
                    {atividades.length > 0 && (
                      <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">{atividades.length}</span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* ── DADOS TAB ── */}
                <TabsContent value="dados" className="px-6 py-4 flex-1">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Lead</dt>
                      <dd className="text-sm text-gray-900">{selectedNegocio.lead?.nome ?? '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Valor</dt>
                      <dd className="text-sm text-gray-900 font-semibold">{formatCurrency(selectedNegocio.valor)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Probabilidade</dt>
                      <dd className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedNegocio.probabilidade}%` }} />
                        </div>
                        <span className="text-sm text-gray-900">{selectedNegocio.probabilidade}%</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</dt>
                      <dd>
                        <Badge variant="outline" className={statusColor(selectedNegocio.status)}>
                          {selectedNegocio.status}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Estágio</dt>
                      <dd className="text-sm text-gray-900">{getEstagioDisplay(selectedNegocio.estagio)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Previsão de Fechamento</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedNegocio.data_previsao_fechamento
                          ? new Date(selectedNegocio.data_previsao_fechamento + 'T00:00:00').toLocaleDateString('pt-BR')
                          : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo</dt>
                      <dd className="text-sm text-gray-900 capitalize">{selectedNegocio.tipo || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Responsável</dt>
                      <dd className="text-sm text-gray-900">{getResponsavelDisplay(selectedNegocio.responsavel)}</dd>
                    </div>
                  </dl>
                </TabsContent>

                {/* ── ATIVIDADES TAB ── */}
                <TabsContent value="atividades" className="px-6 py-4 flex-1 flex flex-col gap-4">
                  {/* Stats + action row */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-2.5 py-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{pendentes} pendente{pendentes !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-2.5 py-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{concluidas} concluída{concluidas !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={openCreateAtividadeModal}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Nova Atividade
                    </Button>
                  </div>

                  {/* Atividades list */}
                  {atividadesLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : atividades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <Activity className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">Nenhuma atividade registrada</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Título</TableHead>
                            <TableHead className="text-xs">Data Agendada</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {atividades.map(at => (
                            <TableRow key={at.id}>
                              <TableCell className="text-xs">{tipoLabel(at.tipo)}</TableCell>
                              <TableCell className="text-xs max-w-[140px] truncate" title={at.titulo}>{at.titulo}</TableCell>
                              <TableCell className="text-xs whitespace-nowrap">{formatDateDisplay(at.data_agendada)}</TableCell>
                              <TableCell>{atividadeStatusBadge(at.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => openEditAtividadeModal(at)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => { setDeletingAtividade(at); setShowDeleteAtividadeModal(true) }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Atividade Create/Edit Modal ── */}
      <Dialog
        open={showAtividadeModal}
        onOpenChange={open => { if (!open) { setShowAtividadeModal(false); setAtividadeApiError('') } }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAtividadeId ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
            <DialogDescription>
              {editingAtividadeId ? 'Atualize os dados da atividade.' : 'Preencha os dados para registrar uma atividade.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAtividade} className="space-y-4">
            {atividadeApiError && (
              <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {atividadeApiError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={atividadeForm.tipo} onValueChange={v => setAtividadeForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_ATIVIDADE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={atividadeForm.status} onValueChange={v => setAtividadeForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_ATIVIDADE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="at-titulo">Título *</Label>
              <Input
                id="at-titulo"
                value={atividadeForm.titulo}
                onChange={e => setAtividadeForm(f => ({ ...f, titulo: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="at-data">Data e Hora *</Label>
              <Input
                id="at-data"
                type="datetime-local"
                value={atividadeForm.data_agendada}
                onChange={e => setAtividadeForm(f => ({ ...f, data_agendada: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="at-desc">Descrição</Label>
              <Textarea
                id="at-desc"
                rows={3}
                value={atividadeForm.descricao}
                onChange={e => setAtividadeForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Detalhes da atividade..."
              />
            </div>
            {atividadeForm.status === 'concluida' && (
              <div className="space-y-2">
                <Label htmlFor="at-resultado">Resultado</Label>
                <Textarea
                  id="at-resultado"
                  rows={3}
                  value={atividadeForm.resultado}
                  onChange={e => setAtividadeForm(f => ({ ...f, resultado: e.target.value }))}
                  placeholder="Descreva o resultado obtido..."
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline"
                onClick={() => { setShowAtividadeModal(false); setAtividadeApiError('') }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={atividadeLoading}>
                {atividadeLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Atividade Confirmation ── */}
      <Dialog
        open={showDeleteAtividadeModal && deletingAtividade !== null}
        onOpenChange={open => { if (!open) { setShowDeleteAtividadeModal(false); setDeletingAtividade(null) } }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a atividade <strong>{deletingAtividade?.titulo}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteAtividadeModal(false); setDeletingAtividade(null) }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAtividade} disabled={atividadeLoading}>
              {atividadeLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      </TabsContent>

      {/* ── Tab: Atividades ── */}
      <TabsContent value="atividades" className="mt-0 space-y-4">
        {/* Negocio selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px] space-y-1">
                <Label className="text-xs">Selecione o Negócio</Label>
                <Select value={tabNegId} onValueChange={setTabNegId}>
                  <SelectTrigger><SelectValue placeholder="Escolha um negócio para ver as atividades..." /></SelectTrigger>
                  <SelectContent>
                    {allNegocios.map(n => (
                      <SelectItem key={n.id} value={String(n.id)}>
                        {n.nome} {n.lead?.nome ? `— ${n.lead.nome}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {tabNegId && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">{tabAtividades.filter(a => a.status === 'pendente').length}</span>
                    <span className="text-muted-foreground">pendentes</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{tabAtividades.filter(a => a.status === 'concluida').length}</span>
                    <span className="text-muted-foreground">concluídas</span>
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity list */}
        {!tabNegId ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm font-medium">Selecione um negócio acima</p>
              <p className="text-xs mt-1">As atividades do negócio serão exibidas aqui</p>
            </CardContent>
          </Card>
        ) : tabAtivIsLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : tabAtividades.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm font-medium">Nenhuma atividade registrada</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">{tabAtividades.length} atividade{tabAtividades.length !== 1 ? 's' : ''}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabAtividades.map(a => (
                    <TableRow key={a.id}>
                      <TableCell><Badge variant="outline" className="text-xs">{tipoLabel(a.tipo)}</Badge></TableCell>
                      <TableCell className="font-medium">{a.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateDisplay(a.data_agendada)}</TableCell>
                      <TableCell>{atividadeStatusBadge(a.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => tabOpenEdit(a)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => { setTabDeletingAtiv(a); setTabShowDeleteModal(true) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tab atividade modal */}
        <Dialog open={tabShowModal} onOpenChange={open => { if (!open) setTabShowModal(false) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{tabEditingId ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
              <DialogDescription>Registre uma atividade para este negócio.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleTabAtivSubmit} className="space-y-4 pt-1">
              {tabAtivError && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{tabAtivError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={tabAtivForm.tipo} onValueChange={v => setTabAtivForm(f => ({ ...f, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPO_ATIVIDADE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={tabAtivForm.status} onValueChange={v => setTabAtivForm(f => ({ ...f, status: v as AtividadeNegocio['status'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_ATIVIDADE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input value={tabAtivForm.titulo} onChange={e => setTabAtivForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data e Hora *</Label>
                <Input type="datetime-local" value={tabAtivForm.data_agendada} onChange={e => setTabAtivForm(f => ({ ...f, data_agendada: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={tabAtivForm.descricao} onChange={e => setTabAtivForm(f => ({ ...f, descricao: e.target.value }))} rows={3} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTabShowModal(false)}>Cancelar</Button>
                <Button type="submit" disabled={tabAtivLoadingState}>
                  {tabAtivLoadingState && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={tabShowDeleteModal} onOpenChange={open => { if (!open) { setTabShowDeleteModal(false); setTabDeletingAtiv(null) } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Remover Atividade</DialogTitle>
              <DialogDescription>Tem certeza que deseja remover <strong>{tabDeletingAtiv?.titulo}</strong>?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setTabShowDeleteModal(false); setTabDeletingAtiv(null) }}>Cancelar</Button>
              <Button variant="destructive" onClick={handleTabAtivDelete} disabled={tabAtivLoadingState}>
                {tabAtivLoadingState && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      </Tabs>
    </div>
  )
}
