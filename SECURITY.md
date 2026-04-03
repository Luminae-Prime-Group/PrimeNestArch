# Politica de Seguranca

## Versoes Suportadas

Apenas a branch `main` mais recente possui suporte ativo.

## Reporte de Vulnerabilidade

Nao abra issue publica para vulnerabilidades de seguranca.

Envie um reporte privado com:

- descricao e impacto
- passos de reproducao
- versao afetada e hash do commit
- sugestao de correcao (opcional)

Canal de contato: abra um GitHub Security Advisory privado neste repositorio (aba Security).

Compromisso de resposta: confirmacao de recebimento em ate 72 horas e retorno inicial de triagem com estimativa de tratativa.

## Requisitos Minimos de Seguranca

- nao versionar segredos
- manter dependencias atualizadas
- usar HTTPS em producao
- manter validacao TLS do banco ativa (`DB_SSL_REJECT_UNAUTHORIZED=true`)
- proteger rotas com token de API (`x-api-token` ou bearer token)
- manter CSRF habilitado para operacoes mutaveis

## Boas Praticas Operacionais

- executar `npm run security:audit` antes de releases
- revisar variaveis sensiveis de ambiente em cada deploy
- acompanhar planos de endurecimento em `SECURITY_UPGRADE_PLAN.md`
