'use client'

import { useState } from 'react'
import useSWR from 'swr'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { GripVertical, ChevronRight, ArrowRight, Loader2, Plus, Search, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const fetcher = (url: string) => api.get(url).then(r => r.data)

interface Estagio {
  id: number
  nome: string
  cor: string
  posicao: number
}

interface LeadEstagio {
  id: number
  lead_estagio_id: number
  nome: string
  empresa: string
  email: string
  posicao: number
}

interface LeadsPorEstagio {
  estagio: Estagio
  leads: LeadEstagio[]
}

interface Lead {
  id: number
  nome: string
  email: string
  empresa: string
  status: string
}

export default function PipelinePage() {
  const [selectedPipeline, setSelectedPipeline] = useState<number | null>(null)
  const [movingLead, setMovingLead] = useState<{ leadId: number; currentEstagioId: number } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchLead, setSearchLead] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [selectedEstagioId, setSelectedEstagioId] = useState<number | null>(null)
  const [addingLead, setAddingLead] = useState(false)

  const { data: pipelinesData, isLoading: loadingPipelines } = useSWR('/api/pipelines', fetcher)
  const pipelines = pipelinesData?.pipelines ?? pipelinesData ?? []

  const activePipelineId = selectedPipeline ?? (pipelines.length > 0 ? pipelines[0]?.id : null)

  const { data: boardData, mutate: mutateBoard, isLoading: loadingBoard } = useSWR(
    activePipelineId ? `/api/pipelines/${activePipelineId}/leads` : null,
    fetcher
  )

  const leadsPorEstagio: LeadsPorEstagio[] = boardData?.leads_por_estagio ?? []

  const { data: leadsData } = useSWR(
    showAddModal ? `/api/leads?per_page=100` : null,
    fetcher
  )
  const allLeads: Lead[] = leadsData?.leads ?? []

  const leadsNoPipeline = new Set(
    leadsPorEstagio.flatMap(col => col.leads.map(l => l.id))
  )

  const leadsDisponiveis = allLeads.filter(lead => {
    if (leadsNoPipeline.has(lead.id)) return false
    if (!searchLead) return true
    const term = searchLead.toLowerCase()
    return (
      lead.nome.toLowerCase().includes(term) ||
      (lead.empresa && lead.empresa.toLowerCase().includes(term)) ||
      (lead.email && lead.email.toLowerCase().includes(term))
    )
  })

  const handleMove = async (leadId: number, estagioId: number) => {
    try {
      await api.post(`/api/pipelines/leads/${leadId}/mover`, {
        estagio_id: estagioId,
        posicao: 0
      })
      setMovingLead(null)
      mutateBoard()
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddLead = async () => {
    if (!selectedLeadId || !selectedEstagioId) return
    setAddingLead(true)
    try {
      await api.post(`/api/pipelines/leads/${selectedLeadId}/mover`, {
        estagio_id: selectedEstagioId,
        posicao: 0
      })
      setShowAddModal(false)
      setSelectedLeadId(null)
      setSelectedEstagioId(null)
      setSearchLead('')
      mutateBoard()
    } catch (err) {
      console.error(err)
    } finally {
      setAddingLead(false)
    }
  }

  const openAddModal = () => {
    setShowAddModal(true)
    setSelectedLeadId(null)
    setSelectedEstagioId(leadsPorEstagio.length > 0 ? leadsPorEstagio[0].estagio.id : null)
    setSearchLead('')
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-xl font-semibold">Pipeline</h2>
        <div className="flex items-center gap-2">
          {activePipelineId && (
            <Button onClick={openAddModal} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Lead
            </Button>
          )}
          {pipelines.length > 0 && (
            <Select
              value={String(activePipelineId ?? '')}
              onValueChange={v => setSelectedPipeline(Number(v))}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p: { id: number; nome: string }) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {loadingPipelines || loadingBoard ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : leadsPorEstagio.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <p className="font-medium">Nenhum pipeline configurado</p>
          <p className="text-sm mt-1">Selecione ou crie um pipeline para visualizar o board</p>
        </Card>
      ) : (
        <div className="flex-1 overflow-x-scroll pb-4">
          <div className="flex gap-3 min-h-[500px]" style={{ width: 'max-content' }}>
            {leadsPorEstagio.map((col) => (
              <div key={col.estagio.id} className="w-[270px] flex-shrink-0 flex flex-col">
                {/* Column Header */}
                <div
                  className="rounded-t-lg px-3 py-2.5 flex items-center justify-between"
                  style={{ backgroundColor: col.estagio.cor || '#6B7280' }}
                >
                  <span className="font-medium text-white text-sm">{col.estagio.nome}</span>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs px-1.5 py-0">
                    {col.leads.length}
                  </Badge>
                </div>

                {/* Column Body */}
                <div className="flex-1 bg-muted/30 border border-t-0 rounded-b-lg p-2 space-y-2 overflow-y-auto">
                  {col.leads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Nenhum lead neste estagio</p>
                  ) : (
                    col.leads.map((item) => (
                      <Card key={item.id} className="p-2.5">
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0 cursor-grab" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.nome}</p>
                            {item.empresa && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.empresa}</p>
                            )}
                            {item.email && (
                              <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{item.email}</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t">
                          {movingLead?.leadId === item.id && movingLead?.currentEstagioId === col.estagio.id ? (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium mb-1">Mover para:</p>
                              {leadsPorEstagio
                                .filter(c => c.estagio.id !== col.estagio.id)
                                .map(c => (
                                  <button
                                    key={c.estagio.id}
                                    onClick={() => handleMove(item.id, c.estagio.id)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded transition-colors text-left"
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                    <span
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: c.estagio.cor || '#6B7280' }}
                                    />
                                    {c.estagio.nome}
                                  </button>
                                ))}
                              <button
                                onClick={() => setMovingLead(null)}
                                className="w-full text-xs text-muted-foreground hover:text-foreground py-1"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => setMovingLead({ leadId: item.id, currentEstagioId: col.estagio.id })}
                            >
                              <ChevronRight className="h-3 w-3 mr-0.5" />
                              Mover para...
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Lead Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Lead ao Pipeline</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Estagio select */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Estagio</label>
              <Select
                value={String(selectedEstagioId ?? '')}
                onValueChange={v => setSelectedEstagioId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leadsPorEstagio.map(col => (
                    <SelectItem key={col.estagio.id} value={String(col.estagio.id)}>
                      {col.estagio.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Buscar Lead</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, empresa ou email..."
                  value={searchLead}
                  onChange={e => setSearchLead(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Lead list */}
            <div className="border rounded-md max-h-64 overflow-y-auto">
              {leadsDisponiveis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users className="h-6 w-6 mb-2" />
                  <p className="text-sm font-medium">
                    {allLeads.length === 0
                      ? 'Nenhum lead cadastrado'
                      : searchLead
                        ? 'Nenhum lead encontrado'
                        : 'Todos os leads ja estao no pipeline'}
                  </p>
                  {allLeads.length === 0 && (
                    <p className="text-xs mt-1">Cadastre leads primeiro na pagina de Leads</p>
                  )}
                </div>
              ) : (
                leadsDisponiveis.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b last:border-b-0',
                      selectedLeadId === lead.id
                        ? 'bg-primary/5 border-l-2 border-l-primary'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className={cn(
                        'text-xs',
                        selectedLeadId === lead.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}>
                        {lead.nome.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {lead.empresa && (
                          <span className="text-xs text-muted-foreground truncate">{lead.empresa}</span>
                        )}
                        {lead.empresa && lead.email && (
                          <span className="text-muted-foreground/50">·</span>
                        )}
                        {lead.email && (
                          <span className="text-xs text-muted-foreground truncate">{lead.email}</span>
                        )}
                      </div>
                    </div>
                    {selectedLeadId === lead.id && (
                      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddLead}
              disabled={!selectedLeadId || !selectedEstagioId || addingLead}
            >
              {addingLead ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Adicionar ao Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
