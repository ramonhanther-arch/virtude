# VIRTUDE — documentação final do sistema visual

Data: 27/10/2026. Trabalho documental após o lote de correções; produto congelado. Atualização do DESIGN.md existente em modo de extração do código, pela função `impeccable_documenter`, sem nova identidade ou entrevista de aprovação.

## Entrega

| Arquivo | Resultado |
| --- | --- |
| `virtude/DESIGN.md` | Decisões existentes preservadas e reorganizadas nas oito seções canônicas; frontmatter com cores, tipografia, espaço e variantes observadas. |
| `virtude/.impeccable/design.json` | Sidecar schemaVersion 2, com metadados vinculados aos tokens do frontmatter, breakpoints, movimento existente, dez snippets de componentes e narrativa sincronizada. |
| `docs/virtude/DESIGN-DOCUMENTATION.md` | Este resumo da extração, validação e limites. |

## Sistema observado

1. **Paleta:** pine `#173f36`, pine-deep `#102922`, sand `#f6f1e7`, paper `#fffdf8`, gold `#c6a86a`, ink `#202925`, line `#d9d0c0`, field `#66766b`, exatamente como em `globals.css`; sem novos acentos ou rampas sintetizadas.
2. **Tipo:** Cormorant Garamond/Georgia nos títulos e DM Sans/Segoe UI na leitura e controles; corpo herdado de 1.0625rem/1.6, títulos recorrentes de 1.5rem a 4.5rem, escala e entrelinhas resolvidas pelo tema Tailwind instalado. Fontes locais via `@fontsource`.
3. **Forma e espaço:** editorial plano, cantos retos, filetes de 1px, fundo sand e superfícies paper/pine; unidade de espaço de 0.25rem. Página pública até 72rem; conteúdo operacional até 48rem, com exceções documentadas para avisos e formulários estreitos.
4. **Responsividade e hierarquia:** sm 40rem, md 48rem, lg 64rem; lateral de 15.5rem em md e cinco destinos fixos no celular. Prática e registro antes do contexto em Hoje/Jornada; landing com proposta e amostra em grade de 7/5 colunas em lg.
5. **Estados e regras:** variantes primary, secondary, quiet, danger e inverse; foco de 2px/offset 3px, pine no claro e gold no pine; pendente “Aguarde” e desabilitado; controles nativos, erros textuais, resumos expansíveis e preferência de movimento reduzido. Regras nomeadas: Paleta do Briefing, Serifa e Orientação, Prática Primeiro.

O sidecar inclui os cinco botões, campo de texto, destino lateral ativo, painel de prática, resumo de revisão e radio de registro. HTML/CSS são exemplos isolados dos padrões reais, sem dependência de runtime React ou classes Tailwind; tokens CSS usam fallback literal para a amostra isolada. O SVG de navegação foi copiado da geometria House instalada no Lucide. O texto genérico do painel identifica o local da prática, sem criar missão ou conteúdo aprovado. Não foi inventada uma biblioteca de chips, estilo de erro vermelho, raio ou sombra de elevação.

## Evidência e validação

- Lidos PRODUCT.md, DESIGN.md anterior, `.impeccable/direction.md` e VISUAL-REVIEW/FIX/VERDICT; aplicada a definição integral de `impeccable_documenter.toml` e a referência `document.md`.
- Fonte dos tokens base e foco: `virtude/src/app/globals.css`. Famílias e pesos carregados: `src/app/layout.tsx`. Resolução de unidades, escalas e breakpoints: `node_modules/tailwindcss/theme.css` instalado, sem consulta a versão externa.
- Componentes amostrados: `ui.tsx`, `app-chrome.tsx`, `app-frame.tsx`, `site.tsx`, `landing.tsx`, `practice.tsx`; consultas dirigidas em onboarding, Mentor, Evolução, Ajustes e demonstração. Asset de marca: `public/icon.svg`.
- **Passou:** parse JSON do sidecar e parse YAML do frontmatter com Ruby/Psych local; oito cores comparadas automaticamente com as declarações CSS; onze papéis de tipografia com metadados correspondentes; referências entre tokens válidas; propriedades de componentes limitadas às oito admitidas pelo formato; oito seções na ordem canônica; dez snippets não vazios, prefixados com `ds-` e com foco visível; narrativa e regras correspondentes ao Markdown.
- **Passou:** valores de tamanho e entrelinha cotejados com o tema Tailwind; dimensões de contêiner, breakpoints e pulso de carregamento conferidos na fonte instalada. Utilidades de tamanho sobrescrevem a entrelinha base dos títulos; essa distinção está explícita no DESIGN.md.
- Nenhum CSS, JSX, rota, dado, teste, dependência ou PRODUCT.md foi editado por este worker. Não foram iniciados servidor, navegador, nova captura, detector, lint, testes ou build; o coordenador mantém a responsabilidade pelas verificações externas. Os snippets não receberam nova certificação visual nesta tarefa documental.

## Proveniência e alcance do aceite

O concept roll/seed **não foi executado antes do build**. Não há seed corroborável, comp gerado aprovado ou screenshot de referência aprovada pelo usuário. Essa ausência foi explicitamente admitida pela revisão e permanece registrada em DESIGN.md; o sidecar contém metadados do sistema observado, sem história de processo inventada.

O último `VISUAL-VERDICT.md` declara `disposition: ship` e quatro correções originais **resolved**: persistência honesta da direção/FORM, prioridade da prática e ação com avisos compactos, combinação de slogan/mecanismo/CTA no primeiro viewport e remoção dos eyebrows decorativos nas superfícies pontuadas. Isso é a conclusão do reviewer sobre as capturas existentes de 390×844 e 1280×900, sem nova inspeção deste documenter.

O aceite não aprova produção, integrações remotas, IA real, revisão humana/teológica nem conteúdo fora dos viewports. Não foram recertificados números de testes citados em relatórios anteriores.

## Drift preexistente não canonizado

- `SetupPanel` em `src/components/ui.tsx` e o cabeçalho de `src/components/auth-screen.tsx` ainda têm rótulos em caixa alta antes do título. Surgiram na leitura estática; estão fora das superfícies pontuadas no veredito. Não foram corrigidos nem transformados em estilo para novas telas, e esta observação não reabre o lote visual encerrado.
- `.impeccable/direction.md` e VISUAL-FIX preservam a linguagem histórica de critérios aguardando recaptura; VISUAL-VERDICT é o registro posterior que encerra as quatro correções. Os arquivos históricos permanecem intactos e o limite temporal está explícito aqui.
- O workspace já continha diretórios/artefatos não rastreados, incluindo `virtude/`, `docs/virtude/`, capturas e resultados de testes. Não houve limpeza, publicação ou commit nesta tarefa; apenas os três arquivos autorizados foram escritos.

Não há trabalho documental pendente neste escopo. Gates de produção e eventuais correções fora do ownership continuam com seus responsáveis.
