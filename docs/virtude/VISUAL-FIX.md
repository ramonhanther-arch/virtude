# VIRTUDE — lote de correções visuais

Data: 27/10/2026. Base: leitura integral de VISUAL-REVIEW.md (`disposition: fix`), `virtude/PRODUCT.md`, `virtude/DESIGN.md`, BRIEF.md, landing-copy.md e craft-floor. Escopo: correção da implementação editorial existente, sem redesign.

## Alterações e critérios

| Critério da revisão | Implementação | Confirmação visual restante |
| --- | --- | --- |
| Hoje: prática e ação antes do contexto | Cabeçalho mais breve; missão com título, dia/fase/variante, referência, prática integral e link original de registro; dificuldade, objetivo e horário movidos para baixo | Em 390×844, prática e ação antes da barra inferior; em 1280×900, ambas inteiras |
| Jornada: resumo e acesso ao registro primeiro | Nome e estado preservados; título e prática antes do ensinamento, âncora `#registro` para o formulário; contexto, princípio e três formulações mantidos completos | Mesmo critério de prioridade no mobile e desktop |
| Avisos completos sem repetição | ReviewNote removido de TodaySummary/PracticePanel e mantido no AppChrome via chamadores existentes; amostra e revisão pendente em resumos expansíveis; aviso de bloqueio segue integral | Resumos legíveis e detalhes acessíveis por mouse/teclado; condição da prévia sempre identificada |
| Landing: slogan, mecanismo e CTA juntos | Navegação mobile mais compacta, hero com escala e espaços menores; slogan e subtítulo aprovados preservados; amostra continua no mesmo destino | Primeiro viewport em 390×844 e 1280×900 com mecanismo e “Ver uma amostra” |
| Remover eyebrows decorativos | Removidos rótulos acima dos títulos de Hoje, Jornada, Mentor, Evolução, Ajustes, onboarding, hero e amostra; condições futuras passam para depois dos títulos | Conferir o lote nas capturas; autores, dia, fase e estados seguem como metadados |
| Direção formal honesta | Cinco blocos e card do mundo em `.impeccable/direction.md`; DESIGN.md atualizado | Ausência de concept seed anterior e de comp gerado aprovado declarada explicitamente |

## Arquivos alterados

- `virtude/src/components/practice.tsx`
- `virtude/src/components/landing.tsx`
- `virtude/src/components/site.tsx`
- `virtude/src/components/app-chrome.tsx`
- `virtude/src/components/demo-experience.tsx`
- `virtude/src/components/mentor-panel.tsx`
- `virtude/src/components/evolution-panel.tsx`
- `virtude/src/components/settings-panel.tsx`
- `virtude/src/components/onboarding-wizard.tsx`
- `virtude/.impeccable/direction.md`
- `virtude/DESIGN.md`
- `docs/virtude/VISUAL-FIX.md`

`globals.css` não precisou mudar. Fontes, cores e navegação lateral/inferior preservadas. Não houve alteração de API, SQL, catálogo das 63 missões, rotas, campos de dados, types, dependências ou testes E2E. O formulário mantém nomes, labels, valores e handlers; o link de Hoje mantém seu destino. Consentimentos, histórico com IA desligada, estados de jornada e arquivo, textarea de dificuldade, botões pendentes e modal não tiveram sua lógica alterada.

## Verificações executadas

- `npm run lint` em `virtude/`: **passou**, saída 0.
- `./node_modules/.bin/tsc --noEmit --incremental false`: **passou**, saída 0; TypeScript direto, sem typegen.
- Detector Impeccable nos nove componentes alterados: **passou**, saída 0 e resultado `[]`. Isso não constitui aprovação visual.
- Conferência estática de hierarquia, textos e atributos do formulário; a captura anterior de Hoje mobile foi consultada como evidência do problema.

Não foram iniciados servidores, build, typegen, suíte unitária, suíte E2E ou novas capturas nesta execução, conforme divisão do trabalho. Os 76 E2E e 104 testes unitários anteriores são contexto fornecido pelo coordenador; não foram certificados de novo por este worker.

**Fonte estável:** lote concluído e verificações estáticas aprovadas. Próximo responsável: Root/coordenador para execução sequencial dos E2E, capturas nos dois viewports e novo veredito independente. O cumprimento geométrico do primeiro viewport continua sujeito a essa recaptura; este relatório não inventa aprovação visual.
