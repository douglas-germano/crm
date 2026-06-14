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
  // LGPD (Lei 13.709/2018)
  base_legal?: 'consentimento' | 'legitimo_interesse' | 'execucao_contrato' | 'obrigacao_legal';
  finalidade?: string;
  consentimento?: boolean;
  consentimento_data?: string | null;
  consentimento_origem?: string;
  anonimizado?: boolean;
  anonimizado_em?: string | null;
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

export interface Projeto {
  id: number;
  uuid: string;
  nome: string;
  descricao?: string;
  status: 'planejamento' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado' | string;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica' | string;
  data_inicio?: string;
  data_previsao_fim?: string;
  data_fim?: string;
  valor_contrato: number;
  percentual_concluido: number;
  negocio_id?: number;
  negocio_nome?: string;
  empresa_id?: number;
  empresa_nome?: string;
  gerente_id?: number;
  gerente_nome?: string;
  criado_por_id?: number;
  total_tarefas: number;
  total_tarefas_concluidas: number;
  data_criacao: string;
  data_atualizacao: string;
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

export interface Ativo {
  id: number;
  uuid: string;
  nome: string;
  tag_identificacao: string;
  categoria: 'hvac' | 'nr12' | 'nr13' | 'outro';
  fabricante?: string;
  modelo?: string;
  numero_serie?: string;
  dados_tecnicos?: Record<string, any>;
  localizacao?: string;
  data_instalacao?: string;
  status: 'ativo' | 'inativo' | 'manutencao';
  empresa_id: number;
  empresa_nome?: string;
  data_criacao: string;
  data_atualizacao: string;
}

export interface ContratoAMC {
  id: number;
  uuid: string;
  titulo: string;
  plano: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  valor_recorrente: number;
  data_inicio: string;
  data_fim?: string;
  status: 'ativo' | 'suspenso' | 'cancelado' | 'finalizado';
  empresa_id: number;
  empresa_nome?: string;
  data_criacao: string;
  data_atualizacao: string;
}

export interface ItemChecklist {
  id: number;
  pergunta: string;
  criticidade: 'baixa' | 'media' | 'alta';
}

export interface TemplateChecklist {
  id: number;
  uuid: string;
  nome: string;
  regulacao: 'pmoc' | 'nr12' | 'nr13' | 'outro';
  versao: string;
  itens: ItemChecklist[];
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

export interface RespostaInspecao {
  pergunta_id: number;
  resposta: 'conforme' | 'nao_conforme' | 'nao_se_aplica';
  observacao?: string;
  foto_url?: string;
}

export interface Inspecao {
  id: number;
  uuid: string;
  data_inspecao: string;
  data_realizacao?: string;
  status: 'agendada' | 'em_campo' | 'concluida' | 'cancelada';
  respostas?: RespostaInspecao[];
  observacoes_gerais?: string;
  art_numero?: string;
  art_pdf_url?: string;
  pdf_laudo_url?: string;
  ativo_id: number;
  ativo_nome?: string;
  ativo_tag?: string;
  ativo_empresa_id?: number;
  ativo_empresa_nome?: string;
  template_id: number;
  template_nome?: string;
  contrato_amc_id?: number;
  contrato_amc_titulo?: string;
  inspetor_id?: number;
  inspetor_nome?: string;
  data_criacao: string;
  data_atualizacao: string;
}

export interface ExecucaoCampo {
  id: number;
  uuid: string;
  status: 'em_andamento' | 'pausada' | 'concluida' | 'cancelada';
  data_inicio?: string;
  data_fim?: string;
  checklist_snapshot?: Record<string, any>;
  respostas?: Record<string, any>[];
  observacoes?: string;
  latitude_inicio?: number;
  longitude_inicio?: number;
  latitude_fim?: number;
  longitude_fim?: number;
  ordem_servico_id: number;
  executor_id?: number;
  executor_nome?: string;
  data_criacao: string;
  data_atualizacao: string;
}

export interface EvidenciaCampo {
  id: number;
  uuid: string;
  tipo: 'foto' | 'video' | 'documento' | 'audio' | string;
  url: string;
  legenda?: string;
  origem?: string;
  item_referencia?: string;
  latitude?: number;
  longitude?: number;
  metadados?: Record<string, any>;
  ordem_servico_id: number;
  execucao_id?: number;
  criado_por_id?: number;
  criado_por_nome?: string;
  data_criacao: string;
}

export interface ApontamentoHora {
  id: number;
  data_inicio: string;
  data_fim?: string;
  horas: number;
  tipo: string;
  descricao?: string;
  ordem_servico_id: number;
  usuario_id?: number;
  usuario_nome?: string;
  data_criacao: string;
}

export interface MaterialUtilizado {
  id: number;
  nome: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
  observacao?: string;
  ordem_servico_id: number;
  registrado_por_id?: number;
  registrado_por_nome?: string;
  data_criacao: string;
}

export interface AssinaturaCampo {
  id: number;
  nome: string;
  documento?: string;
  cargo?: string;
  tipo: 'cliente' | 'responsavel' | string;
  assinatura_url?: string;
  aceite_texto?: string;
  latitude?: number;
  longitude?: number;
  ordem_servico_id: number;
  usuario_id?: number;
  usuario_nome?: string;
  data_criacao: string;
}

export interface RelatorioTecnico {
  id: number;
  titulo: string;
  status: 'rascunho' | 'emitido' | 'cancelado' | string;
  conteudo?: Record<string, any>;
  pdf_url?: string;
  emitido_em?: string;
  ordem_servico_id: number;
  emitido_por_id?: number;
  emitido_por_nome?: string;
  data_criacao: string;
  data_atualizacao: string;
}

export interface OrdemServico {
  id: number;
  uuid: string;
  codigo?: string;
  titulo: string;
  tipo: 'inspecao' | 'manutencao' | 'servico' | 'visita_tecnica' | string;
  status: 'rascunho' | 'planejada' | 'em_campo' | 'pausada' | 'concluida' | 'cancelada' | string;
  prioridade: 'baixa' | 'normal' | 'alta' | 'critica' | string;
  descricao?: string;
  escopo?: Record<string, any>;
  endereco_atendimento?: string;
  latitude?: number;
  longitude?: number;
  data_agendada?: string;
  data_inicio?: string;
  data_fim?: string;
  observacoes_internas?: string;
  observacoes_cliente?: string;
  empresa_id: number;
  empresa_nome?: string;
  ativo_id?: number;
  ativo_nome?: string;
  ativo_tag?: string;
  contrato_amc_id?: number;
  contrato_amc_titulo?: string;
  projeto_id?: number;
  projeto_nome?: string;
  negocio_id?: number;
  negocio_nome?: string;
  responsavel_id?: number;
  responsavel_nome?: string;
  criado_por_id?: number;
  data_criacao: string;
  data_atualizacao: string;
  execucoes?: ExecucaoCampo[];
  evidencias?: EvidenciaCampo[];
  apontamentos_hora?: ApontamentoHora[];
  materiais?: MaterialUtilizado[];
  assinaturas?: AssinaturaCampo[];
  relatorios?: RelatorioTecnico[];
}
