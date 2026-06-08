'use client';

import Link from 'next/link';
import { BarChart3, ClipboardCheck, LogOut, MoveRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

const modules = [
  {
    href: '/dashboard',
    name: 'Apex CRM',
    label: 'Relacionamento, vendas e negócios',
    icon: BarChart3,
    accent: 'bg-brand-500',
  },
  {
    href: '/inspect/ordens',
    name: 'Apex Inspect',
    label: 'Campo, projetos, inspeções, ordens de serviço e relatórios técnicos',
    icon: ClipboardCheck,
    accent: 'bg-emerald-600',
  },
];

export default function ModulosPage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-[#0c192d] text-white">
      <div
        className="min-h-screen px-4 py-6 sm:px-6 lg:px-8"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      >
        <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-5xl flex-col">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-apex-orange">
                <span className="font-display text-sm font-bold leading-none">A</span>
              </div>
              <div>
                <p className="font-display text-lg font-bold leading-none">APEX</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-steel-300">
                  Platform
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={logout}
              className="text-steel-200 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </header>

          <section className="flex flex-1 flex-col justify-center py-10">
            <div className="mb-8 max-w-2xl">
              <p className="text-sm font-medium text-steel-300">
                {user?.nome ? `Olá, ${user.nome}` : 'Bem-vindo'}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Selecione o módulo que deseja usar
              </h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <Link
                    key={module.href}
                    href={module.href}
                    className="group flex min-h-[220px] flex-col justify-between rounded-lg border border-white/12 bg-white p-5 text-steel-950 shadow-2xl transition hover:-translate-y-0.5 hover:border-white hover:shadow-black/30"
                  >
                    <div>
                      <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-lg ${module.accent}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h2 className="text-2xl font-semibold tracking-tight">{module.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-steel-500">{module.label}</p>
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-steel-100 pt-4">
                      <span className="text-sm font-semibold text-brand-900">Acessar módulo</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-steel-100 text-brand-900 transition group-hover:bg-brand-500 group-hover:text-white">
                        <MoveRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
