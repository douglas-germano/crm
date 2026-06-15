'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, GlobeLock, UserPlus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/contexts/toast-context';
import api from '@/lib/api';

interface PlatformConfig {
  inscricoes_abertas: boolean;
  modo_manutencao: boolean;
  forcar_2fa: boolean;
  atualizado_em?: string | null;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/v1/core/super-admin/config')
      .then(r => setConfig(r.data.config))
      .catch(() => toast('Falha ao carregar configurações.', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const atualizar = async (campo: keyof PlatformConfig, valor: boolean) => {
    if (!config) return;
    const anterior = config;
    setConfig({ ...config, [campo]: valor }); // otimista
    setSaving(campo);
    try {
      const r = await api.put('/api/v1/core/super-admin/config', { [campo]: valor });
      setConfig(r.data.config);
      toast('Configuração salva.', 'success');
    } catch (err: unknown) {
      setConfig(anterior); // reverte
      const ax = err as { response?: { data?: { erro?: string } } };
      toast(ax?.response?.data?.erro || 'Falha ao salvar.', 'error');
    } finally {
      setSaving(null);
    }
  };

  if (loading || !config) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 pb-8">
      {/* Acesso */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-muted-foreground" /> Inscrições
          </CardTitle>
          <CardDescription>Controle o cadastro de novos workspaces.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <ToggleRow
            label="Inscrições abertas"
            descricao="Quando desativado, a rota /registro recusa novos cadastros (HTTP 403)."
            checked={config.inscricoes_abertas}
            saving={saving === 'inscricoes_abertas'}
            onChange={(v) => atualizar('inscricoes_abertas', v)}
          />
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" /> Segurança Global
          </CardTitle>
          <CardDescription>Política de autenticação dos operadores.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <ToggleRow
            label="Forçar 2FA para operadores"
            descricao="Operadores sem 2FA serão obrigados a configurá-lo antes de operar o painel."
            checked={config.forcar_2fa}
            saving={saving === 'forcar_2fa'}
            onChange={(v) => atualizar('forcar_2fa', v)}
          />
        </CardContent>
      </Card>

      {/* Emergência */}
      <Card className="border-destructive/20 md:col-span-2">
        <CardHeader className="pb-3 border-b border-destructive/10">
          <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
            <GlobeLock className="w-4 h-4" /> Protocolo de Emergência
          </CardTitle>
          <CardDescription>Afeta o acesso de todos os clientes.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <ToggleRow
            label="Modo manutenção (503)"
            descricao="Bloqueia toda a operação dos tenants. O painel da plataforma continua acessível."
            checked={config.modo_manutencao}
            saving={saving === 'modo_manutencao'}
            destructive
            onChange={(v) => atualizar('modo_manutencao', v)}
          />
          {config.modo_manutencao && (
            <div className="mt-3">
              <Badge variant="destructive">Sistema em manutenção — clientes bloqueados</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {config.atualizado_em && (
        <p className="text-xs text-muted-foreground md:col-span-2">
          Última alteração: {new Date(config.atualizado_em).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
}

function ToggleRow({
  label, descricao, checked, saving, destructive, onChange,
}: {
  label: string;
  descricao: string;
  checked: boolean;
  saving: boolean;
  destructive?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5 flex-1">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={saving}
          className={destructive ? 'data-[state=checked]:bg-destructive' : ''}
        />
      </div>
    </div>
  );
}
