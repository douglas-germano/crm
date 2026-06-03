'use client';

import { ShieldCheck, GlobeLock, Mail, Lock, KeySquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

export default function AdminSettings() {
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);

  return (
    <div className="space-y-6">

      {/* Acesso e Segurança */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <ShieldCheck className="w-4 h-4 text-apex-orange" />
            Acesso e Segurança
          </CardTitle>
          <p className="text-xs text-steel-400">
            Controle quem pode acessar a plataforma e qual protocolo de autenticação exigir.
          </p>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-white">Inscrições abertas</Label>
              <p className="text-xs text-steel-400">
                Se desativado, a página <code className="text-apex-orange">/registro</code> ficará inacessível para novos visitantes.
              </p>
            </div>
            <Switch
              checked={allowRegistration}
              onCheckedChange={setAllowRegistration}
              className="shrink-0 ml-6"
            />
          </div>
          <Separator className="bg-white/5" />
          <div className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-white">Autenticação em dois fatores (2FA)</Label>
              <p className="text-xs text-steel-400">
                Exige 2FA para todos os administradores de instâncias ativas.
              </p>
            </div>
            <Switch
              checked={require2FA}
              onCheckedChange={setRequire2FA}
              className="shrink-0 ml-6"
            />
          </div>
        </CardContent>
      </Card>

      {/* Protocolos de Emergência */}
      <Card className="border-red-500/20 bg-red-500/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2 text-red-400">
            <GlobeLock className="w-4 h-4" />
            Protocolos de Emergência
          </CardTitle>
          <p className="text-xs text-steel-400">
            Ações críticas que afetam todas as instâncias e sessões ativas simultaneamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-white">Modo manutenção</Label>
              <p className="text-xs text-steel-400">
                Exibe mensagem de manutenção e bloqueia acesso a todos os tenants (HTTP 503).
              </p>
            </div>
            <Switch
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
              className="shrink-0 ml-6"
            />
          </div>
          <Separator className="bg-white/5" />
          <div className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-white">Invalidar todas as sessões</Label>
              <p className="text-xs text-steel-400">
                Revoga todos os tokens JWT ativos. Todos os usuários serão desconectados imediatamente.
              </p>
            </div>
            <Button variant="destructive" size="sm" className="shrink-0 ml-6">
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Invalidar JWTs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* E-mail */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Mail className="w-4 h-4 text-emerald-500" />
            Gateway de E-mail
          </CardTitle>
          <p className="text-xs text-steel-400">
            Configurações do provedor transacional Brevo (Sendinblue).
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="bg-white/5 rounded-lg p-3 border border-white/8 space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-steel-500 font-semibold">Provedor</span>
              <p className="text-sm font-semibold flex gap-1.5 items-center text-white">
                <KeySquare className="w-3.5 h-3.5 text-emerald-500" />
                Brevo Transactional
              </p>
              <span className="text-[10px] text-emerald-400 font-medium">Ativo</span>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/8 space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-steel-500 font-semibold">Cota mensal</span>
              <div className="flex items-center gap-2 pt-1">
                <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[12%]" />
                </div>
                <span className="text-xs text-steel-400 font-mono shrink-0">12%</span>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/8 flex items-center">
              <Button variant="outline" size="sm" className="w-full text-xs border-white/10 text-steel-300 hover:text-white hover:bg-white/5">
                Testar gateway
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button size="sm" className="bg-apex-orange hover:bg-apex-orange/90 text-white font-semibold px-6">
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
