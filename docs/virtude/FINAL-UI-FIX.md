# VIRTUDE — ajuste funcional final da UI

Data: 2026-10-27. Escopo: correções finais solicitadas pelo coordenador, preservando componentes, navegação, estilos e contratos de API existentes.

## Correções entregues

- `virtude/src/components/onboarding-wizard.tsx`: etapa 1 começa com “Qual área da sua vida você mais deseja transformar à luz dos ensinamentos de Cristo?”, mantém os três focos disponíveis e vida espiritual desabilitada, e coleta nome/apelido. A validação dessa etapa exige somente foco e nome.
- A etapa 2 coleta a dificuldade pessoal com “Qual sua principal dificuldade nessa área?” em textarea de 600 caracteres, junto do objetivo “O que você gostaria de melhorar nas próximas semanas?”. O helper orienta resposta curta, sem nomes nem detalhes íntimos. Ambos os textos exigem de 1 a 600 caracteres após `trim()` e seguem como strings aparadas no mesmo payload de `/api/onboarding`.
- A etapa 3 mantém horário e consentimentos independentes. O aviso agora explica que desligar histórico apaga conversas; desligar IA impede novas respostas e novas gravações, preservando leitura do histórico ainda autorizado.
- `virtude/src/components/settings-panel.tsx`: dificuldade passou de radios de nível para textarea livre pré-preenchido, com limite de 600 caracteres e a mesma orientação de privacidade. Objetivo, validação, envio de strings aparadas a `/api/goal` e preservação de progresso foram mantidos.
- `virtude/src/components/demo-experience.tsx`: o snapshot da jornada atual preserva `active`/`completed`; somente o armazenamento de uma jornada deixada converte `active` em `archived`. Recomeços/trocas recebem IDs locais únicos, evitando colisões e perda de registros ao recomeçar repetidamente. Dificuldade e objetivo iniciais descrevem uma situação específica explicitamente fictícia. A demo permanece local e sem chamadas a APIs privadas.

## E2E preparados

Arquivo: `virtude/e2e/experience.spec.ts`.

- Onboarding: verifica a pergunta exata, avanço da primeira etapa sem objetivo, limites dos dois textareas, rejeição de textos em branco, consentimentos inicialmente desmarcados e payload completo exato com os textos aparados.
- Ajuste de objetivo: verifica dificuldade pessoal pré-preenchida e editável, um único PATCH com payload exato, mesmo dia e atribuição, registros anteriores preservados e ausência de ação em `/api/journey`.
- Nova regressão da Evolução da demo: exige “Em curso · jornada em tela · dia 1”, realiza dois recomeços com registros distintos e verifica uma jornada atual e duas arquivadas, preservando ambos os relatos e nenhuma chamada privada.
- Captura visual: `open` e `capture` aguardam o heading específico da tela; a captura aguarda fontes, executa `scrollTo(0, 0)` e aguarda dois `requestAnimationFrame` antes do screenshot. A rolagem especial do Mentor foi removida para preservar o enquadramento superior e da navegação lateral. Nenhum screenshot existente foi sobrescrito nesta tarefa; a recaptura manual de Evolução desktop informada pelo coordenador permanece válida.
- Os demais casos e suas asserções foram preservados.

## Validação executada

Em `virtude/`, ambos concluíram com exit code 0:

```sh
npm run lint
./node_modules/.bin/tsc --noEmit --incremental false
```

Nenhum servidor foi iniciado e nenhum E2E foi executado por este worker, conforme solicitado. Os 74 E2E anteriores e os testes de API/SQL informados no dispatch são evidência anterior do coordenador, não uma execução deste ajuste.

## Próximo passo do coordenador

Arquivos prontos para E2E sequencial no servidor de testes 3211, sem usar 3210. O comando abaixo executa primeiro os casos diretamente afetados, nos dois projetos já configurados:

```sh
cd virtude
npx playwright test e2e/experience.spec.ts --workers=1 --grep 'onboarding:|objetivo:|demo: evolução'
```

Após aprovação funcional, o coordenador pode executar o lote visual opt-in sequencialmente caso precise atualizar as prévias:

```sh
VIRTUDE_CAPTURE_REVIEW=1 npx playwright test e2e/experience.spec.ts --workers=1 --grep 'evidência visual:'
```

Sem alterações em API, SQL, tipos compartilhados, package, estilos ou outros produtos; sem commit, delegação ou publicação.
