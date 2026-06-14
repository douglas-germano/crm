'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Database,
  Eye,
  Loader2,
  Power,
  ShieldAlert,
  Users,
  UsersRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

interface TenantStats {
  usuarios: number;
  empresas: number;
  leads: number;
}

interface Tenant {
  id: number;
  nome_fantasia: string;
  subdominio: string;
  db_schema: string;
  ativo: boolean;
  criado_em: string;
  estatisticas: TenantStats;
}

interface DashboardTotals {
  tenants: number;
  tenants_ativos: number;
  usuarios: number;
  empresas: number;
  leads: number;
}

interface AuditLog {
  id: number;
  usuario?: string;
  acao: string;
  alvo_tipo?: string;
  alvo_id?: string;
  descricao?: string;
  data_criacao: string;
}

type Recurso = 'usuarios' | 'empresas' | 'leads';

export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [totais, setTotais] = useState<DashboardTotals | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingTenant, setUpdatingTenant] = useState<number | null>(null);

  const [inspecting, setInspecting] = useState<number | null>(null);
  const [tenantData, setTenantData] = useState<Record<string, unknown>[]>([]);
  const [inspectError, setInspectError] = useState('');
  const [recursoAtivo, setRecursoAtivo] = useState<Recurso>('usuarios');

  useEffect(() => {
    carregarPainel();
  }, []);

  const carregarPainel = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, audit] = await Promise.all([
        api.get('/api/v1/core/super-admin/dashboard'),
        api.get('/api/v1/core/super-admin/audit-logs'),
      ]);
      setTenants(dashboard.data.tenants);
      setTotais(dashboard.data.totais);
      setLogs(audit.data.logs);
    } catch {
      setError('Acesso negado. Entre pelo login Super Admin da plataforma.');
    } finally {
      setLoading(false);
    }
  };

  const visualizarDados = async (tenantId: number, recurso: Recurso) => {
    if (inspecting !== tenantId) setTenantData([]);
    setInspecting(tenantId);
    setRecursoAtivo(recurso);
    setInspectError('');

    try {
      const resp = await api.get(`/api/v1/core/super-admin/tenants/${tenantId}/${recurso}`);
      setTenantData(resp.data.dados);
    } catch {
      setInspectError('Falha ao consultar dados internos do tenant.');
    }
  };

  const alternarStatus = async (tenant: Tenant) => {
    setUpdatingTenant(tenant.id);
    try {
      await api.patch(`/api/v1/core/super-admin/tenants/${tenant.id}/status`, { ativo: !tenant.ativo });
      await carregarPainel();
    } finally {
      setUpdatingTenant(null);
    }
  };

  const fecharInspecao = () => {
    setInspecting(null);
    setTenantData([]);
    setInspectError('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <ShieldAlert className="mb-4 h-16 w-16 text-red-500 opacity-80" />
        <h2 className="mb-2 text-xl font-bold tracking-tight">Sem Permissão</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const tenantInspecionando = tenants.find(t => t.id === inspecting);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Gestão da Plataforma SaaS</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Operação global, suporte e governança de todos os workspaces.
          </p>
        </div>
        <Button variant="outline" onClick={carregarPainel}>Atualizar</Button>
      </div>

      {totais && (
        <div className="grid gap-4 md:grid-cols-5">
          <Metric label="Tenants" value={totais.tenants} icon={Database} />
          <Metric label="Ativos" value={totais.tenants_ativos} icon={Power} />
          <Metric label="Usuários" value={totais.usuarios} icon={Users} />
          <Metric label="Empresas" value={totais.empresas} icon={UsersRound} />
          <Metric label="Leads" value={totais.leads} icon={Briefcase} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {tenants.map(t => (
            <Card key={t.id} className={inspecting === t.id ? 'border-primary' : ''}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-lg font-bold">{t.nome_fantasia}</h3>
                      <Badge variant={t.ativo ? 'default' : 'destructive'}>
                        {t.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="mb-1 text-sm text-muted-foreground">
                      Workspace: <code className="font-mono text-foreground">{t.subdominio}</code>
                    </p>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Schema: <code className="font-mono text-foreground">{t.db_schema}</code>
                    </p>

                    <div className="flex w-fit gap-4 rounded border bg-muted/30 p-2 text-xs font-medium">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3 text-steel-500" /> {t.estatisticas.usuarios} Usuários</span>
                      <span className="flex items-center gap-1"><UsersRound className="h-3 w-3 text-emerald-500" /> {t.estatisticas.empresas} Empresas</span>
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3 text-amber-500" /> {t.estatisticas.leads} Leads</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:max-w-[180px] md:flex-col">
                    <Button variant={inspecting === t.id && recursoAtivo === 'usuarios' ? 'default' : 'outline'} size="sm" onClick={() => visualizarDados(t.id, 'usuarios')}>
                      Ver Usuários
                    </Button>
                    <Button variant={inspecting === t.id && recursoAtivo === 'empresas' ? 'default' : 'outline'} size="sm" onClick={() => visualizarDados(t.id, 'empresas')}>
                      Ver Empresas
                    </Button>
                    <Button variant={inspecting === t.id && recursoAtivo === 'leads' ? 'default' : 'outline'} size="sm" onClick={() => visualizarDados(t.id, 'leads')}>
                      Ver Leads
                    </Button>
                    <Button variant={t.ativo ? 'destructive' : 'secondary'} size="sm" disabled={updatingTenant === t.id} onClick={() => alternarStatus(t)}>
                      {updatingTenant === t.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t.ativo ? 'Inativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          {tenantInspecionando ? (
            <Card className="border-primary">
              <CardHeader className="border-b pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      Modo suporte
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Consulta read-only em <b>{tenantInspecionando.nome_fantasia}</b>
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={fecharInspecao}>Fechar</Button>
                </div>
              </CardHeader>
              <CardContent className="max-h-[520px] overflow-auto pt-6">
                <h4 className="mb-4 border-b pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Recurso: {recursoAtivo}
                </h4>

                {inspectError ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {inspectError}
                  </div>
                ) : tenantData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</p>
                ) : (
                  <div className="space-y-3">
                    {tenantData.map((d, i) => (
                      <div key={i} className="rounded border bg-muted/50 p-3 text-xs">
                        {Object.keys(d).map(chave => {
                          if (chave === 'uuid' || chave === 'senha_hash') return null;
                          return (
                            <div key={chave} className="flex justify-between gap-3 py-0.5">
                              <span className="font-semibold capitalize text-muted-foreground">{chave}:</span>
                              <span className="max-w-[170px] truncate text-right" title={String(d[chave])}>{String(d[chave] ?? '-')}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center text-muted-foreground">
              <Database className="mb-4 h-12 w-12 opacity-50" />
              <p className="text-sm font-medium">Selecione um recurso para abrir o modo suporte read-only.</p>
            </div>
          )}

          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base">Logs operacionais</CardTitle>
              <CardDescription>Últimas ações de Super Admin.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[300px] overflow-auto pt-4">
              <div className="space-y-3">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum log registrado.</p>
                ) : logs.map(log => (
                  <div key={log.id} className="border-b pb-2 text-xs last:border-0">
                    <p className="font-semibold text-foreground">{log.acao}</p>
                    <p className="text-muted-foreground">{log.descricao || '-'}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{new Date(log.data_criacao).toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
