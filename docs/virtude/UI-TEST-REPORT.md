# QA funcional independente da interface VIRTUDE

**Resultado em 2026-10-27: 74/74 testes passaram em 27,0 s**, após as correções do frontend e os ajustes dos seletores para a UI final. São **68 casos de UI com APIs mockadas/demonstração local e 6 casos de HTTP real contra o servidor local**. Os dois jobs de captura também passaram e geraram as 12 imagens solicitadas; o job mobile foi reexecutado apenas para exportar em pixels CSS. Há uma observação baixa da demonstração, UI-05, descrita abaixo.

Lint dos dois arquivos de testes e `npx tsc --noEmit --pretty false` passaram na versão final. Este worker não alterou UI, backend, dependências, configuração, testes de outros agentes nem publicou/comitou código.

## O que a evidência comprova

`e2e/fixtures.ts` cria `AppState` tipado com `getMission`, perfil e relatos sintéticos. `page.route` / `route.fulfill` interceptam as APIs do fluxo autenticado, registram métodos/payloads e devolvem estado determinístico; chamada sem handler recebe 501. Não há cookie de usuário real nem conexão autenticada ao Supabase.

Uma resposta mockada comprova o wiring da UI, a apresentação de estado e a intenção enviada. **Não comprova persistência remota, RLS/CRUD de usuários reais, exclusão real, entrega de e-mail, login Supabase ou chamada OpenAI.** `/demo` foi exercitada com bloqueio de qualquer `/api/**`: navegação, check-in, autorização local de IA, ensaio sintético e confirmação de atividade completaram sem requests privados.

| Área | Verificações observáveis aprovadas nos dois viewports |
| --- | --- |
| Landing | Âncoras Jornadas/Planos, CTA de amostra, link de acesso, abertura de todas as respostas FAQ, overflow |
| Acesso | Login mockado até o app, payloads de login/cadastro/recuperação, mostrar/ocultar senha, apresentação de erro e retorno ao estado utilizável |
| Sessão | Loading, erro recuperável/retry, 401 redirecionando ao acesso, missão bloqueada por revisão sem botão de registro |
| Onboarding | Três etapas; jornada futura desabilitada; quatro consentimentos inicialmente desmarcados; envio só após opt-in sensível; IA/histórico/contexto permanecem false |
| Jornada | `completed`, `attempted`, `skipped`; reflexão e aprendizado; check-in sem avanço automático; adaptação sem mudar dia; progressão explícita; troca/recomeço com confirmação; pausa sem request; erro de quota sem falso sucesso; controles ocupados desabilitados |
| Mentor | IA off bloqueia envio; conversa salva via GET com ID; rehearsal identificado como simulação; payload de modo; contexto transitório sem histórico; mensagem preservada após erro; atividade enviada com `confirmed:true` somente após confirmação |
| Consentimentos | Opt-ins independentes; revogar histórico; desligar IA preserva histórico autorizado e permite leitura via GET sem compositor/POST |
| Configurações | Salvar perfil/horário; exportar arquivo JSON sintético baixado; cancelar exclusão sem request; EXCLUIR+senha enviados; erro dentro do modal; saída após exclusão mockada |
| Objetivo | PATCH `/api/goal` com objetivo+dificuldade; caso começa no dia 3 e permanece no dia 3; nenhuma ação `/api/journey` é enviada |
| Evolução | Três status, dias em branco, reflexão sintética e calendário; dados vêm da resposta de `/api/evolution` |
| Layout | Sem overflow nas telas representativas; nome sem espaços de 80 caracteres e objetivo sem espaços de 600 caracteres cabem no viewport; texto do título também verificado contra clipping |

Chromium, projetos `desktop` (Desktop Chrome) e `mobile` (Pixel 7), configuração existente do Playwright, servidor 3211 e dist `.next-e2e`. Não houve servidor extra 3210 criado por este worker.

## Acessibilidade

