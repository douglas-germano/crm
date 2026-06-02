'use client'

import { useState } from 'react'
import useSWR from 'swr'
import api from '@/lib/api'
import { cn, formatCNPJ } from '@/lib/utils'
import {
  Plus, Search, Phone, Mail, MapPin, Globe,
  Loader2, Edit, User, ChevronDown, ChevronUp, Users
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

const fetcher = (url: string) => api.get(url).then(r => r.data)

const PORTE_OPTIONS = ['MEI', 'ME', 'EPP', 'Medio', 'Grande']

const EMPTY_FORM = {
  cnpj: '', razao_social: '', nome_fantasia: '', ramo: '', porte: '',
  endereco: '', cidade: '', estado: '', cep: '', telefone: '', email: '', website: ''
}

const EMPTY_CONTATO = { nome: '', email: '', telefone: '', cargo: '' }

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
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')

  const [form, setForm] = useState({ ...EMPTY_FORM })

  const [showContatoForm, setShowContatoForm] = useState<number | null>(null)
  const [contatoForm, setContatoForm] = useState({ ...EMPTY_CONTATO })
  const [contatoLoading, setContatoLoading] = useState(false)

  const params = new URLSearchParams({ page: String(page), per_page: '12' })
  if (search) params.set('busca', search)

  const { data, mutate, isLoading } = useSWR(`/api/empresas?${params}`, fetcher)

  const { data: expandedData, mutate: mutateExpanded } = useSWR(
    expandedId ? `/api/empresas/${expandedId}` : null,
    fetcher
  )

  const empresas: Empresa[] = data?.empresas ?? []
  const totalPages = data?.pages ?? 1

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

  const handleCreateContato = async (empresaId: number) => {
    if (!contatoForm.nome.trim()) return
    setContatoLoading(true)
    try {
      await api.post(`/api/empresas/${empresaId}/contatos`, contatoForm)
      setContatoForm({ ...EMPTY_CONTATO })
      setShowContatoForm(null)
      mutateExpanded()
      mutate()
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setContatoLoading(false)
    }
  }

  const expandedContatos: Contato[] = expandedData?.contatos ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Empresas</h2>
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
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setExpandedId(expandedId === empresa.id ? null : empresa.id)}
                  >
                    {expandedId === empresa.id ? 'Ocultar' : 'Ver contatos'}
                    {expandedId === empresa.id ? (
                      <ChevronUp className="h-3 w-3 ml-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded contacts */}
              {expandedId === empresa.id && (
                <div className="border-t bg-muted/30 p-3">
                  {expandedContatos.length > 0 ? (
                    <div className="space-y-2">
                      {expandedContatos.map(c => (
                        <div key={c.id} className="flex items-start gap-2 p-2 bg-background rounded border text-xs">
                          <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{c.nome}</p>
                            {c.cargo && <p className="text-muted-foreground">{c.cargo}</p>}
                            <div className="flex items-center gap-3 mt-0.5 text-muted-foreground">
                              {c.email && (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="h-2.5 w-2.5" />
                                  {c.email}
                                </span>
                              )}
                              {c.telefone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5" />
                                  {c.telefone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhum contato cadastrado</p>
                  )}

                  {showContatoForm === empresa.id ? (
                    <div className="mt-2 p-2 bg-background rounded border space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Nome *"
                          value={contatoForm.nome}
                          onChange={e => setContatoForm(f => ({ ...f, nome: e.target.value }))}
                          className="h-8 text-xs"
                        />
                        <Input
                          placeholder="Cargo"
                          value={contatoForm.cargo}
                          onChange={e => setContatoForm(f => ({ ...f, cargo: e.target.value }))}
                          className="h-8 text-xs"
                        />
                        <Input
                          placeholder="Email"
                          value={contatoForm.email}
                          onChange={e => setContatoForm(f => ({ ...f, email: e.target.value }))}
                          className="h-8 text-xs"
                        />
                        <Input
                          placeholder="Telefone"
                          value={contatoForm.telefone}
                          onChange={e => setContatoForm(f => ({ ...f, telefone: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => { setShowContatoForm(null); setContatoForm({ ...EMPTY_CONTATO }) }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={contatoLoading || !contatoForm.nome.trim()}
                          onClick={() => handleCreateContato(empresa.id)}
                        >
                          {contatoLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs mt-2"
                      onClick={() => { setShowContatoForm(empresa.id); setContatoForm({ ...EMPTY_CONTATO }) }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Novo Contato
                    </Button>
                  )}
                </div>
              )}
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

      {/* Create / Edit Dialog */}
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
                  value={form.porte}
                  onValueChange={v => setForm(f => ({ ...f, porte: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
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
    </div>
  )
}
