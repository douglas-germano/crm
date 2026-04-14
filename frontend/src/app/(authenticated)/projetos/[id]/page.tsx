'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, Plus, Loader2, Calendar, GripVertical,
  CheckCircle2, Circle, Clock, Eye, Trash2, MoreHorizontal, Pencil
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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

const TASK_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  a_fazer: { label: 'A Fazer', icon: Circle, color: 'text-slate-500', bgColor: 'bg-slate-50 border-slate-200' },
  em_andamento: { label: 'Em Andamento', icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-50 border-blue-200' },
  em_revisao: { label: 'Em Revisão', icon: Eye, color: 'text-amber-500', bgColor: 'bg-amber-50 border-amber-200' },
  concluida: { label: 'Concluída', icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-50 border-green-200' },
}

const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: 'bg-slate-400',
  media: 'bg-blue-400',
  alta: 'bg-orange-400',
  critica: 'bg-red-500',
}

const PRIORIDADE_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
}

interface Tarefa {
  id: number
  uuid: string
  titulo: string
  descricao: string
  status: string
  prioridade: string
  data_prazo: string | null
  data_inicio: string | null
  data_conclusao: string | null
  ordem: number
  responsavel_id: number | null
  responsavel_nome: string | null
  tarefa_pai_id: number | null
  subtarefas: Tarefa[]
  checklist: { id: number; descricao: string; concluido: boolean; ordem: number }[]
  total_comentarios: number
}

interface Projeto {
  id: number
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
  tarefas: Tarefa[]
}

interface ProjetoForm {
  nome: string
  descricao: string
  status: string
  prioridade: string
  data_inicio: string
  data_previsao_fim: string
  valor_contrato: string
  gerente_id: string
  negocio_id: string
}

interface TarefaForm {
  titulo: string
  descricao: string
  status: string
  prioridade: string
  data_prazo: string
  responsavel_id: string
}

const EMPTY_TAREFA_FORM: TarefaForm = {
  titulo: '', descricao: '', status: 'a_fazer', prioridade: 'media',
  data_prazo: '', responsavel_id: '',
}

