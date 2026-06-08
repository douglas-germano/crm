'use client';

import useSWR from 'swr';
import Link from 'next/link';
import api from '@/lib/api';
import { DashboardStats, Negocio, Projeto } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, BarChart3, Briefcase, FolderKanban, Loader2, TrendingUp, Wallet } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

function asArray<T>(value: T[] | { [key: string]: T[] } | undefined, key: string): T[] {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value[key])) return value[key];
  return [];
}

export default function RelatoriosPage() {
  const { data: stats, isLoading: loadingStats } = useSWR<DashboardStats>('/api/v1/crm/dashboard/stats', fetcher);
  const { data: negociosRaw, isLoading: loadingNegocios } = useSWR('/api/v1/crm/negocios', fetcher);
  const { data: projetosRaw, isLoading: loadingProjetos } = useSWR('/api/v1/crm/projetos', fetcher);

  const negocios = asArray<Negocio>(negociosRaw, 'negocios');
  const projetos = asArray<Projeto>(projetosRaw, 'projetos');
  const loading = loadingStats || loadingNegocios || loadingProjetos;
  const negociosRecentes = negocios.slice(0, 8);
  const projetosEmAndamento = projetos.filter((projeto) => projeto.status === 'em_andamento').slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Relatórios</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Indicadores consolidados de vendas, pipeline e execução de projetos
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <BarChart3 className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Negócios</p>
            </div>
            <p className="text-[1.875rem] font-semibold leading-none">{stats?.total_negocios ?? 0}</p>
            <p className="mt-2 text-xs text-muted-foreground">{stats?.total_abertos ?? 0} em aberto</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Valor Aberto</p>
            </div>
            <p className="text-[1.875rem] font-semibold leading-none">{formatCurrency(stats?.valor_aberto ?? 0)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Oportunidades em andamento</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Receita Ganha</p>
            </div>
            <p className="text-[1.875rem] font-semibold leading-none">{formatCurrency(stats?.valor_ganho ?? 0)}</p>
            <p className="mt-2 text-xs text-muted-foreground">{stats?.total_ganhos ?? 0} negócios ganhos</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Projetos</p>
            </div>
            <p className="text-[1.875rem] font-semibold leading-none">{projetos.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">{projetosEmAndamento.length} em andamento</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card className="bg-white">
          <CardContent className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando relatórios...
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="bg-white">
            <CardHeader className="border-b">
              <CardTitle>Negócios recentes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Negócio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {negociosRecentes.map((negocio) => (
                    <TableRow key={negocio.id}>
                      <TableCell>
                        <div className="font-medium">{negocio.nome}</div>
                        <div className="text-xs text-muted-foreground">{negocio.responsavel || 'Sem responsável'}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{negocio.status}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(negocio.valor || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="border-b">
              <CardTitle>Projetos em andamento</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead className="text-right">Progresso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projetosEmAndamento.map((projeto) => (
                    <TableRow key={projeto.id}>
                      <TableCell>
                        <div className="font-medium">{projeto.nome}</div>
                        <div className="text-xs text-muted-foreground">{projeto.empresa_nome || 'Sem empresa'}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{projeto.prioridade}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{Math.round(projeto.percentual_concluido || 0)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t p-4">
                <Button asChild variant="outline" size="sm">
                  <Link href="/projetos">
                    Ver todos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
