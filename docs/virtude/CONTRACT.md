# Contrato de implementação — VIRTUDE

Aplicação isolada `virtude/`. Não editar apps existentes, core OpenSquad ou lockfiles deles. Cada worker lê seu `.agent.md` inteiro, BRIEF.md e este arquivo. Coordenador cuida de bootstrap, integração, Mentor, verificações e relatório. Workers não fazem git commit nem publicam.

## Tipos compartilhados (coordenador cria `src/lib/types.ts`)

Focus = self_control | relationships | stewardship. Status = completed | attempted | skipped.
Mission = {id:string,focus:Focus,day:number,phase:string,title:string,reference:string,context:string,principle:string,practice:string,simplified:string,deepened:string,reflectionQuestion:string,reviewStatus:'pending_review'|'approved'}.
CheckIn = {id:string,assignmentId:string,day:number,status:Status,reflection:string|null,learned:string|null,createdAt:string}.
State = {profile:{displayName,preferredTime,locale},consents:{sensitiveData,ai,history,journeyContext},journey:{id,focus,currentDay,status:'active'|'completed',difficulty,goal}|null,today:(Mission & {assignmentId:string,variant:'standard'|'simplified'|'deepened'})|null,checkins:CheckIn[],activities:{id,title,description,createdAt}[],conversations:{id,title,createdAt}[],plan:{code:'free'|'premium',mentorDailyLimit:number},contentPendingReview:boolean}.

## API JSON (mesma origem)

Sucesso retorna objeto diretamente; erro `{error:string,code?:string}` com status adequado; `Cache-Control: no-store` para privados. Sem ambiente configurado: `503`, nunca usuário falso. `/demo` é amostra sintética somente UI e não contorna autorização.

- POST `/api/auth`: {action:login|signup|logout|forgot|reset,email?,password?}; retorna {message?,redirectTo?}. Signup exige consentimento sensível apenas no onboarding. Redirect seguro para app/onboarding; confirmação Supabase PKCE via `/auth/callback`; recuperação via `/redefinir`.
- GET `/api/state`: State autenticado (perfil inicial e journey:null antes onboarding).
- POST `/api/onboarding`: {displayName,focus,difficulty,goal,preferredTime,sensitiveDataConsent:true,aiConsent:boolean,historyConsent:boolean,journeyContextConsent:boolean}; inicia jornada e atribuição do dia 1 de forma atômica.
- POST `/api/checkins`: {assignmentId,status,reflection?:string,learned?:string}; grava/upsert por atribuição, não avança automaticamente. Retorna {ok:true}.
- POST `/api/journey`: {action:advance|adapt|restart|switch,focus?}; avançar só após check-in do dia, máximo uma progressão por data local; ausência não avança. Adapt troca variante simplificada, next usa último checkin para dificuldade. Retorna {ok:true}.
- PATCH `/api/settings`: {displayName?,preferredTime?,consents?:{sensitiveData?:boolean,ai?:boolean,history?:boolean,journeyContext?:boolean}}. Revogar sensível exige fluxo exclusão, histórico false apaga conversas imediatamente. Retorna {ok:true}.
- PATCH `/api/goal`: {goal:string,difficulty:string}; ajusta objetivo/dificuldade da jornada ativa, preserva progresso e versões anteriores de objetivo, limite5/h também no banco. Retorna {ok:true}.
- GET `/api/evolution`: {journeys:[{id,focus,currentDay,status,createdAt,completed,attempted,reflections,records:[{day,status,reflection,learned,createdAt}]}]}; inclui jornadas arquivadas autorizadas.
- GET `/api/export`: JSON arquivo com todos dados privados do usuário, autenticado + rate limit.
- DELETE `/api/account`: {confirmation:'EXCLUIR',password:string}; reautentica, revoga sessões, apaga dados e Auth, retorna {ok:true}.
- GET `/api/mentor?conversationId=uuid`: {messages:{role:'user'|'assistant',content:string}[]} autorizado e condicionado ao histórico.
- POST `/api/mentor`: {message:string,mode:'reflection'|'rehearsal',conversationId?:string,history?:{role:'user'|'assistant',content:string}[]}; retorna {reply:string,references:string[],questions:string[],suggestedActivity:{title:string,description:string}|null,conversationId:string|null,safety:string}. Histórico não persistido usa apenas últimas 8 mensagens, sem confiar em papel system.
- POST `/api/activities`: {title,description,confirmed:true}; atividade complementar privada, nunca altera missões automaticamente. Retorna {ok:true}.

## Backend exports para integração com Mentor

`src/lib/server/context.ts`: `requireContext()` => {supabase:SupabaseClient,user:{id:string},state:State}; lança ApiError(401/503).
`src/lib/server/http.ts`: `ApiError(status,message,code?)`, `handleRoute(fn:()=>Promise<Response>):Promise<Response>`, `json(data,status?)`, `readJson(request,schema)` valida origem e tamanho antes parse; `assertSameOrigin(request)`.
`src/lib/server/rate-limit.ts`: `consumeLimit(supabase,userId,operation,limit,windowSeconds)` => Promise<void>, backend RPC atômico.
Banco: profiles, consents (chaves sensitive_data, ai, history, journey_context), personal_goals, journeys, mission_assignments, check_ins, reflections, mentor_conversations, mentor_messages, activities, subscriptions, product_events; cada privado user_id. Globais journey_templates, biblical_contents, mission_templates, plans. Colunas de conversas: id,user_id,title,created_at; mensagens: id,user_id,conversation_id,role,content,created_at. Só servidor pode conceder premium. Todos UUID. AI rate limit 5 grátis/30 premium por dia, adicional 3/min. Anônimos auth por IP hash com RPC servidor restrito (sem criar uma chave pública bypass RLS).

## Propriedade dos arquivos

- Backend/AppSec: `virtude/src/lib/server/{context,http,rate-limit,supabase,journey-service}.ts`, `virtude/src/app/api/{auth,state,onboarding,checkins,journey,settings,export,account}/route.ts`, callback auth, `virtude/supabase/{config.toml,migrations,tests}`, testes próprios. Pode criar helpers extras em server, avisar coordenador.
- Frontend/UX: `virtude/src/app` páginas e CSS (exceto `api/`, callback auth), `src/components/`, `public/` e design.md. Importa tipos e catálogo, usa APIs acima. Não editar package.json; pedir dependência.
- Conteúdo/produto: `virtude/src/content/missions.ts`, testes de conteúdo, `docs/virtude/CONTENT-REVIEW.md`, landing-copy.md. Exporta `missions:Mission[]`, `focusLabels:Record<Focus,string>`, `getMission(focus,day)`; não editar backend/SQL/UI. Revisor independente fará copy/teologia apenas consultiva, aprovação humana continua pendente.
- Coordenador: demais arquivos, Mentor, bootstrap, dependências, integração/CI/relatórios. Não alterar arquivos em escrita por outro worker sem coordenação.
