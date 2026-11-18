# Revisão independente VIRTUDE — AppSec, QA e conteúdo

Data: 2026-10-27. Revisor: worker real OpenSquad despachado no Orca, sessão `bd801314-b492-4134-88e4-fc5752e13c6f`, task `task_9cea85473979`, dispatch `ctx_5f37b463d4df`. Não fui autor do backend, migrations, Mentor, currículo, landing ou interface. Nesta revisão escrevi somente este relatório e testes novos `virtude/tests/review-*.test.ts`; não editei implementação nem simulei aprovação teológica humana.

## Parecer e limites

No recorte inspecionado não reproduzi vazamento entre usuários, concessão de Premium pelo cliente, execução de ferramentas pela IA ou acesso privado com sessão removida. Reproduzi três achados médios, detalhados abaixo, e uma divergência baixa entre comportamento e copy. **Os três médios foram corrigidos pelos responsáveis e revalidados independentemente; IR-04 permanece como alinhamento editorial pendente.** Os achados foram consolidados e enviados ao coordenador antes de propor alterações; não escrevi suas correções.

O produto **não está aprovado para lançamento**: revisão teológica humana das 63 missões, integração real Auth/PostgREST/OpenAI, operação de privacidade, infraestrutura e QA da interface permanecem gates. O build desta revisão continha endpoints e callback, sem páginas do frontend em implementação. Não esperar UI para esta auditoria de backend não equivale a aprovar UI.

Os testes de banco usam PostgreSQL em PGlite com tabelas `auth.users`/`auth.sessions` sintéticas. Exclusão de uma linha de sessão e negação com claims inalterados foram executadas de verdade nesse banco local; **logout, recuperação e exclusão no GoTrue/Supabase remoto não foram executados**. Testes de IA usam provedor simulado: demonstram limites de código e contraexemplos do validador, não a taxa de resistência de um modelo real a prompt injection.

## Achados consolidados por severidade

### IR-01 — Média — escrita direta contorna quotas de armazenamento e integridade de histórico

**Evidência inicial:** migration `20261027183421_virtude_initial.sql`, linhas 190–191, concede `INSERT/UPDATE/DELETE` em `activities`, `mentor_conversations` e `mentor_messages` a `authenticated`. RLS exige proprietário/sessão/consentimentos, mas não quota. `save_mentor_exchange`, linhas 329–345, verifica sessão/consentimento e limites de tamanho, porém não consome quota. A proteção HTTP de `/api/activities` e `/api/mentor` não intercepta chamadas ao Data API/RPC do Supabase.

**Reprodução executada:** `review-database.test.ts`, teste `reproduces direct Data API storage writes after the activity and Mentor quota is exhausted`. Com A autenticado e consentimentos válidos, consumir as 20 permissões de atividades; a chamada seguinte devolve `false`. Ainda assim `INSERT ... SELECT ... FROM generate_series(1,21)` grava outras 21 atividades. Esgotar as cinco permissões diárias de Mentor também não impede `save_mentor_exchange(null, 'Over quota', 'Caller-authored assistant text')` de gravar uma conversa e duas mensagens. Não houve chamada à OpenAI.

**Impacto:** usuário legítimo pode aumentar armazenamento/carga sem as quotas anunciadas e gravar texto próprio com papel `assistant` no próprio histórico. Não demonstra acesso a B, bypass da quota de chamadas à OpenAI ou poderes administrativos. A confirmação `confirmed:true` é exigida pelo endpoint de atividades, mas o banco aceita inserções diretas sem esse campo; o modelo continua sem ferramenta e não grava automaticamente por causa disso.

**Correção proposta:** retirar escrita direta que contorna o serviço e usar capacidades/RPCs com quota atômica no caminho efetivo de escrita, preservando proprietário, consentimentos e FKs. Cobrir também recomeços/trocas de jornada, cujas RPCs públicas podem criar registros sem passar pelo limitador HTTP. Evitar cobrar duas vezes a mesma operação na transição. Definir explicitamente se mensagens `assistant` podem ser fornecidas pelo cliente; se o histórico pretende atestar autoria do Mentor, a capacidade de persistência precisa distingui-la de uma importação não confiável.

**Estado:** corrigido e revalidado quanto às quotas de gravação reproduzidas: ACL nega escrita direta; atividade 21, par de histórico 4/min, Free 6/dia, Premium 31/dia e restart 31/min falham. Quotas de armazenamento são independentes das de geração, com proprietário/plano/janela fixados no banco. A RPC de histórico ainda aceita texto `assistant` do próprio titular; esse histórico é entrada não confiável, sem atestado de autoria do modelo, sem ferramentas e sem acesso a terceiros. Não apresentar o histórico como prova de uma recomendação produzida pela OpenAI.

