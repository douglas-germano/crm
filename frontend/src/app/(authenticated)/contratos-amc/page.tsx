'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ContratoAMC, Empresa } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Handshake, CircleDollarSign, CalendarDays, RefreshCw, Settings, Check, Plus, AlertCircle } from 'lucide-react';

export default function ContratosAmcPage() {
  const [contratos, setContratos] = useState<ContratoAMC[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form fields
  const [titulo, setTitulo] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [plano, setPlano] = useState<'mensal' | 'trimestral' | 'semestral' | 'anual'>('mensal');
  const [valorRecorrente, setValorRecorrente] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function carregarDados() {
    try {
      setLoading(true);
      const resContratos = await api.get('/api/inspecoes/contratos-amc');
      setContratos(resContratos.data);

      const resEmpresas = await api.get('/api/empresas');
      setEmpresas(resEmpresas.data.empresas ?? resEmpresas.data);
    } catch (err) {
      console.error('Erro ao carregar contratos e empresas', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCriarContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !empresaId || !dataInicio) return;

    try {
      setSalvando(true);
      const payload = {
        titulo,
        empresa_id: parseInt(empresaId),
        plano,
        valor_recorrente: parseFloat(valorRecorrente) || 0.0,
        data_inicio: dataInicio,
        data_fim: dataFim || null,
        status: 'ativo'
      };

      await api.post('/api/inspecoes/contratos-amc', payload);
      
      // Reset form
      setTitulo('');
      setEmpresaId('');
      setPlano('mensal');
      setValorRecorrente('');
      setDataInicio('');
      setDataFim('');
      setOpenModal(false);

      // Reload
      await carregarDados();
    } catch (err) {
      console.error('Erro ao criar contrato AMC', err);
    } finally {
      setSalvando(false);
    }
  };

  // Calcular estatísticas financeiras
  const totalAtivos = contratos.filter(c => c.status === 'ativo').length;
  
  // MRR (Monthly Recurring Revenue)
  const mrr = contratos
    .filter(c => c.status === 'ativo')
    .reduce((acc, curr) => {
      let multiplicador = 1;
      if (curr.plano === 'trimestral') multiplicador = 1 / 3;
      else if (curr.plano === 'semestral') multiplicador = 1 / 6;
      else if (curr.plano === 'anual') multiplicador = 1 / 12;
      return acc + (curr.valor_recorrente * multiplicador);
    }, 0);

  const totalSuspensos = contratos.filter(c => c.status === 'suspenso').length;

  if (loading && contratos.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Settings className="mx-auto h-12 w-12 animate-spin text-sky-600" />
          <p className="mt-4 text-gray-500 font-medium">Carregando painel de faturamento recorrente (AMC)...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER & NEW ACTION */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-6">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Contratos de Conformidade Recorrente (AMC)
          </h2>
          <p className="text-muted-foreground text-sm font-medium leading-relaxed">
            Painel administrativo para controle de receita recorrente mensal (MRR) e contratos anuais de manutenção.
          </p>
        </div>

        {/* DIALOG DE CRIAÇÃO */}
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <Plus className="h-5 w-5" /> Novo Contrato AMC
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-slate-900">Novo Contrato Recorrente (AMC)</DialogTitle>
              <DialogDescription className="text-slate-500">
                Cadastre um novo plano de auditoria regulatória e recorrência para um cliente da Apex.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCriarContrato} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="titulo" className="text-xs font-bold text-slate-700">Título do Contrato</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Plano de Manutenção PMOC Shopping"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="border-slate-200 focus-visible:ring-sky-600 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="empresa" className="text-xs font-bold text-slate-700">Cliente (Empresa)</Label>
                <Select value={empresaId} onValueChange={setEmpresaId}>
                  <SelectTrigger className="border-slate-200 focus:ring-sky-600 font-semibold text-slate-700">
                    <SelectValue placeholder="Selecione o Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="plano" className="text-xs font-bold text-slate-700">Plano / Recorrência</Label>
                  <Select value={plano} onValueChange={(val: 'mensal' | 'trimestral' | 'semestral' | 'anual') => setPlano(val)}>
                    <SelectTrigger className="border-slate-200 focus:ring-sky-600 font-semibold text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="valor" className="text-xs font-bold text-slate-700">Valor Faturado (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    placeholder="1500.00"
                    value={valorRecorrente}
                    onChange={(e) => setValorRecorrente(e.target.value)}
                    className="border-slate-200 focus-visible:ring-sky-600 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="data_ini" className="text-xs font-bold text-slate-700">Data de Início</Label>
                  <Input
                    id="data_ini"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="border-slate-200 focus-visible:ring-sky-600"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="data_fim" className="text-xs font-bold text-slate-700">Data de Término (Opcional)</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="border-slate-200 focus-visible:ring-sky-600"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" className="border-slate-200" onClick={() => setOpenModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvando}>
                  {salvando ? 'Processando...' : 'Salvar Contrato'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* FINANCE METRIC CARDS */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* MRR CARD */}
        <Card className="border-border bg-brand-900 text-white relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <CircleDollarSign className="h-44 w-44 text-emerald-400" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-wider">MRR (Faturamento Recorrente Mensal)</CardDescription>
            <CardTitle className="text-4xl font-extrabold text-emerald-400 font-mono">
              R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400 font-medium">
            Receita previsível calculada proporcionalmente ao mês de todos os contratos ativos.
          </CardContent>
        </Card>

        {/* CONTRATOS ATIVOS */}
        <Card className="border-slate-200/80 shadow-md shadow-slate-100/50 bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-wider">Contratos Ativos</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              <Handshake className="h-6 w-6 text-sky-600" /> {totalAtivos}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 font-medium">
            Acordos vigentes de conformidade mecânica em execução.
          </CardContent>
        </Card>

        {/* SUSPENSOS / CANCELADOS */}
        <Card className="border-slate-200/80 shadow-md shadow-slate-100/50 bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-wider">Contratos Suspensos</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-600" /> {totalSuspensos}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 font-medium">
            Contratos com pendência comercial ou suspensos temporariamente.
          </CardContent>
        </Card>
      </div>

      {/* LISTA DE CONTRATOS */}
      <Card className="border-slate-200 shadow-md shadow-slate-100/50 bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-sky-600" /> Relação de Contratos AMC Cadastrados
          </CardTitle>
          <CardDescription className="text-xs">Detalhamento financeiro e de vigência.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {contratos.length === 0 ? (
            <div className="p-6 text-center text-slate-400 font-semibold text-sm">
              Nenhum contrato recorrente cadastrado para a Apex Inspect.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-100/40">
                <TableRow>
                  <TableHead className="font-bold text-slate-600 text-xs">Vigência / Cliente</TableHead>
                  <TableHead className="font-bold text-slate-600 text-xs">Contrato / Título</TableHead>
                  <TableHead className="font-bold text-slate-600 text-xs">Recorrência / Plano</TableHead>
                  <TableHead className="font-bold text-slate-600 text-xs">Valor Recorrente</TableHead>
                  <TableHead className="font-bold text-slate-600 text-xs">Início</TableHead>
                  <TableHead className="font-bold text-slate-600 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((contrato) => (
                  <TableRow key={contrato.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-slate-700">{contrato.empresa_nome}</TableCell>
                    <TableCell className="font-bold text-slate-900">{contrato.titulo}</TableCell>
                    <TableCell className="capitalize font-semibold text-slate-500">{contrato.plano}</TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600">
                      R$ {contrato.valor_recorrente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-slate-500 font-semibold">
                      {new Date(contrato.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={contrato.status === 'ativo' ? 'default' : 'secondary'} className={`px-2 py-0.5 rounded text-xs font-bold ${contrato.status === 'ativo' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-amber-500/20 text-amber-700 border border-amber-500/30'}`}>
                        {contrato.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
