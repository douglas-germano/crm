'use client'

import { useState } from 'react'
import useSWR from 'swr'
import api from '@/lib/api'
import { cn, formatCNPJ, formatCurrency } from '@/lib/utils'
import { ContratoAMC } from '@/types'
import { useToast } from '@/contexts/toast-context'
import {
  Plus, Search, Phone, Mail, MapPin, Globe,
  Loader2, Edit, User, Users, FileText, Handshake,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const fetcher = (url: string) => api.get(url).then(r => r.data)

const PORTE_OPTIONS = ['MEI', 'ME', 'EPP', 'Medio', 'Grande']

const EMPTY_FORM = {
  cnpj: '', razao_social: '', nome_fantasia: '', ramo: '', porte: '',
  endereco: '', cidade: '', estado: '', cep: '', telefone: '', email: '', website: ''
}

const EMPTY_CONTATO = { nome: '', email: '', telefone: '', cargo: '' }

const EMPTY_CONTRATO_FORM = {
  titulo: '',
  plano: 'mensal' as ContratoAMC['plano'],
  valor_recorrente: '',
  data_inicio: '',
  data_fim: '',
}

const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  cancelado: 'Cancelado',
  finalizado: 'Finalizado',
}

const PLANO_LABEL: Record<string, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
}

interface Contato {
  id: number
  nome: string
  email: string
  telefone: string
  cargo: string
}

interface Empresa {
  id: number
  cnpj: string
  razao_social: string
  nome_fantasia: string
  ramo: string
  porte: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  email: string
  website: string
  total_contatos?: number
  contatos?: Contato[]
}

