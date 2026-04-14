'use client';

import { Settings2, ShieldCheck, Mail, GlobeLock, DatabaseZap, Users, Lock, KeySquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export default function AdminSettings() {
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold tracking-tight text-white flex items-center gap-3">
           <Settings2 className="w-8 h-8 text-brand-500 shrink-0" />
           Configurações da Plataforma
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
           Painel de Toggles Globais do SaaS. Ajustes críticos que se aplicam a todas as instâncias e schemas ativos no banco de dados isolado da sua nuvem.
        </p>
      </div>

      {/* Grid Central */}
      <div className="grid gap-6 md:grid-cols-2">
         
         {/* Controle de Segurança */}
         <Card className="border-brand-500/20 bg-background/50 backdrop-blur-xl">
           <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
               <ShieldCheck className="w-5 h-5 text-brand-500" />
               Acesso e Segurança Global
             </CardTitle>
             <CardDescription>Gerencie quem pode entrar na sua plataforma e qual protocolo exigir.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                   <Label className="text-base font-medium text-white">Inscrições Abertas</Label>
                   <p className="text-xs text-muted-foreground mr-6">Se desativado, esconderá a página de <code>/registro</code> para visitantes externos.</p>
                 </div>
                 <Switch 
                   checked={allowRegistration} 
                   onCheckedChange={setAllowRegistration}
                   className="data-[state=checked]:bg-brand-500"
                 />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                 <div className="space-y-0.5">
                   <Label className="text-base font-medium text-white">Forçar Autenticação 2FA</Label>
                   <p className="text-xs text-muted-foreground mr-6">Todos os administradores da sua rede e de clientes serão retidos no Login.</p>
                 </div>
                 <Switch 
                   checked={require2FA} 
                   onCheckedChange={setRequire2FA}
                   className="data-[state=checked]:bg-brand-500"
                 />
              </div>
           </CardContent>
         </Card>

         {/* Operações de Crise */}
         <Card className="border-red-500/10 bg-red-500/5">
           <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2 text-red-500">
               <GlobeLock className="w-5 h-5" />
               Protocolos de Emergência
             </CardTitle>
             <CardDescription>Ações diretas que derrubam conexões e sessões de clientes.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                   <Label className="text-base font-medium text-white">Modo Manutenção (503)</Label>
                   <p className="text-xs text-muted-foreground">Coloca todo o sistema B2B em lockdown com mensagem de manutenção aos clientes.</p>
                 </div>
                 <Switch 
                   checked={maintenanceMode} 
                   onCheckedChange={setMaintenanceMode}
                   className="data-[state=checked]:bg-red-500"
                 />
              </div>
              
              <div className="pt-2 border-t border-white/5 flex gap-4">
                 <Button variant="destructive" size="sm" className="w-full font-semibold">
                    <Lock className="w-4 h-4 mr-2" />
                    Invalidar JWTs Ativos
                 </Button>
              </div>
           </CardContent>
         </Card>

         {/* Motores de Disparo */}
         <Card className="md:col-span-2 border-white/10">
           <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
               <Mail className="w-5 h-5 text-accent-500" />
               Motores de E-mail & Mensageria B2B
             </CardTitle>
             <CardDescription>Apontamentos DNS e chaves mestras atreladas ao Brevo API.</CardDescription>
           </CardHeader>
           <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="bg-muted/30 p-4 rounded-xl border border-white/5 space-y-2">
                 <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Provedor</span>
                 <p className="text-sm font-bold flex gap-2 items-center"><KeySquare className="w-4 h-4 text-emerald-500" /> Brevo Transactional (Ativo)</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-white/5 space-y-2">
                 <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Cota Mensal</span>
                 <div className="flex items-center gap-2">
                   <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-500 w-[12%]" />
                   </div>
                   <span className="text-xs text-muted-foreground font-mono">12%</span>
                 </div>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-white/5 space-y-2 flex flex-col justify-center items-start">
                 <Button variant="outline" size="sm" className="w-full border-accent-500/50 text-accent-400 hover:bg-accent-500 hover:text-white">Testar Gateway</Button>
              </div>
           </CardContent>
         </Card>

      </div>
      
      <div className="flex justify-end pt-4">
        <Button className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 shadow-lg shadow-brand-500/20">
          Salvar Modificações
        </Button>
      </div>

    </div>
  );
}
