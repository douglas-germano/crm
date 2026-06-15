'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, ShieldCheck, ShieldOff, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/contexts/toast-context';
import api from '@/lib/api';

interface Operador {
  id: number;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
  mfa_habilitado: boolean;
  bloqueado: boolean;
  ultimo_login?: string | null;
}

const NOVO_VAZIO = { nome: '', email: '', senha: '', papel: 'super_admin' };

const PAPEL_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  suporte: 'Suporte (read-only)',
};

export default function OperadoresPage() {
  const { toast } = useToast();
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState(NOVO_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/api/v1/core/super-admin/platform-users');
      setOperadores(resp.data.operadores);
    } catch {
      toast('Falha ao carregar operadores.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const criar = async () => {
    setSalvando(true);
    try {
      await api.post('/api/v1/core/super-admin/platform-users', novo);
      toast('Operador criado.', 'success');
      setCriando(false);
      setNovo(NOVO_VAZIO);
      await carregar();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { erro?: string } } };
      toast(ax?.response?.data?.erro || 'Falha ao criar operador.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const alterarPapel = async (op: Operador, papel: string) => {
    try {
      await api.put(`/api/v1/core/super-admin/platform-users/${op.id}`, { papel });
      toast('Papel atualizado.', 'success');
      await carregar();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { erro?: string } } };
      toast(ax?.response?.data?.erro || 'Falha ao atualizar papel.', 'error');
    }
  };

  const alternarAtivo = async (op: Operador) => {
    try {
      if (op.ativo) {
        await api.delete(`/api/v1/core/super-admin/platform-users/${op.id}`);
      } else {
        await api.put(`/api/v1/core/super-admin/platform-users/${op.id}`, { ativo: true });
      }
      toast(op.ativo ? 'Operador desativado.' : 'Operador reativado.', 'success');
      await carregar();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { erro?: string } } };
      toast(ax?.response?.data?.erro || 'Falha ao atualizar operador.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <UserCog className="h-6 w-6 text-muted-foreground" /> Operadores da Plataforma
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Contas com acesso ao painel global (Super Admin e Suporte).</p>
        </div>
        <Button onClick={() => setCriando(true)}><Plus className="h-4 w-4" /> Novo operador</Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {operadores.map(op => (
            <Card key={op.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{op.nome}</h3>
                    <Badge variant={op.ativo ? 'default' : 'destructive'}>{op.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    {op.mfa_habilitado && <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" /> 2FA</Badge>}
                    {op.bloqueado && <Badge variant="destructive">Bloqueado</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{op.email}</p>
                  {op.ultimo_login && <p className="text-[11px] text-muted-foreground">Último acesso: {new Date(op.ultimo_login).toLocaleString('pt-BR')}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={op.papel} onValueChange={(v) => alterarPapel(op, v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">{PAPEL_LABEL.super_admin}</SelectItem>
                      <SelectItem value="suporte">{PAPEL_LABEL.suporte}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant={op.ativo ? 'destructive' : 'secondary'} size="sm" onClick={() => alternarAtivo(op)}>
                    {op.ativo ? <><ShieldOff className="h-4 w-4" /> Desativar</> : <><ShieldCheck className="h-4 w-4" /> Reativar</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={criando} onOpenChange={setCriando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo operador</DialogTitle>
            <DialogDescription>Crie uma conta de acesso ao painel da plataforma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={novo.email} onChange={e => setNovo({ ...novo, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Senha</Label>
              <Input type="password" value={novo.senha} onChange={e => setNovo({ ...novo, senha: e.target.value })} placeholder="mín. 8 caracteres, com letra e número" />
            </div>
            <div className="space-y-1">
              <Label>Papel</Label>
              <Select value={novo.papel} onValueChange={(v) => setNovo({ ...novo, papel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">{PAPEL_LABEL.super_admin}</SelectItem>
                  <SelectItem value="suporte">{PAPEL_LABEL.suporte}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriando(false)}>Cancelar</Button>
            <Button onClick={criar} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />} Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