export default function EmpresasPage() {
  const { toast } = useToast()

  // Empresa list state
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  // Create/Edit empresa modal
  const [showModal, setShowModal] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [form, setForm] = useState({ ...EMPTY_FORM })

  // Sheet (drawer) state
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null)

  // Contacts state (inside sheet)
  const [showContatoForm, setShowContatoForm] = useState(false)
  const [contatoForm, setContatoForm] = useState({ ...EMPTY_CONTATO })
  const [contatoLoading, setContatoLoading] = useState(false)

  // Contrato AMC create modal (inside sheet)
  const [showContratoModal, setShowContratoModal] = useState(false)
  const [contratoForm, setContratoForm] = useState({ ...EMPTY_CONTRATO_FORM })
  const [contratoLoading, setContratoLoading] = useState(false)
  const [contratoApiError, setContratoApiError] = useState('')

  // Data fetching
  const params = new URLSearchParams({ page: String(page), per_page: '12' })
  if (search) params.set('busca', search)

  const { data, mutate, isLoading } = useSWR(`/api/empresas?${params}`, fetcher)

  const { data: expandedData, mutate: mutateExpanded } = useSWR(
    selectedEmpresa ? `/api/empresas/${selectedEmpresa.id}` : null,
    fetcher
  )

  const { data: contratosData, mutate: mutateContratos } = useSWR(
    selectedEmpresa ? `/api/inspecoes/contratos-amc?empresa_id=${selectedEmpresa.id}` : null,
    fetcher
  )

  const empresas: Empresa[] = data?.empresas ?? []
  const totalPages = data?.pages ?? 1
  const sheetContatos: Contato[] = expandedData?.contatos ?? []
  const sheetContratos: ContratoAMC[] = Array.isArray(contratosData)
    ? contratosData
    : (contratosData?.items ?? contratosData?.contratos ?? [])

  // ── Empresa form helpers ──────────────────────────────────────────────────

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!form.razao_social.trim()) {
      errors.razao_social = 'Razao social e obrigatoria'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const openCreateModal = () => {
    setForm({ ...EMPTY_FORM })
    setEditingEmpresa(null)
    setFormErrors({})
    setApiError('')
    setShowModal(true)
  }

  const openEditModal = (empresa: Empresa) => {
    setForm({
      cnpj: empresa.cnpj || '',
      razao_social: empresa.razao_social || '',
      nome_fantasia: empresa.nome_fantasia || '',
      ramo: empresa.ramo || '',
      porte: empresa.porte || '',
      endereco: empresa.endereco || '',
      cidade: empresa.cidade || '',
      estado: empresa.estado || '',
      cep: empresa.cep || '',
      telefone: empresa.telefone || '',
      email: empresa.email || '',
      website: empresa.website || '',
    })
    setEditingEmpresa(empresa)
    setFormErrors({})
    setApiError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingEmpresa(null)
    setFormErrors({})
    setApiError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setApiError('')
    try {
      if (editingEmpresa) {
        await api.put(`/api/empresas/${editingEmpresa.id}`, form)
      } else {
        await api.post('/api/empresas', form)
      }
      setForm({ ...EMPTY_FORM })
      closeModal()
      mutate()
      // If we edited the currently-selected empresa, refresh expanded data
      if (editingEmpresa && selectedEmpresa?.id === editingEmpresa.id) {
        mutateExpanded()
        // Update the selectedEmpresa local state with new form values
        setSelectedEmpresa(prev => prev ? { ...prev, ...form } : prev)
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string; msg?: string } } }
      const msg = error.response?.data?.erro
        || error.response?.data?.message
        || error.response?.data?.msg
        || 'Erro ao salvar empresa. Tente novamente.'
      setApiError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Contact helpers ───────────────────────────────────────────────────────

  const handleCreateContato = async () => {
    if (!contatoForm.nome.trim() || !selectedEmpresa) return
    setContatoLoading(true)
    try {
      await api.post(`/api/empresas/${selectedEmpresa.id}/contatos`, contatoForm)
      setContatoForm({ ...EMPTY_CONTATO })
      setShowContatoForm(false)
      mutateExpanded()
      mutate()
    } catch {
      toast('Erro ao criar contato')
    } finally {
      setContatoLoading(false)
    }
  }

  // ── Contrato AMC helpers ──────────────────────────────────────────────────

  const openContratoModal = () => {
    setContratoForm({ ...EMPTY_CONTRATO_FORM })
    setContratoApiError('')
    setShowContratoModal(true)
  }

  const handleCreateContrato = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmpresa) return
    if (!contratoForm.titulo || !contratoForm.data_inicio) {
      setContratoApiError('Título e data de início são obrigatórios')
      return
    }
    setContratoLoading(true)
    setContratoApiError('')
    try {
      await api.post('/api/inspecoes/contratos-amc', {
        titulo: contratoForm.titulo,
        empresa_id: selectedEmpresa.id,
        plano: contratoForm.plano,
        valor_recorrente: parseFloat(contratoForm.valor_recorrente) || 0,
        data_inicio: contratoForm.data_inicio,
        data_fim: contratoForm.data_fim || null,
        status: 'ativo',
      })
      setContratoForm({ ...EMPTY_CONTRATO_FORM })
      setShowContratoModal(false)
      mutateContratos()
      toast('Contrato AMC criado com sucesso!')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } }
      setContratoApiError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao criar contrato')
    } finally {
      setContratoLoading(false)
    }
  }

  // ── Status badge helper ───────────────────────────────────────────────────

  const statusBadgeClass = (status: string) => {
    if (status === 'ativo') return 'bg-green-50 text-green-700 border-green-200'
    if (status === 'suspenso') return 'bg-amber-50 text-amber-700 border-amber-200'
    if (status === 'cancelado') return 'bg-red-50 text-red-700 border-red-200'
    return 'bg-gray-50 text-gray-600 border-gray-200'
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Empresas</h2>
        <Button onClick={openCreateModal} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nova Empresa
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CNPJ..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="pl-9"
        />
      </div>

      {/* Card Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : empresas.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <p className="font-medium">Nenhuma empresa encontrada</p>
          <p className="text-sm mt-1">Cadastre uma nova empresa para comecar</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {empresas.map((empresa) => (
            <Card key={empresa.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {empresa.nome_fantasia || empresa.razao_social}
                    </p>
                    {empresa.nome_fantasia && empresa.razao_social && (
                      <p className="text-xs text-muted-foreground truncate">{empresa.razao_social}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {empresa.ramo && (
                      <Badge variant="secondary" className="text-[10px] px-1.5">{empresa.ramo}</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditModal(empresa)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {empresa.cnpj && (
                  <p className="text-xs text-muted-foreground font-mono mb-2">{formatCNPJ(empresa.cnpj)}</p>
                )}

                <div className="space-y-1 text-xs text-muted-foreground">
                  {(empresa.cidade || empresa.estado) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span>{[empresa.cidade, empresa.estado].filter(Boolean).join(' / ')}</span>
                    </div>
                  )}
                  {empresa.telefone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span>{empresa.telefone}</span>
                    </div>
                  )}
                  {empresa.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{empresa.email}</span>
                    </div>
                  )}
                  {empresa.website && (
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{empresa.website}</span>
                    </div>
                  )}
                </div>

                <Separator className="my-3" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{empresa.total_contatos ?? 0} contatos</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSelectedEmpresa(empresa)
                      setShowContatoForm(false)
                      setContatoForm({ ...EMPTY_CONTATO })
                    }}
                  >
                    Ver detalhes
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages}
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

      {/* ── Empresa Detail Sheet ──────────────────────────────────────────── */}
      <Sheet open={!!selectedEmpresa} onOpenChange={open => { if (!open) setSelectedEmpresa(null) }}>
        <SheetContent className="sm:max-w-[640px] overflow-y-auto">
          {selectedEmpresa && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  {selectedEmpresa.nome_fantasia || selectedEmpresa.razao_social}
                  {selectedEmpresa.ramo && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {selectedEmpresa.ramo}
                    </Badge>
                  )}
                </SheetTitle>
              </SheetHeader>

              <Tabs defaultValue="dados">
                <TabsList className="mb-4 w-full">
                  <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
                  <TabsTrigger value="contatos" className="flex-1">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Contatos
                  </TabsTrigger>
                  <TabsTrigger value="contratos" className="flex-1">
                    <Handshake className="h-3.5 w-3.5 mr-1" />
                    Contratos AMC
                  </TabsTrigger>
                </TabsList>

                {/* ── Tab: Dados ── */}
                <TabsContent value="dados" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: 'CNPJ', value: selectedEmpresa.cnpj ? formatCNPJ(selectedEmpresa.cnpj) : '—' },
                      { label: 'Razão Social', value: selectedEmpresa.razao_social || '—' },
                      { label: 'Nome Fantasia', value: selectedEmpresa.nome_fantasia || '—' },
                      { label: 'Ramo', value: selectedEmpresa.ramo || '—' },
                      { label: 'Porte', value: selectedEmpresa.porte || '—' },
                      { label: 'Endereço', value: selectedEmpresa.endereco || '—' },
                      {
                        label: 'Cidade / Estado / CEP',
                        value: [selectedEmpresa.cidade, selectedEmpresa.estado, selectedEmpresa.cep]
                          .filter(Boolean).join(' / ') || '—',
                      },
                      { label: 'Telefone', value: selectedEmpresa.telefone || '—' },
                      { label: 'Email', value: selectedEmpresa.email || '—' },
                      { label: 'Website', value: selectedEmpresa.website || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="space-y-0.5">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                        <p className="text-sm text-gray-900 break-all">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(selectedEmpresa)}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Editar Empresa
                    </Button>
                  </div>
                </TabsContent>

                {/* ── Tab: Contatos ── */}
                <TabsContent value="contatos" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">
                      {sheetContatos.length} contato{sheetContatos.length !== 1 ? 's' : ''}
                    </p>
                    {!showContatoForm && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setShowContatoForm(true); setContatoForm({ ...EMPTY_CONTATO }) }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Novo Contato
                      </Button>
                    )}
                  </div>

                  {showContatoForm && (
                    <div className="p-3 bg-gray-50 rounded-lg border space-y-3">
                      <p className="text-sm font-medium">Novo Contato</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome *</Label>
                          <Input
                            placeholder="Nome completo"
                            value={contatoForm.nome}
                            onChange={e => setContatoForm(f => ({ ...f, nome: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Cargo</Label>
                          <Input
                            placeholder="Ex: Gerente"
                            value={contatoForm.cargo}
                            onChange={e => setContatoForm(f => ({ ...f, cargo: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Email</Label>
                          <Input
                            placeholder="email@exemplo.com"
                            value={contatoForm.email}
                            onChange={e => setContatoForm(f => ({ ...f, email: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Telefone</Label>
                          <Input
                            placeholder="(00) 00000-0000"
                            value={contatoForm.telefone}
                            onChange={e => setContatoForm(f => ({ ...f, telefone: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setShowContatoForm(false); setContatoForm({ ...EMPTY_CONTATO }) }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          disabled={contatoLoading || !contatoForm.nome.trim()}
                          onClick={handleCreateContato}
                        >
                          {contatoLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  )}

                  {sheetContatos.length === 0 && !showContatoForm ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nenhum contato cadastrado</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sheetContatos.map(c => (
                        <div key={c.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border text-sm">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900">{c.nome}</p>
                            {c.cargo && <p className="text-xs text-muted-foreground">{c.cargo}</p>}
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {c.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {c.email}
                                </span>
                              )}
                              {c.telefone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {c.telefone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── Tab: Contratos AMC ── */}
                <TabsContent value="contratos" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">
                      {sheetContratos.length} contrato{sheetContratos.length !== 1 ? 's' : ''}
                    </p>
                    <Button size="sm" variant="outline" onClick={openContratoModal}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Novo Contrato
                    </Button>
                  </div>

                  {sheetContratos.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nenhum contrato AMC para esta empresa</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Início</TableHead>
                            <TableHead>Fim</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sheetContratos.map(c => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium text-sm">{c.titulo}</TableCell>
                              <TableCell className="text-sm">{PLANO_LABEL[c.plano] ?? c.plano}</TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {formatCurrency(c.valor_recorrente)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn('text-xs', statusBadgeClass(c.status))}
                                >
                                  {STATUS_LABEL[c.status] ?? c.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(c.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {c.data_fim
                                  ? new Date(c.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')
                                  : '—'}
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

      {/* ── Create / Edit Empresa Dialog ────────────────────────────────────── */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {apiError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {apiError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input
                  value={form.cnpj}
                  onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Razao Social *</Label>
                <Input
                  value={form.razao_social}
                  onChange={e => {
                    setForm(f => ({ ...f, razao_social: e.target.value }))
                    if (e.target.value.trim()) setFormErrors(prev => { const { razao_social, ...rest } = prev; return rest })
                  }}
                  className={cn(formErrors.razao_social && 'border-destructive')}
                />
                {formErrors.razao_social && (
                  <p className="text-destructive text-xs">{formErrors.razao_social}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Nome Fantasia</Label>
                <Input
                  value={form.nome_fantasia}
                  onChange={e => setForm(f => ({ ...f, nome_fantasia: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ramo</Label>
                <Input
                  value={form.ramo}
                  onChange={e => setForm(f => ({ ...f, ramo: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Porte</Label>
                <Select
                  value={form.porte || 'none'}
                  onValueChange={v => setForm(f => ({ ...f, porte: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione...</SelectItem>
                    {PORTE_OPTIONS.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input
                  value={form.cep}
                  onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Endereco</Label>
                <Input
                  value={form.endereco}
                  onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input
                  value={form.cidade}
                  onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Input
                  value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Website</Label>
                <Input
                  value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Create Contrato AMC Dialog ───────────────────────────────────── */}
      <Dialog open={showContratoModal} onOpenChange={open => { if (!open) { setShowContratoModal(false); setContratoApiError('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Contrato AMC</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateContrato} className="space-y-4 pt-1">
            {contratoApiError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {contratoApiError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Título do Contrato *</Label>
              <Input
                placeholder="Ex: Manutenção PMOC Shopping"
                value={contratoForm.titulo}
                onChange={e => setContratoForm(f => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select
                  value={contratoForm.plano}
                  onValueChange={v => setContratoForm(f => ({ ...f, plano: v as ContratoAMC['plano'] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLANO_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor Recorrente (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1500.00"
                  value={contratoForm.valor_recorrente}
                  onChange={e => setContratoForm(f => ({ ...f, valor_recorrente: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Início *</Label>
                <Input
                  type="date"
                  value={contratoForm.data_inicio}
                  onChange={e => setContratoForm(f => ({ ...f, data_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Término</Label>
                <Input
                  type="date"
                  value={contratoForm.data_fim}
                  onChange={e => setContratoForm(f => ({ ...f, data_fim: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowContratoModal(false); setContratoApiError('') }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={contratoLoading}>
                {contratoLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
