# Contribuicao

Obrigado por contribuir com o projeto.

## Fluxo de Desenvolvimento

1. Faca fork e crie uma branch a partir de `main`.
2. Mantenha commits atomicos e use Conventional Commits.
3. Rode as validacoes antes de abrir PR:

```bash
npm run lint:check
npm run build
npm test
```

4. Se a mudanca tocar persistencia, inclua migracoes.
5. Abra PR com contexto, analise de risco e evidencia de testes.

## Padrao de Codigo

- TypeScript estrito e tipagem explicita quando necessario
- Nenhum segredo hardcoded
- Validar todas as variaveis de ambiente
- Preferir defaults seguros

## Regras de Arquitetura

- Mantenha regra de negocio em `src/modules/<modulo>/domain` e `src/modules/<modulo>/application`.
- Mantenha controllers e DTOs em `presentation`.
- Mantenha adaptadores externos em `infrastructure`.
- Evite importar classes concretas de infraestrutura diretamente em `domain/application`.
- Promova codigo para `src/shared` apenas quando houver reuso real entre modulos.

## Onde Criar Novos Arquivos

- Novo caso de uso: `src/modules/<modulo>/application`.
- Nova politica/entidade/value object de dominio: `src/modules/<modulo>/domain`.
- Novo adaptador de banco/provider: `src/modules/<modulo>/infrastructure` ou `src/infrastructure`.
- Novo endpoint HTTP/DTO: `src/modules/<modulo>/presentation`.
- Novo contrato compartilhado: `src/shared/contracts`.

## Checklist de Pull Request

- Explique por que cada arquivo novo esta na camada escolhida.
- Inclua evidencia de testes unitarios/integracao/e2e para o comportamento alterado.
- Se houver alteracao de fronteira arquitetural, atualize `docs/architecture/README.md`.
- Se houver mudanca de contrato de API, atualize a documentacao principal.

## Convencao de Commits

Exemplos:

- `feat(auth): add refresh token rotation`
- `fix(database): handle transaction rollback`
- `chore(ci): add npm audit step`
