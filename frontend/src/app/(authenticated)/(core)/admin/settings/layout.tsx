'use client';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Configurações da Plataforma</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Políticas globais que afetam todos os workspaces.
        </p>
      </div>

      {children}
    </div>
  );
}
