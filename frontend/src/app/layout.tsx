import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Apex CRM',
  description: 'Sistema de Gestão de Relacionamento com Clientes - Apex',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-body antialiased bg-steel-50 text-steel-950">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
