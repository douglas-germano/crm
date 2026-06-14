import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Política de Privacidade • Apex CRM',
  description: 'Política de Privacidade e tratamento de dados pessoais (LGPD).',
};

export default function PoliticaPrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-brand-500" />
        <h1 className="text-2xl font-semibold text-steel-900">Política de Privacidade</h1>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Conteúdo a ser preenchido pelo jurídico / Encarregado (DPO).</strong> Esta é a
        estrutura da página. O texto definitivo da Política de Privacidade, em conformidade com a
        Lei nº 13.709/2018 (LGPD), deve ser inserido aqui antes da publicação.
      </div>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-steel-600">
        <div>
          <h2 className="mb-1 font-semibold text-steel-800">1. Controlador e Encarregado (DPO)</h2>
          <p>[Razão social do controlador], inscrita no CNPJ [•]. Encarregado pelo tratamento de dados: [nome] — [email-dpo@empresa.com.br].</p>
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-steel-800">2. Dados coletados e finalidades</h2>
          <p>Descrever as categorias de dados pessoais tratados (nome, e-mail, telefone, cargo) e as finalidades do tratamento (gestão de relacionamento comercial / CRM).</p>
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-steel-800">3. Bases legais</h2>
          <p>Consentimento, legítimo interesse e execução de contrato, conforme art. 7 da LGPD.</p>
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-steel-800">4. Direitos do titular</h2>
          <p>Acesso, correção, anonimização, portabilidade, eliminação e revogação de consentimento (art. 18). Solicitações pelo canal: [email-dpo@empresa.com.br].</p>
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-steel-800">5. Retenção e segurança</h2>
          <p>Descrever prazos de retenção e medidas de segurança adotadas (art. 15, 16 e 46).</p>
        </div>
      </section>

      <div className="mt-10 text-sm">
        <Link href="/termos" className="text-brand-500 hover:underline">Termos de Uso</Link>
        <span className="mx-2 text-steel-300">•</span>
        <Link href="/login" className="text-brand-500 hover:underline">Voltar ao login</Link>
      </div>
    </main>
  );
}