### IR-02 — Média — quota bloqueia o fallback local de emergência

**Evidência inicial:** `src/app/api/mentor/route.ts:34–45` consome quotas antes de chamar `urgentSupport`. A função reconhece literalmente `Quero me matar`, mas nunca é alcançada quando `consumeLimit` lança 429. O mesmo ordenamento faz consentimento de IA e indisponibilidade do limitador antecederem o texto local de proteção.

**Reprodução executada:** `review-mentor.test.ts`, teste `reproduces a recognized urgent message returning only quota error`: contexto autenticado autorizado, quota esgotada, mensagem `Quero me matar`. Resposta observada: HTTP 429, somente erro de limite, sem `192`, `188` ou orientação de segurança. Provedor não chamado.

**Impacto:** pessoa em crise identificável recebe uma barreira de produto no lugar da orientação já disponível sem IA. Não é alegação de que o app seja serviço de emergência ou de que regex cubra toda linguagem de risco.

**Correção proposta:** após limites de tamanho/origem e a autorização apropriada, dar acesso ao fallback local sem cobrança de quota de IA, chamada externa ou exigência de histórico; falha de persistência não deve suprimir a orientação. Disponibilizar ajuda estática também nos estados sem acesso ao Mentor. Manter proteção contra abuso do transporte sem tornar o texto de segurança dependente de crédito de IA.

**Estado:** corrigido pelo responsável e revalidado independentemente. O teste agora exige HTTP 200 com ajuda local e ausência de chamada ao limitador, biblioteca, provedor ou persistência. Continua restrito ao contexto autorizado e ao reconhecimento limitado de risco pela função local.

### IR-03 — Média — allowlist de referências não cobre citações na prosa

**Evidência inicial:** `src/lib/ai/mentor-core.ts:83–94` valida somente os itens de `references` contra a biblioteca. `reply`, `questions` e `suggestedActivity` continuam texto livre, sujeito a tamanho/markup/alguns ecos, sem validação de referências bíblicas embutidas.

**Reprodução executada:** `review-mentor.test.ts`, teste `reproduces inline invented citation bypassing the references allowlist`: `reply: 'João 99:99 ensina este princípio.'`, `references: []`, allowlist contendo somente `Tiago 1:19`. O validador aceita e devolve o objeto. A citação não existe e não pertence à biblioteca.

**Impacto:** a fronteira de saída não garante a restrição de referências anunciada; erro do modelo ou resposta induzida pode apresentar referência não autorizada no texto mesmo com array válido. O teste injeta uma resposta simulada, não prova que um ataque específico induziu o modelo remoto. O modelo segue sem ferramentas, e uma falha textual não lhe concede banco, segredos ou admin.

**Correção proposta:** validar citações em todos os campos apresentados ou separar de forma verificável o texto de reflexão e as referências renderizadas pelo servidor. Incluir variantes de nome/abreviação e intervalo nos testes; evitar afirmar que regex resolve validade teológica ou toda referência implícita. Continuar com biblioteca aprovada, rejeição de saída inválida e revisão humana.

**Estado:** corrigido para as variantes testadas e revalidado independentemente. Sete variantes em todos os campos livres passaram a ser rejeitadas, inclusive abreviação, caixa alta, espaço não separável e acento Unicode decomposto. O normalizador NFC foi acrescentado após uma segunda falha reproduzida pelo revisor. Não é garantia de detecção de toda alusão bíblica ou de validade doutrinária da prosa.

### IR-04 — Baixa — “dias de prática” inclui check-in “não realizou” no código

**Evidência:** landing diz “São 21 dias de prática” e “Seu caminho avança nos dias de prática”. `change_journey`, linhas 247–257, verifica existência de check-in, mas não rejeita `status='skipped'`. O novo teste `documents skipped check-in advancing a day despite the public days-of-practice wording` grava `skipped` e avança do dia 1 ao 2.

**Impacto:** ambiguidade de expectativa, não perda de isolamento ou avanço automático por ausência. O contrato técnico permite avançar após check-in e inclui `skipped`; por isso é necessária uma decisão de produto, não uma mudança unilateral do revisor.

