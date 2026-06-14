import Link from 'next/link';
import { FileText } from 'lucide-react';

export const metadata = {
  title: 'Termos de Uso • Apex CRM',
  description: 'Termos e Condições de Uso da plataforma.',
};

export default function TermosUsoPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <FileText className="h-7 w-7 text-brand-500" />
        <h1 className="text-2xl font-semibold text-steel-900">Termos de Uso</h1>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Conteúdo a ser preenchido pelo jurídico.</strong> Esta é a estrutura da página. O
        texto definitivo dos Termos de Uso deve ser inserido aqui antes da publicação.
      </div>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-steel-600">
        <div>
          <h2 className="mb-1 font-semibold text-steel-800">1. Objeto</h2>
          <p>Descrever o objeto e as condições de uso da plataforma.</p>
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-steel-800">2. Responsabilidades do usuário</h2>
          <p>Descrever obrigações e responsabilidades das partes.</p>
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-steel-800">3. Proteção de dados</h2>
          <p>
            O tratamento de dados pessoais observa a{' '}
            <Link href="/privacidade" className="text-brand-500 hover:underline">Política de Privacidade</Link>.
          </p>
        </div>
      </section>

      <div className="mt-10 text-sm">
        <Link href="/login" className="text-brand-500 hover:underline">Voltar ao login</Link>
      </div>
    </main>
  );
}
