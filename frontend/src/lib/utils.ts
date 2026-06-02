import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  const digits = cnpj.replace(/\D/g, '');
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    novo:        'bg-blue-50 text-blue-700 border-blue-200',
    contatado:   'bg-amber-50 text-amber-700 border-amber-200',
    qualificado: 'bg-violet-50 text-violet-700 border-violet-200',
    convertido:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    perdido:     'bg-red-50 text-red-600 border-red-200',
    aberto:      'bg-blue-50 text-blue-700 border-blue-200',
    ganho:       'bg-emerald-50 text-emerald-700 border-emerald-200',
    pendente:    'bg-amber-50 text-amber-700 border-amber-200',
    concluida:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelada:   'bg-red-50 text-red-600 border-red-200',
  };
  return colors[status] || 'bg-steel-50 text-steel-600 border-steel-200';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
