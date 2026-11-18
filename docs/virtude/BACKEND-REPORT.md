# VIRTUDE — backend e persistência

Implementação de 27/10/2026. Sem publicação, commit, credenciais reais ou chamadas a um projeto Supabase remoto. As rotas retornam 503 quando falta configuração; não existe identidade ou integração simulada no backend.

## Entrega e integração

Implementados `src/lib/server/{supabase,http,context,rate-limit,journey-service,schemas,auth-abuse}.ts`, callback PKCE e APIs auth/state/onboarding/checkins/journey/settings/export/account. Mentor, activities, evolution, proxy, dependências, seed editorial e runner de banco são do coordenador. Os exports `requireContext`, `ApiError`, `handleRoute`, `json`, `readJson`, `assertSameOrigin` e `consumeLimit` mantêm o contrato.

A migration `20261027183421_virtude_initial.sql` cria globais, dados privados, índices, restrições, políticas e RPCs. Perfis, consentimentos inicialmente falsos e plano free nascem no trigger de Auth, sem usar metadados editáveis para autorização. FKs compostas impedem ligar mensagens ou atribuições a registros de outro proprietário. Subscriptions só admite leitura pelo usuário; escrita de plano não tem grant nem política para authenticated. Progressão e consentimentos só mudam por RPCs delimitadas.

Reflexão e aprendizado residem em `check_ins`, na mesma linha única da atribuição. Essa simplificação torna o upsert indivisível e evita divergência entre reflexão e check-in; a exportação inclui os campos originais e uma seção `reflections` derivada, sem perda de texto. Todos os dados privados de aplicação são exportados com paginação de 500 linhas, além da identidade básica de Auth; não se exportam senhas, tokens ou segredos internos.

## Segurança e comportamento

