'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, ShieldAlert, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/toast-context';
import api from '@/lib/api';

export default function SegurancaPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [habilitado, setHabilitado] = useState(false);

  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [codigo, setCodigo] = useState('');
  const [processando, setProcessando] = useState(false);

  const [desativando, setDesativando] = useState(false);
  const [senha, setSenha] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/api/v1/core/super-admin/me');
      setHabilitado(!!resp.data.usuario.mfa_habilitado);
    } catch {
      toast('Falha ao carregar status de segurança.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const iniciarSetup = async () => {
    setProcessando(true);
    try {
      const resp = await api.post('/api/v1/core/super-admin/mfa/setup');
      setSetup(resp.data);
    } catch {
      toast('Falha ao iniciar configuração do 2FA.', 'error');
    } finally {
      setProcessando(false);
    }
  };

  const ativar = async () => {
    setProcessando(true);
    try {
      await api.post('/api/v1/core/super-admin/mfa/ativar', { codigo });
      toast('2FA ativado com sucesso.', 'success');
      setSetup(null);
      setCodigo('');
      await carregar();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { erro?: string } } };
      toast(ax?.response?.data?.erro || 'Código inválido.', 'error');
    } finally {
      setProcessando(false);
    }
  };

  const desativar = async () => {
    setProcessando(true);
    try {
      await api.post('/api/v1/core/super-admin/mfa/desativar', { senha });
      toast('2FA desativado.', 'success');
      setDesativando(false);
      setSenha('');
      await carregar();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { erro?: string } } };
      toast(ax?.response?.data?.erro || 'Falha ao desativar.', 'error');
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Segurança da Conta</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Autenticação em dois fatores (2FA) da sua conta de plataforma.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {habilitado ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-amber-600" />}
            Autenticação em dois fatores
          </CardTitle>
          <CardDescription>
            {habilitado
              ? 'O 2FA está ativo. Você precisará do código do autenticador a cada login.'
              : 'Recomendado: proteja a conta mais poderosa da plataforma com um app autenticador (Google Authenticator, Authy).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {habilitado ? (
            desativando ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Confirme sua senha para desativar</Label>
                  <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDesativando(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={desativar} disabled={processando || !senha}>
                    {processando && <Loader2 className="h-4 w-4 animate-spin" />} Desativar 2FA
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="destructive" onClick={() => setDesativando(true)}>Desativar 2FA</Button>
            )
          ) : setup ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="mb-2 text-sm font-medium">1. Adicione esta chave no seu app autenticador</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-background px-3 py-2 font-mono text-sm">{setup.secret}</code>
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(setup.secret); toast('Chave copiada.', 'info'); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 break-all text-[11px] text-muted-foreground">{setup.otpauth_uri}</p>
              </div>
              <div className="space-y-1">
                <Label>2. Digite o código gerado</Label>
                <Input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="000000" maxLength={6} inputMode="numeric" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setSetup(null); setCodigo(''); }}>Cancelar</Button>
                <Button onClick={ativar} disabled={processando || codigo.length !== 6}>
                  {processando && <Loader2 className="h-4 w-4 animate-spin" />} Ativar 2FA
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={iniciarSetup} disabled={processando}>
              {processando && <Loader2 className="h-4 w-4 animate-spin" />} Configurar 2FA
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