**Recomendação após consolidação:** decidir se tentativa e registro de não realização contam como conclusão reflexiva do dia. Alinhar regra e texto de progressão à decisão, mantendo ausência sem avanço automático e sem punição. Não recomendo reescrever o currículo inteiro.

**Estado:** decisão de produto pendente.

## Segurança inspecionada e evidência positiva

| Área | Evidência e conclusão limitada |
|---|---|
| Autorização por endpoint | Endpoints privados usam `requireSession`/`requireContext`; `getUser` é seguido por RPC de sessão real. `user.is_anonymous` é negado. Testes executados cobrem ausência/revogação e falha fechada. Fluxos reais de login/cadastro/reset precisam de integração. |
| RLS A/B/anon | Suite SQL e teste independente executaram visibilidade de todas as 11 tabelas privadas. A vê registros de A; B não vê os de A; `anon` não tem SELECT/INSERT/UPDATE/DELETE. No recorte inicial, as três tabelas narrativas permitiam CRUD próprio e filtravam estrangeiros; após a correção, todas as privadas negam mutação direta ao authenticated. Atividade, histórico e progressão usam RPCs restritas, com proprietário derivado da sessão. |
| Integridade entre usuários | FKs compostas ligam mensagem/conversa, check-in/atribuição e atribuição/jornada/foco. A suite SQL rejeita associação a UUID de conversa estrangeira conhecido. Não identifiquei vínculo entre usuários aceito. |
| SECURITY DEFINER | Funções examinadas têm `search_path=''`, referências qualificadas e grants explícitos. Helpers de `private` não são executáveis por anon/authenticated. Capacidades de usuário usam `private.require_user` ou helpers sem parâmetros de identidade; o contador auth é restrito a `service_role`. IR-01 continua sendo uma limitação das capacidades graváveis. |
| Sessão revogada | SQL remove `auth.sessions`, mantém claims antigos e comprova negação de leitura em todas as privadas, INSERT e RPCs. Também testa sessão expirada, ausente, malformada e de outro usuário. Não é uma execução de `signOut` no GoTrue real. A documentação oficial confirma a relação entre `session_id` e `auth.sessions`. |
| Progresso | Onboarding atômico; uma jornada ativa; check-in sem avanço automático; avanço diário serializado pelo perfil; recomeçar não burla limite diário. Correção acrescentou 30 mutações/min também na RPC, bloqueando restart 31. `skipped` exige alinhamento editorial IR-04. |
| Atividade confirmada | Endpoint exige literal `confirmed:true`, rejeita proprietário adicional e usa RPC que deriva usuário autenticado, valida tamanho, bloqueia consentimento ausente e limita a 20 gravações/dia. Mentor devolve sugestão, sem ferramenta nem inserção de atividade. |
| Prompt injection e custos IA | Input limitado a 2.000 caracteres, histórico 8×1.800, biblioteca reduzida, uma mensagem `user` serializada, instruções fora dos dados não confiáveis. `tools:[]`, `store:false`, saída 1.100 tokens, timeout 25s, quota persistente 3/min e 5/30 por dia. Erros do provedor não expõem corpo/segredos. IR-02/03 foram corrigidos para os casos executados; não houve chamada de IA real nem prova de cobertura absoluta. |
| Privacidade/contexto | Perfil, e-mail, UUIDs, reflexões e outras conversas não entram no prompt. Objetivo/dificuldade entram somente com consentimento de contexto e são truncados. Histórico opcional; revogar histórico apaga conversas/mensagens da base ativa e a RPC serializa novas gravações com consentimento. Consentimento de IA separado; revogá-lo preserva histórico autorizado para leitura. |
| CSRF/JSON | Mutações validam origem exata configurada, rejeitam cross-site, Content-Type inadequado, content-encoding e excesso real de bytes mesmo com Content-Length falso. Schemas estritos rejeitam campos de privilégio. |
| Cookies/retorno | Cookies configurados HttpOnly/SameSite=Lax, Secure em produção. Callback PKCE permite apenas `/redefinir`, `/app` ou `/onboarding`, concatenados à origem configurada. Não há parâmetro de retorno externo aceito. Flags e cookie chunking no navegador real ainda precisam de integração. |
| Segredos/configuração | `server-only` nas bibliotecas sensíveis; chave de serviço confinada ao contador auth. Somente `.env.example` encontrado como arquivo env do produto, com valores privados vazios; `.env*` ignorado e exceção para o exemplo. Secretlint passou; nenhum segredo real identificado no recorte. Não foi feita varredura histórica Git ou prova de bundle com sentinel nesta revisão. |
| Admin/Premium | Nenhuma rota admin identificada; `subscriptions` só SELECT para authenticated, plano livre no bootstrap sem copiar metadata. Rate limit diário busca plano no banco e ignora aumentos de janela/limite do cliente. |
| Exportação | Código usa proprietário, no-store, rate limit, paginação de 500 com ordem estável e todas as tabelas de produto; reflexões derivadas dos check-ins e perfil Auth limitado. Não executei exportação remota nem snapshot consistente durante mutações concorrentes. |
| Exclusão | Reautenticação por cliente isolado; RPC exige AMR de senha de até 120 segundos, remove todas as sessões e usuário com cascata em transação. Suite SQL comprova remoção real das fixtures e cascatas. Privilégios nas tabelas Auth e claims AMR do projeto Supabase alvo são gate de integração. |
| CSP/cache/PWA | CSP com nonce, frame-ancestors none, object-src none e demais cabeçalhos configurados; respostas privadas no-store. Nenhum service worker do frontend havia sido entregue no recorte; não há aprovação de cache privado na PWA. |

