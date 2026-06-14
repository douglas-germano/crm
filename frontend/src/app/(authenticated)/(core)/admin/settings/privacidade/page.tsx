'use client';

import { useState } from 'react';
import { Download, Trash2, BanIcon, Loader2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import api from '@/lib/api';

type Acao = 'exportar' | 'anonimizar' | 'revogar' | null;

export default function PrivacidadePage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState<Acao>(null);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const exportar = async () => {
    setCarregando('exportar');
    try {
      const { data } = await api.post('/api/v1/core/privacidade/titular/exportar', { email: email.trim() });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dados-titular-${email.trim()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Exportação concluída: ${data.total_registros ?? 0} registro(s).`, 'success');
    } catch (e) {
      toast(extrairErro(e, 'Falha ao exportar dados.'), 'error');
    } finally {
      setCarregando(null);
    }
  };

  const anonimizar = async () => {
    if (!confirm(`Anonimizar (irreversível) todos os dados pessoais de "${email.trim()}"?`)) return;
    setCarregando('anonimizar');
    try {
      const { data } = await api.post('/api/v1/core/privacidade/titular/anonimizar', { email: email.trim() });
      toast(`Anonimizado(s) ${data.registros_anonimizados ?? 0} registro(s).`, 'success');
    } catch (e) {
      toast(extrairErro(e, 'Falha ao anonimizar.'), 'error');
    } finally {
      setCarregando(null);
    }
  };

  const revogar = async () => {
    setCarregando('revogar');
    try {
      const { data } = await api.post('/api/v1/core/privacidade/titular/revogar-consentimento', { email: email.trim() });
      toast(`Consentimento revogado em ${data.registros_afetados ?? 0} registro(s).`, 'success');
    } catch (e) {
      toast(extrairErro(e, 'Falha ao revogar consentimento.'), 'error');
    } finally {
      setCarregando(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-500" />
            <CardTitle>Direitos do Titular (LGPD)</CardTitle>
          </div>
          <CardDescription>
            Atenda às solicitações de titulares de dados pessoais (Lei 13.709/2018, art. 18):
            acesso e portabilidade, eliminação por anonimização e revogação de consentimento.
            Todas as ações ficam registradas na trilha de auditoria.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email-titular">E-mail do titular</Label>
            <Input
              id="email-titular"
              type="email"
              placeholder="titular@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" disabled={!emailValido || carregando !== null} onClick={exportar}>
              {carregando === 'exportar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar dados
            </Button>
            <Button variant="outline" disabled={!emailValido || carregando !== null} onClick={revogar}>
              {carregando === 'revogar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BanIcon className="h-4 w-4" />}
              Revogar consentimento
            </Button>
            <Button variant="destructive" disabled={!emailValido || carregando !== null} onClick={anonimizar}>
              {carregando === 'anonimizar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Anonimizar
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            A anonimização é irreversível: nome, e-mail, telefone e demais dados pessoais do lead
            são substituídos por valores anônimos, preservando o histórico de negócios do CRM.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function extrairErro(e: unknown, padrao: string): string {
  const ax = e as { response?: { data?: { erro?: string } } };
  return ax?.response?.data?.erro || padrao;
}
