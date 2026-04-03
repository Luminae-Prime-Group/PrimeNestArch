# Plano de Migracao Arquitetural

## Estado Atual (ja concluido)

- Reorganizacao estrutural para pastas por camadas foi concluida.
- Bootstrap principal foi desacoplado em componentes menores.
- Estruturas de infraestrutura (config, database, middleware) estao estabelecidas.
- Modulo de e-mail foi quebrado em servicos mais coesos por responsabilidade.

## Proximo Objetivo

Consolidar fronteiras entre camadas para impedir regressao de acoplamento e manter crescimento previsivel por modulo.

## Fase 1: Camada de aplicacao orientada a contratos

- Definir contratos por modulo (repositorios, providers, publicadores) em `shared` ou no proprio modulo.
- Refatorar casos de uso para depender de contratos e nao de implementacoes concretas.
- Isolar detalhes de Nest e TypeORM fora de `domain` e `application`.

## Fase 2: Pureza de dominio

- Mover invariantes e politicas de negocio para `domain`.
- Introduzir value objects para primitivas criticas.
- Garantir testes unitarios de dominio sem container Nest.

## Fase 3: Endurecimento de infraestrutura

- Tornar adaptadores explicitos, substituiveis e testaveis.
- Centralizar resiliencia (retry, timeout e politicas de fallback) em adaptadores de infraestrutura.
- Encapsular mapeamentos de persistencia e versionamento de esquema.

## Fase 4: Segregacao de interfaces

- Manter preocupacoes HTTP somente em `presentation` e em `src/interfaces/http` quando aplicavel.
- Isolar handlers de eventos, workers e CLI em `src/interfaces/*`.
- Evitar vazamento de DTOs de transporte para `domain/application`.

## Fase 5: Alinhamento de testes

- Unitarios: regras de `domain` e orquestracao de `application`.
- Integracao: comportamento de adaptadores de `infrastructure`.
- Contrato: compatibilidade entre fronteiras de modulos e adaptadores.
- E2E: fluxos criticos de negocio e seguranca.

## Definicao de Pronto por Modulo

- `domain` sem dependencia de framework/ORM.
- `application` orquestrando casos de uso via contratos.
- `infrastructure` contendo somente IO externo concreto.
- `presentation` mapeando DTOs de entrada e respostas.
- cobertura de testes minima para caminhos criticos unitarios e integrados.

## Indicadores de Sucesso

- reducao de arquivos com responsabilidades misturadas
- menor necessidade de mocks acoplados ao framework em testes de regra
- aumento de reutilizacao de casos de uso entre interfaces
- diminuicao de regressao ao trocar detalhes de infraestrutura
