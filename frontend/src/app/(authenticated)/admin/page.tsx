'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Database, Users, UsersRound, Briefcase, Eye, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  criado_em: string;
  estatisticas: TenantStats;
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [inspecting, setInspecting] = useState<number | null>(null);
  const [tenantData, setTenantData] = useState<Record<string, unknown>[]>([]);
  const [inspectError, setInspectError] = useState('');
  const [recursoAtivo, setRecursoAtivo] = useState<'usuarios' | 'empresas' | 'leads'>('usuarios');

  useEffect(() => {
    carregarTenants();
  }, []);

  const carregarTenants = async () => {
    try {
      const resp = await api.get('/api/admin/tenants');
      setTenants(resp.data.tenants);
    } catch {
      setError('Acesso Negado: Apenas a matriz operacional possui poderes Super Admin.');
    } finally {
      setLoading(false);
    }
  };

  const visualizarDados = async (tId: number, recurso: 'usuarios'|'empresas'|'leads') => {
    if (inspecting !== tId) setTenantData([]);
    setInspecting(tId);
    setRecursoAtivo(recurso);
    setInspectError('');

    try {
      const resp = await api.get(`/api/admin/tenants/${tId}/${recurso}`);
      setTenantData(resp.data.dados);
    } catch {
      setInspectError('Falha ao extrair dados internos do tenant.');
    }
  };

  const fecharInspecao = () => {
    setInspecting(null);
    setTenantData([]);
    setInspectError('');
  };

  if (loading) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-brand-500" /></div>;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
         <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-80" />
         <h2 className="text-xl font-bold tracking-tight mb-2">Sem Permissão</h2>
         <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const tenantInspecionando = tenants.find(t => t.id === inspecting);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-brand-500" />
            Central de Servidores SaaS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitorando {tenants.length} Workspaces (Schemes Isolados).
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Painel de Contas */}
        <div className="space-y-4">
          {tenants.map(t => (
            <Card key={t.id} className={inspecting === t.id ? 'border-brand-500 ring-1 ring-brand-500' : ''}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                  <div>
                    <h3 className="text-lg font-bold">{t.nome_fantasia}</h3>
                    <p className="text-sm text-muted-foreground mb-4">Workspace: <code className="text-brand-500 font-mono">"{t.subdominio}"</code></p>
                    
                    <div className="flex gap-4 text-xs font-medium border p-2 rounded bg-muted/30 w-fit">
                       <span className="flex items-center gap-1"><Users className="w-3 h-3 text-steel-500"/> {t.estatisticas.usuarios} Usuários</span>
                       <span className="flex items-center gap-1"><UsersRound className="w-3 h-3 text-emerald-500"/> {t.estatisticas.empresas} Empresas</span>
                       <span className="flex items-center gap-1"><Briefcase className="w-3 h-3 text-amber-500"/> {t.estatisticas.leads} Leads</span>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 shrink-0">
                    <Button 
                      variant={inspecting === t.id && recursoAtivo === 'usuarios' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => visualizarDados(t.id, 'usuarios')}
                    >
                      Ver Usuários
                    </Button>
                    <Button 
                      variant={inspecting === t.id && recursoAtivo === 'empresas' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => visualizarDados(t.id, 'empresas')}
                    >
                      Ver Empresas
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Visor de Inspeção */}
        <div>
          {inspecting && tenantInspecionando ? (
            <div className="sticky top-6">
              <Card className="border-brand-500 shadow-xl shadow-brand-500/10">
                <CardHeader className="bg-brand-500/5 pb-4">
                   <div className="flex justify-between items-start">
                     <div>
                       <CardTitle className="flex items-center gap-2">
                         <Eye className="w-5 h-5 text-brand-500" />
                         Visão Raio-X
                       </CardTitle>
                       <CardDescription className="mt-1">
                         Dados de <b>{tenantInspecionando.nome_fantasia}</b>
                       </CardDescription>
                     </div>
                     <Button variant="ghost" size="sm" onClick={fecharInspecao} className="text-xs">Fechar</Button>
                   </div>
                </CardHeader>
                <CardContent className="pt-6 max-h-[600px] overflow-auto">
                   <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 border-b pb-2">
                     Recurso: {recursoAtivo}
                   </h4>

                   {inspectError ? (
                     <div className="flex items-center gap-2 text-destructive text-sm py-4">
                       <AlertCircle className="w-4 h-4 shrink-0" />
                       {inspectError}
                     </div>
                   ) : tenantData.length === 0 ? (
                     <p className="text-center text-sm py-8 text-muted-foreground">Nenhum registro de {recursoAtivo} encontrado.</p>
                   ) : (
                     <div className="space-y-3">
                       {tenantData.map((d, i) => (
                         <div key={i} className="text-xs bg-muted/50 p-3 rounded border">
                           {Object.keys(d).map(chave => {
                              if (chave === 'uuid' || chave === 'senha_hash') return null;
                              return (
                                <div key={chave} className="flex justify-between py-0.5">
                                   <span className="font-semibold text-muted-foreground capitalize">{chave}:</span>
                                   <span className="text-right truncate max-w-[140px]" title={String(d[chave])}>{String(d[chave] ?? '-')}</span>
                                </div>
                              )
                           })}
                         </div>
                       ))}
                     </div>
                   )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl text-center text-muted-foreground">
               <Database className="w-12 h-12 mb-4 opacity-50" />
               <p className="text-sm font-medium">Clique em Extrair nas Empresas ao lado para abrir uma janela temporária do "search_path" deles diretamente do banco de dados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
