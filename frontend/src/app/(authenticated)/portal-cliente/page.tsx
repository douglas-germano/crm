'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Empresa, Ativo, Inspecao } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, ShieldAlert, FileText, Download, Building, Cpu, Calendar, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function PortalClientePage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [inspecoes, setInspecoes] = useState<Inspecao[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar lista de empresas
  useEffect(() => {
    async function carregarEmpresas() {
      try {
        setLoading(true);
        const res = await api.get('/api/empresas');
        const dataEmpresas: Empresa[] = res.data;
        setEmpresas(dataEmpresas);
        
        if (dataEmpresas.length > 0) {
          // Selecionar a primeira empresa por padrão
          setEmpresaSelecionada(dataEmpresas[0].id.toString());
        }
      } catch (err) {
        console.error('Erro ao buscar empresas', err);
      } finally {
        setLoading(false);
      }
    }
    carregarEmpresas();
  }, []);

  // Carregar dados de Ativos e Inspeções para a empresa selecionada
  useEffect(() => {
    async function carregarDadosEmpresa() {
      if (!empresaSelecionada) return;
      try {
        setLoading(true);
        
        // Carregar ativos filtrados pela empresa
        const resAtivos = await api.get(`/api/ativos?empresa_id=${empresaSelecionada}`);
        setAtivos(resAtivos.data);

        // Carregar inspeções filtradas pela empresa
        const resInspecoes = await api.get(`/api/inspecoes?empresa_id=${empresaSelecionada}`);
        setInspecoes(resInspecoes.data);
      } catch (err) {
        console.error('Erro ao buscar ativos e inspeções da empresa', err);
      } finally {
        setLoading(false);
      }
    }
    carregarDadosEmpresa();
  }, [empresaSelecionada]);

  const baixarPdfLaudo = (inspecaoId: number) => {
    const token = localStorage.getItem('token');
    const url = `${api.defaults.baseURL}/api/inspecoes/${inspecaoId}/pdf?token=${token}`;
    window.open(url, '_blank');
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

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 pb-12">
      {/* HEADER E SELETOR DE EMPRESA */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Portal de Conformidade do Cliente
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Área de transparência técnica, controle de validade de laudos de engenharia mecânica e ARTs regulatórias.
          </p>
        </div>

        {/* SELETOR DE CLIENTE (EMPRESA) */}
        <div className="flex items-center gap-2 max-w-sm shrink-0">
          <Building className="h-5 w-5 text-slate-400" />
          <Select value={empresaSelecionada} onValueChange={setEmpresaSelecionada}>
            <SelectTrigger className="w-[280px] bg-white border-slate-200 focus:ring-sky-600 font-semibold text-slate-700">
              <SelectValue placeholder="Selecione o Cliente" />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((emp) => (
                <SelectItem key={emp.id} value={emp.id.toString()} className="font-medium text-slate-700">
                  {emp.nome_fantasia || emp.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* COMPLIANCE HEALTH CARDS */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* SCORE DE SAÚDE REGULATÓRIA */}
        <Card className="md:col-span-2 border-slate-200/80 shadow-md shadow-slate-100/50 bg-gradient-to-br from-slate-900 to-slate-950 text-white relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <ShieldCheck className="h-44 w-44 text-sky-400" />
          </div>
          <CardContent className="p-6 flex items-center justify-between gap-6 h-full">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider">Saúde Regulatória Geral</h3>
                <p className="text-sm text-slate-300">
                  Conformidade de caldeiras, climatização e dispositivos de segurança.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`px-2.5 py-1 text-xs font-extrabold ${percentualSaude === 100 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                  {percentualSaude === 100 ? '100% REGULAR' : 'REQUER ATENÇÃO'}
                </Badge>
              </div>
            </div>
            <div className="text-center shrink-0">
              <div className="inline-flex items-center justify-center rounded-full bg-slate-800 border-4 border-sky-500/80 h-24 w-24 shadow-lg shadow-sky-500/10">
                <span className="text-3xl font-extrabold font-mono text-sky-400">{percentualSaude}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ATIVOS REGULADOS */}
        <Card className="border-slate-200/80 shadow-md shadow-slate-100/50 bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-wider">Ativos de Engenharia</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              <Cpu className="h-6 w-6 text-sky-600" /> {totalAtivos}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 font-medium">
            Equipamentos cadastrados e mapeados no parque industrial.
          </CardContent>
        </Card>

        {/* PRÓXIMAS AUDITORIAS */}
        <Card className="border-slate-200/80 shadow-md shadow-slate-100/50 bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-wider">Próximas Inspeções</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-emerald-600" /> {proximasInspecoes}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 font-medium">
            Agendamentos de inspeção recorrente contratada.
          </CardContent>
        </Card>
      </div>

      {/* LISTA DE ATIVOS E CONFORMIDADE */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* TABELA DE ATIVOS E STATUS DE CONFORMIDADE (COLSPAN=2) */}
        <Card className="md:col-span-2 border-slate-200 shadow-md shadow-slate-100/50 bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-sky-600" /> Status de Conformidade dos Ativos
            </CardTitle>
            <CardDescription className="text-xs">Validade legal atual de cada máquina ou sistema técnico.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {ativos.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-semibold text-sm">
                Nenhum ativo mecânico cadastrado para este cliente.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-100/40">
                  <TableRow>
                    <TableHead className="font-bold text-slate-600 text-xs">TAG</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs">Equipamento</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs">Categoria</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs">Conformidade Legal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ativos.map((ativo) => {
                    // Descobrir a conformidade
                    const inspecoesAtivo = inspecoes.filter(i => i.ativo_id === ativo.id && i.status === 'concluida');
                    const possuiLaudo = inspecoesAtivo.length > 0;
                    const temFalha = possuiLaudo && inspecoesAtivo[0].respostas?.some(r => r.resposta === 'nao_conforme');
                    
                    let statusLabel = 'Pendente';
                    let statusColor = 'bg-slate-100 text-slate-600';
                    let IconStatus = AlertTriangle;

                    if (possuiLaudo) {
                      if (temFalha) {
                        statusLabel = 'Não Conforme';
                        statusColor = 'bg-red-50 text-red-600 border border-red-100';
                        IconStatus = ShieldAlert;
                      } else {
                        statusLabel = 'Regularizado';
                        statusColor = 'bg-green-50 text-green-600 border border-green-100';
                        IconStatus = CheckCircle2;
                      }
                    }

                    return (
                      <TableRow key={ativo.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono font-bold text-sky-600 text-sm">{ativo.tag_identificacao}</TableCell>
                        <TableCell className="font-semibold text-slate-700">{ativo.nome}</TableCell>
                        <TableCell className="text-slate-500 capitalize">{ativo.categoria}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${statusColor}`}>
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

        {/* DOWNLOADS DE LAUDOS E ARTs (SKU / AMC) */}
        <Card className="border-slate-200 shadow-md shadow-slate-100/50 bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-600" /> Repositório de Laudos & ARTs
            </CardTitle>
            <CardDescription className="text-xs">Documentos de conformidade assinados em PDF.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {inspecoes.filter(i => i.status === 'concluida').length === 0 ? (
              <div className="p-4 text-center text-slate-400 font-semibold text-xs">
                Nenhum laudo técnico concluído no sistema.
              </div>
            ) : (
              inspecoes
                .filter(i => i.status === 'concluida')
                .slice(0, 5)
                .map((inspecao) => (
                  <div key={inspecao.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200/80 transition bg-slate-50/30">
                    <div className="space-y-1">
                      <span className="font-mono font-bold text-xs text-sky-600 block">{inspecao.ativo_tag}</span>
                      <span className="text-xs font-bold text-slate-800 block truncate max-w-[150px]">{inspecao.template_nome}</span>
                      <span className="text-[10px] text-slate-400 block font-semibold">ART: {inspecao.art_numero || 'Pendente'}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-200 hover:bg-sky-50 hover:text-sky-600 font-bold text-xs px-2 h-8 flex items-center gap-1"
                      onClick={() => baixarPdfLaudo(inspecao.id)}
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Button>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
