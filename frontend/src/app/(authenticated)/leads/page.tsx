'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import api from '@/lib/api'
import { formatDate, statusColor } from '@/lib/utils'
import { Plus, Search, Trash2, Loader2, Pencil, CheckCircle2, Users } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/contexts/toast-context'

const fetcher = (url: string) => api.get(url).then(r => r.data)

const STATUS_OPTIONS = ['novo', 'contatado', 'qualificado', 'convertido', 'perdido']
const ORIGEM_OPTIONS = ['Site', 'Indicacao', 'Evento', 'LinkedIn', 'Outro']

interface Lead {
  id: number
  nome: string
  email: string
  telefone: string
  empresa: string
  cargo: string
  interesse: string
  origem: string
  observacoes: string
  status: string
  empresa_id?: number | null
  responsavel?: string
  data_criacao: string
}

interface Empresa {
  id: number
  nome_fantasia: string
  razao_social: string
}

const EMPTY_FORM = {
  nome: '', email: '', telefone: '', empresa: '',
  cargo: '', interesse: '', origem: '', observacoes: '', empresa_id: '' as string | number,
  status: 'novo'
}

function statusBadgeClass(status: string) {
  return statusColor(status)
}

export default function LeadsPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const params = new URLSearchParams({ page: String(page), per_page: '10' })
  if (status) params.set('status', status)
  if (search) params.set('busca', search)

  const { data, mutate, isLoading } = useSWR(`/api/leads?${params}`, fetcher)
  const { data: empresasData } = useSWR('/api/empresas?per_page=100', fetcher)

  const leads: Lead[] = data?.leads ?? []
  const totalPages = data?.pages ?? 1
  const empresas: Empresa[] = empresasData?.empresas ?? []

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.nome.trim()) newErrors.nome = 'Nome e obrigatorio'
    if (!form.email.trim()) newErrors.email = 'Email e obrigatorio'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const openCreateModal = () => {
    setForm({ ...EMPTY_FORM })
    setErrors({})
    setApiError('')
    setShowCreateModal(true)
  }

  const openEditModal = (lead: Lead) => {
    setForm({
      nome: lead.nome || '',
      email: lead.email || '',
      telefone: lead.telefone || '',
      empresa: lead.empresa || '',
      cargo: lead.cargo || '',
      interesse: lead.interesse || '',
      origem: lead.origem || '',
      observacoes: lead.observacoes || '',
      empresa_id: lead.empresa_id ?? '',
      status: lead.status || 'novo'
    })
    setErrors({})
    setApiError('')
    setEditingLead(lead)
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingLead(null)
    setErrors({})
    setApiError('')
  }

  const buildPayload = () => {
    const payload: Record<string, unknown> = { ...form }
    if (payload.empresa_id === '' || payload.empresa_id === undefined) {
      payload.empresa_id = null
    } else {
      payload.empresa_id = Number(payload.empresa_id)
    }
    return payload
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setApiError('')
    try {
      await api.post('/api/leads', buildPayload())
      closeModal()
      setSuccessMessage('Lead criado com sucesso!')
      mutate()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } }
      setApiError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao criar lead')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLead || !validate()) return
    setLoading(true)
    setApiError('')
    try {
      await api.put(`/api/leads/${editingLead.id}`, buildPayload())
      closeModal()
      setSuccessMessage('Lead atualizado com sucesso!')
      mutate()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } }
      setApiError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao atualizar lead')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/leads/${id}`)
      setDeleteId(null)
      mutate()
    } catch {
      toast('Erro ao excluir lead. Tente novamente.')
    }
  }

  const isModalOpen = showCreateModal || editingLead !== null
  const modalTitle = editingLead ? 'Editar Lead' : 'Novo Lead'
  const handleSubmit = editingLead ? handleEdit : handleCreate

  return (
    <div className="space-y-6">
      {/* Success message */}
      {successMessage && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Leads</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie e qualifique seus leads de vendas</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={status || 'all'} onValueChange={v => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
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
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Users className="h-10 w-10 opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium">Nenhum lead encontrado</p>
                <p className="text-xs mt-1">{search || status ? 'Tente ajustar os filtros' : 'Comece cadastrando seu primeiro lead'}</p>
              </div>
              {!search && !status && (
                <Button size="sm" onClick={openCreateModal}>
                  <Plus className="h-4 w-4 mr-1" /> Criar primeiro lead
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsavel</TableHead>
                  <TableHead>Criacao</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    onClick={() => openEditModal(lead)}
                    className="cursor-pointer group hover:bg-steel-50/60 transition-colors"
                  >
                    <TableCell className="font-medium">{lead.nome}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.telefone}</TableCell>
                    <TableCell>{lead.empresa}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass(lead.status)}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{lead.responsavel ?? '-'}</TableCell>
                    <TableCell>{formatDate(lead.data_criacao)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); openEditModal(lead) }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(lead.id) }}
                        >
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages} ({data?.total ?? 0} leads)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Proximo
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este lead? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>
              {editingLead ? 'Atualize as informacoes do lead.' : 'Preencha os dados para criar um novo lead.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {apiError && (
              <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {apiError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); setErrors(prev => ({ ...prev, nome: '' })) }}
                  className={errors.nome ? 'border-destructive' : ''}
                />
                {errors.nome && <p className="text-destructive text-sm">{errors.nome}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(prev => ({ ...prev, email: '' })) }}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Input
                  id="empresa"
                  value={form.empresa}
                  onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Vincular a Empresa</Label>
                <Select
                  value={form.empresa_id ? String(form.empresa_id) : 'none'}
                  onValueChange={v => setForm(f => ({ ...f, empresa_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {empresas.map(emp => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.nome_fantasia || emp.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={form.cargo}
                  onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Origem</Label>
                <Select
                  value={form.origem || 'none'}
                  onValueChange={v => setForm(f => ({ ...f, origem: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione...</SelectItem>
                    {ORIGEM_OPTIONS.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingLead && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status ?? editingLead.status}
                    onValueChange={v => setForm(f => ({ ...f, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="interesse">Interesse</Label>
              <Input
                id="interesse"
                value={form.interesse}
                onChange={e => setForm(f => ({ ...f, interesse: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observacoes</Label>
              <Textarea
                id="observacoes"
                rows={3}
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingLead ? 'Salvar alteracoes' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
