'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import api from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { cn, getInitials, formatDate } from '@/lib/utils'
import {
  Loader2, Check, Lock, AlertTriangle, Eye, EyeOff,
  User, Settings2, Users, Plus, GitBranch, Pencil, Trash2,
  ChevronDown, ChevronRight, Webhook, Copy, RefreshCw, ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const STAGE_COLORS = [
  '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#27ae60', '#c0392b', '#8e44ad',
  '#2980b9', '#16a085', '#d35400', '#7f8c8d', '#2c3e50',
]

const fetcher = (url: string) => api.get(url).then(r => r.data)

export default function PerfilPage() {
  const { user } = useAuth()
  const senhaRef = useRef<HTMLDivElement>(null)

  // ── Perfil ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [formErrors, setFormErrors] = useState<{ nome?: string; email?: string }>({})
  const [form, setForm] = useState({ nome: '', email: '' })

  // ── Senha ───────────────────────────────────────────────────────────────────
  const [senhaLoading, setSenhaLoading] = useState(false)
  const [senhaSuccess, setSenhaSuccess] = useState(false)
  const [senhaError, setSenhaError] = useState('')
  const [senhaErrors, setSenhaErrors] = useState<{ senha_atual?: string; nova_senha?: string; confirmar_senha?: string }>({})
  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false)
  const [senhaForm, setSenhaForm] = useState({ senha_atual: '', nova_senha: '', confirmar_senha: '' })

  // ── Pipeline (admin) ────────────────────────────────────────────────────────
  interface PipelineItem { id: number; nome: string; descricao: string; ativo: boolean; estagios: EstagioItem[] }
  interface EstagioItem { id: number; nome: string; cor: string; ordem: number; descricao?: string }

  const [expandedPipeline, setExpandedPipeline] = useState<number | null>(null)
  // Pipeline modal
  const [showPipelineModal, setShowPipelineModal] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<PipelineItem | null>(null)
  const [pipelineForm, setPipelineForm] = useState({ nome: '', descricao: '' })
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [pipelineError, setPipelineError] = useState('')
  // Delete pipeline
  const [deletingPipeline, setDeletingPipeline] = useState<PipelineItem | null>(null)
  const [showDeletePipelineModal, setShowDeletePipelineModal] = useState(false)
  // Stage modal
  const [showEstagioModal, setShowEstagioModal] = useState(false)
  const [editingEstagio, setEditingEstagio] = useState<EstagioItem | null>(null)
  const [estagioTargetPipelineId, setEstagioTargetPipelineId] = useState<number | null>(null)
  const [estagioForm, setEstagioForm] = useState({ nome: '', cor: '#3498db', descricao: '' })
  const [estagioLoading, setEstagioLoading] = useState(false)
  const [estagioError, setEstagioError] = useState('')
  // Delete stage
  const [deletingEstagio, setDeletingEstagio] = useState<EstagioItem | null>(null)
  const [showDeleteEstagioModal, setShowDeleteEstagioModal] = useState(false)

  const isAdmin = user?.perfil
    ? (typeof user.perfil === 'string' ? user.perfil : user.perfil.nome) === 'Administrador'
    : false

  // ── Webhook (admin) ──────────────────────────────────────────────────────────
  const [tokenVisible, setTokenVisible] = useState(false)
  const [copied, setCopied] = useState<'token' | 'url' | 'curl' | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)

  const { data: webhookConfig, mutate: mutateWebhook } = useSWR(
    isAdmin ? '/api/webhook/config' : null, fetcher
  )
  const webhookToken: string = webhookConfig?.webhook_token ?? ''
  const webhookUrl: string = webhookConfig?.webhook_url ?? ''

  const copyToClipboard = async (text: string, field: 'token' | 'url' | 'curl') => {
    await navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      await api.post('/api/webhook/token/regenerate')
      mutateWebhook()
      setShowRegenerateConfirm(false)
      setTokenVisible(false)
    } catch { /* silencioso */ }
    finally { setRegenerating(false) }
  }

  const curlExample = webhookToken
    ? `curl -X POST ${webhookUrl} \\\n  -H "Content-Type: application/json" \\\n  -H "X-Webhook-Token: ${webhookToken}" \\\n  -d '{"nome":"João Silva","email":"joao@empresa.com","telefone":"11999999999","empresa":"Empresa X","origem":"Site"}'`
    : ''

  // ── Usuários (admin) ─────────────────────────────────────────────────────────
  const [showUsuarioModal, setShowUsuarioModal] = useState(false)
  const [usuarioLoading, setUsuarioLoading] = useState(false)
  const [usuarioApiError, setUsuarioApiError] = useState('')
  const [usuarioForm, setUsuarioForm] = useState({ nome: '', email: '', senha: '', perfil_id: '' })

  const { data: usuariosData, mutate: mutateUsuarios, isLoading: usuariosLoading } = useSWR(
    isAdmin ? '/api/usuarios' : null, fetcher
  )
  const { data: perfisData } = useSWR(isAdmin ? '/api/usuarios/perfis' : null, fetcher)

  interface UsuarioItem { id: number; nome: string; email: string; perfil?: { nome: string }; ativo: boolean; ultimo_login: string }
  interface PerfilItem { id: number; nome: string }
  const usuarios: UsuarioItem[] = usuariosData?.usuarios ?? []
  const perfis: PerfilItem[] = perfisData?.perfis ?? []

  const { data: pipelinesData, mutate: mutatePipelines, isLoading: pipelinesLoading } = useSWR(
    isAdmin ? '/api/pipelines' : null, fetcher
  )
  const pipelines: PipelineItem[] = pipelinesData?.pipelines ?? []

  // ── Pipeline handlers ───────────────────────────────────────────────────────
  const openCreatePipeline = () => {
    setEditingPipeline(null)
    setPipelineForm({ nome: '', descricao: '' })
    setPipelineError('')
    setShowPipelineModal(true)
  }
  const openEditPipeline = (p: PipelineItem) => {
    setEditingPipeline(p)
    setPipelineForm({ nome: p.nome, descricao: p.descricao ?? '' })
    setPipelineError('')
    setShowPipelineModal(true)
  }
  const handleSavePipeline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pipelineForm.nome.trim()) { setPipelineError('Nome é obrigatório'); return }
    setPipelineLoading(true); setPipelineError('')
    try {
      if (editingPipeline) {
        await api.put(`/api/pipelines/${editingPipeline.id}`, pipelineForm)
      } else {
        await api.post('/api/pipelines', { ...pipelineForm, criar_estagios_padrao: false })
      }
      setShowPipelineModal(false)
      mutatePipelines()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } }
      setPipelineError(error.response?.data?.erro || 'Erro ao salvar pipeline')
    } finally { setPipelineLoading(false) }
  }
  const handleDeletePipeline = async () => {
    if (!deletingPipeline) return
    setPipelineLoading(true)
    try {
      await api.delete(`/api/pipelines/${deletingPipeline.id}`)
      setShowDeletePipelineModal(false)
      setDeletingPipeline(null)
      if (expandedPipeline === deletingPipeline.id) setExpandedPipeline(null)
      mutatePipelines()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } }
      setPipelineError(error.response?.data?.erro || 'Erro ao excluir pipeline')
    } finally { setPipelineLoading(false) }
  }

  // ── Stage handlers ──────────────────────────────────────────────────────────
  const openCreateEstagio = (pipelineId: number) => {
    setEditingEstagio(null)
    setEstagioTargetPipelineId(pipelineId)
    setEstagioForm({ nome: '', cor: '#3498db', descricao: '' })
    setEstagioError('')
    setShowEstagioModal(true)
  }
  const openEditEstagio = (e: EstagioItem, pipelineId: number) => {
    setEditingEstagio(e)
    setEstagioTargetPipelineId(pipelineId)
    setEstagioForm({ nome: e.nome, cor: e.cor, descricao: e.descricao ?? '' })
    setEstagioError('')
    setShowEstagioModal(true)
  }
  const handleSaveEstagio = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!estagioForm.nome.trim()) { setEstagioError('Nome é obrigatório'); return }
    setEstagioLoading(true); setEstagioError('')
    try {
      if (editingEstagio) {
        await api.put(`/api/pipelines/estagios/${editingEstagio.id}`, estagioForm)
      } else {
        await api.post(`/api/pipelines/${estagioTargetPipelineId}/estagios`, estagioForm)
      }
      setShowEstagioModal(false)
      mutatePipelines()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } }
      setEstagioError(error.response?.data?.erro || 'Erro ao salvar estágio')
    } finally { setEstagioLoading(false) }
  }
  const handleDeleteEstagio = async () => {
    if (!deletingEstagio) return
    setEstagioLoading(true)
    try {
      await api.delete(`/api/pipelines/estagios/${deletingEstagio.id}`)
      setShowDeleteEstagioModal(false)
      setDeletingEstagio(null)
      mutatePipelines()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } }
      setEstagioError(error.response?.data?.erro || 'Erro ao excluir estágio')
    } finally { setEstagioLoading(false) }
  }

  const handleCreateUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioForm.perfil_id) { setUsuarioApiError('Selecione um perfil'); return }
    setUsuarioLoading(true); setUsuarioApiError('')
    try {
      await api.post('/api/usuarios', { ...usuarioForm, perfil_id: Number(usuarioForm.perfil_id) })
      setUsuarioForm({ nome: '', email: '', senha: '', perfil_id: '' })
      setShowUsuarioModal(false)
      mutateUsuarios()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string } } }
      setUsuarioApiError(error.response?.data?.erro || 'Erro ao criar usuário')
    } finally { setUsuarioLoading(false) }
  }

  useEffect(() => {
    if (user) setForm({ nome: user.nome ?? '', email: user.email ?? '' })
  }, [user])

  useEffect(() => {
    if (user?.deve_trocar_senha && senhaRef.current) {
      senhaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [user?.deve_trocar_senha])

  // ── Handlers perfil ─────────────────────────────────────────────────────────
  const validateProfileForm = (): boolean => {
    const errors: { nome?: string; email?: string } = {}
    if (!form.nome.trim()) errors.nome = 'Nome é obrigatório.'
    if (!form.email.trim()) errors.email = 'Email é obrigatório.'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setSuccess(false)
    if (!validateProfileForm()) return
    setLoading(true)
    try {
      await api.put('/api/usuarios/perfil', form)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } }
      setProfileError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao salvar perfil.')
    } finally {
      setLoading(false)
    }
  }

  // ── Handlers senha ──────────────────────────────────────────────────────────
  const validateSenhaForm = (): boolean => {
    const errors: { senha_atual?: string; nova_senha?: string; confirmar_senha?: string } = {}
    if (!senhaForm.senha_atual.trim()) errors.senha_atual = 'Informe a senha atual.'
    if (!senhaForm.nova_senha.trim()) {
      errors.nova_senha = 'Informe a nova senha.'
    } else if (senhaForm.nova_senha.length < 6) {
      errors.nova_senha = 'A nova senha deve ter no mínimo 6 caracteres.'
    }
    if (!senhaForm.confirmar_senha.trim()) {
      errors.confirmar_senha = 'Confirme a nova senha.'
    } else if (senhaForm.nova_senha !== senhaForm.confirmar_senha) {
      errors.confirmar_senha = 'As senhas não coincidem.'
    }
    setSenhaErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSenhaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSenhaError('')
    setSenhaSuccess(false)
    if (!validateSenhaForm()) return
    setSenhaLoading(true)
    try {
      await api.put('/api/usuarios/senha', {
        senha_atual: senhaForm.senha_atual,
        nova_senha: senhaForm.nova_senha,
      })
      setSenhaSuccess(true)
      setSenhaForm({ senha_atual: '', nova_senha: '', confirmar_senha: '' })
      setTimeout(() => setSenhaSuccess(false), 3000)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } }
      setSenhaError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao alterar senha.')
    } finally {
      setSenhaLoading(false)
    }
  }

  const initials = user?.nome ? getInitials(user.nome) : '?'

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{user?.nome ?? 'Carregando...'}</h2>
          <p className="text-sm text-muted-foreground">{user?.email ?? '-'}</p>
          {user?.perfil && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {typeof user.perfil === 'string' ? user.perfil : user.perfil.nome}
            </p>
          )}
        </div>
      </div>

      {/* Banner troca de senha obrigatória */}
      {user?.deve_trocar_senha && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Por segurança, altere sua senha padrão.</p>
            <p className="text-xs mt-0.5 text-amber-700">
              Recomendamos alterar a senha padrão para manter sua conta segura.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="perfil">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="perfil" className="gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-2">
            <Lock className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="usuarios" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="configuracoes" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="integracoes" className="gap-2">
              <Webhook className="h-4 w-4" />
              Integrações
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Tab Perfil ── */}
        <TabsContent value="perfil" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados Pessoais</CardTitle>
              <CardDescription>Atualize seu nome e endereço de e-mail.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nome</Label>
                    <Input
                      value={form.nome}
                      onChange={e => {
                        setForm(f => ({ ...f, nome: e.target.value }))
                        if (formErrors.nome) setFormErrors(fe => ({ ...fe, nome: undefined }))
                      }}
                      className={cn(formErrors.nome && 'border-destructive')}
                    />
                    {formErrors.nome && <p className="text-destructive text-xs">{formErrors.nome}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => {
                        setForm(f => ({ ...f, email: e.target.value }))
                        if (formErrors.email) setFormErrors(fe => ({ ...fe, email: undefined }))
                      }}
                      className={cn(formErrors.email && 'border-destructive')}
                    />
                    {formErrors.email && <p className="text-destructive text-xs">{formErrors.email}</p>}
                  </div>
                </div>

                {profileError && <p className="text-destructive text-sm">{profileError}</p>}

                <div className="flex items-center gap-3 pt-1">
                  <Button type="submit" size="sm" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : success ? <Check className="h-4 w-4 mr-1" /> : null}
                    {success ? 'Salvo!' : 'Salvar Alterações'}
                  </Button>
                  {success && <span className="text-emerald-600 text-sm">Perfil atualizado com sucesso.</span>}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Segurança ── */}
        <TabsContent value="seguranca" className="mt-4">
          <Card ref={senhaRef} className={cn(user?.deve_trocar_senha && 'ring-2 ring-amber-400')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Alterar Senha
              </CardTitle>
              <CardDescription>Escolha uma senha forte com no mínimo 6 caracteres.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSenhaSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Senha atual</Label>
                  <div className="relative">
                    <Input
                      type={showSenhaAtual ? 'text' : 'password'}
                      value={senhaForm.senha_atual}
                      onChange={e => {
                        setSenhaForm(f => ({ ...f, senha_atual: e.target.value }))
                        if (senhaErrors.senha_atual) setSenhaErrors(se => ({ ...se, senha_atual: undefined }))
                      }}
                      className={cn(senhaErrors.senha_atual && 'border-destructive', 'pr-9')}
                    />
                    <button type="button" onClick={() => setShowSenhaAtual(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {senhaErrors.senha_atual && <p className="text-destructive text-xs">{senhaErrors.senha_atual}</p>}
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nova senha</Label>
                    <div className="relative">
                      <Input
                        type={showNovaSenha ? 'text' : 'password'}
                        value={senhaForm.nova_senha}
                        onChange={e => {
                          setSenhaForm(f => ({ ...f, nova_senha: e.target.value }))
                          if (senhaErrors.nova_senha) setSenhaErrors(se => ({ ...se, nova_senha: undefined }))
                        }}
                        className={cn(senhaErrors.nova_senha && 'border-destructive', 'pr-9')}
                      />
                      <button type="button" onClick={() => setShowNovaSenha(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {senhaErrors.nova_senha && <p className="text-destructive text-xs">{senhaErrors.nova_senha}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirmar nova senha</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmarSenha ? 'text' : 'password'}
                        value={senhaForm.confirmar_senha}
                        onChange={e => {
                          setSenhaForm(f => ({ ...f, confirmar_senha: e.target.value }))
                          if (senhaErrors.confirmar_senha) setSenhaErrors(se => ({ ...se, confirmar_senha: undefined }))
                        }}
                        className={cn(senhaErrors.confirmar_senha && 'border-destructive', 'pr-9')}
                      />
                      <button type="button" onClick={() => setShowConfirmarSenha(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showConfirmarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {senhaErrors.confirmar_senha && <p className="text-destructive text-xs">{senhaErrors.confirmar_senha}</p>}
                  </div>
                </div>

                {senhaError && <p className="text-destructive text-sm">{senhaError}</p>}

                <div className="flex items-center gap-3 pt-1">
                  <Button type="submit" size="sm" disabled={senhaLoading}>
                    {senhaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : senhaSuccess ? <Check className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                    {senhaSuccess ? 'Senha alterada!' : 'Alterar Senha'}
                  </Button>
                  {senhaSuccess && <span className="text-emerald-600 text-sm">Senha alterada com sucesso.</span>}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Usuários (admin only) ── */}
        {isAdmin && (
          <TabsContent value="usuarios" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Gerencie os usuários do workspace.</p>
              <Button size="sm" onClick={() => setShowUsuarioModal(true)}>
                <Plus className="h-4 w-4 mr-1" /> Novo Usuário
              </Button>
            </div>
            <Card>
              {usuariosLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : usuarios.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground text-sm">Nenhum usuário encontrado.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Último Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map(u => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs">{u.nome.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{u.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.perfil?.nome ?? '-'}</TableCell>
                        <TableCell>
                          <Badge variant={u.ativo ? 'default' : 'destructive'} className="text-xs">
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.ultimo_login ? formatDate(u.ultimo_login) : 'Nunca'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            <Dialog open={showUsuarioModal} onOpenChange={open => { if (!open) { setShowUsuarioModal(false); setUsuarioApiError(''); setUsuarioForm({ nome: '', email: '', senha: '', perfil_id: '' }) } }}>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateUsuario} className="space-y-4">
                  {usuarioApiError && (
                    <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{usuarioApiError}</div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Nome *</Label>
                    <Input required value={usuarioForm.nome} onChange={e => setUsuarioForm(f => ({ ...f, nome: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input required type="email" value={usuarioForm.email} onChange={e => setUsuarioForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Senha *</Label>
                    <Input required type="password" value={usuarioForm.senha} onChange={e => setUsuarioForm(f => ({ ...f, senha: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Perfil *</Label>
                    <Select value={usuarioForm.perfil_id || 'none'} onValueChange={v => setUsuarioForm(f => ({ ...f, perfil_id: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione um perfil..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione...</SelectItem>
                        {perfis.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setShowUsuarioModal(false); setUsuarioApiError('') }}>Cancelar</Button>
                    <Button type="submit" disabled={usuarioLoading}>
                      {usuarioLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {/* ── Tab Pipeline (admin only) ── */}
        {isAdmin && (
          <TabsContent value="configuracoes" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Gerencie os pipelines e seus estágios de venda.</p>
              <Button size="sm" onClick={openCreatePipeline}>
                <Plus className="h-4 w-4 mr-1" /> Novo Pipeline
              </Button>
            </div>

            {pipelinesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : pipelines.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <GitBranch className="h-10 w-10 opacity-20" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Nenhum pipeline criado</p>
                    <p className="text-xs mt-1">Crie um pipeline para organizar seus leads por etapa de venda</p>
                  </div>
                  <Button size="sm" onClick={openCreatePipeline}>
                    <Plus className="h-4 w-4 mr-1" /> Criar primeiro pipeline
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pipelines.map(pipeline => (
                  <Card key={pipeline.id} className="overflow-hidden">
                    {/* Pipeline header */}
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                      onClick={() => setExpandedPipeline(expandedPipeline === pipeline.id ? null : pipeline.id)}
                    >
                      <button className="text-muted-foreground">
                        {expandedPipeline === pipeline.id
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{pipeline.nome}</p>
                        {pipeline.descricao && (
                          <p className="text-xs text-muted-foreground truncate">{pipeline.descricao}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {pipeline.estagios.length} estágio{pipeline.estagios.length !== 1 ? 's' : ''}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={e => { e.stopPropagation(); openEditPipeline(pipeline) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={e => { e.stopPropagation(); setDeletingPipeline(pipeline); setShowDeletePipelineModal(true) }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded stages */}
                    {expandedPipeline === pipeline.id && (
                      <>
                        <Separator />
                        <div className="p-4 space-y-2">
                          {pipeline.estagios.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">Nenhum estágio. Adicione o primeiro abaixo.</p>
                          ) : (
                            pipeline.estagios
                              .sort((a, b) => a.ordem - b.ordem)
                              .map(estagio => (
                                <div key={estagio.id} className="flex items-center gap-3 px-3 py-2 rounded-md border bg-muted/20 group">
                                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: estagio.cor }} />
                                  <span className="text-xs text-muted-foreground w-5 tabular-nums">{estagio.ordem}.</span>
                                  <span className="text-sm font-medium flex-1">{estagio.nome}</span>
                                  {estagio.descricao && (
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden md:block">{estagio.descricao}</span>
                                  )}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-6 w-6"
                                      onClick={() => openEditEstagio(estagio, pipeline.id)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                                      onClick={() => { setDeletingEstagio(estagio); setShowDeleteEstagioModal(true) }}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                          )}
                          <Button variant="outline" size="sm" className="w-full mt-2 text-xs"
                            onClick={() => openCreateEstagio(pipeline.id)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar estágio
                          </Button>
                        </div>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* Modal: criar/editar pipeline */}
            <Dialog open={showPipelineModal} onOpenChange={open => { if (!open) setShowPipelineModal(false) }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingPipeline ? 'Editar Pipeline' : 'Novo Pipeline'}</DialogTitle>
                  <DialogDescription>
                    {editingPipeline ? 'Atualize o nome e descrição do pipeline.' : 'Crie um funil de vendas para organizar seus leads.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSavePipeline} className="space-y-4">
                  {pipelineError && (
                    <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{pipelineError}</div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Nome *</Label>
                    <Input required value={pipelineForm.nome} onChange={e => setPipelineForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Funil Comercial" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Input value={pipelineForm.descricao} onChange={e => setPipelineForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição opcional" />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowPipelineModal(false)}>Cancelar</Button>
                    <Button type="submit" disabled={pipelineLoading}>
                      {pipelineLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Modal: confirmar exclusão pipeline */}
            <Dialog open={showDeletePipelineModal} onOpenChange={open => { if (!open) { setShowDeletePipelineModal(false); setDeletingPipeline(null) } }}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Excluir Pipeline</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir <strong>{deletingPipeline?.nome}</strong>? Todos os estágios serão removidos. Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowDeletePipelineModal(false); setDeletingPipeline(null) }}>Cancelar</Button>
                  <Button variant="destructive" onClick={handleDeletePipeline} disabled={pipelineLoading}>
                    {pipelineLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Excluir
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Modal: criar/editar estágio */}
            <Dialog open={showEstagioModal} onOpenChange={open => { if (!open) setShowEstagioModal(false) }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingEstagio ? 'Editar Estágio' : 'Novo Estágio'}</DialogTitle>
                  <DialogDescription>Configure o nome e a cor do estágio no pipeline.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveEstagio} className="space-y-4">
                  {estagioError && (
                    <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{estagioError}</div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Nome *</Label>
                    <Input required value={estagioForm.nome} onChange={e => setEstagioForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Proposta Técnica" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Input value={estagioForm.descricao} onChange={e => setEstagioForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição opcional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="flex flex-wrap gap-2">
                      {STAGE_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEstagioForm(f => ({ ...f, cor: color }))}
                          className="w-7 h-7 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: color,
                            borderColor: estagioForm.cor === color ? '#000' : 'transparent',
                            transform: estagioForm.cor === color ? 'scale(1.2)' : 'scale(1)',
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: estagioForm.cor }} />
                      <Input
                        value={estagioForm.cor}
                        onChange={e => setEstagioForm(f => ({ ...f, cor: e.target.value }))}
                        placeholder="#3498db"
                        className="w-28 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowEstagioModal(false)}>Cancelar</Button>
                    <Button type="submit" disabled={estagioLoading}>
                      {estagioLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Modal: confirmar exclusão estágio */}
            <Dialog open={showDeleteEstagioModal} onOpenChange={open => { if (!open) { setShowDeleteEstagioModal(false); setDeletingEstagio(null) } }}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Excluir Estágio</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir <strong>{deletingEstagio?.nome}</strong>? Estágios com leads não podem ser excluídos.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowDeleteEstagioModal(false); setDeletingEstagio(null) }}>Cancelar</Button>
                  <Button variant="destructive" onClick={handleDeleteEstagio} disabled={estagioLoading}>
                    {estagioLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Excluir
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {/* ── Tab Integrações (admin only) ── */}
        {isAdmin && (
          <TabsContent value="integracoes" className="mt-4 space-y-6">

            {/* Webhook card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Webhook de Leads</CardTitle>
                </div>
                <CardDescription>
                  Envie leads automaticamente de formulários, anúncios e integrações externas para este workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* URL do Webhook */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">URL do Endpoint</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-muted px-3 py-2 rounded-md font-mono truncate">
                      {webhookUrl || 'Carregando...'}
                    </code>
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0"
                      onClick={() => copyToClipboard(webhookUrl, 'url')} disabled={!webhookUrl}>
                      {copied === 'url' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Token */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Token de Autenticação</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <code className="block text-sm bg-muted px-3 py-2 rounded-md font-mono truncate pr-10">
                        {!webhookToken
                          ? 'Carregando...'
                          : tokenVisible
                          ? webhookToken
                          : '•'.repeat(Math.min(webhookToken.length, 40))}
                      </code>
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setTokenVisible(v => !v)}
                      >
                        {tokenVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0"
                      onClick={() => copyToClipboard(webhookToken, 'token')} disabled={!webhookToken}>
                      {copied === 'token' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0text-muted-foreground"
                      onClick={() => setShowRegenerateConfirm(true)} disabled={!webhookToken}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envie o token no header <code className="bg-muted px-1 rounded text-[11px]">X-Webhook-Token</code> de cada requisição.
                  </p>
                </div>

                <Separator />

                {/* Campos suportados */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campos do Payload (JSON)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-foreground">Obrigatórios</p>
                      {[
                        { field: 'nome', aliases: 'name, full_name' },
                        { field: 'email', aliases: 'email_address' },
                      ].map(({ field, aliases }) => (
                        <div key={field} className="flex items-start gap-2 text-xs">
                          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] shrink-0">{field}</code>
                          <span className="text-muted-foreground">ou {aliases}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-foreground">Opcionais</p>
                      {[
                        { field: 'telefone', aliases: 'phone, mobile' },
                        { field: 'empresa', aliases: 'company' },
                        { field: 'cargo', aliases: 'job_title, position' },
                        { field: 'interesse', aliases: 'interest, subject' },
                        { field: 'origem', aliases: 'source, utm_source' },
                        { field: 'observacoes', aliases: 'message, notes' },
                      ].map(({ field, aliases }) => (
                        <div key={field} className="flex items-start gap-2 text-xs">
                          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] shrink-0">{field}</code>
                          <span className="text-muted-foreground">ou {aliases}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Exemplo cURL */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exemplo cURL</Label>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => copyToClipboard(curlExample, 'curl')} disabled={!curlExample}>
                      {copied === 'curl' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === 'curl' ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                  <pre className="text-[11px] bg-muted rounded-md p-3 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap break-all">
                    {curlExample || 'Carregando token...'}
                  </pre>
                </div>

                {/* Integrações populares */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compatível com</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Meta Ads (Lead Ads)', 'Google Ads', 'RD Station', 'Zapier', 'Make (Integromat)', 'Typeform', 'Tally', 'Google Forms'].map(tool => (
                      <Badge key={tool} variant="outline" className="text-xs font-normal">{tool}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure qualquer ferramenta que envie requisições HTTP POST com JSON para receber leads automaticamente.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Modal de confirmação de regeneração */}
            <Dialog open={showRegenerateConfirm} onOpenChange={open => { if (!open) setShowRegenerateConfirm(false) }}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Regenerar Token</DialogTitle>
                  <DialogDescription>
                    O token atual deixará de funcionar imediatamente. Todas as integrações que o utilizam precisarão ser atualizadas com o novo token. Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRegenerateConfirm(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={handleRegenerate} disabled={regenerating}>
                    {regenerating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Regenerar Token
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
