'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COOKIE_CONSENT_KEY, initAmplitude } from '@/lib/analytics';

/**
 * Banner de consentimento de cookies (LGPD art. 8).
 * Só habilita cookies/rastreamento analítico após aceite explícito do titular.
 * A escolha fica persistida em localStorage (`lgpd_cookie_consent`).
 */
export default function CookieConsent() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const escolha = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!escolha) setVisivel(true);
  }, []);

  const registrar = (valor: 'accepted' | 'rejected') => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, valor);
    setVisivel(false);
    if (valor === 'accepted') {
      initAmplitude();
    }
  };

  if (!visivel) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-xl border border-steel-200 bg-white p-5 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
          <p className="text-sm leading-relaxed text-steel-700">
            Utilizamos cookies essenciais para o funcionamento da plataforma e, com o seu
            consentimento, cookies analíticos para melhorar sua experiência. Saiba mais na{' '}
            <Link href="/privacidade" className="font-medium text-brand-500 underline-offset-2 hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => registrar('rejected')}>
            Rejeitar
          </Button>
          <Button size="sm" onClick={() => registrar('accepted')}>
            Aceitar cookies
          </Button>
        </div>
      </div>
    </div>
  );
}
