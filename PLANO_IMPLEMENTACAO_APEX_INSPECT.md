# Plano de Implementacao - Apex Inspect

## Objetivo

O Apex CRM esta praticamente pronto e deve continuar sendo o modulo principal de relacionamento comercial. O novo modulo, chamado Apex Inspect, sera implementado dentro da mesma plataforma para cuidar da operacao de campo: ordens de servico, inspecoes, execucoes tecnicas, evidencias, apontamentos, assinaturas e relatorios/laudos.

A implementacao deve aproveitar a base existente, mas separar claramente responsabilidades para evitar que o codigo fique misturado.

## Principio Arquitetural

A plataforma passa a ser organizada em dominios:

- Apex CRM: relacionamento comercial, leads, pipeline, negocios, empresas, projetos e atividades comerciais.
- Apex Inspect: operacao tecnica em campo, ativos, contratos, ordens, inspecoes, execucoes, evidencias e relatorios.
- Core: autenticacao, usuarios, perfis, permissoes, tenants, configuracoes compartilhadas e infraestrutura comum.

Essa separacao deve aparecer no backend, frontend, nomes de arquivos, rotas e tipos TypeScript.

## Organizacao Atual

Hoje o projeto ja possui partes do Apex Inspect:

- Modelos: `Ativo`, `ContratoAMC`, `TemplateChecklist`, `Inspecao`.
- Blueprints: `/api/v1/inspect/ativos` e `/api/v1/inspect/inspecoes`.
- Frontend: `/contratos-amc`, `/portal-cliente`, `/inspecoes/campo` e `/m/inspecoes`.

O ponto fraco atual e que `inspecoes/routes.py` mistura contratos AMC, templates, inspecoes e geracao de PDF. Isso ainda funciona para MVP, mas nao deve ser expandido dessa forma.

## Nova Nomenclatura Estrutural

### Backend

Proposta de organizacao:

```text
backend/app/
  domains/
    core/
      models/
      blueprints/
      services/
    crm/
      models/
      blueprints/
      services/
    inspect/
      models/
      blueprints/
      services/
```

Como o projeto atual usa `app/models` e `app/blueprints`, a migracao deve ser gradual. Nao devemos mover tudo de uma vez se isso gerar risco. A primeira etapa pode criar a nomenclatura por blueprints e nomes de arquivos, mantendo modelos existentes ate uma reorganizacao controlada.

### Blueprints sugeridas

Core:

- `/api/v1/core/usuarios`
- `/api/v1/core/perfis`
- `/api/v1/core/permissoes`
- `/api/v1/core/tenants`
- `/api/v1/core/admin`

CRM:

- `/api/v1/crm/dashboard`
- `/api/v1/crm/leads`
- `/api/v1/crm/pipelines`
- `/api/v1/crm/negocios`
- `/api/v1/crm/empresas`
- `/api/v1/crm/projetos`
- `/api/v1/crm/servicos`

Inspect:

- `/api/v1/inspect/ativos`
- `/api/v1/inspect/contratos`
- `/api/v1/inspect/ordens`
- `/api/v1/inspect/inspecoes`
- `/api/v1/inspect/execucoes`
- `/api/v1/inspect/evidencias`
- `/api/v1/inspect/templates`
- `/api/v1/inspect/relatorios`

O contrato publico da API deve seguir o padrao versionado `/api/v1/<dominio>/<recurso>`. Rotas fora desse padrao nao devem ser usadas pelo frontend novo.

## Apex CRM - Padronizacao

O CRM deve seguir a mesma logica modular do Inspect. Isso significa:

- Agrupar regras comerciais em um dominio `crm`.
- Evitar que paginas ou blueprints crescam com responsabilidades misturadas.
- Separar servicos de negocio das rotas HTTP.
- Padronizar nomes em portugues do negocio ou nomes tecnicos consistentes, sem misturar estilos sem necessidade.
- Manter contratos de API claros entre backend e frontend.

Exemplo:

```text
crm/
  leads
  pipelines
  negocios
  empresas
  projetos
  servicos
```

Cada recurso deve ter:

- model
- blueprint/routes
- service com regras de negocio
- schemas/validadores quando necessario
- tipos TypeScript equivalentes no frontend

## Apex Inspect - Modelo Funcional

O Apex Inspect deve ser implementado em torno de `OrdemServico`.

### Entidades principais

