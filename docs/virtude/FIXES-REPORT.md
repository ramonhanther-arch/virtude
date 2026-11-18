# VIRTUDE — correções AppSec

Data: 2026-10-27. Worker `ctx_840d538cfea7`, tarefa `task_cc9fcc81a1ce`. Revisão independente: `ctx_5f37b463d4df`.

As três falhas médias foram corrigidas no recorte local: escrita que contornava quotas pelo Data API, urgência bloqueada pela quota de IA e citações bíblicas fora da biblioteca na prosa. A validação também encontrou e fechou o contorno de quota por recomeços diretos via `change_journey` e a evasão de citações em Unicode NFD. Nenhum commit, publicação ou chamada a provedor de IA foi feito nesta rodada.

## Banco e API de gravação

Nova migration aditiva: `virtude/supabase/migrations/20261027190100_enforce_storage_quotas.sql`, posterior a `20261027190000`; migrations anteriores preservadas.

- `authenticated`, `anon` e `PUBLIC` não têm INSERT/UPDATE/DELETE sobre `activities`, `mentor_conversations` ou `mentor_messages`. SELECT continua sujeito a RLS, proprietário, consentimento e sessão vigente. Edição/exclusão direta dessas linhas deixa de ser uma API pública; revogação de histórico e exclusão da conta mantêm suas RPCs existentes.
- `create_activity(p_title,p_description)` deriva o proprietário de `auth.uid()`, verifica sessão viva e consentimento sensível, normaliza whitespace como `String.trim()` e valida os limites equivalentes ao Zod (1–100/1–500 unidades UTF-16). Insere com quota persistente de 20 atividades por janela de 86400 segundos. O endpoint continua exigindo `confirmed:true`, origem e JSON estrito, e chama somente essa RPC; não cobra a quota uma segunda vez.
- `save_mentor_exchange` deriva usuário, relógio e plano no banco, bloqueia consentimentos durante a transação, valida conteúdo/vínculo de conversa e grava um par atomicamente. Quotas de **armazenamento independentes**: `mentor_storage_daily` permite 5 pares grátis ou 30 Premium por 86400 segundos; `mentor_storage_minute` permite 3 pares por 60 segundos. Elas não debitam `mentor_daily`/`mentor_minute`, as quotas de geração já cobradas pelo endpoint.
- Esgotar geração não significa esgotar armazenamento: chamadas diretas podem usar o saldo de armazenamento remanescente, mas o 4º par no minuto e o 6º/31º par no dia são negados. Um par salvo pela aplicação ocupa uma unidade de cada quota de armazenamento, sem duplicar débito de geração.
- `change_journey` também limita todas as mutações com `journey_storage_minute` (30/60 segundos), separado do contador HTTP `journey`. Isso fecha recomeços/trocas diretos que criavam jornadas, atribuições e eventos sem limite. Regras de avanço diário, check-in e revisão de conteúdo permanecem no corpo da RPC.
- Janelas fixas são calculadas no PostgreSQL por `floor(epoch(now())/janela)`, alinhadas à semântica já existente; não são janelas móveis nem calendário de São Paulo. O cliente não fornece dono, plano ou janela às RPCs de armazenamento, não acessa `private.rate_limits` e não consegue consumir/resetar as operações privadas pelo RPC público de rate limit. A assinatura antiga de rate limit continua impondo janelas reais do servidor, mesmo quando o cliente envia parâmetros arbitrários.
- Falha de quota usa SQLSTATE `P0429`, traduzido para HTTP 429/RATE_LIMITED nas APIs específicas e no helper genérico `databaseError`. Falhas revertem gravação e débito na mesma transação; não deixam conversa/par/jornada parcial. Helpers privados não são executáveis por roles públicas. Não foi adicionado cliente privilegiado de aplicação nem RPC de escrita com usuário arbitrário.

## Urgência

