export interface Usuario {
  id: number;
  uuid: string;
  nome: string;
  email: string;
  perfil_id: number;
  perfil?: Perfil;
  ativo: boolean;
  deve_trocar_senha?: boolean;
  data_criacao: string;
  ultimo_login?: string;
}

export interface Perfil {
  id: number;
  nome: string;
  descricao: string;
  permissoes?: Permissao[];
}

export interface Permissao {
  id: number;
  codigo: string;
  descricao: string;
  modulo: string;
}

export interface Lead {
  id: number;
  uuid: string;
  nome: string;
  email: string;
  telefone?: string;
  empresa?: string;
  empresa_id?: number;
  empresa_dados?: Empresa;
  cargo?: string;
  interesse?: string;
  origem?: string;
  observacoes?: string;
  status: 'novo' | 'contatado' | 'qualificado' | 'convertido' | 'perdido';
  responsavel?: string;
  responsavel_id?: number;
  data_criacao: string;
  data_atualizacao: string;
}

export interface Pipeline {
  id: number;
  uuid: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  estagios: Estagio[];
  data_criacao: string;
  data_atualizacao: string;
}

export interface Estagio {
  id: number;
  uuid: string;
  nome: string;
  descricao?: string;
  cor: string;
  ordem: number;
  pipeline_id: number;
  data_criacao: string;
  data_atualizacao: string;
}

export interface LeadEstagio {
  id: number;
  lead_id: number;
  estagio_id: number;
  posicao: number;
  data_entrada: string;
  data_atualizacao: string;
  lead?: Lead;
}

export interface Negocio {
  id: number;
  uuid: string;
  nome: string;
  descricao?: string;
  valor: number;
  tipo: 'unico' | 'recorrente';
  periodicidade?: string;
  probabilidade: number;
  data_previsao_fechamento?: string;
  status: 'aberto' | 'ganho' | 'perdido';
  motivo?: string;
  lead_id: number;
  lead?: Lead;
  pipeline_id: number;
  estagio_id: number;
  estagio?: Estagio;
  responsavel_id: number;
  responsavel?: string;
  servico_id?: number;
  servico?: Servico;
  data_criacao: string;
  data_atualizacao: string;
  data_fechamento?: string;
}

export interface AtividadeNegocio {
  id: number;
  uuid: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  data_agendada: string;
  data_conclusao?: string;
  status: 'pendente' | 'concluida' | 'cancelada';
  resultado?: string;
  negocio_id: number;
  responsavel_id: number;
  responsavel?: string;
  data_criacao: string;
  data_atualizacao: string;
}

export interface Empresa {
  id: number;
  uuid: string;
  cnpj?: string;
  razao_social: string;
  nome_fantasia?: string;
  ramo?: string;
  porte?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  website?: string;
  observacoes?: string;
  ativo: boolean;
  total_contatos: number;
  contatos?: Contato[];
  data_criacao: string;
  data_atualizacao: string;
}

export interface Contato {
  id: number;
  uuid: string;
  nome: string;
  cargo?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  principal: boolean;
  observacoes?: string;
  empresa_id: number;
  data_criacao: string;
  data_atualizacao: string;
}

export interface Servico {
  id: number;
  uuid: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  ativo: boolean;
  data_criacao: string;
}

export interface DashboardStats {
  total_leads: number;
  total_empresas: number;
  total_negocios: number;
  total_abertos: number;
  total_ganhos: number;
  total_perdidos: number;
  valor_total: number;
  valor_ganho: number;
  valor_aberto: number;
  valor_perdido: number;
  taxa_conversao: number;
  leads_por_status: Array<{ status: string; total: number }>;
  leads_por_origem: Array<{ origem: string; total: number }>;
}

export interface FunilData {
  pipeline: string;
  funil: Array<{
    estagio: string;
    cor: string;
    total: number;
    valor: number;
  }>;
}

export interface PaginatedResponse<T> {
  total: number;
  pages: number;
  page: number;
  per_page: number;
  [key: string]: T[] | number;
}
