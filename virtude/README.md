# VIRTUDE

SaaS cristão em português brasileiro: jornadas de 21 dias, Mentor com IA e acompanhamento pessoal. Aplicação independente no worktree `VIRTUDE`; `lucro/`, `dashboard/` e o core do OpenSquad foram preservados.

[Estado da entrega, evidências e gates de produção](../docs/virtude/DELIVERY.md).

## Executar

Node.js 24 LTS ou superior e npm. Na pasta `virtude/`:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3210](http://localhost:3210). `/demo` mostra exclusivamente dados fictícios em memória e não representa login, persistência ou chamada real à OpenAI. Sem configuração, os endpoints privados retornam erro de configuração e a interface explica a indisponibilidade.

## Conectar Neon, Auth.js e IA

O banco é Neon Postgres 16 em `aws-sa-east-1` (projeto `virtude`). O app fala SQL pelo `postgres` (postgres.js) usando `DATABASE_URL`. Em produção, o Worker recebe a URL pelo binding Hyperdrive `HYPERDRIVE`. Auth.js (NextAuth v5) emite o cookie; a tabela `sessions` revoga a sessão. Não há `@supabase/*`.

1. Copie a connection string **pooled** do branch `main` para `DATABASE_URL` em `.env.local`. Não comite esse valor.
2. Aplique o schema com `npm run db:apply`. Ele lê `db/migrations/` em ordem: tabelas do Auth.js, jornadas, as 84 missões em `pending_review`. O comando não roda sem `DATABASE_URL`.
3. Defina `AUTH_SECRET` (32+ caracteres) e `AUTH_URL` com a origem exata do app. O cadastro grava e-mail e senha e ainda não envia o e-mail de confirmação. O link de redefinição usa `/auth/callback?token&email&next=/redefinir` quando o envio existir.
4. Defina `AUTH_RATE_LIMIT_SECRET` com pelo menos 32 caracteres aleatórios. Em produção, `TRUST_AUTH_PROXY=true` exige ingress que remova o header recebido e sobrescreva `x-real-ip`, com origem inacessível diretamente. Sem esse controle, autenticação falha fechada.
5. Defina `OPENAI_API_KEY` e `OPENAI_MODEL` com um modelo disponível na sua conta que suporte Responses e Structured Outputs. A chave nunca entra no navegador. Sem IA configurada, a missão do dia mostra o catálogo com uma ligação explícita ao propósito.

O exemplo de ambiente usa `localhost`; se acessar por `127.0.0.1`, configure `NEXT_PUBLIC_APP_URL` com essa origem exata. Produção exige HTTPS. Não misture ambientes nem use o projeto de produção para testes.

### Workers

vinext 1.4 é um framework Vite e não hospeda este Next.js. O deploy é OpenNext (`open-next.config.ts`, `wrangler.toml`, `cloudflare/entry.mjs`). `npm run cf:build` gera `.open-next/`. `npm run cf:deploy` publica o Worker `virtude`. O Hyperdrive `virtude-neon` (`f45e12d5fcf84c06a2e084fcabfa815f`) é o binding `HYPERDRIVE`; no Worker a conexão vem desse binding, não de `DATABASE_URL`. O cron `*/15 * * * *` chama `POST /api/cron/reminders`. Segredos (`AUTH_SECRET`, `CRON_SECRET`, `OPENAI_API_KEY`) ficam no Cloudflare, não no toml.

### Conteúdo pendente e desenvolvimento

Produção só serve missões com `review_status = approved` no banco. As 84 missões (três jornadas iniciais e Vida espiritual) entram como `pending_review`. O painel `/app/revisao` lista o catálogo, mostra a nota de `docs/virtude/CONTENT-REVIEW.md` e grava aprovar, ajustar ou rejeitar. Ele não aprova nada sozinho. O acesso é a lista `VIRTUDE_CONTENT_REVIEWERS` ou `users.role = admin`. Exporte CSV ou JSON em `/api/revisao/export`. O arquivo `docs/virtude/content-review-ledger.json` começa sem decisões.

Para desenvolvimento isolado, o operador pode definir `ALLOW_UNREVIEWED_CONTENT=true` e, na base local, executar:

```sql
update private.deployment_config
set environment = 'development', allow_unreviewed = true
where singleton;
```

A prévia informa a pendência. Esse opt-in nunca autoriza conteúdo não revisado quando o servidor está em produção. A configuração do banco também impede `allow_unreviewed` no modo de produção. A lista de revisão está em [CONTENT-REVIEW.md](../docs/virtude/CONTENT-REVIEW.md).

`npm run content:seed` grava só a migration aditiva de Vida espiritual. Não regrava as 63 missões já versionadas e não conecta a nenhuma base. Alterações de texto exigem nova revisão.

## Missão do dia personalizada

A prática que a pessoa vê em Hoje e na Jornada usa o objetivo e a dificuldade do onboarding. Com consentimento de IA e OpenAI configurada, o servidor adapta só a ação. A referência e o contexto continuam os do catálogo. A saída é recusada se trouxer HTML, citação nova, fala em nome de Deus ou promessa de cura ou riqueza; nesse caso aparece o catálogo com uma frase explícita de ligação ao propósito. O texto fica na assignment do dia, para o registro corresponder ao que foi visto. Trocar a variante gera outra versão. Sem IA, o fallback não finge adaptação profunda.

## Lembretes e métricas do piloto

`reminder_email` começa desligado. A pessoa pode optar pelo lembrete no horário preferido, no onboarding ou em Ajustes, e desligar depois. `POST /api/cron/reminders` com `Authorization: Bearer $CRON_SECRET` só conta quem optou e está na janela de 15 minutos em `America/Sao_Paulo`. Não envia e-mail e não inclui endereço na resposta. Não há WhatsApp.

`analytics_events` guarda `signup` (ao criar a conta), `onboarding_complete` (um por pessoa), `mission_view` (um por pessoa por dia em que a missão abre), `checkin_complete` (um por pessoa por dia), `mentor_message` (cada resposta não urgente) e `day7_return` (uma vez, ao abrir o app no sétimo dia ou depois). A pessoa só insere os próprios eventos. Não há leitura pela sessão. Propriedades aceitas: `focus`, `day`, `status`, `variant`, `plan`. Denominador do piloto: contas criadas (`signup`). Retorno no sétimo dia usa como denominador os cadastros com pelo menos sete dias.

## Verificar

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npm audit --audit-level=high
npm run security:secrets
npm run security:sast
npm run build
npm run security:bundle
npx playwright install chromium
npm run test:e2e
```

O runner SQL usa PostgreSQL PGlite descartável. Comprova o schema Neon, as políticas para um papel sem bypass e as funções de jornada. Não substitui um teste contra o Neon remoto, o Hyperdrive ou o envio de e-mail. Os testes de UI usam dados sintéticos.

Interrompa o servidor `npm run dev` antes de executar `test:e2e`. O Playwright inicia sua própria instância na porta 3211; dois servidores Next de desenvolvimento na mesma pasta podem regravar tipos e provocar recarregamentos repetidos. O driver limpa apenas o cache descartável `.next-e2e` antes de cada execução. Ao terminar, a prévia pode ser iniciada novamente. `typecheck` regenera os tipos da instância padrão.

`security:sast` usa `uvx` e Python 3.12 para Semgrep. O pipeline GitHub instala versão fixada por pip. SCA bloqueia dependências high/critical; secretlint e regras SAST bloqueiam achados. Para provar a ausência de segredos no bundle, construa com o marcador sintético `VIRTUDE_SERVER_ONLY_SENTINEL_2026` em `OPENAI_API_KEY` e `AUTH_SECRET`; o verificador não imprime segredos.

## Organização

- `src/app`: páginas e endpoints.
- `src/components`: interface reutilizável.
- `src/lib/server`: sessão Auth.js, Postgres, autorização e serviços de domínio.
- `db/migrations`: schema Neon aplicável. `supabase/migrations` é histórico e não entra no Neon.
- `src/lib/ai`: isolamento do provedor, contexto mínimo e saída validada.
- `src/content`: currículo original pendente de revisão.
- `db/tests`: checagem de isolamento num papel sem bypass de RLS.
- `e2e`: testes de navegador desktop/mobile.
- [Arquitetura](../docs/virtude/ARCHITECTURE.md), [operação e privacidade](../docs/virtude/PRIVACY-OPERATIONS.md), [contrato](../docs/virtude/CONTRACT.md).
- `../squads/virtude/`: agentes, pipeline e registro das execuções reais no Orca.

Planos têm permissões no servidor. O Premium de R$29,90 é uma proposta de teste; não há checkout ou cobrança. WhatsApp, grupos e React Native ficam para versões futuras. Vida espiritual já está no catálogo, pendente de revisão. O lembrete por e-mail tem opt-in e um disparo ainda simulado.

## Antes de produção

Credenciais reais, revisão teológica e jurídica, controlador/contato, envio de e-mail, teste de Auth no Neon alvo, backup/restauração, Hyperdrive, ingress confiável, rotação, limites/custos da OpenAI e proteção de branch são gates de release. O código implementado não equivale a aprovação de lançamento.
