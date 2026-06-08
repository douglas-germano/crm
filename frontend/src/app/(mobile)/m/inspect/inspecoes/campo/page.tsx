'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import type { Inspecao, TemplateChecklist } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Camera,
  Check,
  ClipboardCheck,
  FileText,
  Loader2,
  ShieldAlert,
  X,
} from 'lucide-react';

interface RespostaChecklistForm {
  pergunta_id: number;
  resposta: 'conforme' | 'nao_conforme' | 'nao_se_aplica';
  observacao: string;
  foto_url?: string;
}

const STATUS_OPTIONS = [
  { value: 'conforme', label: 'Conforme', icon: Check },
  { value: 'nao_conforme', label: 'Não conforme', icon: X },
  { value: 'nao_se_aplica', label: 'N/A', icon: ShieldAlert },
] as const;

export default function MobileInspecaoCampoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inspecaoId = searchParams.get('id');

  const [inspecao, setInspecao] = useState<Inspecao | null>(null);
  const [template, setTemplate] = useState<TemplateChecklist | null>(null);
  const [respostas, setRespostas] = useState<Record<number, RespostaChecklistForm>>({});
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [artNumero, setArtNumero] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregarDados() {
      if (!inspecaoId) {
        setErro('Inspeção não informada.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErro('');

        const resInspecao = await api.get(`/api/v1/inspect/inspecoes/${inspecaoId}`);
        const dataInspecao: Inspecao = resInspecao.data;
        setInspecao(dataInspecao);
        setObservacoesGerais(dataInspecao.observacoes_gerais || '');
        setArtNumero(dataInspecao.art_numero || '');

        const resTemplate = await api.get(`/api/v1/inspect/inspecoes/templates/${dataInspecao.template_id}`);
        const currentTemplate: TemplateChecklist = resTemplate.data;
        setTemplate(currentTemplate);

        const mapaRespostas: Record<number, RespostaChecklistForm> = {};
        if (dataInspecao.respostas && dataInspecao.respostas.length > 0) {
          dataInspecao.respostas.forEach((resposta) => {
            mapaRespostas[resposta.pergunta_id] = {
              pergunta_id: resposta.pergunta_id,
              resposta: resposta.resposta,
              observacao: resposta.observacao || '',
              foto_url: resposta.foto_url,
            };
          });
        } else {
          currentTemplate.itens.forEach((item) => {
            mapaRespostas[item.id] = {
              pergunta_id: item.id,
              resposta: 'nao_se_aplica',
              observacao: '',
            };
          });
        }
        setRespostas(mapaRespostas);
      } catch {
        setErro('Não foi possível carregar a inspeção.');
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [inspecaoId]);

  const updateResposta = (
    perguntaId: number,
    patch: Partial<RespostaChecklistForm>,
  ) => {
    setRespostas((prev) => ({
      ...prev,
      [perguntaId]: {
        ...prev[perguntaId],
        pergunta_id: perguntaId,
        resposta: prev[perguntaId]?.resposta || 'nao_se_aplica',
        observacao: prev[perguntaId]?.observacao || '',
        ...patch,
      },
    }));
  };

  const simularFoto = (perguntaId: number) => {
    updateResposta(perguntaId, {
      foto_url: `https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=900&auto=format&fit=crop&item=${perguntaId}`,
    });
  };

  const salvar = async () => {
    if (!inspecaoId) return;

    try {
      setSalvando(true);
      setErro('');
      await api.put(`/api/v1/inspect/inspecoes/${inspecaoId}/campo`, {
        respostas: Object.values(respostas),
        observacoes_gerais: observacoesGerais,
        art_numero: artNumero,
      });
      setSucesso(true);
    } catch {
      setErro('Erro ao salvar o checklist de campo.');
    } finally {
      setSalvando(false);
    }
  };

  const baixarPdf = async () => {
    if (!inspecaoId) return;

    const token = localStorage.getItem('token');
    const url = `${api.defaults.baseURL}/api/v1/inspect/inspecoes/${inspecaoId}/pdf`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setErro('Não foi possível baixar o laudo.');
      return;
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `laudo-inspecao-${inspecaoId}.pdf`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" />
          <p className="mt-3 text-sm font-medium text-steel-500">Carregando inspeção...</p>
        </div>
      </div>
    );
  }

  if (erro && (!inspecao || !template)) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => router.push('/m/inspect/inspecoes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {erro}
        </div>
      </div>
    );
  }

  if (!inspecao || !template) return null;

  return (
    <div className="space-y-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/m/inspect/inspecoes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <span className="rounded-full border border-steel-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-steel-500">
          {inspecao.status}
        </span>
      </div>

      <section className="rounded-lg bg-brand-900 p-4 text-white">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-apex-orange" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-steel-300">
            Apex Inspect
          </p>
        </div>
        <h2 className="text-lg font-semibold leading-tight">{inspecao.ativo_nome}</h2>
        <p className="mt-1 font-mono text-sm text-apex-orange">#{inspecao.ativo_tag}</p>
        <p className="mt-2 text-sm text-steel-300">{inspecao.ativo_empresa_nome}</p>
        <p className="mt-3 text-xs text-steel-400">{template.nome} · v{template.versao}</p>
      </section>

      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {erro}
        </div>
      )}

      {sucesso ? (
        <section className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-emerald-950">Inspeção concluída</h3>
            <p className="mt-1 text-sm text-emerald-700">
              O checklist foi salvo e o laudo já pode ser baixado.
            </p>
          </div>
          <Button className="w-full" onClick={baixarPdf}>
            <FileText className="mr-2 h-4 w-4" />
            Baixar Laudo PDF
          </Button>
          <Button className="w-full" variant="outline" onClick={() => router.push('/m/inspect/inspecoes')}>
            Voltar para Inspeções
          </Button>
        </section>
      ) : (
        <>
          <section className="space-y-3">
            {template.itens.map((item, index) => {
              const resposta = respostas[item.id];
              return (
                <article key={item.id} className="rounded-lg border border-steel-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-steel-100 text-xs font-semibold text-brand-900">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold leading-snug text-steel-950">{item.pergunta}</h3>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-steel-400">
                        Criticidade {item.criticidade}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {STATUS_OPTIONS.map(({ value, label, icon: Icon }) => {
                      const active = resposta?.resposta === value;
                      return (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={active ? 'default' : 'outline'}
                          onClick={() => updateResposta(item.id, { resposta: value })}
                          className="h-10 px-2 text-xs"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </Button>
                      );
                    })}
                  </div>

                  <Textarea
                    value={resposta?.observacao ?? ''}
                    onChange={(event) => updateResposta(item.id, { observacao: event.target.value })}
                    className="mt-3"
                    placeholder="Observação técnica"
                  />

                  <Button className="mt-3 w-full" variant="outline" onClick={() => simularFoto(item.id)}>
                    <Camera className="mr-2 h-4 w-4" />
                    {resposta?.foto_url ? 'Foto vinculada' : 'Adicionar evidência'}
                  </Button>
                </article>
              );
            })}
          </section>

          <section className="space-y-4 rounded-lg border border-steel-100 bg-white p-4 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="art">Número da ART</Label>
              <Input
                id="art"
                value={artNumero}
                onChange={(event) => setArtNumero(event.target.value)}
                placeholder="ART vinculada ao atendimento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações gerais</Label>
              <Textarea
                id="observacoes"
                value={observacoesGerais}
                onChange={(event) => setObservacoesGerais(event.target.value)}
                placeholder="Resumo técnico da inspeção"
              />
            </div>
            <Button className="w-full" disabled={salvando} onClick={salvar}>
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Finalizar Inspeção
            </Button>
          </section>
        </>
      )}
    </div>
  );
}
