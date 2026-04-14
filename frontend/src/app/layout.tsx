import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Engetch CRM - Engenharia Mecânica',
  description: 'Sistema de Gestão de Relacionamento com Clientes - Engetch Engenharia Mecânica',
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