Após validar origem/payload, sessão e consentimentos sensível/IA, o endpoint reconhece `urgentSupport` e retorna resposta local no formato normal, com `conversationId:null`. Não consulta/cobra quota de IA, não lê histórico da conversa, não carrega biblioteca, não chama provedor e não persiste automaticamente, mesmo com histórico ativo ou `conversationId` fornecido. Mensagens normais continuam cobrando as quotas de geração e respeitando autorização de conversa.

## Citações

`validateMentorOutput` procura citações também em `reply`, cada pergunta e título/descrição da sugestão. Reconhece livros numerados, nomes portugueses/ingleses e abreviações comuns, mesmo sem espaço entre livro e capítulo; examina capítulos, versículos, intervalos e listas. Cada ocorrência deve corresponder exatamente a uma referência autorizada da biblioteca (com equivalência canônica NFC para prosa). `references:[]` não desativa essa validação. Rejeita exemplos como `Mateus99:99`, `João 99:99`, `Jo 99:99`, caixa alta, NBSP, NFD, `2 Coríntios 99:99` e extensão de passagem autorizada para versículos não autorizados; aceita passagens exatas autorizadas.

JSON estrito, limites, bloqueios de HTML/material interno e identificação de ensaio permanecem. O objeto é validado novamente depois de prefixar “Simulação”, garantindo o limite de tamanho também nesse caminho. A detecção de citações textuais não constitui um analisador universal de toda notação informal, transliteração, obfuscação ou paráfrase; revisão humana e biblioteca revisada continuam necessárias.

## Evidências

Executados em `virtude/`:

| Verificação | Resultado |
| --- | --- |
| `npm run test:db` | Passou; aplica as três migrations em PostgreSQL/PGlite e executa `supabase/tests/rls.sql` |
| `npm test` | 104 testes passaram em 8 arquivos, incluindo regressões independentes `review-database` e `review-mentor` |
| `npm run typecheck` | Passou após regenerar os tipos Next antigos do workspace |
| ESLint dos arquivos backend/API/Mentor alterados e testes próprios | Passou |

A evidência estruturada do banco está em `virtude/test-results/database.json`. O SQL próprio cobre atividade 21, UTF-16/trim/validação, quotas free de pares/minuto/dia, rollback do par, negação de acesso aos contadores, isolamento A/B/anon, revogação e recomeço 31; o revisor acrescentou e executou os probes de Premium 31, Unicode NFD e os demais casos adversariais. Os arquivos `review-*` pertencem ao revisor e não foram editados por este worker. Ver também `INDEPENDENT-REVIEW.md`.

Houve um erro transitório em `.next/dev/types/validator.ts` por tipos de rotas antigos (`LayoutRoutes=never`) presentes em diretórios gerados do build/E2E, enquanto o dev já possuía layout. `next typegen` regenerou as definições de `.next` e `.next-e2e`; a geração padrão foi executada por último para manter `next-env.d.ts` apontando para `.next`. Não houve alteração de UI, conteúdo, package ou tsconfig pelo worker.

## Limites e gates

PGlite executa PostgreSQL real, mas `auth.users`, `auth.sessions` e JWTs são fixtures locais. Não houve Supabase remoto, GoTrue, PostgREST real, teste de concorrência entre múltiplas conexões nem advisors remotos; isso permanece gate de integração, sem alegar evidência externa. A atomicidade usa transação, contador com UPSERT e locks já existentes; testes sequenciais demonstram os limites e a ausência de escrita parcial.

`save_mentor_exchange` permite ao próprio titular enviar texto com role assistant dentro de sua quota: histórico é dado não confiável do titular, não um atestado de autoria do modelo. O contexto do Mentor já o transporta como `untrustedHistory`; a correção garante autorização/limites, sem prometer proveniência de conteúdo. A resposta urgente só cobre mensagens reconhecidas pelo detector existente e não promete reconhecer toda situação de risco. Conteúdo pendente, revisão teológica/jurídica, provedores reais e release continuam sujeitos aos gates existentes.

Documentação consultada: [Supabase database functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), índice de changelog atual e documentação local instalada de Next Route Handlers/CLI (`next typegen`).