**20 scans axe passaram, sem violações nas tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`.** Telas: `/`, `/entrar`, `/cadastro`, `/onboarding`, `/app`, `/app/jornada`, `/app/mentor`, `/app/evolucao`, `/app/configuracoes`, `/demo`, em desktop e mobile. Cada scan exige HTTP 200 e o heading esperado; uma tela de erro não pode contar como aprovação. A revisão bloqueada e o erro no diálogo também têm testes funcionais próprios.

Isso é uma amostra automatizada, não certificação WCAG nem auditoria humana completa com leitor de tela, teclado e todos os estados. Não houve achado axe atual que exigisse screenshot de violação.

## HTTP real local, sem mock

O arquivo existente `e2e/api.spec.ts` não foi editado. Seus **6/6 casos passaram** na rodada final: endpoints privados sem sessão respondem 401/no-store; mutações cruzadas e sem Origin são recusadas; tentativa de alterar plano é inválida; CSP com nonce, X-Frame-Options e X-Content-Type-Options são entregues pelo Next local. `/api/goal` também negou acesso sem sessão.

O ambiente do runner usa URL/chave Supabase sintéticas locais. Esses testes comprovam as recusas e os headers HTTP, não a integração remota autenticada. Testes SQL/RLS e adversariais de IA pertencem a outros agentes e não foram reexecutados por este worker.

## Achados e revalidação

| ID | Evidência original e impacto | Resultado final |
| --- | --- | --- |
| UI-01 — alto no fluxo de demonstração | `/demo` HTTP 500: página server chamava `parseDemoScreen` de módulo `use client` | Corrigido pelo frontend; navegação/interação isolada e axe da demonstração passam nos dois viewports |
| UI-02 — médio de UX/acessibilidade | DELETE 400 deixava mensagem de erro fora do modal, em região inert | Corrigido pelo frontend; erro agora encontrado no diálogo aberto; teste passa em desktop/mobile |
| UI-03 — médio de robustez | `disabled=false` do caller sobrescrevia pending do Button, permitindo ações durante request | Corrigido pelo frontend; POST suspenso mantém todos os controles com `aria-busy=true` desabilitados |
| UI-04 — médio de responsividade | Nome80/objetivo600 válidos produziam scrollWidth 8154 no desktop1280; também falhava no mobile | Corrigido pelo frontend; regressão passa nos dois viewports, inclusive inspeção dos retângulos do título |
| UI-05 — baixo, apenas amostra | `/demo?tela=evolucao` rotula a jornada em curso como “Arquivada · jornada em tela”; `snapshot(state)` usa archived também para o item atual | Reportado ao coordenador após inspeção dos screenshots; fluxo autenticado com estado active está correto; pendente de decisão/correção |

UI-01 a UI-04 foram consolidados e enviados ao coordenador/frontend antes das correções, sem alteração de implementação pelo QA. As evidências anteriores permanecem em `/tmp/virtude-ui-evidence/`, nos subdiretórios `experience-demo-navegação-local-nunca-chama-API-privada-*`, `experience-configurações-f-6e572--informa-sucesso-nem-navega-*`, `experience-jornada-control-eb6d2-s-impedem-mutação-duplicada-*` e `experience-layout-nome-e-o-05319-ão-criam-rolagem-horizontal-*`.

Falhas intermediárias dos testes por locators amplos/ambíguos foram corrigidas nos próprios testes: anunciador vazio do Next, botão oculto Sair da amostra no mobile, nova CTA aprovada e texto da alternativa repetido em formulações distintas. Não foram contabilizadas como bugs do produto.

## Screenshots para revisão visual independente

Diretório: `virtude/.impeccable/review/`. Os 12 arquivos foram abertos e inspecionados: conteúdo renderizado, sem tela vazia, overlay de erro ou indicador de desenvolvimento. Desktop 1280×900; mobile 390×844, exportado com `scale:"css"`. O Mentor é enquadrado na seleção de modo e na resposta sintética para mostrar a identificação de simulação.

| Tela | Desktop | Mobile |
| --- | --- | --- |
| Landing `/` | `landing-desktop.png` | `landing-mobile.png` |
| Demo Hoje `/demo` | `hoje-desktop.png` | `hoje-mobile.png` |
| Demo Jornada `?tela=jornada` | `jornada-desktop.png` | `jornada-mobile.png` |
| Demo Mentor `?tela=mentor` | `mentor-desktop.png` | `mentor-mobile.png` |
| Demo Evolução `?tela=evolucao` | `evolucao-desktop.png` | `evolucao-mobile.png` |
| Demo Ajustes `?tela=configuracoes` | `configuracoes-desktop.png` | `configuracoes-mobile.png` |

Os dados da captura existem apenas na memória de `/demo`. O opt-in de IA foi feito na própria amostra; não houve request privado nem modelo chamado. Houve um único lote visual; a reexportação mobile corrigiu somente a escala física dos PNGs, sem alteração da UI.

## Leitura adicional solicitada pelo coordenador

**IR-04:** `docs/virtude/landing-copy.md` usa agora “dias de jornada” na microcopy de progressão, funcionamento e FAQ; `virtude/README.md` descreve jornadas de 21 dias. Nos alvos solicitados, a redação evita afirmar que somente práticas realizadas contam. A UI exige registro antes do avanço e aceita os três status. O teste de `skipped` demonstra a intenção enviada e a apresentação mockada; não foi alegada revalidação do avanço no banco. O relatório de revisão independente anterior pertence a outro agente e não foi editado aqui.

**Novo RPC de objetivo:** leitura breve de `src/app/api/goal/route.ts` e `supabase/migrations/20261027192000_edit_personal_goal.sql`: schema estrito, limites de 1–600, sessão, consentimento sensível, seleção/lock da jornada ativa do titular, quota de cinco edições/hora, update por proprietário, gravação em personal_goals e grant apenas authenticated. O RPC não recebe user_id fornecido pelo cliente nem altera current_day. A leitura não substitui os testes SQL do responsável; a prova própria é a recusa HTTP sem sessão e o wiring mockado de PATCH preservando dia 3.

## Reproduzir e limites restantes

```sh
cd virtude
# Pare o preview 3210 antes do runner; não rode typegen/build/dev em paralelo.
npx playwright test --grep-invert 'evidência visual'
npx eslint e2e/fixtures.ts e2e/experience.spec.ts
npx tsc --noEmit --pretty false
# Captura é opt-in; não precisa repeti-la para rodar regressões.
VIRTUDE_CAPTURE_REVIEW=1 npx playwright test e2e/experience.spec.ts --grep 'evidência visual'
```

A rodada final funcional foi 74/74; os jobs de artefato são adicionais e não foram regenerados durante essa reexecução. `npx playwright test` normal deixa apenas esses dois jobs opcionais skipped.

Houve Fast Refresh contínuo durante execuções anteriores, inclusive após parar o preview. **Limpar somente o cache gerado `.next-e2e` resolveu antes da alteração posterior de escopo Tailwind do coordenador**; não atribuir causalidade à linha CSS. O coordenador também restringiu o scanner a src e desativou o badge N que cobria Hoje no mobile. Depois disso, a rodada final completou sem recargas anormais. Nenhuma dessas falhas intermediárias foi tratada como aprovação ou integração real.

Revisão visual especializada, revisão teológica/jurídica humana, conteúdo aprovado, deploy, browsers além de Chromium e integração remota autenticada permanecem fora desta evidência. O resultado não declara produção pronta.
