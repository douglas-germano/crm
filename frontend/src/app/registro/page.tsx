'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { UserPlus, Loader2, Building, User, Mail, Lock, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

export default function RegistroPage() {
  const router = useRouter();

  // Field states
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [nomeAdmin, setNomeAdmin] = useState('');
  const [emailAdmin, setEmailAdmin] = useState('');
  const [senhaAdmin, setSenhaAdmin] = useState('');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Chama a nova API criada para provisionamento de tenants
      await api.post('/api/tenants/registro', {
        nome_empresa: nomeEmpresa,
        workspace: workspace,
        nome_admin: nomeAdmin,
        email_admin: emailAdmin,
        senha_admin: senhaAdmin
      });
      
      // Se deu certo, podemos jogar o usuario no flow do proprio NextAuth de novo 
      // ou apenas mandar para o login preenchendo o workspace localmente.
      localStorage.setItem('workspace_nome', nomeEmpresa);
      alert('Workspace criado com sucesso! Faça seu primeiro login.');
      router.push('/login');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { erro?: string } } };
      setError(
        axiosError?.response?.data?.erro ||
        'Falha ao criar o Workspace. Verifique os dados e tente novamente.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        backgroundColor: '#0c192d',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }}
    >
      <Card className="w-full max-w-lg shadow-2xl border-0">
        <CardHeader className="text-center pb-4">
          <CardTitle className="font-display text-3xl tracking-tight text-foreground">
            APEX CRM
          </CardTitle>
          <p className="text-sm text-muted-foreground tracking-wide mt-1">
            Plataforma B2B para Engenharia
          </p>

          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-0.5 bg-brand-500" />
          </div>

          <CardDescription className="text-base font-medium pt-2">
            Crie seu ambiente exclusivo
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 p-3 rounded-md">
              <p className="text-sm text-red-500 font-medium text-center">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* STEP 1: Empresa */}
            <div className={`space-y-4 ${step === 2 ? 'opacity-50 pointer-events-none hidden' : ''}`}>
              <div className="flex items-center space-x-2 border-b pb-2 mb-4">
                <Building className="w-5 h-5 text-brand-500" />
                <h3 className="text-lg font-medium">Dados da Empresa</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                <Input
                  id="nomeEmpresa"
                  type="text"
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                  required
                  placeholder="Ex: ACME Engenharia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspace">URL / Workspace</Label>
                <div className="flex relative items-center">
                  <Globe className="w-4 h-4 absolute left-3 text-muted-foreground" />
                  <Input
                    id="workspace"
                    className="pl-9"
                    type="text"
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    required
                    placeholder="acme"
                  />
                </div>
                {workspace && (
                  <p className="text-xs text-brand-500">Seu portal será: acesse.crm/{workspace}</p>
                )}
              </div>

              <Button 
                type="button" 
                className="w-full mt-4"
                onClick={() => setStep(2)}
                disabled={!nomeEmpresa || !workspace}
              >
                Continuar
              </Button>
            </div>

            {/* STEP 2: Administrador */}
            <div className={`space-y-4 ${step === 1 ? 'hidden' : ''}`}>
              <div className="flex items-center space-x-2 border-b pb-2 mb-4">
                <User className="w-5 h-5 text-brand-500" />
                <h3 className="text-lg font-medium">Perfil do Administrador</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nomeAdmin">Seu Nome Completo</Label>
                <Input
                  id="nomeAdmin"
                  type="text"
                  value={nomeAdmin}
                  onChange={(e) => setNomeAdmin(e.target.value)}
                  required={step === 2}
                  placeholder="João da Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailAdmin">E-mail Corporativo</Label>
                <div className="flex relative items-center">
                  <Mail className="w-4 h-4 absolute left-3 text-muted-foreground" />
                  <Input
                    id="emailAdmin"
                    className="pl-9"
                    type="email"
                    value={emailAdmin}
                    onChange={(e) => setEmailAdmin(e.target.value)}
                    required={step === 2}
                    placeholder="joao@acme.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senhaAdmin">Senha de Acesso</Label>
                <div className="flex relative items-center">
                  <Lock className="w-4 h-4 absolute left-3 text-muted-foreground" />
                  <Input
                    id="senhaAdmin"
                    className="pl-9"
                    type="password"
                    value={senhaAdmin}
                    onChange={(e) => setSenhaAdmin(e.target.value)}
                    required={step === 2}
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-1/3" 
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                >
                  Voltar
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting || !nomeAdmin || !emailAdmin || !senhaAdmin}
                  className="w-2/3"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Construindo Servidor...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Criar Conta
                    </>
                  )}
                </Button>
              </div>
            </div>
            
          </form>

          {!isSubmitting && (
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Já tem um Workspace? </span>
              <Button variant="link" onClick={() => router.push('/login')}>
                Faça login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
