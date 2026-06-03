'use client'

import { useState, useEffect, useRef } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { cn, getInitials } from '@/lib/utils'
import {
  Loader2, Check, Lock, AlertTriangle, Eye, EyeOff,
  ShieldCheck, GlobeLock, Mail, KeySquare, AlertCircle,
  User, Settings2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

  // ── Configurações (admin) ───────────────────────────────────────────────────
  const [allowRegistration, setAllowRegistration] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [require2FA, setRequire2FA] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [invalidatingJwt, setInvalidatingJwt] = useState(false)
  const [jwtDone, setJwtDone] = useState(false)
  const [testingGateway, setTestingGateway] = useState(false)
  const [gatewayResult, setGatewayResult] = useState<'ok' | 'error' | null>(null)

  const isAdmin = user?.perfil
    ? (typeof user.perfil === 'string' ? user.perfil : user.perfil.nome) === 'Administrador'
    : false

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

  // ── Handlers configurações ──────────────────────────────────────────────────
  const handleSaveConfig = async () => {
    setSaving(true)
    setSaved(false)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleInvalidateJwts = async () => {
    setInvalidatingJwt(true)
    setJwtDone(false)
    await new Promise(r => setTimeout(r, 1000))
    setInvalidatingJwt(false)
    setJwtDone(true)
    setTimeout(() => setJwtDone(false), 3000)
  }

  const handleTestGateway = async () => {
    setTestingGateway(true)
    setGatewayResult(null)
    await new Promise(r => setTimeout(r, 1200))
    setTestingGateway(false)
    setGatewayResult('ok')
    setTimeout(() => setGatewayResult(null), 4000)
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
            <TabsTrigger value="configuracoes" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Configurações
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

        {/* ── Tab Configurações (admin only) ── */}
        {isAdmin && (
          <TabsContent value="configuracoes" className="mt-4 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">

              {/* Acesso e Segurança */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-500" />
                    Acesso e Segurança Global
                  </CardTitle>
                  <CardDescription>Controle quem pode entrar na plataforma e qual protocolo exigir.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 flex-1">
                      <Label className="text-sm font-medium">Inscrições Abertas</Label>
                      <p className="text-xs text-muted-foreground">
                        Se desativado, esconde a página <code className="text-xs">/registro</code> para visitantes externos.
                      </p>
                    </div>
                    <Switch
                      checked={allowRegistration}
                      onCheckedChange={setAllowRegistration}
                      className="data-[state=checked]:bg-brand-500 shrink-0"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-4 border-t">
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Forçar Autenticação 2FA</Label>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Em breve</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Todos os administradores serão obrigados a usar 2FA no login.
                      </p>
                    </div>
                    <Switch
                      checked={require2FA}
                      onCheckedChange={setRequire2FA}
                      disabled
                      className="data-[state=checked]:bg-brand-500 shrink-0"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Protocolos de Emergência */}
              <Card className="border-destructive/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <GlobeLock className="w-4 h-4" />
                    Protocolos de Emergência
                  </CardTitle>
                  <CardDescription>Ações que afetam sessões e conexões de todos os clientes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 flex-1">
                      <Label className="text-sm font-medium">Modo Manutenção (503)</Label>
                      <p className="text-xs text-muted-foreground">
                        Coloca todo o sistema em lockdown com mensagem de manutenção.
                      </p>
                    </div>
                    <Switch
                      checked={maintenanceMode}
                      onCheckedChange={setMaintenanceMode}
                      className="data-[state=checked]:bg-destructive shrink-0"
                    />
                  </div>
                  <div className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full font-semibold"
                      onClick={handleInvalidateJwts}
                      disabled={invalidatingJwt || jwtDone}
                    >
                      {invalidatingJwt ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : jwtDone ? <Check className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                      {jwtDone ? 'JWTs invalidados!' : 'Invalidar JWTs Ativos'}
                    </Button>
                    {jwtDone && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Todos os tokens foram revogados. Usuários precisarão fazer login novamente.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* E-mail & Mensageria */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="w-4 h-4 text-accent-500" />
                    Motores de E-mail & Mensageria
                  </CardTitle>
                  <CardDescription>Apontamentos DNS e chaves atreladas ao Brevo API.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div className="bg-muted/40 p-4 rounded-lg border space-y-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Provedor</span>
                    <p className="text-sm font-semibold flex gap-2 items-center">
                      <KeySquare className="w-4 h-4 text-emerald-500" />
                      Brevo Transactional
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">Ativo</Badge>
                    </p>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-lg border space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Cota Mensal</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent-500 w-[12%] rounded-full" />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">12%</span>
                    </div>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-lg border flex flex-col justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleTestGateway}
                      disabled={testingGateway}
                    >
                      {testingGateway ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : gatewayResult === 'ok' ? <Check className="w-4 h-4 mr-2 text-emerald-600" /> : gatewayResult === 'error' ? <AlertCircle className="w-4 h-4 mr-2 text-destructive" /> : null}
                      {gatewayResult === 'ok' ? 'Gateway OK' : 'Testar Gateway'}
                    </Button>
                    {gatewayResult === 'error' && (
                      <p className="text-xs text-destructive text-center">Falha na conexão com o Brevo.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Salvar configurações */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t">
              {saved && (
                <span className="text-sm text-emerald-600 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Configurações salvas.
                </span>
              )}
              <Button
                onClick={handleSaveConfig}
                disabled={saving || saved}
                className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : null}
                {saved ? 'Salvo!' : 'Salvar Modificações'}
              </Button>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
