'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const MOBILE_BREAKPOINT = 768;

const TO_MOBILE: Record<string, string> = {
  '/dashboard': '/m/crm/dashboard',
  '/leads': '/m/crm/leads',
  '/projetos': '/m/crm/projetos',
  '/negocios': '/m/crm/negocios',
  '/inspect/ordens/detalhe': '/m/inspect/ordens/detalhe',
  '/inspect/ordens': '/m/inspect/ordens',
  '/inspect/ativos': '/m/inspect/ativos',
  '/inspecoes/campo': '/m/inspect/inspecoes/campo',
  '/inspecoes': '/m/inspect/inspecoes',
};

const TO_DESKTOP: Record<string, string> = {
  '/m/crm/dashboard': '/dashboard',
  '/m/crm/leads': '/leads',
  '/m/crm/projetos': '/projetos',
  '/m/crm/negocios': '/negocios',
  '/m/inspect/ordens/detalhe': '/inspect/ordens/detalhe',
  '/m/inspect/ordens': '/inspect/ordens',
  '/m/inspect/ativos': '/inspect/ativos',
  '/m/inspect/inspecoes/campo': '/inspecoes/campo',
  '/m/inspect/inspecoes': '/inspecoes',
};

function isMobile() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

/** Em layouts desktop: redireciona para /m/* se o dispositivo for mobile */
export function useDesktopToMobileRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isMobile()) return;
    const entry = Object.entries(TO_MOBILE).find(
      ([desktop]) => pathname === desktop || pathname.startsWith(desktop + '/')
    );
    if (entry) {
      const query = window.location.search;
      router.replace(`${entry[1]}${query}`);
    }
  }, [pathname, router]);
}

/** Em layouts mobile: redireciona para rota desktop se o dispositivo for desktop */
export function useMobileToDesktopRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isMobile()) return;
    const desktop = TO_DESKTOP[pathname];
    if (desktop) {
      const query = window.location.search;
      router.replace(`${desktop}${query}`);
    }
  }, [pathname, router]);
}
