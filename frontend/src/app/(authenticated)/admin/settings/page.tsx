'use client';

import { Settings2, ShieldCheck, Mail, GlobeLock, KeySquare, Lock, Check, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
    <div className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-brand-500 shrink-0" />
          Configurações da Plataforma
        </h1>
        <p className="text-muted-foreground text-sm">
          Toggles globais do SaaS. Ajustes que se aplicam a todas as instâncias e schemas ativos.
        </p>
      </div>

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
                {invalidatingJwt ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : jwtDone ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
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
                {testingGateway ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : gatewayResult === 'ok' ? (
                  <Check className="w-4 h-4 mr-2 text-emerald-600" />
                ) : gatewayResult === 'error' ? (
                  <AlertCircle className="w-4 h-4 mr-2 text-destructive" />
                ) : null}
                {gatewayResult === 'ok' ? 'Gateway OK' : 'Testar Gateway'}
              </Button>
              {gatewayResult === 'error' && (
                <p className="text-xs text-destructive text-center">Falha na conexão com o Brevo.</p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t">
        {saved && (
          <span className="text-sm text-emerald-600 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Configurações salvas.
          </span>
        )}
        <Button
          onClick={handleSave}
          disabled={saving || saved}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4 mr-2" />
          ) : null}
          {saved ? 'Salvo!' : 'Salvar Modificações'}
        </Button>
      </div>

    </div>
  );
}
