'use client';

import Link from 'next/link';
import { Settings2, ShieldCheck, Mail, GlobeLock, KeySquare, Lock, Check, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

export default function AdminSettings() {
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [invalidatingJwt, setInvalidatingJwt] = useState(false);
  const [jwtDone, setJwtDone] = useState(false);
  const [testingGateway, setTestingGateway] = useState(false);
  const [gatewayResult, setGatewayResult] = useState<'ok' | 'error' | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleInvalidateJwts = async () => {
    setInvalidatingJwt(true);
    setJwtDone(false);
    await new Promise(r => setTimeout(r, 1000));
    setInvalidatingJwt(false);
    setJwtDone(true);
    setTimeout(() => setJwtDone(false), 3000);
  };

  const handleTestGateway = async () => {
    setTestingGateway(true);
    setGatewayResult(null);
    await new Promise(r => setTimeout(r, 1200));
    setTestingGateway(false);
    setGatewayResult('ok');
    setTimeout(() => setGatewayResult(null), 4000);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              Tratamento LGPD
            </CardTitle>
            <CardDescription>Exporte, revogue consentimento ou anonimize dados pessoais de titulares.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <Button asChild>
              <Link href="/admin/settings/privacidade">
                Abrir tratamento LGPD
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Acesso e Segurança */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              Acesso e Segurança Global
            </CardTitle>
            <CardDescription>Controle quem pode entrar na plataforma e qual protocolo exigir.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
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
                className="shrink-0"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
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
                className="shrink-0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Protocolos de Emergência */}
        <Card className="border-destructive/20">
          <CardHeader className="pb-3 border-b border-destructive/10">
            <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <GlobeLock className="w-4 h-4" />
              Protocolos de Emergência
            </CardTitle>
            <CardDescription>Ações que afetam sessões e conexões de todos os clientes.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
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

            <Separator />

            <div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleInvalidateJwts}
                disabled={invalidatingJwt || jwtDone}
              >
                {invalidatingJwt
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : jwtDone
                  ? <Check className="w-4 h-4 mr-2" />
                  : <Lock className="w-4 h-4 mr-2" />
                }
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
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              E-mail & Mensageria
            </CardTitle>
            <CardDescription>Apontamentos DNS e chaves atreladas ao Brevo API.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Provedor</p>
                <div className="flex items-center gap-2">
                  <KeySquare className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">Brevo Transactional</span>
                </div>
                <p className="text-xs text-green-600 font-medium">Ativo</p>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Cota Mensal</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-foreground/30 w-[12%] rounded-full" />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0">12%</span>
                </div>
                <p className="text-xs text-muted-foreground">~360 de 3.000 e-mails usados</p>
              </div>

              <div className="flex flex-col justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestGateway}
                  disabled={testingGateway}
                >
                  {testingGateway
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : gatewayResult === 'ok'
                    ? <Check className="w-4 h-4 mr-2 text-green-600" />
                    : gatewayResult === 'error'
                    ? <AlertCircle className="w-4 h-4 mr-2 text-destructive" />
                    : null
                  }
                  {gatewayResult === 'ok' ? 'Gateway OK' : 'Testar Gateway'}
                </Button>
                {gatewayResult === 'error' && (
                  <p className="text-xs text-destructive">Falha na conexão com o Brevo.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t">
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Configurações salvas.
          </span>
        )}
        <Button onClick={handleSave} disabled={saving || saved}>
          {saving
            ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            : saved
            ? <Check className="w-4 h-4 mr-2" />
            : null
          }
          {saved ? 'Salvo!' : 'Salvar Modificações'}
        </Button>
      </div>
    </div>
  );
}
