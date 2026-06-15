'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { loginSuperAdmin, isAuthenticated, isPlatformSession, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigoMfa, setCodigoMfa] = useState('');
  const [mfaRequerido, setMfaRequerido] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && isPlatformSession) {
      router.push('/admin');
    }
  }, [isAuthenticated, isPlatformSession, loading, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await loginSuperAdmin(email, senha, mfaRequerido ? codigoMfa : undefined);
      if (res.mfaRequired) {
        setMfaRequerido(true);
        setError('');
        return;
      }
      // Política global pode exigir configurar o 2FA antes de operar
      router.push(res.mfaSetupRequired ? '/admin/seguranca' : '/admin');
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { erro?: string } } };
      if (ax?.response?.status === 429) {
        setError(ax.response.data?.erro || 'Conta temporariamente bloqueada. Aguarde alguns minutos.');
      } else {
        setError(ax?.response?.data?.erro || 'Falha na autenticacao Super Admin.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c192d] px-4">
      <Card className="w-full max-w-sm border-0 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500 text-white">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">Super Admin</CardTitle>
          <CardDescription>Operação global da plataforma SaaS.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required disabled={mfaRequerido} />
            </div>
            {mfaRequerido && (
              <div className="space-y-2">
                <Label htmlFor="codigo">Código de verificação (2FA)</Label>
                <Input
                  id="codigo"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  placeholder="000000"
                  value={codigoMfa}
                  onChange={(e) => setCodigoMfa(e.target.value.replace(/\D/g, ''))}
                  required
                />
                <p className="text-xs text-muted-foreground">Abra seu app autenticador e informe o código de 6 dígitos.</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting || (mfaRequerido && codigoMfa.length !== 6)}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mfaRequerido ? 'Verificar e entrar' : 'Entrar na plataforma'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