export default function ProjetoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const projetoId = params.id

  const [showTarefaModal, setShowTarefaModal] = useState(false)
  const [showEditProjetoModal, setShowEditProjetoModal] = useState(false)
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null)
  const [tarefaForm, setTarefaForm] = useState<TarefaForm>({ ...EMPTY_TAREFA_FORM })
  const [projetoForm, setProjetoForm] = useState<ProjetoForm>({ nome: '', descricao: '', status: '', prioridade: '', data_inicio: '', data_previsao_fim: '', valor_contrato: '', gerente_id: '', negocio_id: '' })
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [draggedTask, setDraggedTask] = useState<Tarefa | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const { data: projeto, mutate, isLoading } = useSWR<Projeto>(
    `/api/projetos/${projetoId}`,
    fetcher
  )

  const { data: usuariosData } = useSWR('/api/usuarios', fetcher)
  const usuarios = usuariosData?.usuarios ?? usuariosData ?? []

  const { data: negocios = [] } = useSWR('/api/negocios', fetcher)

  const tarefas = projeto?.tarefas || []

  const getTasksByStatus = useCallback((status: string) => {
    return tarefas.filter(t => t.status === status).sort((a, b) => a.ordem - b.ordem)
  }, [tarefas])

  // --- Project actions ---
  const handleChangeStatus = async (newStatus: string) => {
    try {
      await api.put(`/api/projetos/${projetoId}`, { status: newStatus })
      mutate()
    } catch {
      // silently fail
    }
  }

  const openEditProjeto = () => {
    if (!projeto) return
    setProjetoForm({
      nome: projeto.nome,
      descricao: projeto.descricao || '',
      status: projeto.status,
      prioridade: projeto.prioridade,
      data_inicio: projeto.data_inicio || '',
      data_previsao_fim: projeto.data_previsao_fim || '',
      valor_contrato: projeto.valor_contrato ? String(projeto.valor_contrato) : '',
      gerente_id: projeto.gerente_id ? String(projeto.gerente_id) : '',
      negocio_id: projeto.negocio_id ? String(projeto.negocio_id) : '',
    })
    setApiError('')
    setShowEditProjetoModal(true)
  }

  const handleEditProjeto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projetoForm.nome.trim()) {
      setApiError('Nome é obrigatório')
      return
    }
    setLoading(true)
    setApiError('')
    try {
      await api.put(`/api/projetos/${projetoId}`, {
        ...projetoForm,
        valor_contrato: projetoForm.valor_contrato ? Number(projetoForm.valor_contrato) : 0,
        gerente_id: projetoForm.gerente_id ? Number(projetoForm.gerente_id) : null,
        negocio_id: projetoForm.negocio_id ? Number(projetoForm.negocio_id) : null,
      })
      setShowEditProjetoModal(false)
      mutate()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } }
      setApiError(error.response?.data?.erro || 'Erro ao atualizar projeto')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTarefa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tarefaForm.titulo.trim()) {
      setApiError('Título é obrigatório')
      return
    }
    setLoading(true)
    setApiError('')
    try {
      const payload = {
        ...tarefaForm,
        responsavel_id: tarefaForm.responsavel_id ? Number(tarefaForm.responsavel_id) : undefined,
      }
      await api.post(`/api/projetos/${projetoId}/tarefas`, payload)
      setTarefaForm({ ...EMPTY_TAREFA_FORM })
      setShowTarefaModal(false)
      setEditingTarefa(null)
      mutate()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } }
      setApiError(error.response?.data?.erro || 'Erro ao criar tarefa')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTarefa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTarefa) return
    setLoading(true)
    setApiError('')
    try {
      const payload = {
        ...tarefaForm,
        responsavel_id: tarefaForm.responsavel_id ? Number(tarefaForm.responsavel_id) : null,
      }
      await api.put(`/api/projetos/${projetoId}/tarefas/${editingTarefa.id}`, payload)
      setTarefaForm({ ...EMPTY_TAREFA_FORM })
      setShowTarefaModal(false)
      setEditingTarefa(null)
      mutate()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } }
      setApiError(error.response?.data?.erro || 'Erro ao atualizar tarefa')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTarefa = async (tarefaId: number) => {
    try {
      await api.delete(`/api/projetos/${projetoId}/tarefas/${tarefaId}`)
      mutate()
    } catch {
      // silently fail
    }
  }

  const openCreateTarefa = (status: string = 'a_fazer') => {
    setEditingTarefa(null)
    setTarefaForm({ ...EMPTY_TAREFA_FORM, status })
    setApiError('')
    setShowTarefaModal(true)
  }

  const openEditTarefa = (tarefa: Tarefa) => {
    setEditingTarefa(tarefa)
    setTarefaForm({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || '',
      status: tarefa.status,
      prioridade: tarefa.prioridade,
      data_prazo: tarefa.data_prazo || '',
      responsavel_id: tarefa.responsavel_id ? String(tarefa.responsavel_id) : '',
    })
    setApiError('')
    setShowTarefaModal(true)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, tarefa: Tarefa) => {
    setDraggedTask(tarefa)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(tarefa.id))
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(status)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDragOverColumn(null)

    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null)
      return
    }

    // Optimistic update
    const updatedTarefas = tarefas.map(t =>
      t.id === draggedTask.id ? { ...t, status: newStatus } : t
    )

    mutate({ ...projeto!, tarefas: updatedTarefas }, false)

    try {
      await api.put(`/api/projetos/${projetoId}/tarefas/${draggedTask.id}`, {
        status: newStatus,
      })
      mutate()
    } catch {
      mutate() // Revert on error
    }

    setDraggedTask(null)
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!projeto) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Projeto não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/projetos')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 shrink-0"
            onClick={() => router.push('/projetos')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-semibold tracking-tight">{projeto.nome}</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="cursor-pointer">
                    <Badge variant="outline" className={`${STATUS_COLORS[projeto.status] || ''} hover:opacity-80 transition-opacity`}>
                      {STATUS_LABELS[projeto.status] || projeto.status}
                      <span className="ml-1 text-[10px]">▼</span>
                    </Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel className="text-xs">Alterar Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => handleChangeStatus(key)}
                      className={projeto.status === key ? 'font-semibold bg-accent' : ''}
                    >
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        key === 'planejamento' ? 'bg-blue-500' :
                        key === 'em_andamento' ? 'bg-emerald-500' :
                        key === 'pausado' ? 'bg-amber-500' :
                        key === 'concluido' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {projeto.descricao && (
              <p className="text-sm text-muted-foreground max-w-2xl">{projeto.descricao}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {projeto.empresa_nome && <span>🏢 {projeto.empresa_nome}</span>}
              {projeto.gerente_nome && <span>👤 {projeto.gerente_nome}</span>}
              {projeto.data_previsao_fim && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Prazo: {formatDate(projeto.data_previsao_fim)}
                </span>
              )}
              {projeto.valor_contrato > 0 && (
                <span className="font-medium text-brand-700">
                  {formatCurrency(projeto.valor_contrato)}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={openEditProjeto}>
          <Pencil className="h-3.5 w-3.5 mr-2" />
          Editar Projeto
        </Button>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-4 px-6">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Progresso Geral</span>
                <span className="text-sm font-bold text-brand-700">
                  {Math.round(projeto.percentual_concluido)}%
                </span>
              </div>
              <div className="h-3 bg-steel-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-brand-500 to-accent-500"
                  style={{ width: `${projeto.percentual_concluido}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm shrink-0">
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-700">{projeto.total_tarefas}</p>
                <p className="text-xs text-muted-foreground">Tarefas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{projeto.total_tarefas_concluidas}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="kanban">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
          <Button onClick={() => openCreateTarefa()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>

        {/* Kanban View */}
        <TabsContent value="kanban" className="mt-4">
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(TASK_STATUS_CONFIG).map(([status, config]) => {
              const StatusIcon = config.icon
              const columnTasks = getTasksByStatus(status)

              return (
                <div
                  key={status}
                  className={`rounded-xl border-2 border-dashed p-3 min-h-[400px] transition-colors ${
                    dragOverColumn === status
                      ? 'border-brand-400 bg-brand-50/50'
                      : 'border-steel-200 bg-steel-50/50'
                  }`}
                  onDragOver={(e) => handleDragOver(e, status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${config.color}`} />
                      <span className="text-sm font-semibold text-steel-700">{config.label}</span>
                      <span className="text-xs text-muted-foreground bg-steel-200 rounded-full px-2 py-0.5">
                        {columnTasks.length}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => openCreateTarefa(status)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Task Cards */}
                  <div className="space-y-2">
                    {columnTasks.map((tarefa) => (
                      <div
                        key={tarefa.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, tarefa)}
                        className={`group bg-white rounded-lg border border-steel-200 p-3 cursor-grab active:cursor-grabbing
                          shadow-sm hover:shadow-md hover:border-brand-300 transition-all duration-150
                          ${draggedTask?.id === tarefa.id ? 'opacity-50' : ''}`}
                      >
                        {/* Priority Indicator + Title */}
                        <div className="flex items-start gap-2 mb-2">
                          <div className={`w-1 h-full min-h-[20px] rounded-full shrink-0 mt-0.5 ${PRIORIDADE_COLORS[tarefa.prioridade]}`} />
                          <p className="text-sm font-medium flex-1 leading-snug">{tarefa.titulo}</p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditTarefa(tarefa)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteTarefa(tarefa.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Checklist Progress */}
                        {tarefa.checklist.length > 0 && (
                          <div className="flex items-center gap-2 mb-2 ml-3">
                            <div className="h-1.5 flex-1 bg-steel-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-400 rounded-full transition-all"
                                style={{
                                  width: `${(tarefa.checklist.filter(c => c.concluido).length / tarefa.checklist.length) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {tarefa.checklist.filter(c => c.concluido).length}/{tarefa.checklist.length}
                            </span>
                          </div>
                        )}

                        {/* Meta Row */}
                        <div className="flex items-center justify-between ml-3">
                          <div className="flex items-center gap-2">
                            {tarefa.data_prazo && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(tarefa.data_prazo)}
                              </span>
                            )}
                          </div>
                          {tarefa.responsavel_nome && (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[9px] font-bold bg-brand-100 text-brand-700">
                                {getInitials(tarefa.responsavel_nome)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="lista" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {tarefas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <p className="text-sm">Nenhuma tarefa criada ainda</p>
                </div>
              ) : (
                <div className="divide-y">
                  {tarefas.map((tarefa) => {
                    const config = TASK_STATUS_CONFIG[tarefa.status]
                    const StatusIcon = config?.icon || Circle
                    return (
                      <div
                        key={tarefa.id}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-steel-50 cursor-pointer transition-colors"
                        onClick={() => openEditTarefa(tarefa)}
                      >
                        <StatusIcon className={`h-4 w-4 shrink-0 ${config?.color || 'text-muted-foreground'}`} />
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORIDADE_COLORS[tarefa.prioridade]}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${tarefa.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
                            {tarefa.titulo}
                          </p>
                        </div>
                        {tarefa.data_prazo && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDate(tarefa.data_prazo)}
                          </span>
                        )}
                        {tarefa.responsavel_nome && (
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="text-[9px] font-bold bg-brand-100 text-brand-700">
                              {getInitials(tarefa.responsavel_nome)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${config?.bgColor || ''}`}>
                          {config?.label || tarefa.status}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Modal */}
      <Dialog open={showTarefaModal} onOpenChange={(open) => { if (!open) { setShowTarefaModal(false); setEditingTarefa(null); setApiError('') } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTarefa ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
            <DialogDescription>
              {editingTarefa
                ? 'Atualize as informações da tarefa.'
                : 'Preencha os dados para criar uma nova tarefa.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editingTarefa ? handleUpdateTarefa : handleCreateTarefa} className="space-y-4">
            {apiError && (
              <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {apiError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={tarefaForm.titulo}
                onChange={e => setTarefaForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Revisar contrato do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={tarefaForm.descricao}
                onChange={e => setTarefaForm(f => ({ ...f, descricao: e.target.value }))}
                rows={3}
                placeholder="Detalhes da tarefa..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={tarefaForm.status} onValueChange={v => setTarefaForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={tarefaForm.prioridade} onValueChange={v => setTarefaForm(f => ({ ...f, prioridade: v }))}>
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
                <Label htmlFor="data_prazo">Prazo</Label>
                <Input
                  id="data_prazo"
                  type="date"
                  value={tarefaForm.data_prazo}
                  onChange={e => setTarefaForm(f => ({ ...f, data_prazo: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={tarefaForm.responsavel_id || 'none'}
                  onValueChange={v => setTarefaForm(f => ({ ...f, responsavel_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {(Array.isArray(usuarios) ? usuarios : []).map((u: { id: number; nome: string }) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowTarefaModal(false); setEditingTarefa(null); setApiError('') }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingTarefa ? 'Salvar' : 'Criar Tarefa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      <Dialog open={showEditProjetoModal} onOpenChange={(open) => { if (!open) { setShowEditProjetoModal(false); setApiError('') } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
            <DialogDescription>Atualize as informações do projeto.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProjeto} className="space-y-4">
            {apiError && (
              <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {apiError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="proj_nome">Nome *</Label>
              <Input
                id="proj_nome"
                value={projetoForm.nome}
                onChange={e => setProjetoForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj_descricao">Descrição</Label>
              <Textarea
                id="proj_descricao"
                value={projetoForm.descricao}
                onChange={e => setProjetoForm(f => ({ ...f, descricao: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={projetoForm.status} onValueChange={v => setProjetoForm(f => ({ ...f, status: v }))}>
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
                <Select value={projetoForm.prioridade} onValueChange={v => setProjetoForm(f => ({ ...f, prioridade: v }))}>
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
                <Label htmlFor="proj_data_inicio">Data Início</Label>
                <Input
                  id="proj_data_inicio"
                  type="date"
                  value={projetoForm.data_inicio}
                  onChange={e => setProjetoForm(f => ({ ...f, data_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj_data_fim">Previsão de Fim</Label>
                <Input
                  id="proj_data_fim"
                  type="date"
                  value={projetoForm.data_previsao_fim}
                  onChange={e => setProjetoForm(f => ({ ...f, data_previsao_fim: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proj_valor">Valor do Contrato (R$)</Label>
                <Input
                  id="proj_valor"
                  type="number"
                  step="0.01"
                  value={projetoForm.valor_contrato}
                  onChange={e => setProjetoForm(f => ({ ...f, valor_contrato: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Gerente</Label>
                <Select
                  value={projetoForm.gerente_id || 'none'}
                  onValueChange={v => setProjetoForm(f => ({ ...f, gerente_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {(Array.isArray(usuarios) ? usuarios : []).map((u: { id: number; nome: string }) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Negócio Vinculado</Label>
              <Select
                value={projetoForm.negocio_id || 'none'}
                onValueChange={v => setProjetoForm(f => ({ ...f, negocio_id: v === 'none' ? '' : v }))}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowEditProjetoModal(false); setApiError('') }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