Referência de sessão consultada em 27/10/2026: [Supabase — User sessions](https://supabase.com/docs/guides/auth/sessions). Também consultados o [changelog](https://supabase.com/changelog.md) e a [documentação de observabilidade](https://supabase.com/docs/guides/monitoring-and-debugging). Não foram usados dados de outro produto.

## Revisão independente de currículo e landing

Li integralmente `src/content/missions.ts` (63 missões, três jornadas), `landing-copy.md` e o ledger `CONTENT-REVIEW.md`, além do briefing e contrato. A skill de copywriting foi aplicada como diagnóstico de promessa, capacidade efetiva, mecanismo, função das seções e clareza; não se importaram métricas da skill para a landing. PT-BR/Brasil do briefing prevalece sobre a preferência genérica de inglês da memória criativa. Esta revisão foi executada pelo worker independente real; não houve delegação nem bancada fictícia.

**Promessa e argumento:** o slogan apresenta finalidade de aprendizado, acompanhado de ações concretas — escolher área, ler contexto, praticar, registrar e adaptar. Não identifiquei promessa de cura, riqueza, revelação, transformação garantida em 21 dias, eficácia comprovada ou métricas inventadas. Os números 21 e 63 descrevem estrutura editorial. O preço R$29,90 permanece planejado, sem periodicidade inventada nem checkout. O estado de prévia exige trocar chamadas de início por amostra, declarar pendência humana e usar dados fictícios. A implementação dessa regra na landing será revista com a UI.

**Mecanismo e clareza:** a progressão “referência → contexto → ação → check-in → adaptação” está explicada. No teste “agora você pode”, os benefícios correspondem a capacidades especificadas, não a resultados comprovados. O desconforto cotidiano leva a um gesto possível e à oferta, sem mudança arbitrária de assunto ou pressão espiritual. A ressalva concreta é IR-04 sobre o significado de dias de prática. Claims de exportação, exclusão e controle só podem ser apresentados como operantes depois da integração real; a nota editorial já registra essa condição.

**Contexto bíblico:** os textos distinguem sabedoria de garantia mecânica e identificam analogias modernas, por exemplo 1Coríntios 6:12/hábitos digitais, Lucas 14:28–33/custos cotidianos e 1Coríntios 4:1–5/administração pessoal. Referências de risco mais alto foram reconferidas no texto primário público: [Mateus 18](https://ebible.org/engwebp/MAT18.htm) trata a parábola do perdão, [Lucas 14](https://ebible.org/engwebp/LUK14.htm) situa torre/rei no custo do discipulado, [2Coríntios 9](https://ebible.org/engwebp/2CO09.htm) trata a contribuição e [Filipenses 4](https://ebible.org/engwebp/PHP04.htm) liga força em Cristo à experiência de fartura e necessidade. Minha leitura não encontrou, nesses recortes, a inversão do contexto que as notas procuram evitar. Não fiz comparação independente de cada uma das 63 referências com todas as traduções/tradições.

**Práticas e proteção:** não identifiquei missão ordenando procurar agressor, retirar denúncia, restaurar contato compulsoriamente, doar além de necessidades básicas, assumir dívida, privar comida/sono, ignorar tratamento, revelar senha ou exercer reparo perigoso. Relacionamentos separa perdão de convivência, usa baixo risco e consentimento. Mordomia declara analogias, respeita alimentação/conservação, pede ajuda em escassez e evita recomendação de investimento. Domínio próprio inclui descanso, emergência e retomada sem castigo. São salvaguardas textuais presentes; não certificam segurança pastoral em toda situação individual.

**Parecer editorial consultivo:** não recomendo reescrita geral. Consolidar IR-04 com produto e manter os limites já presentes. Todos os conteúdos seguem `pending_review`, sem nome/assinatura de revisor humano no ledger; minha revisão de clareza e risco **não aprova teologia nem autoriza promoção para `approved`**. As diferenças pastorais e doutrinárias identificadas no ledger continuam para revisão humana qualificada.

## Execuções locais desta revisão

| Comando | Resultado observado |
|---|---|
| `npm test` inicial | 6 arquivos, **68 testes passaram**. |
| `npm run test:db` | **Passou**, duas migrations aplicadas a PGlite e `supabase/tests/rls.sql` executado; evidência gerada em `virtude/test-results/database.json`. Não repetido sem mudança de migrations. |
| `npm test` após probes | 8 arquivos, **74 testes passaram**. Os testes de contraexemplo passarem significa que reproduziram as lacunas, não que elas estejam corrigidas. |
| `npm run lint` | **Passou**. |
| `npm run typecheck` | **Passou** depois de corrigir somente um erro no teste novo do revisor. |
| `npm run build` | **Passou** para o recorte de APIs/callback/proxy, sem frontend entregue. |
| `npm run security:secrets` | **Passou**. |
| `npm audit --audit-level=high` | **Passou, 0 vulnerabilidades reportadas** no lockfile consultado. |

Na primeira execução dos testes novos, usei `describe.sequential`, inexistente no Vitest instalado, e a coleta falhou. Troquei por `describe` (execução sequencial padrão), executei novamente os testes e typecheck e obtive os resultados acima. Nenhuma implementação foi alterada para fazer um teste passar. SAST e inspeção de bundle com marcador constam do CI do coordenador; não afirmo tê-los executado nesta revisão.

Novos arquivos de prova: `virtude/tests/review-database.test.ts` (cinco casos SQL independentes na versão final) e `virtude/tests/review-mentor.test.ts` (oito casos na versão final). Os seis contraexemplos/casos iniciais foram convertidos e ampliados para 13 regressões. Não reexecutei checks já aprovados sem mudança: novas execuções decorreram de testes novos, falhas reproduzidas ou correções externas, registradas abaixo.

## Gates externos e riscos restantes

1. **Conteúdo:** aprovação teológica/pastoral humana identificada para as 63 missões e variantes, com data/parecer e processo auditável de aprovação. Mantê-las bloqueadas até então.
2. **Integração Auth/DB:** projeto isolado real ou stack Docker com GoTrue/PostgREST; duas contas, anon, fluxo PKCE/callback/recovery, cookies, reutilização de JWT após logout global e exclusão, AMR recente, RLS CRUD e FKs pela API pública. PGlite não certifica esses componentes.
3. **Abuso e operação:** ingress que sobrescreve `x-real-ip` e impede origem direta; configuração de Auth/SMTP/redirects/captcha quando aplicável; quotas de armazenamento e orçamento/alertas OpenAI no provedor. Não foram provisionados.
4. **IA:** avaliação adversarial com modelo real e catálogo aprovado, incluindo ataque em histórico, citação em prosa, violência, autoagressão, manipulação religiosa e vazamento por paráfrase. `store:false` não equivale a ZDR; confirmar retenção/contratos com operador sem prometer apagamento de logs externos.
5. **Privacidade/jurídico:** identidade e contato do controlador, política/termos revisados, base/transferência internacional, plano para menores, retenção de inativos, descarte de contadores, exercício real de exportação/exclusão e teste de restauração com reaplicação de exclusões. A política atual é proposta, não infraestrutura contratada nem parecer jurídico.
6. **CI/release:** custom SAST, secretlint, SCA e demais jobs precisam rodar no commit final; required checks e branch protections precisam ser habilitados por administrador. O arquivo de workflow existente não prova proteção ativa.
7. **Interface:** rodada posterior de UI/QA visual, acessibilidade, contraste, mobile, confirmação de atividade, consentimentos separados, aviso de simulação, estados de erro/crise/limite, preview e ausência de cache privado. Sem aprovação visual nesta rodada.

## Identificação do recorte inicial

SHA-256, antes de correções dos responsáveis:

| Arquivo | SHA-256 |
|---|---|
| `src/content/missions.ts` | `7f3f565919099d53560350348843dd6cae0739e7e15c2bcd68c381c994b5aa8e` |
| migration inicial | `545bd641f3429ca41c6f839fbc83b20d98e1d44dcf46c4591de717db0e7a76cf` |
| migration conteúdo | `7d407bd6481e435dc491f2a4f3ff1dbcb6ddb706971037293349758d5181c8a8` |
| `src/lib/ai/mentor-core.ts` | `51f5537b7f23ecb597a6ca8ec99d04c6b0c698bbd5d1510207870d6dd98ba6ad` |
| `src/app/api/mentor/route.ts` | `63a6213ef8ba4344c4bc30ac4213820ac8b905eae15426451b02e2ce332d60e4` |
| `docs/virtude/landing-copy.md` | `ae88b040086620e32348741ff7d798b513bfe6ff2039f648e266decc3c0c56d7` |

## Revalidação das correções

Primeira revalidação independente da migration adicional `20261027190100_enforce_storage_quotas.sql` e das alterações do Mentor:

- Os 11 primeiros testes de regressão passaram: escrita direta negada nas tabelas narrativas, limite de 20 atividades, três pares de mensagens por minuto, cinco por dia para Free e 30 para Premium, fallback de emergência 200 sem quota/biblioteca/provedor/persistência e seis variantes de citações inválidas.
- O novo caso com acento Unicode decomposto `Joa\u0303o 99:99` inicialmente passou pelo filtro de citações. Teste adicional falhou corretamente e a evidência foi enviada ao responsável, que acrescentou normalização NFC. Após essa mudança, `npm test -- tests/review-mentor.test.ts` passou com **oito testes**; IR-02/03 encerrados no recorte testado.
- O caminho de recomeço, explicitamente incluído na recomendação IR-01, inicialmente ainda aceitava 31 chamadas diretas `change_journey('restart')` seguidas. Cada chamada criava jornada/atribuição/evento; o teste adicional falhou corretamente. O responsável acrescentou quota privada de 30 mutações/minuto à RPC, mantendo o limite diário de avanço e a quota HTTP separada. Após isso, a regressão bloqueou o restart 31 e IR-01 foi encerrado para os caminhos reproduzidos.
- `npm run test:db` passou novamente com as **três** migrations, justificativa para nova execução após mudança de schema. `npm run typecheck` nesta etapa falhou em `.next/dev/types/validator.ts:15` (`Route` não satisfaz `never`); o primeiro typecheck/build havia passado sem frontend. Esse erro envolve artefato gerado no checkout compartilhado em implementação e exige verificação de integração pelo coordenador; não alterei UI ou arquivos gerados.

**Execução final após essas mudanças:** `npm test` passou com **103 testes em oito arquivos**, incluindo as 13 regressões independentes; `npm run test:db` passou com as três migrations atualizadas. O SQL foi repetido após mudança real na função de jornada, não como repetição sem causa. Os testes próprios passaram no ESLint.

O erro transitório dos tipos gerados foi comunicado. Como verificação adicional sem tocar arquivos gerados, um programa TypeScript com as opções do `tsconfig.json` e exclusão apenas dos roots `.next`/`.next-e2e` validou **56 arquivos de fonte/teste**, sem erro. O responsável depois regenerou tipos Next: **`npm run typecheck` completo passou na reexecução independente**. Também acrescentou tradução `P0429 → HTTP 429/RATE_LIMITED` em `databaseError`; a execução dirigida `npm test -- tests/backend.test.ts` passou com **16 testes**, incluindo essa tradução genérica e ausência de mensagem interna. Esses testes dirigidos posteriores evitam repetir toda a suite sem necessidade.

O relatório preserva os contraexemplos iniciais e registra a autoria separada das correções. IR-01/02/03 encerrados no recorte testado; os gates externos e a ressalva editorial IR-04 continuam explícitos.

SHA-256 do recorte corrigido revalidado: migration adicional `f6cdb4153395da3bde9e4c716e960f2be2748d244ed03b18c09dc2cc863a6571`; `mentor-core.ts` `7158e6f310b9df85dc88e6fb0b94400c364a713eb3256b88bee60c8fb2c16ffa`; rota Mentor `f70c24a0875ba6a34437f47976a45ea32daecdf31d5ecb42fc2085640b62c7ee`. Os hashes das duas migrations iniciais permaneceram iguais aos registrados acima.