`requireSession()` chama `auth.getUser()` e depois `session_is_valid()`. RLS repete a verificação em toda leitura e escrita privada: a sessão indicada pelo JWT precisa existir em `auth.sessions`, pertencer ao mesmo usuário e não estar expirada por `not_after`. A consulta privilegiada fica em `private.live_session()`, com `search_path=''`, execute revogado de PUBLIC/anon/authenticated e schema não exposto. O wrapper autenticado não aceita parâmetros nem permite consultar sessões alheias. A correlação por `session_id` segue a [documentação de sessões do Supabase](https://supabase.com/docs/guides/auth/sessions).

Origem exata vem de `NEXT_PUBLIC_APP_URL`, nunca do Host informado pelo cliente. Mutações JSON exigem origem, schema Zod estrito e limite real de 32 KiB no stream antes do parse. Respostas privadas têm no-store; exceções não devolvem detalhes internos. Cookies SSR usam HttpOnly, SameSite=Lax e Secure em produção. Não foram adicionados logs com relatos, IPs, credenciais ou tokens.

Onboarding, check-in e progressão são transacionais. Só existe uma jornada ativa, avanço requer check-in e ocorre no máximo uma vez por data de São Paulo, inclusive após restart/switch. Ausência não gera avanço. Dois completed consecutivos aprofundam a próxima prática; attempted/skipped simplificam. Adapt altera somente a variante da atribuição atual.

Histórico é independente do consentimento de IA: revogar IA impede novas gravações, mas permite consultar o histórico que continua consentido. Revogar history exclui conversas e mensagens na mesma transação. Triggers e `save_mentor_exchange` serializam gravações com o lock do consentimento, impedindo recriação por uma resposta em voo após revogação. Essa RPC grava o par usuário/assistente atomicamente, com título fixo e vínculo por proprietário. Revogar dados sensíveis exige exclusão de conta.

Exclusão exige confirmação e senha novamente. Um cliente sem persistência reautentica a mesma identidade; `delete_my_account()` também exige sessão real e AMR password de até 120 segundos. Na mesma transação, revoga todas as sessões, remove Auth e dados por cascata. Nenhuma service role é usada para consultas ou mutações normais de usuário, nem para exclusão.

Limites persistem em tabela private e são incrementados atomicamente. A RPC fixa operações/janelas e impõe o teto do plano, mesmo que o cliente envie um limite ou janela maior. Mentor: 5/free ou 30/premium por janela diária UTC e 3/min; leitura 60/min; activities 20/dia; export e exclusão 3/hora; onboarding 5/hora; demais mutações 30/min. Os limites usam janelas fixas, portanto há efeito de borda entre duas janelas.

Auth sem sessão usa HMAC do IP, sem armazenar IP bruto, e RPC concedida somente a service_role. Esse é o único uso excepcional da chave elevada no código deste worker. Login/recuperação/reset/callback têm 10 tentativas por operação em 15 minutos, signup 5. Produção exige `TRUST_AUTH_PROXY=true`, `x-real-ip` válido normalizado/sobrescrito por proxy confiável e bloqueio de acesso direto ao origin; sem confiança configurada retorna 503. Desenvolvimento sem proxy compartilha um bucket local. `AUTH_RATE_LIMIT_SECRET` precisa ter pelo menos 32 caracteres.

## Conteúdo e configuração

Produção obtém conteúdo de `mission_templates` aprovado no banco. O catálogo `getMission` só é fallback quando `NODE_ENV != production` e `ALLOW_UNREVIEWED_CONTENT=true`. O banco também bloqueia onboarding/progressão em conteúdo pendente, por padrão em qualquer ambiente. Não há aprovação automática: a migration inicial insere apenas 63 metadados pending, e o seed editorial é responsabilidade do coordenador.

Para desenvolvimento deliberado, além da flag do servidor, um operador local precisa executar no banco de desenvolvimento:

```sql
update private.deployment_config
set environment='development', allow_unreviewed=true
where singleton;
```

A tabela não é acessível pela API e a constraint proíbe allow_unreviewed em environment production. Não executar essa alteração em produção. Revisão humana teológica, jurídica e integração real continuam gates de release.

`supabase/config.toml` foi aceito pelo parser do CLI atual, usando `[local_smtp]`, confirmação de email, signup anônimo desabilitado e JWT de 15 minutos. URLs locais precisam ser substituídas pelos destinos exatos do ambiente real, incluindo callback de recuperação, antes de publicação. O fluxo SSR segue a [documentação oficial de cliente no servidor](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## Validação executada

- `npm run typecheck`: passou.
- `npm exec vitest run tests/backend.test.ts`: 15 testes passaram, cobrindo CSRF/origem, configuração ausente, tamanho real, schemas/consentimentos, erros limpos/no-store, getUser + sessão revogada, indisponibilidade do banco, quotas e gate produção/desenvolvimento.
- `npm test`: 37 testes passaram em 4 arquivos no checkpoint da integração; os demais testes são do coordenador/conteúdo.
- `npm run test:db`: migration e `supabase/tests/rls.sql` passaram em PostgreSQL/PGlite efêmero. Cobertura de bootstrap, isolamento A/B de todas as relações privadas, anon, CRUD proprietário, reatribuição proibida, FK composta, plano imutável, onboarding duplicado, check-in upsert, avanço sem check-in, teto diário e tentativa de bypass por restart/janelas arbitrárias, aprofundamento/simplificação, histórico e IA independentes, exclusão física de histórico, quotas de Auth restritas, sessão revogada/expirada/alheia/ausente/malformada e exclusão de Auth/sessões/dados em cascata. Fixtures são sintéticas e a transação termina em rollback.
- `npx --yes supabase@latest status --workdir virtude`: config aceita; execução da stack indisponível porque Docker e Podman não estão instalados. Não foi apresentado como sucesso de integração.

O primeiro disparo isolado de Vitest foi executado na raiz sem os aliases do app e falhou na resolução; a execução corrigida no diretório `virtude/` passou. O runner PGlite é do coordenador e seus mocks reproduzem apenas as colunas/funções Auth usadas pelos testes.

## Limites e operação pendente

Não se comprovou integração GoTrue/PostgREST/SMTP, reautenticação e recuperação em navegador, cookies em proxy HTTPS real ou compatibilidade de permissões com um projeto Supabase remoto. PGlite valida SQL/RLS reais, mas não substitui essa integração nem teste de carga e concorrência entre conexões; as RPCs usam locks de perfil/consentimento/jornada, sem alegar ensaio de concorrência distribuída.

Exportações paginadas não são um snapshot transacional de todas as tabelas: mudanças concorrentes podem aparecer durante a geração. Dados de aplicativo permanecem até exclusão da conta ou revogação de histórico; contadores expiram logicamente após até duas janelas e sua limpeza física é preguiçosa e limitada por chamada. Backups/restore, retenção contratual do provedor, expurgo em backups e resposta a incidentes não foram provisionados ou comprovados; o operador deve defini-los e verificar restauração sem reativar conta excluída. Nenhum backend garante eliminação de cópias que o próprio usuário já exportou.
