'use client';

import Link from 'next/link';
import { BarChart3, ClipboardCheck, LogOut, MoveRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const modules = [
  {
    href: '/m/crm/dashboard',
    name: 'Apex CRM',
    label: 'Vendas, relacionamento e negócios',
    icon: BarChart3,
    accent: 'bg-brand-500',
  },
  {
    href: '/m/inspect/ordens',
    name: 'Apex Inspect',
    label: 'Campo, projetos, inspeções, ativos e ordens de serviço',
    icon: ClipboardCheck,
    accent: 'bg-emerald-600',
  },
];

export default function MobileModulosPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-full bg-brand-900 px-4 py-5 text-white">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-apex-orange">
            <span className="font-display text-sm font-bold leading-none">A</span>
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-none">APEX</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-steel-300">
              Mobile
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={logout}
          className="text-steel-200 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Sair</span>
        </Button>
      </header>

      <section className="mb-5">
        <p className="text-sm font-medium text-steel-300">
          {user?.nome ? `Olá, ${user.nome}` : 'Bem-vindo'}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Selecione o módulo
        </h1>
      </section>

      <div className="space-y-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href} className="block">
              <Card className="border-white/10 bg-white text-steel-950">
                <CardContent className="p-4">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${module.accent}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-steel-100 text-brand-900">
                      <MoveRight className="h-4 w-4" />
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight">{module.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-steel-500">{module.label}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
