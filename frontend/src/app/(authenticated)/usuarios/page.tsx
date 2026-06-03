'use client'

import { useState } from 'react'
import useSWR from 'swr'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Plus, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const fetcher = (url: string) => api.get(url).then(r => r.data)

interface Usuario {
  id: number
  nome: string
  email: string
  perfil?: { nome: string }
  ativo: boolean
  ultimo_login: string
}

interface Perfil {
  id: number
  nome: string
}

export default function UsuariosPage() {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const [form, setForm] = useState({
    nome: '', email: '', senha: '', perfil_id: ''
  })

  const { data, mutate, isLoading } = useSWR('/api/usuarios', fetcher)
  const { data: perfisData } = useSWR('/api/usuarios/perfis', fetcher)

  const usuarios: Usuario[] = data?.usuarios ?? []
  const perfis: Perfil[] = perfisData?.perfis ?? []

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.perfil_id) {
      setApiError('Selecione um perfil para o usuário')
      return
    }
    setLoading(true)
    setApiError('')
    try {
      await api.post('/api/usuarios', {
        ...form,
        perfil_id: Number(form.perfil_id),
      })
      setForm({ nome: '', email: '', senha: '', perfil_id: '' })
      setShowModal(false)
      mutate()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { erro?: string; message?: string } } }
      setApiError(error.response?.data?.erro || error.response?.data?.message || 'Erro ao criar usuário')
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setApiError('')
    setForm({ nome: '', email: '', senha: '', perfil_id: '' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Usuários</h2>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Novo Usuário
        </Button>
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="font-medium">Nenhum usuário encontrado</p>
          </div>
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
              {usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {usuario.nome.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{usuario.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{usuario.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {usuario.perfil?.nome ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={usuario.ativo ? 'default' : 'destructive'} className="text-xs">
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {usuario.ultimo_login ? formatDate(usuario.ultimo_login) : 'Nunca'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {apiError && (
              <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {apiError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                required
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                required
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Senha *</Label>
              <Input
                required
                type="password"
                value={form.senha}
                onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil *</Label>
              <Select value={form.perfil_id || 'none'} onValueChange={v => setForm(f => ({ ...f, perfil_id: v === 'none' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um perfil..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione...</SelectItem>
                  {perfis.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
