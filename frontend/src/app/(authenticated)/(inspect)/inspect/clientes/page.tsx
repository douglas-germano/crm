'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import api from '@/lib/api';
import { Ativo, Empresa, Inspecao, OrdemServico } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Box,
  Building2,
  ClipboardList,
  FileText,
  Loader2,
  Printer,
  Search,
  ShieldCheck,
} from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const STATUS_ATIVO: Record<string, string> = {
  ativo: 'Ativo',
  manutencao: 'Manutenção',
  inativo: 'Inativo',
};

const STATUS_ATIVO_CLASS: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  manutencao: 'bg-amber-50 text-amber-700 border-amber-200',
  inativo: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_ORDEM_ABERTA = new Set(['rascunho', 'planejada', 'em_campo', 'pausada']);

function formatDate(value?: string) {
  if (!value) return 'Sem registro';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function normalizeAtivos(raw: Ativo[] | { ativos?: Ativo[] } | undefined): Ativo[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : raw.ativos ?? [];
}

export default function InventarioClientePage() {
  const [empresaId, setEmpresaId] = useState('');
  const [query, setQuery] = useState('');

  const { data: empresasResp, isLoading: loadingEmpresas } = useSWR('/api/v1/crm/empresas?per_page=200', fetcher);
  const empresas: Empresa[] = empresasResp?.empresas ?? [];

  useEffect(() => {
    if (!empresaId && empresas.length > 0) {
      setEmpresaId(String(empresas[0].id));
    }
  }, [empresaId, empresas]);

  const selectedEmpresa = useMemo(
    () => empresas.find((empresa) => String(empresa.id) === empresaId),
    [empresas, empresaId],
  );

  const ativosUrl = empresaId ? `/api/v1/inspect/ativos?empresa_id=${empresaId}&per_page=500` : null;
  const ordensUrl = empresaId ? `/api/v1/inspect/ordens?empresa_id=${empresaId}` : null;
  const inspecoesUrl = empresaId ? `/api/v1/inspect/inspecoes?empresa_id=${empresaId}` : null;

  const { data: ativosRaw, isLoading: loadingAtivos } = useSWR<Ativo[] | { ativos?: Ativo[] }>(ativosUrl, fetcher);
  const { data: ordensRaw, isLoading: loadingOrdens } = useSWR<OrdemServico[]>(ordensUrl, fetcher);
  const { data: inspecoesRaw, isLoading: loadingInspecoes } = useSWR<Inspecao[]>(inspecoesUrl, fetcher);

  const ativos = useMemo(() => normalizeAtivos(ativosRaw), [ativosRaw]);
  const ordens = Array.isArray(ordensRaw) ? ordensRaw : [];
  const inspecoes = Array.isArray(inspecoesRaw) ? inspecoesRaw : [];
  const loading = loadingEmpresas || loadingAtivos || loadingOrdens || loadingInspecoes;

  const ativosFiltrados = useMemo(() => {
    const termo = query.trim().toLowerCase();
    if (!termo) return ativos;
    return ativos.filter((ativo) => [
      ativo.nome,
      ativo.tag_identificacao,
      ativo.categoria,
      ativo.fabricante,
      ativo.modelo,
      ativo.localizacao,
      ativo.status,
    ].some((value) => value?.toLowerCase().includes(termo)));
  }, [ativos, query]);

  const ativosComResumo = useMemo(() => {
    return ativosFiltrados.map((ativo) => {
      const ordensAtivo = ordens.filter((ordem) => ordem.ativo_id === ativo.id);
      const inspecoesAtivo = inspecoes.filter((inspecao) => inspecao.ativo_id === ativo.id);
      const ultimaInspecao = [...inspecoesAtivo].sort((a, b) => {
        const dataA = new Date(a.data_realizacao || a.data_inspecao || a.data_criacao).getTime();
        const dataB = new Date(b.data_realizacao || b.data_inspecao || b.data_criacao).getTime();
        return dataB - dataA;
      })[0];

      return {
        ativo,
        ordensAbertas: ordensAtivo.filter((ordem) => STATUS_ORDEM_ABERTA.has(ordem.status)).length,
        ordensConcluidas: ordensAtivo.filter((ordem) => ordem.status === 'concluida').length,
        ultimaInspecao,
      };
    });
  }, [ativosFiltrados, ordens, inspecoes]);

  const resumo = useMemo(() => ({
    ativos: ativos.length,
    operacionais: ativos.filter((ativo) => ativo.status === 'ativo').length,
    manutencao: ativos.filter((ativo) => ativo.status === 'manutencao').length,
    inativos: ativos.filter((ativo) => ativo.status === 'inativo').length,
    ordensAbertas: ordens.filter((ordem) => STATUS_ORDEM_ABERTA.has(ordem.status)).length,
    ordensConcluidas: ordens.filter((ordem) => ordem.status === 'concluida').length,
    inspecoesConcluidas: inspecoes.filter((inspecao) => inspecao.status === 'concluida').length,
  }), [ativos, ordens, inspecoes]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 print:hidden lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Inventário por Cliente</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Controle consolidado dos ativos, ordens e inspeções por cliente
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger className="w-full bg-white sm:w-[320px]">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((empresa) => (
                <SelectItem key={empresa.id} value={String(empresa.id)}>
                  {empresa.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={!selectedEmpresa || ativos.length === 0} onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Emitir Relatório
          </Button>
        </div>
      </div>

      <section className="space-y-6 print:space-y-4">
        <div className="hidden border-b pb-4 print:block">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Apex Inspect</p>
          <h1 className="mt-1 text-2xl font-semibold">Relatório de Ativos por Cliente</h1>
          <p className="mt-1 text-sm text-gray-600">
            {selectedEmpresa?.razao_social ?? 'Cliente não selecionado'} · Emitido em {formatDate(new Date().toISOString())}
          </p>
        </div>

        {selectedEmpresa && (
          <Card className="bg-white">
            <CardContent className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Cliente
                    </p>
                  </div>
                  <h3 className="text-xl font-semibold">{selectedEmpresa.razao_social}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedEmpresa.nome_fantasia || selectedEmpresa.cnpj || 'Sem nome fantasia/CNPJ informado'}
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground md:text-right">
                  <span>{selectedEmpresa.email || 'Sem e-mail informado'}</span>
                  <span>{selectedEmpresa.telefone || 'Sem telefone informado'}</span>
                  <span>{[selectedEmpresa.cidade, selectedEmpresa.estado].filter(Boolean).join(' / ') || 'Sem cidade/UF'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard icon={Box} label="Ativos cadastrados" value={resumo.ativos} />
          <MetricCard icon={ShieldCheck} label="Operacionais" value={resumo.operacionais} />
          <MetricCard icon={ClipboardList} label="Ordens abertas" value={resumo.ordensAbertas} />
          <MetricCard icon={FileText} label="Inspeções concluídas" value={resumo.inspecoesConcluidas} />
        </div>

        <Card className="bg-white print:shadow-none">
          <CardHeader className="border-b print:hidden">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Ativos do cliente</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por ativo, tag, local ou status"
                  className="h-10 w-full rounded-md border border-input bg-white pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[320px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando inventário...
              </div>
            ) : !selectedEmpresa ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Selecione um cliente para visualizar o inventário técnico
              </div>
            ) : ativosComResumo.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Nenhum ativo encontrado para este cliente
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ordens</TableHead>
                      <TableHead>Última inspeção</TableHead>
                      <TableHead className="text-right print:hidden">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ativosComResumo.map(({ ativo, ordensAbertas, ordensConcluidas, ultimaInspecao }) => (
                      <TableRow key={ativo.id}>
                        <TableCell>
                          <div className="font-medium">{ativo.nome}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {ativo.tag_identificacao} · {ativo.categoria}
                          </div>
                          {(ativo.fabricante || ativo.modelo) && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {[ativo.fabricante, ativo.modelo].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{ativo.localizacao || 'Sem localização'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_ATIVO_CLASS[ativo.status] ?? STATUS_ATIVO_CLASS.inativo}>
                            {STATUS_ATIVO[ativo.status] ?? ativo.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{ordensAbertas} abertas</div>
                          <div className="text-xs text-muted-foreground">{ordensConcluidas} concluídas</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(ultimaInspecao?.data_realizacao || ultimaInspecao?.data_inspecao)}</div>
                          <div className="text-xs text-muted-foreground">
                            {ultimaInspecao?.status ? `Status: ${ultimaInspecao.status}` : 'Sem inspeção registrada'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right print:hidden">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/inspect/ordens?ativo_id=${ativo.id}`}>
                              Ver Ordens
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="hidden grid-cols-4 gap-3 text-xs print:grid">
          <div>Total em manutenção: {resumo.manutencao}</div>
          <div>Total inativos: {resumo.inativos}</div>
          <div>Ordens concluídas: {resumo.ordensConcluidas}</div>
          <div>Registros listados: {ativosComResumo.length}</div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card className="bg-white print:shadow-none">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        </div>
        <p className="text-[1.875rem] font-semibold leading-none tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
