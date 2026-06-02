'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Inspecao, TemplateChecklist } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, X, ShieldAlert, ArrowLeft, Camera, FileText, Settings } from 'lucide-react';

interface RespostaChecklistForm {
  pergunta_id: number;
  resposta: 'conforme' | 'nao_conforme' | 'nao_se_aplica';
  observacao: string;
  foto_url?: string;
}

export default function InspecaoCampoPage() {
  const params = useParams();
  const router = useRouter();
  const inspecaoId = params.inspecaoId;

  const [inspecao, setInspecao] = useState<Inspecao | null>(null);
  const [template, setTemplate] = useState<TemplateChecklist | null>(null);
  const [respostas, setRespostas] = useState<Record<number, RespostaChecklistForm>>({});
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [artNumero, setArtNumero] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    async function carregarDados() {
      try {
        setLoading(true);
        // Buscar detalhes da inspeção
        const resInspecao = await api.get(`/api/inspecoes/${inspecaoId}`);
        const dataInspecao: Inspecao = resInspecao.data;
        setInspecao(dataInspecao);
        setObservacoesGerais(dataInspecao.observacoes_gerais || '');
        setArtNumero(dataInspecao.art_numero || '');

        // Buscar o template do checklist associado
        const resTemplate = await api.get(`/api/inspecoes/templates`);
        const listTemplates: TemplateChecklist[] = resTemplate.data;
        const currentTemplate = listTemplates.find(t => t.id === dataInspecao.template_id) || null;
        setTemplate(currentTemplate);

        // Inicializar respostas
        const mapaRespostas: Record<number, RespostaChecklistForm> = {};
        
        // Se a inspeção já tiver respostas salvas
        if (dataInspecao.respostas && dataInspecao.respostas.length > 0) {
          dataInspecao.respostas.forEach(r => {
            mapaRespostas[r.pergunta_id] = {
              pergunta_id: r.pergunta_id,
              resposta: r.resposta,
              observacao: r.observacao || '',
              foto_url: r.foto_url
            };
          });
        } else if (currentTemplate) {
          // Caso contrário, carregar em branco a partir do template
          currentTemplate.itens.forEach(item => {
            mapaRespostas[item.id] = {
              pergunta_id: item.id,
              resposta: 'nao_se_aplica',
              observacao: ''
            };
          });
        }
        setRespostas(mapaRespostas);
      } catch (err) {
        console.error('Erro ao carregar dados da inspeção', err);
      } finally {
        setLoading(false);
      }
    }

    if (inspecaoId) {
      carregarDados();
    }
  }, [inspecaoId]);

  const handleRespostaChange = (perguntaId: number, valor: 'conforme' | 'nao_conforme' | 'nao_se_aplica') => {
    setRespostas(prev => ({
      ...prev,
      [perguntaId]: {
        ...prev[perguntaId],
        resposta: valor
      }
    }));
  };

  const handleObservacaoChange = (perguntaId: number, texto: string) => {
    setRespostas(prev => ({
      ...prev,
      [perguntaId]: {
        ...prev[perguntaId],
        observacao: texto
      }
    }));
  };

  // Simular adição de foto no canteiro de obras
  const handleSimularFoto = (perguntaId: number) => {
    const mockFotoUrls = [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1535813547-99c456a41d4a?q=80&w=500&auto=format&fit=crop'
    ];
    const randomFoto = mockFotoUrls[Math.floor(Math.random() * mockFotoUrls.length)];

    setRespostas(prev => ({
      ...prev,
      [perguntaId]: {
        ...prev[perguntaId],
        foto_url: randomFoto
      }
    }));
  };

  const salvarLaudoCampo = async () => {
    try {
      setSalvando(true);
      const payload = {
        respostas: Object.values(respostas),
        observacoes_gerais: observacoesGerais,
        art_numero: artNumero
      };

      await api.put(`/api/inspecoes/${inspecaoId}/campo`, payload);
      setSucesso(true);
    } catch (err) {
      console.error('Erro ao salvar relatório de inspeção', err);
    } finally {
      setSalvando(false);
    }
  };

  const baixarPdfLaudo = () => {
    // Abrir endpoint de download direto do PDF
    const token = localStorage.getItem('token');
    const url = `${api.defaults.baseURL}/api/inspecoes/${inspecaoId}/pdf?token=${token}`;
    
    // Método seguro passando token no cabeçalho ou abrindo requisição autenticada
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Settings className="mx-auto h-12 w-12 animate-spin text-sky-600" />
          <p className="mt-4 text-gray-500 font-medium">Carregando formulário de campo regulatório...</p>
        </div>
      </div>
    );
  }

  if (!inspecao || !template) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 font-semibold">Erro: Inspeção ou Checklist Regulatório não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="text-gray-600 hover:text-gray-900" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Badge variant={inspecao.status === 'concluida' ? 'default' : 'secondary'} className="bg-slate-900 text-white font-semibold">
          Status: {inspecao.status.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
          Apex Inspect — Inspeção de Campo
        </h1>
        <p className="text-slate-500 font-medium leading-relaxed">
          Preenchimento de checklist dinâmico e emissão de laudo técnico regulatório para engenheiros mecânicos.
        </p>
      </div>

      {/* METADADOS DO EQUIPAMENTO */}
      <Card className="border-slate-200/80 shadow-md shadow-slate-100/50 bg-gradient-to-r from-slate-900 to-slate-950 text-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-400" /> Ficha Técnica do Ativo
          </CardTitle>
          <CardDescription className="text-slate-400">Dados do equipamento mecânico sendo auditado.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400 block text-xs">TAG IDENTIFICAÇÃO</span>
            <span className="font-mono font-bold text-lg text-sky-400">{inspecao.ativo_tag}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">EQUIPAMENTO</span>
            <span className="font-semibold">{inspecao.ativo_nome}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">CLIENTE</span>
            <span>{inspecao.ativo_empresa_nome}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">TEMPLATE APLICADO</span>
            <span>{template.nome} (v{template.versao})</span>
          </div>
        </CardContent>
      </Card>

      {/* TELA DE SUCESSO PÓS-FINALIZAÇÃO */}
      {sucesso ? (
        <Card className="border-green-100 bg-green-50/50 p-6 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Check className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-green-950">Inspeção Concluída e Auditada!</h2>
            <p className="text-green-700 text-sm max-w-md mx-auto">
              O checklist regulatório foi salvo no banco de dados e o Laudo Técnico de Engenharia Mecânica foi gerado automaticamente em PDF.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold" onClick={baixarPdfLaudo}>
              <FileText className="mr-2 h-5 w-5" /> Baixar Laudo PDF + ART
            </Button>
            <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 font-bold" onClick={() => router.push('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* SEÇÃO DO CHECKLIST */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-sky-600" /> Avaliação de Itens Regulatórios
            </h2>

            {template.itens.map((item, index) => {
              const resp = respostas[item.id] || { resposta: 'nao_se_aplica', observacao: '' };
              
              return (
                <Card key={item.id} className="border-slate-200 shadow-sm hover:border-slate-300 transition">
                  <CardHeader className="pb-3 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-slate-400 font-bold text-xs uppercase">ITEM #{index + 1}</span>
                        <CardTitle className="text-sm font-semibold text-slate-800 leading-snug">
                          {item.pergunta}
                        </CardTitle>
                      </div>
                      <Badge variant={item.criticidade === 'alta' ? 'destructive' : item.criticidade === 'media' ? 'default' : 'secondary'} className="capitalize shrink-0">
                        {item.criticidade}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* BOTÕES GRANDES DE TOGGLE */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={resp.resposta === 'conforme' ? 'default' : 'outline'}
                        className={`font-semibold py-6 flex flex-col items-center justify-center gap-1 border-slate-200 transition ${resp.resposta === 'conforme' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-slate-700 hover:bg-green-50 hover:text-green-600'}`}
                        onClick={() => handleRespostaChange(item.id, 'conforme')}
                      >
                        <Check className="h-5 w-5" />
                        <span className="text-xs">CONFORME</span>
                      </Button>

                      <Button
                        type="button"
                        variant={resp.resposta === 'nao_conforme' ? 'default' : 'outline'}
                        className={`font-semibold py-6 flex flex-col items-center justify-center gap-1 border-slate-200 transition ${resp.resposta === 'nao_conforme' ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-slate-700 hover:bg-red-50 hover:text-red-600'}`}
                        onClick={() => handleRespostaChange(item.id, 'nao_conforme')}
                      >
                        <X className="h-5 w-5" />
                        <span className="text-xs">NÃO CONFORME</span>
                      </Button>

                      <Button
                        type="button"
                        variant={resp.resposta === 'nao_se_aplica' ? 'default' : 'outline'}
                        className={`font-semibold py-6 flex flex-col items-center justify-center gap-1 border-slate-200 transition ${resp.resposta === 'nao_se_aplica' ? 'bg-slate-700 hover:bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}
                        onClick={() => handleRespostaChange(item.id, 'nao_se_aplica')}
                      >
                        <span className="h-5 flex items-center text-sm font-bold">-</span>
                        <span className="text-xs">NÃO SE APLICA</span>
                      </Button>
                    </div>

                    {/* OBSERVAÇÃO INDIVIDUAL */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`obs-${item.id}`} className="text-xs font-semibold text-slate-500">Observações Técnicas / Anomalias</Label>
                      <Input
                        id={`obs-${item.id}`}
                        placeholder="Ex: Vazamento de óleo na junta do compressor, necessidade de troca rápida."
                        value={resp.observacao}
                        onChange={(e) => handleObservacaoChange(item.id, e.target.value)}
                        className="border-slate-200/80 focus-visible:ring-sky-600"
                      />
                    </div>

                    {/* FOTO E ANEXOS (MOBILE CAMERA SIMULATOR) */}
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"
                        onClick={() => handleSimularFoto(item.id)}
                      >
                        <Camera className="h-4 w-4" /> Capturar Foto de Evidência
                      </Button>
                      
                      {resp.foto_url && (
                        <div className="relative h-10 w-16 overflow-hidden rounded border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={resp.foto_url} alt="Evidência" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* PARECER GERAL E ART */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-800">Parecer Geral de Responsabilidade Técnica</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="art-number" className="text-sm font-bold text-slate-700">Número da ART (CREA-MG / CREA-SP)</Label>
                <Input
                  id="art-number"
                  placeholder="Ex: MG20261234567"
                  value={artNumero}
                  onChange={(e) => setArtNumero(e.target.value)}
                  className="border-slate-200 focus-visible:ring-sky-600 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="obs-gerais" className="text-sm font-bold text-slate-700">Conclusão / Parecer do Engenheiro Mecânico</Label>
                <Textarea
                  id="obs-gerais"
                  rows={4}
                  placeholder="Digite aqui as recomendações obrigatórias de engenharia mecânica, prazos para readequações normativas e o parecer final sobre a conformidade do equipamento."
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                  className="border-slate-200 focus-visible:ring-sky-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <Button
              size="lg"
              className="w-full bg-slate-900 hover:bg-slate-950 text-white font-extrabold py-6 rounded-lg transition text-base tracking-wide flex items-center justify-center gap-2"
              onClick={salvarLaudoCampo}
              disabled={salvando}
            >
              {salvando ? 'Processando e Assinando Laudo...' : 'Finalizar Inspeção & Gerar Laudo PDF'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