- `OrdemServico`: unidade central de trabalho em campo.
- `ExecucaoCampo`: registro da execucao real pelo engenheiro.
- `Inspecao`: avaliacao tecnica/regulatoria associada a uma ordem.
- `Ativo`: equipamento ou item tecnico do cliente.
- `ContratoInspect` ou `ContratoAMC`: contrato recorrente que pode gerar ordens.
- `TemplateChecklist`: modelo de checklist aplicado a inspecoes ou servicos.
- `RespostaChecklist`: respostas estruturadas dos itens de checklist.
- `EvidenciaCampo`: fotos, anexos, documentos e observacoes visuais.
- `ApontamentoHora`: horas trabalhadas e deslocamento.
- `MaterialUtilizado`: materiais, pecas ou insumos usados.
- `AssinaturaCampo`: aceite do cliente e assinatura do engenheiro.
- `RelatorioTecnico`: PDF/laudo gerado a partir da execucao.

### Fluxo principal

1. Administrativo cria ou agenda uma ordem de servico.
2. Ordem pode estar ligada a cliente, contrato, ativo, projeto ou negocio.
3. Engenheiro visualiza suas ordens no mobile.
4. Engenheiro inicia atendimento em campo.
5. Registra checklist, servicos feitos, fotos, observacoes, horas e materiais.
6. Cliente assina ou confirma atendimento.
7. Sistema finaliza a ordem.
8. Sistema gera relatorio/laudo.
9. Portal do cliente exibe historico, laudos e pendencias.

## Frontend

### Desktop

Rotas sugeridas:

```text
/crm
/crm/dashboard
/crm/leads
/crm/pipeline
/crm/negocios
/crm/empresas
/crm/projetos

/inspect
/inspect/dashboard
/inspect/ordens
/inspect/ativos
/inspect/contratos
/inspect/templates
/inspect/relatorios
```

As rotas atuais podem continuar no primeiro momento, mas a estrutura visual e de codigo deve caminhar para essa separacao.

### Mobile / Campo

Rotas sugeridas:

```text
/m/inspect
/m/inspect/ordens
/m/inspect/ordens/[id]
/m/inspect/ordens/[id]/execucao
/m/inspect/ordens/[id]/assinatura
```

O mobile deve ser pensado para uso real em campo:

- telas curtas
- botoes grandes
- salvamento parcial
- captura de fotos
- fluxo de continuar execucao
- estados claros de pendente, em campo, pausada, concluida

## Ordem de Implementacao Recomendada

### Fase 1 - Base estrutural

- Criar estrutura de blueprints do Apex Inspect.
- Definir padrao de nomenclatura para CRM, Inspect e Core.
- Corrigir mapeamento da topbar/sidebar para novos modulos.
- Migrar chamadas do frontend para `/api/v1/core`, `/api/v1/crm` e `/api/v1/inspect`.
- Validar migrations e ambiente PostgreSQL local.

### Fase 2 - Ordem de Servico

- Criar modelo `OrdemServico`.
- Criar CRUD administrativo.
- Relacionar ordem com empresa, contrato, ativo, projeto, negocio e responsavel.
- Criar status padronizados: `rascunho`, `agendada`, `em_campo`, `pausada`, `concluida`, `cancelada`.

### Fase 3 - Execucao de Campo

- Criar modelo `ExecucaoCampo`.
- Criar tela mobile de "minhas ordens".
- Criar tela mobile de detalhe da ordem.
- Implementar iniciar, pausar, continuar e finalizar atendimento.

### Fase 4 - Checklists e evidencias

- Evoluir templates de checklist.
- Salvar respostas estruturadas.
- Criar upload de fotos/anexos.
- Vincular evidencias a ordem, execucao ou item do checklist.

### Fase 5 - Relatorios e laudos

- Gerar relatorio tecnico em PDF.
- Incluir dados da empresa, ativo, ordem, checklist, evidencias, assinaturas e ART quando aplicavel.
- Versionar relatorios gerados.

### Fase 6 - Portal do cliente

- Exibir ordens realizadas.
- Exibir laudos.
- Exibir ativos e historico tecnico.
- Exibir pendencias e nao conformidades.

### Fase 7 - Automacoes

- Gerar ordens recorrentes a partir de contratos.
- Criar alertas de vencimento.
- Criar dashboard operacional do Inspect.

## Cuidados Importantes

- Nao misturar Apex CRM e Apex Inspect em uma unica blueprint.
- Nao transformar `inspecoes/routes.py` em um arquivo gigante.
- Nao guardar evidencias reais apenas como URL manual.
- Nao depender de SQLite para testar multi-tenancy.
- Nao criar telas desktop para fluxos que serao usados majoritariamente em celular.
- Evitar novas rotas fora do contrato `/api/v1/<dominio>/<recurso>`.

## Resultado Esperado

Ao final, a plataforma tera dois aplicativos bem definidos:

- Apex CRM: gestao comercial e relacionamento.
- Apex Inspect: operacao tecnica de campo.

Ambos compartilham Core, autenticacao, usuarios, empresas, tenants e design system, mas cada dominio tera sua propria organizacao, rotas, blueprints e regras de negocio.
