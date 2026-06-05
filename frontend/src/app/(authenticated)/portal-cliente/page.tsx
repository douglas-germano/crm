'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Empresa, Ativo, Inspecao } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, ShieldAlert, FileText, Download, Building, Cpu, Calendar, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function PortalClientePage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [inspecoes, setInspecoes] = useState<Inspecao[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  // Carregar empresas e dados da primeira empresa em um único bloco de loading
  useEffect(() => {
    async function carregarInicial() {
      try {
        setLoading(true);
        const res = await api.get('/api/empresas');
        const dataEmpresas: Empresa[] = res.data.empresas ?? res.data;
        setEmpresas(dataEmpresas);

        if (dataEmpresas.length > 0) {
          const primeiraId = dataEmpresas[0].id.toString();
          setEmpresaSelecionada(primeiraId);

          const [resAtivos, resInspecoes] = await Promise.all([
            api.get(`/api/ativos?empresa_id=${primeiraId}`),
            api.get(`/api/inspecoes?empresa_id=${primeiraId}`),
          ]);
          setAtivos(resAtivos.data);
          setInspecoes(resInspecoes.data);
          initialLoadDone.current = true;
        }
      } catch {
        // erro silencioso — usuário vê estado vazio
      } finally {
        setLoading(false);
      }
    }
    carregarInicial();
  }, []);

  // Recarregar ativos e inspeções quando o usuário troca de empresa
  useEffect(() => {
    if (!empresaSelecionada || !initialLoadDone.current) return;
    async function carregarDadosEmpresa() {
      try {
        setLoading(true);
        const [resAtivos, resInspecoes] = await Promise.all([
          api.get(`/api/ativos?empresa_id=${empresaSelecionada}`),
          api.get(`/api/inspecoes?empresa_id=${empresaSelecionada}`),
        ]);
        setAtivos(resAtivos.data);
        setInspecoes(resInspecoes.data);
      } catch {
        // erro silencioso — usuário vê estado vazio ao trocar de empresa
      } finally {
        setLoading(false);
      }
    }
    carregarDadosEmpresa();
  }, [empresaSelecionada]);

  const baixarPdfLaudo = async (inspecaoId: number) => {
    try {
      const token = localStorage.getItem('token');
      const url = `${api.defaults.baseURL}/api/inspecoes/${inspecaoId}/pdf`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erro ao baixar PDF');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `laudo-${inspecaoId}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // falha no download — o navegador exibirá erro nativo
    }
  };

  // Calcular estatísticas de conformidade
  const totalAtivos = ativos.length;
  
  // Mapear conformidade real baseada nas inspeções mais recentes concluídas de cada ativo
  const ativosConformes = ativos.filter(ativo => {
    const inspecoesAtivo = inspecoes.filter(i => i.ativo_id === ativo.id && i.status === 'concluida');
    if (inspecoesAtivo.length === 0) return false; // Sem inspeção concluída = pendente de conformidade
    
    // Pegar a mais recente
    const ultimaInspecao = inspecoesAtivo[0];
    const temFalhas = ultimaInspecao.respostas?.some(r => r.resposta === 'nao_conforme');
    return !temFalhas;
  }).length;

  const percentualSaude = totalAtivos > 0 ? Math.round((ativosConformes / totalAtivos) * 100) : 100;
  const proximasInspecoes = inspecoes.filter(i => i.status === 'agendada').length;

  if (loading && ativos.length === 0 && inspecoes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Portal do Cliente</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Transparência técnica, laudos de engenharia e ARTs regulatórias.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Building className="h-4 w-4 text-muted-foreground" />
          <Select value={empresaSelecionada} onValueChange={setEmpresaSelecionada}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((emp) => (
                <SelectItem key={emp.id} value={emp.id.toString()}>
                  {emp.nome_fantasia || emp.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando dados da empresa...
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2 bg-white transition-colors hover:border-gray-300">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">
                Saúde Regulatória Geral
              </p>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-semibold text-foreground tabular-nums tracking-tight leading-none">
                {percentualSaude}%
              </p>
              <span className={cn(
                'flex items-center gap-1 text-xs font-medium mb-0.5',
                percentualSaude === 100 ? 'text-green-600' : 'text-amber-600'
              )}>
                {percentualSaude === 100
                  ? <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Regular</>
                  : <><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Requer atenção</>
                }
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Conformidade de caldeiras, climatização e dispositivos de segurança
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">
                Ativos de Engenharia
              </p>
            </div>
            <p className="text-[1.875rem] font-semibold text-foreground tabular-nums tracking-tight leading-none">
              {totalAtivos}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Equipamentos cadastrados e mapeados</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">
                Próximas Inspeções
              </p>
            </div>
            <p className="text-[1.875rem] font-semibold text-foreground tabular-nums tracking-tight leading-none">
              {proximasInspecoes}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Agendamentos de inspeção contratada</p>
          </CardContent>
        </Card>
      </div>

      {/* Ativos + Laudos */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Conformidade dos Ativos
            </CardTitle>
            <CardDescription className="text-xs">Validade legal de cada equipamento ou sistema técnico.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {ativos.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum ativo cadastrado para este cliente.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TAG</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Conformidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ativos.map((ativo) => {
                    const inspecoesAtivo = inspecoes.filter(i => i.ativo_id === ativo.id && i.status === 'concluida');
                    const possuiLaudo = inspecoesAtivo.length > 0;
                    const temFalha = possuiLaudo && inspecoesAtivo[0].respostas?.some(r => r.resposta === 'nao_conforme');

                    let statusLabel = 'Pendente';
                    let statusClass = 'text-muted-foreground';
                    let IconStatus = AlertTriangle;

                    if (possuiLaudo) {
                      if (temFalha) {
                        statusLabel = 'Não Conforme';
                        statusClass = 'text-red-600';
                        IconStatus = ShieldAlert;
                      } else {
                        statusLabel = 'Regularizado';
                        statusClass = 'text-green-600';
                        IconStatus = CheckCircle2;
                      }
                    }

                    return (
                      <TableRow key={ativo.id}>
                        <TableCell className="font-mono text-sm font-medium text-foreground">{ativo.tag_identificacao}</TableCell>
                        <TableCell className="font-medium">{ativo.nome}</TableCell>
                        <TableCell className="text-muted-foreground capitalize">{ativo.categoria}</TableCell>
                        <TableCell>
                          <span className={cn('flex items-center gap-1.5 text-xs font-medium', statusClass)}>
                            <IconStatus className="h-3.5 w-3.5 shrink-0" />
                            {statusLabel}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Laudos & ARTs
            </CardTitle>
            <CardDescription className="text-xs">Documentos de conformidade assinados em PDF.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {inspecoes.filter(i => i.status === 'concluida').length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum laudo concluído no sistema.
              </div>
            ) : (
              <div className="divide-y">
                {inspecoes
                  .filter(i => i.status === 'concluida')
                  .slice(0, 5)
                  .map((inspecao) => (
                    <div key={inspecao.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 space-y-0.5">
                        <span className="font-mono text-xs font-medium text-foreground block">{inspecao.ativo_tag}</span>
                        <span className="text-xs text-foreground block truncate max-w-[160px]">{inspecao.template_nome}</span>
                        <span className="text-[10px] text-muted-foreground block">ART: {inspecao.art_numero || 'Pendente'}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs gap-1 shrink-0"
                        onClick={() => baixarPdfLaudo(inspecao.id)}
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
