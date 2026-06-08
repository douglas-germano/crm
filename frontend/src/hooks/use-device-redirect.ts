'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const MOBILE_BREAKPOINT = 768;

const TO_MOBILE: Record<string, string> = {
  '/dashboard': '/m/dashboard',
  '/leads': '/m/leads',
  '/inspecoes/campo': '/m/inspecoes/campo',
  '/inspecoes': '/m/inspecoes',
  '/projetos': '/m/projetos',
  '/negocios': '/m/negocios',
};

const TO_DESKTOP: Record<string, string> = {
  '/m/dashboard': '/dashboard',
  '/m/leads': '/leads',
  '/m/inspecoes/campo': '/inspecoes/campo',
  '/m/inspecoes': '/inspecoes',
  '/m/projetos': '/projetos',
  '/m/negocios': '/negocios',
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
    if (entry) router.replace(entry[1]);
  }, [pathname, router]);
}

/** Em layouts mobile: redireciona para rota desktop se o dispositivo for desktop */
export function useMobileToDesktopRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isMobile()) return;
    const desktop = TO_DESKTOP[pathname];
    if (desktop) router.replace(desktop);
  }, [pathname, router]);
}
