'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyMobileInspecaoCampoPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/m/inspect/inspecoes/campo${window.location.search}`);
  }, [router]);

  return null;
}
