# Guia de Arquitetura

Este documento descreve a arquitetura atual do projeto, os limites entre camadas e as regras praticas para evoluir a base sem reintroduzir acoplamento excessivo.

## Objetivos

- manter fronteiras previsiveis entre regra de negocio e adaptadores tecnicos
- facilitar testes e manutencao
- reduzir arquivos com responsabilidades misturadas
- permitir crescimento por modulo sem degradar legibilidade

## Estrutura Atual

```text
src/
  main.ts               # entrada da aplicacao
  bootstrap/            # composicao e inicializacao da app
  core/                 # abstracoes e componentes centrais compartilhados
  shared/               # constantes, contratos, excecoes e utilitarios comuns
  modules/              # modulos de negocio
    <modulo>/
      application/      # casos de uso e orquestracao
      domain/           # regras de negocio puras
      infrastructure/   # adaptadores e integracoes locais ao modulo
      presentation/     # controllers, DTOs e modelos de resposta
  infrastructure/       # adaptadores tecnicos transversais
  interfaces/           # entradas alternativas: http, events, workers e cli
tests/
test/
```

## Responsabilidade por Camada

### domain

- concentra regra de negocio pura
- nao deve depender de NestJS, TypeORM, Express ou detalhes de transporte
- deve preservar invariantes explicitas e comportamento deterministico

### application

- orquestra casos de uso e fluxos do modulo
- coordena validacoes, idempotencia, retry, consultas e persistencia via contratos e servicos dedicados
- nao deve receber responsabilidade de transporte HTTP nem detalhes de framework alem do necessario para injecao

### infrastructure

- implementa integracoes com banco, cache, SMTP, mensageria e observabilidade
- concentra detalhes tecnicos substituiveis
- deve servir a aplicacao, nao decidir regra de negocio principal

### presentation

- recebe e valida entrada externa
- mapeia DTOs, query params, headers e respostas
- deve permanecer fina, delegando a regra para `application`

## Organizacao Recomendada por Modulo

Use a seguinte regra ao criar ou expandir um modulo em `src/modules/<modulo>`:

1. Coloque regras puras e invariantes em `domain`.
2. Coloque casos de uso e servicos de orquestracao em `application`.
3. Coloque persistencia, providers e integracoes locais em `infrastructure`.
4. Coloque controllers, DTOs e view models em `presentation`.
5. Exporte apenas contratos estaveis e pontos de entrada necessarios.

## Exemplo Pratico: Modulo de E-mail

O modulo de e-mail e hoje a melhor referencia de organizacao interna da base:

- `application` separa responsabilidades como validacao, idempotencia, rate limit, auditoria, suppression e webhook
- `infrastructure` concentra dispatch SMTP, gerenciamento de jobs e renderizacao de templates
- `presentation` expõe endpoints de auditoria, envio, agendamento, suppression e webhook
- `mail.service.ts` funciona como facade fina para o resto da aplicacao

Esse padrao deve ser repetido em novos modulos quando houver crescimento de complexidade.

## Regras de Manutencao Arquitetural

- logica de negocio nova deve nascer em `domain` ou `application`
- controllers nao devem conter decisao de negocio alem de validacao superficial de entrada
- `bootstrap` deve apenas compor a app, registrar middlewares e configurar integracoes globais
- `shared` deve conter apenas primitivas estaveis e reaproveitaveis
- imports entre modulos devem evitar dependencias em arquivos concretos de infraestrutura sempre que houver contrato mais apropriado
- se um servico acumular multiplas responsabilidades, ele deve ser quebrado em servicos menores e coesos

## Fluxo Recomendado para Novas Features

1. Defina o comportamento esperado e os invariantes do dominio.
2. Modele o caso de uso em `application`.
3. Implemente adaptadores tecnicos necessarios em `infrastructure`.
4. Exponha a funcionalidade em `presentation` com DTOs claros.
5. Registre providers e imports no modulo.
6. Cubra o fluxo com testes no nivel correto.

## Onde Colocar Cada Tipo de Mudanca

### Nova regra de negocio

Coloque em `domain` ou em um servico de caso de uso dentro de `application`.

### Nova integracao externa

Coloque em `infrastructure`, mantendo interface clara para consumo da aplicacao.

### Novo endpoint HTTP

Coloque controller e DTOs em `presentation`, com delegacao imediata para um servico de `application`.

### Novo middleware global

Coloque em `src/infrastructure` ou `src/bootstrap`, dependendo se ele e apenas configuracao global ou um adaptador tecnico compartilhado.

## Anti-patterns a Evitar

- controllers gordos com regras de negocio
- servicos unicos que validam, persistem, integram e formatam resposta ao mesmo tempo
- helpers globais escondendo dependencia importante
- importacao direta de implementacoes concretas de outro modulo quando um contrato resolveria
- entidades de dominio acopladas desnecessariamente a detalhes de transporte

## Checklist Antes de Merge

- a regra de negocio nova ficou fora de controller e middleware?
- a integracao externa ficou em `infrastructure`?
- DTOs e mapeamentos ficaram em `presentation`?
- a composicao ficou em `bootstrap` ou no modulo, sem logica de negocio?
- os testes foram adicionados no nivel certo: unitario, integracao, contrato ou e2e?

## Resultado Esperado

Quando essas regras sao seguidas, o projeto fica mais previsivel para evoluir, mais facil de testar e menos sujeito a regressao por acoplamento acidental.
