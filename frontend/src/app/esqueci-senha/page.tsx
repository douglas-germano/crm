'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

export default function EsqueciSenhaPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [workspace, setWorkspace] = useState('');
  
  const [msg, setMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Autocompleta workspace se houver no localstorage
    const saved = localStorage.getItem('workspace_nome');
    if (saved) setWorkspace(saved);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg('');
    setIsSubmitting(true);

    try {
      const resp = await api.post('/api/usuarios/esqueci-senha', {
        email, workspace
      });
      setMsg(resp.data.mensagem);
    } catch {
      // Por segurança, muitas apis fingem que deu certo. Nós vamos fingir também se falhar, 
      // ou se tiver uma formatacao mt errada acusamos erro tecnico.
      setMsg('Se os dados estiverem corretos, enviamos as instruções para o seu e-mail.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <CardTitle className="font-display text-2xl tracking-tight text-foreground">
            Recuperar Acesso
          </CardTitle>
          <CardDescription className="text-base font-medium pt-2">
            Insira os dados da sua conta para redefinir sua senha.
          </CardDescription>
        </CardHeader>

          <CardContent>
          {msg && (
            <div className="mb-6 p-4 rounded-md text-sm border font-medium text-center bg-brand-500/10 border-brand-500/50 text-brand-500">
              <p>{msg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace">Seu Workspace</Label>
                <Input
                  id="workspace"
                  type="text"
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value.toLowerCase())}
                  required
                  placeholder="ex: engetch"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Enviar Instruções
                </Button>
              </div>
            </form>

          <div className="mt-6 text-center">
            <Button variant="ghost" className="text-sm font-semibold text-muted-foreground hover:text-foreground" onClick={() => router.push('/login')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
