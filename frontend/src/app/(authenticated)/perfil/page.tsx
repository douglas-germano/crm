'use client'

import { useState, useEffect, useRef } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { cn, getInitials } from '@/lib/utils'
import { Loader2, Check, Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function PerfilPage() {
  const { user } = useAuth()
  const senhaRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [formErrors, setFormErrors] = useState<{ nome?: string; email?: string }>({})

  const [form, setForm] = useState({ nome: '', email: '' })

  const [senhaLoading, setSenhaLoading] = useState(false)
  const [senhaSuccess, setSenhaSuccess] = useState(false)
  const [senhaError, setSenhaError] = useState('')
  const [senhaErrors, setSenhaErrors] = useState<{ senha_atual?: string; nova_senha?: string; confirmar_senha?: string }>({})
  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false)

  const [senhaForm, setSenhaForm] = useState({
    senha_atual: '',
    nova_senha: '',
    confirmar_senha: '',
  })

  useEffect(() => {
    if (user) {
      setForm({ nome: user.nome ?? '', email: user.email ?? '' })
    }
  }, [user])

  useEffect(() => {
    if (user?.deve_trocar_senha && senhaRef.current) {
      senhaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [user?.deve_trocar_senha])

  const validateProfileForm = (): boolean => {
    const errors: { nome?: string; email?: string } = {}
    if (!form.nome.trim()) errors.nome = 'Nome e obrigatorio.'
    if (!form.email.trim()) errors.email = 'Email e obrigatorio.'
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
    } catch (err: any) {
      const msg = err?.response?.data?.erro || err?.response?.data?.message || 'Erro ao salvar perfil.'
      setProfileError(msg)
    } finally {
      setLoading(false)
    }
  }

  const validateSenhaForm = (): boolean => {
    const errors: { senha_atual?: string; nova_senha?: string; confirmar_senha?: string } = {}
    if (!senhaForm.senha_atual.trim()) errors.senha_atual = 'Informe a senha atual.'
    if (!senhaForm.nova_senha.trim()) {
      errors.nova_senha = 'Informe a nova senha.'
    } else if (senhaForm.nova_senha.length < 6) {
      errors.nova_senha = 'A nova senha deve ter no minimo 6 caracteres.'
    }
    if (!senhaForm.confirmar_senha.trim()) {
      errors.confirmar_senha = 'Confirme a nova senha.'
    } else if (senhaForm.nova_senha !== senhaForm.confirmar_senha) {
      errors.confirmar_senha = 'As senhas nao coincidem.'
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
    } catch (err: any) {
      const msg = err?.response?.data?.erro || err?.response?.data?.message || 'Erro ao alterar senha.'
      setSenhaError(msg)
    } finally {
      setSenhaLoading(false)
    }
  }

  const initials = user?.nome ? getInitials(user.nome) : '?'

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <h2 className="text-xl font-semibold">Meu Perfil</h2>

      {/* Force password change banner */}
      {user?.deve_trocar_senha && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Por seguranca, altere sua senha padrao.</p>
            <p className="text-xs mt-0.5 text-amber-700">
              Recomendamos que voce altere a senha padrao para manter sua conta segura.
            </p>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{user?.nome ?? 'Carregando...'}</CardTitle>
              <p className="text-sm text-muted-foreground">{user?.email ?? '-'}</p>
              {user?.perfil && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {typeof user.perfil === 'string' ? user.perfil : user.perfil.nome}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <p className="text-sm font-medium mb-3">Editar Perfil</p>
          <form onSubmit={handleProfileSubmit} className="space-y-3">
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

            {profileError && (
              <p className="text-destructive text-sm">{profileError}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : success ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : null}
                {success ? 'Salvo!' : 'Salvar Alteracoes'}
              </Button>
              {success && <span className="text-green-600 text-sm">Perfil atualizado com sucesso.</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card ref={senhaRef} className={cn(user?.deve_trocar_senha && 'ring-2 ring-amber-400')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSenhaSubmit} className="space-y-3">
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
                <button
                  type="button"
                  onClick={() => setShowSenhaAtual(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {senhaErrors.senha_atual && <p className="text-destructive text-xs">{senhaErrors.senha_atual}</p>}
            </div>

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
                <button
                  type="button"
                  onClick={() => setShowNovaSenha(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
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
                <button
                  type="button"
                  onClick={() => setShowConfirmarSenha(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {senhaErrors.confirmar_senha && <p className="text-destructive text-xs">{senhaErrors.confirmar_senha}</p>}
            </div>

            {senhaError && (
              <p className="text-destructive text-sm">{senhaError}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" size="sm" disabled={senhaLoading}>
                {senhaLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : senhaSuccess ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <Lock className="h-4 w-4 mr-1" />
                )}
                {senhaSuccess ? 'Senha alterada!' : 'Alterar Senha'}
              </Button>
              {senhaSuccess && <span className="text-green-600 text-sm">Senha alterada com sucesso.</span>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
