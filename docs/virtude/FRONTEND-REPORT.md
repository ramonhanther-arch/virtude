# Relatório da interface Virtude

Data: 2026-10-27. Implementação em `virtude/src/app`, `virtude/src/components`, `virtude/public` e `virtude/DESIGN.md`. Não houve commit nem publicação. `package.json`, tipos, APIs, catálogo, proxy e `next.config.ts` não foram editados.

## Retomada final de correções consolidadas

A implementação existente foi preservada. Esta retomada foi executada por Codex após encerramento do provider Grok, conforme orientação do coordenador; não se atribui a Grok esta verificação final.

- Corrigida a causa do overflow com nome de 80 caracteres e objetivo de 600 caracteres sem espaços: `overflow-wrap: anywhere` herdado pelo texto e `min-w-0` nos contêineres da navegação e prática. Não se corta ou abrevia o conteúdo do usuário para fazê-lo caber.
- Ajustes só avisa que conversas serão apagadas quando o histórico for revogado. Desligar apenas IA mantém a autorização de histórico.
- Na demonstração, desligar somente IA preserva conversas e mensagens na memória React; revogar histórico limpa ambas.
- Mentor lista e abre conversas quando dados sensíveis e histórico estão autorizados, inclusive com IA desligada. Nesse estado não há campo de mensagem, botões de sugestão, novo ensaio nem envio; falhas de leitura aparecem no próprio painel. O handler também impede envio sem os consentimentos necessários.
- Confirmados no código os reparos anteriores: `parseDemoScreen` em módulo sem `use client`, erro de exclusão dentro do diálogo e botão pendente que permanece desabilitado. O formulário `/api/goal` foi preservado.

Verificações de fonte desta retomada: `npx eslint src/app src/components --max-warnings 0` e `npx tsc --noEmit --pretty false`, ambos com saída 0. Não foi executado typegen nem iniciado outro servidor, para preservar a rodada de QA na porta 3211. O worker independente de QA foi avisado de que a fonte está estável; os resultados atuais de E2E, axe e screenshots pertencem a `UI-TEST-REPORT.md`, e o build final ao coordenador. Não se afirma que os reparos finais já passaram E2E com base apenas na checagem de tipos.

## O que a interface faz

A landing segue `docs/virtude/landing-copy.md`. Enquanto alguma missão do catálogo não está `approved`, a página fica no estado de prévia: uma faixa, os botões de início viram "Ver uma amostra" e o Premium aparece como indisponível, a R$ 29,90 planejados, sem checkout.

Rotas presentes: `/`, `/entrar`, `/cadastro`, `/recuperar`, `/redefinir`, `/onboarding`, `/app`, `/app/jornada`, `/app/mentor`, `/app/evolucao`, `/app/configuracoes`, `/privacidade`, `/termos`, `/demo`. A demonstração aceita `?tela=jornada|mentor|evolucao|configuracoes`, guarda o estado só na memória do React e não chama API privada.

A conta real lê `GET /api/state`. `401` manda para `/entrar`. Sem jornada, manda para `/onboarding`. `503` com `CONFIGURATION_REQUIRED` mostra "O Virtude está em preparação" e o link da amostra. Nenhuma sessão é inventada. O layout exporta `dynamic = "force-dynamic"` e lê os headers para o nonce da CSP.

Ajustes gravam perfil em `PATCH /api/settings` e objetivo da jornada ativa em `PATCH /api/goal`. A evolução lê `GET /api/evolution` e conta os registros recebidos, sem usar o agregado `attempted` como "tentou" e sem linguagem de sequência. O erro de exclusão aparece dentro do diálogo.

## Ajustes pedidos depois do primeiro lote

- Copy pública sem frases de bastidor. Uma faixa de prévia.
- Nomes das jornadas importados do catálogo.
- Botão ocupado permanece desabilitado. O contorno dos campos passou para `#66766B`.
- `parseDemoScreen` saiu do módulo de cliente. `/demo` responde 200.
- Objetivo e dificuldade editáveis na jornada ativa, também na amostra.
- Dificuldade e objetivo aparecem na prática como texto da pessoa. As três formulações do catálogo ficam legíveis.
- Alerta de confirmação da exclusão fica no diálogo.

## Evidências registradas antes da retomada final

- `cd virtude && npm run typecheck` saiu 0. O typegen passou a listar todas as rotas acima e `/api/goal`.
- `cd virtude && npx eslint src/app src/components --max-warnings 0` saiu 0, depois de tirar `setState` síncrono de efeito em sessão, prática e ajustes.
- O servidor que já estava em `127.0.0.1:3210` ainda não enxergava `/entrar`, `/recuperar`, `/redefinir`, `/app` e `/app/evolucao` e devolvia o 404 da aplicação. Foi reiniciado. Depois disso, as 16 URLs acima responderam 200 com o título esperado.
- No HTML e no Playwright, a CSP traz `nonce` por request e os scripts da página carregam. Não houve erro de hidratação.
- Landing em 1280 e 320 sem overflow horizontal. Demonstração em 320 sem overflow; a barra inferior cabe em 320px. Em 1280 a navegação lateral mede 216px e a barra inferior fica oculta.
- Na amostra, no mesmo carregamento: registro "Realizei", avanço para o dia 2, objetivo salvo, ensaio identificado como simulação, exclusão com a palavra errada mostra "Digite EXCLUIR em maiúsculas." dentro do diálogo. `browser_network_requests` filtrado em `/api/` ficou vazio.
- `GET /api/state` sem sessão respondeu `503` `CONFIGURATION_REQUIRED`. `/entrar` e `/app` mostraram o painel de preparação, sem formulário de senha e sem jornada fictícia. O console registra esse 503 duas vezes, compatível com a montagem em desenvolvimento. Não foi possível exercitar login, senha ou evolução de uma conta real neste ambiente.
- A suíte `e2e/experience.spec.ts` não foi executada de novo nesta rodada. O relatório de QA anterior descreve falhas que este lote corrige; a confirmação dessa suíte fica com o worker de testes.

## Limites

O catálogo carregado continua com `reviewStatus: pending_review`, então a prévia permanece. Premium não cobra. Pausar não chama API. Não há service worker. A retomada final não iniciou ou reiniciou processos de preview; a porta 3211 pertence ao worker independente de QA. Autenticação externa, persistência Supabase, exclusão real e respostas OpenAI exigem ambiente configurado e evidência de integração, e não são comprovadas pelos testes mockados de interface.
