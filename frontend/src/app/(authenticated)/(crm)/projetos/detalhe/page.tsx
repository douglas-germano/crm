'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LegacyProjetoDetalhePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(`/inspect/projetos/detalhe${query ? `?${query}` : ''}`);
  }, [router, searchParams]);

  return null;
}
