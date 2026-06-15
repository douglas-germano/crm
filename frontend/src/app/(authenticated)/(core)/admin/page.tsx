'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Briefcase,
  Database,
  Download,
  Eye,
  KeyRound,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  Power,
  ShieldAlert,
  Users,
  UsersRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import api from '@/lib/api';

interface TenantStats {
  usuarios: number;
  empresas: number;
  leads: number;
  negocios?: number;
  ultimo_acesso?: string | null;
}

interface Tenant {
  id: number;
  nome_fantasia: string;
  subdominio: string;
  db_schema: string;
  ativo: boolean;
  motivo_inativacao?: string | null;
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

const NOVO_TENANT_VAZIO = { nome_empresa: '', workspace: '', nome_admin: '', email_admin: '', senha_admin: '' };

export default function AdminPage() {
  const router = useRouter();
  const { aplicarSessaoImpersonada } = useAuth();
  const { toast } = useToast();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [totais, setTotais] = useState<DashboardTotals | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPages, setLogsPages] = useState(1);
  const [filtroAcao, setFiltroAcao] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingTenant, setUpdatingTenant] = useState<number | null>(null);

  const [inspecting, setInspecting] = useState<number | null>(null);
  const [tenantData, setTenantData] = useState<Record<string, unknown>[]>([]);
  const [inspectError, setInspectError] = useState('');
  const [recursoAtivo, setRecursoAtivo] = useState<Recurso>('usuarios');

  // Modais
  const [criando, setCriando] = useState(false);
  const [novoTenant, setNovoTenant] = useState(NOVO_TENANT_VAZIO);
  const [salvandoTenant, setSalvandoTenant] = useState(false);

  const [inativando, setInativando] = useState<Tenant | null>(null);
  const [motivoInativacao, setMotivoInativacao] = useState('');

  const [editando, setEditando] = useState<Tenant | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [resetAlvo, setResetAlvo] = useState<{ usuarioId: number; nome: string } | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    carregarPainel();
  }, []);

  useEffect(() => {
    carregarLogs(logsPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logsPage, filtroAcao, filtroData]);

  const carregarPainel = async () => {
    setLoading(true);
    setError('');
    try {
      const dashboard = await api.get('/api/v1/core/super-admin/dashboard');
      setTenants(dashboard.data.tenants);
      setTotais(dashboard.data.totais);
    } catch {
      setError('Acesso negado. Entre pelo login Super Admin da plataforma.');
    } finally {
      setLoading(false);
    }
  };

  const carregarLogs = async (page: number) => {
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      if (filtroAcao) params.set('acao', filtroAcao);
      if (filtroData) params.set('data_inicio', `${filtroData}T00:00:00`);
      const audit = await api.get(`/api/v1/core/super-admin/audit-logs?${params.toString()}`);
      setLogs(audit.data.logs);
      setLogsPages(audit.data.pages || 1);
    } catch {
      // silencioso — logs são secundários
    }
  };

  const editarTenant = async () => {
    if (!editando) return;
    setSalvandoEdicao(true);
    try {
      await api.put(`/api/v1/core/super-admin/tenants/${editando.id}`, { nome_fantasia: novoNome });
      toast('Tenant atualizado.', 'success');
      setEditando(null);
      await carregarPainel();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { erro?: string } } };
      toast(ax?.response?.data?.erro || 'Falha ao atualizar tenant.', 'error');
    } finally {
      setSalvandoEdicao(false);
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
    if (tenant.ativo) {
      // Inativar é destrutivo → exige confirmação + motivo
      setInativando(tenant);
      setMotivoInativacao('');
      return;
    }
    setUpdatingTenant(tenant.id);
    try {
      await api.patch(`/api/v1/core/super-admin/tenants/${tenant.id}/status`, { ativo: true });
      toast('Tenant reativado.', 'success');
      await carregarPainel();
    } catch {
      toast('Falha ao reativar tenant.', 'error');
    } finally {
      setUpdatingTenant(null);
    }
  };

  const confirmarInativacao = async () => {
    if (!inativando) return;
    setUpdatingTenant(inativando.id);
    try {
      await api.patch(`/api/v1/core/super-admin/tenants/${inativando.id}/status`, {
        ativo: false,
        motivo: motivoInativacao || undefined,
      });
      toast('Tenant inativado.', 'success');
      setInativando(null);
      await carregarPainel();
    } catch {
      toast('Falha ao inativar tenant.', 'error');
    } finally {
      setUpdatingTenant(null);
    }
  };

  const criarTenant = async () => {
    setSalvandoTenant(true);
    try {
      await api.post('/api/v1/core/super-admin/tenants', novoTenant);
      toast('Tenant provisionado com sucesso.', 'success');
      setCriando(false);
      setNovoTenant(NOVO_TENANT_VAZIO);
      await carregarPainel();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { erro?: string } } };
      toast(ax?.response?.data?.erro || 'Falha ao criar tenant.', 'error');
    } finally {
      setSalvandoTenant(false);
    }
  };

  const impersonar = async (tenantId: number, usuarioId: number) => {
    try {
      const resp = await api.post(`/api/v1/core/super-admin/tenants/${tenantId}/impersonar`, { usuario_id: usuarioId });
      aplicarSessaoImpersonada(resp.data);
      toast('Sessão assumida. Redirecionando…', 'info');
      router.push('/dashboard');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { erro?: string } } };
      toast(ax?.response?.data?.erro || 'Falha ao impersonar usuário.', 'error');
    }
  };

  const confirmarReset = async () => {
    if (!resetAlvo || inspecting === null) return;
    setResetLoading(true);
    try {
      await api.post(`/api/v1/core/super-admin/tenants/${inspecting}/usuarios/${resetAlvo.usuarioId}/reset-senha`, {
        nova_senha: novaSenha,
      });
      toast('Senha redefinida. O usuário deverá trocá-la no próximo acesso.', 'success');
      setResetAlvo(null);
      setNovaSenha('');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { erro?: string } } };
      toast(ax?.response?.data?.erro || 'Falha ao redefinir senha.', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const exportarLogs = async () => {
    try {
      const resp = await api.get('/api/v1/core/super-admin/audit-logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-logs.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast('Falha ao exportar logs.', 'error');
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
        <div className="flex gap-2">
          <Button onClick={() => setCriando(true)}>
            <Plus className="h-4 w-4" /> Novo Tenant
          </Button>
          <Button variant="outline" onClick={carregarPainel}>Atualizar</Button>
        </div>
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
                    <p className="mb-1 text-sm text-muted-foreground">
                      Schema: <code className="font-mono text-foreground">{t.db_schema}</code>
                    </p>
                    {!t.ativo && t.motivo_inativacao && (
                      <p className="mb-3 text-xs text-destructive">Motivo: {t.motivo_inativacao}</p>
                    )}

                    <div className="mt-2 flex w-fit flex-wrap gap-4 rounded border bg-muted/30 p-2 text-xs font-medium">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3 text-steel-500" /> {t.estatisticas?.usuarios ?? '-'} Usuários</span>
                      <span className="flex items-center gap-1"><UsersRound className="h-3 w-3 text-emerald-500" /> {t.estatisticas?.empresas ?? '-'} Empresas</span>
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3 text-amber-500" /> {t.estatisticas?.leads ?? '-'} Leads</span>
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3 text-sky-500" /> {t.estatisticas?.negocios ?? '-'} Negócios</span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Último acesso: {t.estatisticas?.ultimo_acesso ? new Date(t.estatisticas.ultimo_acesso).toLocaleString('pt-BR') : 'sem registro'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 md:max-w-[180px] md:flex-col">
                    <Button variant="outline" size="sm" onClick={() => { setEditando(t); setNovoNome(t.nome_fantasia); }}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
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
                        {recursoAtivo === 'usuarios' && typeof d.id === 'number' && (
                          <div className="mt-2 flex gap-2 border-t pt-2">
                            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => impersonar(tenantInspecionando.id, d.id as number)}>
                              <LogIn className="h-3 w-3" /> Entrar como
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setResetAlvo({ usuarioId: d.id as number, nome: String(d.nome ?? d.email ?? d.id) })}>
                              <KeyRound className="h-3 w-3" /> Reset senha
                            </Button>
                          </div>
                        )}
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Logs operacionais</CardTitle>
                  <CardDescription>Ações de Super Admin.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={exportarLogs} title="Exportar CSV">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtrar por ação (ex.: login)"
                  value={filtroAcao}
                  onChange={e => { setLogsPage(1); setFiltroAcao(e.target.value.trim()); }}
                />
                <Input
                  type="date"
                  className="h-8 w-[140px] text-xs"
                  value={filtroData}
                  onChange={e => { setLogsPage(1); setFiltroData(e.target.value); }}
                />
              </div>
            </CardHeader>
            <CardContent className="max-h-[300px] overflow-auto pt-4">
              <div className="space-y-3">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum log registrado.</p>
                ) : logs.map(log => (
                  <div key={log.id} className="border-b pb-2 text-xs last:border-0">
                    <p className="font-semibold text-foreground">{log.acao} {log.usuario ? <span className="font-normal text-muted-foreground">· {log.usuario}</span> : null}</p>
                    <p className="text-muted-foreground">{log.descricao || '-'}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{new Date(log.data_criacao).toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
            {logsPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-2 text-xs">
                <Button variant="ghost" size="sm" disabled={logsPage <= 1} onClick={() => setLogsPage(p => p - 1)}>Anterior</Button>
                <span className="text-muted-foreground">Página {logsPage} de {logsPages}</span>
                <Button variant="ghost" size="sm" disabled={logsPage >= logsPages} onClick={() => setLogsPage(p => p + 1)}>Próxima</Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal: criar tenant */}
      <Dialog open={criando} onOpenChange={setCriando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Tenant</DialogTitle>
            <DialogDescription>Provisiona um workspace completo (schema, perfis e usuário administrador).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome da empresa</Label>
              <Input value={novoTenant.nome_empresa} onChange={e => setNovoTenant({ ...novoTenant, nome_empresa: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Workspace (subdomínio)</Label>
              <Input value={novoTenant.workspace} onChange={e => setNovoTenant({ ...novoTenant, workspace: e.target.value.toLowerCase() })} placeholder="apenas letras e números" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nome do admin</Label>
                <Input value={novoTenant.nome_admin} onChange={e => setNovoTenant({ ...novoTenant, nome_admin: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email do admin</Label>
                <Input type="email" value={novoTenant.email_admin} onChange={e => setNovoTenant({ ...novoTenant, email_admin: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Senha inicial do admin</Label>
              <Input type="password" value={novoTenant.senha_admin} onChange={e => setNovoTenant({ ...novoTenant, senha_admin: e.target.value })} placeholder="mín. 8 caracteres, com letra e número" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriando(false)}>Cancelar</Button>
            <Button onClick={criarTenant} disabled={salvandoTenant}>
              {salvandoTenant && <Loader2 className="h-4 w-4 animate-spin" />} Provisionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: editar tenant */}
      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tenant</DialogTitle>
            <DialogDescription>
              Workspace <code className="font-mono">{editando?.subdominio}</code> — o subdomínio/schema não pode ser alterado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Nome fantasia</Label>
            <Input value={novoNome} onChange={e => setNovoNome(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={editarTenant} disabled={salvandoEdicao || !novoNome.trim()}>
              {salvandoEdicao && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: confirmar inativação (destrutivo) */}
      <Dialog open={!!inativando} onOpenChange={(o) => !o && setInativando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Inativar tenant</DialogTitle>
            <DialogDescription>
              Isto bloqueia o acesso de <b>todos os usuários</b> de <b>{inativando?.nome_fantasia}</b>. Eles não conseguirão fazer login até a reativação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Motivo (registrado na auditoria)</Label>
            <Textarea value={motivoInativacao} onChange={e => setMotivoInativacao(e.target.value)} placeholder="Ex.: inadimplência, solicitação do cliente…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInativando(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarInativacao} disabled={updatingTenant === inativando?.id}>
              {updatingTenant === inativando?.id && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar inativação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: reset de senha */}
      <Dialog open={!!resetAlvo} onOpenChange={(o) => !o && setResetAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Nova senha para <b>{resetAlvo?.nome}</b>. O usuário será obrigado a trocá-la no próximo acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Nova senha</Label>
            <Input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="mín. 8 caracteres, com letra e número" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetAlvo(null)}>Cancelar</Button>
            <Button onClick={confirmarReset} disabled={resetLoading || novaSenha.length < 8}>
              {resetLoading && <Loader2 className="h-4 w-4 animate-spin" />} Redefinir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
