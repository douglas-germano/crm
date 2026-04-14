'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

function RedefinirForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token inválido ou não fornecido na URL.");
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (senha !== confirmacao) {
       setError("As senhas não coincidem.");
       return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      const resp = await api.post('/api/usuarios/redefinir-senha', {
        token, nova_senha: senha
      });
      setSuccess(true);
      setError('');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { erro?: string } } };
      setError(axiosError?.response?.data?.erro || "Falha ao redefinir a senha.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CardContent>
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 p-3 rounded-md">
          <p className="text-sm text-red-500 font-medium text-center">
            {error}
          </p>
        </div>
      )}

      {success ? (
        <div className="space-y-6">
          <div className="bg-green-500/10 border border-green-500/50 p-4 rounded-md">
            <p className="text-sm text-green-500 font-medium text-center">
              Senha atualizada com sucesso! Você já pode fazer login.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white shadow-lg"
          >
            Ir para o Login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha">Crie a nova senha</Label>
            <div className="flex relative items-center">
              <Lock className="w-4 h-4 absolute left-3 text-muted-foreground" />
              <Input
                id="senha"
                className="pl-9"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmacao">Confirme a nova senha</Label>
            <div className="flex relative items-center">
              <Lock className="w-4 h-4 absolute left-3 text-muted-foreground" />
              <Input
                id="confirmacao"
                className="pl-9"
                type="password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !token}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20"
            >
              {isSubmitting ? (
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                 <Lock className="w-4 h-4 mr-2" />
              )}
              Confirmar Nova Senha
            </Button>
          </div>
          
          <div className="mt-6 text-center">
            <Button type="button" variant="ghost" className="text-sm font-semibold text-muted-foreground hover:text-foreground" onClick={() => router.push('/login')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancelar
            </Button>
          </div>
        </form>
      )}
    </CardContent>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: '#0c192d',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }}
    >
      <Card className="w-full max-w-sm shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <CardTitle className="font-display text-2xl tracking-tight text-foreground">
            Nova Senha
          </CardTitle>
          <CardDescription className="text-base font-medium pt-2">
            Digite a sua nova credencial segura.
          </CardDescription>
        </CardHeader>
        
        <Suspense fallback={
          <CardContent className="flex justify-center py-6">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </CardContent>
        }>
          <RedefinirForm />
        </Suspense>
      </Card>
    </div>
  );
}
