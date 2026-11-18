---
name: VIRTUDE
description: "Sistema editorial sereno da interface existente em português brasileiro."
colors:
  pine: "#173f36"
  pine-deep: "#102922"
  sand: "#f6f1e7"
  paper: "#fffdf8"
  gold: "#c6a86a"
  ink: "#202925"
  line: "#d9d0c0"
  field: "#66766b"
typography:
  display:
    fontFamily: '"Cormorant Garamond", Georgia, serif'
    fontSize: "3rem"
    fontWeight: 500
    lineHeight: 1
  display-md:
    fontFamily: '"Cormorant Garamond", Georgia, serif'
    fontSize: "3.75rem"
    fontWeight: 500
    lineHeight: 1
  display-lg:
    fontFamily: '"Cormorant Garamond", Georgia, serif'
    fontSize: "4.5rem"
    fontWeight: 500
    lineHeight: 1
  headline:
    fontFamily: '"Cormorant Garamond", Georgia, serif'
    fontSize: "2.25rem"
    fontWeight: 500
    lineHeight: "calc(2.5 / 2.25)"
  title:
    fontFamily: '"Cormorant Garamond", Georgia, serif'
    fontSize: "1.875rem"
    fontWeight: 500
    lineHeight: 1.2
  subtitle:
    fontFamily: '"Cormorant Garamond", Georgia, serif'
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: "calc(2 / 1.5)"
  body:
    fontFamily: '"DM Sans", "Segoe UI", sans-serif'
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  body-large:
    fontFamily: '"DM Sans", "Segoe UI", sans-serif'
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  control:
    fontFamily: '"DM Sans", "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"DM Sans", "Segoe UI", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "calc(1.25 / 0.875)"
  caption:
    fontFamily: '"DM Sans", "Segoe UI", sans-serif'
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "calc(1 / 0.75)"
spacing:
  "1": "0.25rem"
  "1.5": "0.375rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "7": "1.75rem"
  "8": "2rem"
  "10": "2.5rem"
  "16": "4rem"
  "20": "5rem"
  "24": "6rem"
  "28": "7rem"
components:
  button-primary:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.sand}"
    typography: "{typography.label}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.pine-deep}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.pine}"
    typography: "{typography.label}"
    padding: "0.5rem 1rem"
  button-secondary-hover:
    backgroundColor: "color-mix(in oklab, #173f36 5%, transparent)"
  button-quiet:
    textColor: "{colors.pine}"
    typography: "{typography.label}"
    padding: "0.5rem 0"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "0.5rem 1rem"
  button-danger-hover:
    backgroundColor: "color-mix(in oklab, #202925 5%, transparent)"
  button-inverse:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.pine}"
    typography: "{typography.label}"
    padding: "0.5rem 1rem"
  button-inverse-hover:
    backgroundColor: "{colors.paper}"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    padding: "0.75rem"
    width: "100%"
  navigation-desktop:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.sand}"
    width: "15.5rem"
  navigation-mobile:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.ink}"
  practice-panel:
    backgroundColor: "{colors.paper}"
    padding: "1rem"
  practice-panel-md:
    padding: "1.25rem"
  review-summary:
    backgroundColor: "{colors.paper}"
    padding: "0 0.75rem"
---

# Design System: VIRTUDE

## Overview

**Creative North Star: "Editorial sereno"**

Esta expressão registra a direção já construída e descrita em PRODUCT.md e `.impeccable/direction.md`: página bege, leitura em grafite, títulos em serifa e ações em verde. Painéis planos e filetes organizam a interface; não há ornamento religioso nem textura simulada. A documentação atualiza o DESIGN.md existente a partir do código, preservando a paleta e as famílias do briefing.

A forma observada combina grade editorial na landing com proposta e amostra lado a lado no desktop, fluxo vertical no celular e aplicação com coluna de leitura e navegação lateral ou inferior. Hoje e Jornada priorizam uma prática concreta e o acesso ao registro; objetivo, dificuldade e horário ficam depois. A condição de prévia continua explícita.

**Proveniência:** o concept roll/seed não foi executado antes do build; nenhum comp gerado foi aprovado e não há screenshot de referência aprovada pelo usuário. Este é um registro posterior da implementação, sem aprovação retroativa de identidade. O último `VISUAL-VERDICT.md` declara `ship` apenas para as quatro correções originais resolvidas; não aprova produção. Fontes: `src/app/globals.css`, `src/app/layout.tsx`, componentes citados abaixo, `.impeccable/direction.md` e os relatórios em `../docs/virtude/`.

**Key Characteristics:**

- Paleta do briefing preservada, com pine para títulos e ações e sand como campo.
- Cormorant Garamond para títulos; DM Sans para leitura e controles.
- Superfícies planas, bordas finas e cantos retos.
- Prática seguida de registro antes do contexto pessoal.
- Avisos verdadeiros, foco visível e textos pessoais completos.

## Colors

Os valores normativos estão no frontmatter e reproduzem os oito tokens de `globals.css`; transparências são derivações usadas em estados, sem criar outra paleta.

### Primary

- **Pine:** títulos, ação principal, navegação lateral, painéis escuros e foco no claro.
- **Pine deep:** hover da ação principal.

### Secondary

- **Gold:** filetes de destaque, indicador da navegação ativa, borda de revisão e foco dentro de superfície pine. Não é cor de corpo pequeno sobre sand.

### Neutral

- **Sand:** fundo da página; texto em painéis pine e fundo da ação inversa.
- **Paper:** leitura, campos, avisos e painéis de prática.
- **Ink:** corpo, mensagens de erro e ação destrutiva contornada.
- **Line:** divisórias de seção, listas, navegação inferior e contêineres secundários.
- **Field:** contorno dos campos sobre paper.

**The Paleta do Briefing Rule.** Preserve os oito tokens observados; use gold para orientação e filetes, sem convertê-lo em texto pequeno sobre o fundo claro.

A seleção de texto usa pine sobre sand invertidos: fundo pine e texto sand. Avisos de erro usam ink, sem uma cor vermelha semântica implementada. O código usa pine com transparência no hover secundário, sand com transparência no item lateral ativo e ink com transparência na borda de alertas e no backdrop.

## Typography

**Display Font:** Cormorant Garamond, com Georgia e serif como fallback.

**Body Font:** DM Sans, com Segoe UI e sans-serif como fallback. Não há família mono distinta.

As fontes são importadas localmente por `@fontsource` em `src/app/layout.tsx`: DM Sans 400/500/600; Cormorant Garamond 500/600 e itálico 500. A página declara `pt-BR`. Os papéis do frontmatter registram usos recorrentes, não uma nova escala fluida.

### Hierarchy

- **Display:** hero em display no celular, display-md a partir de md e display-lg a partir de lg. Grandes seções públicas usam display/display-md; a chamada final usa display/display-lg a partir de md.
- **Headline:** títulos de página em Hoje/Jornada no celular e títulos de painéis no desktop. Os títulos de página passam para display em md.
- **Title:** títulos de missão no celular, subseções, formulários e diálogos secundários. A missão passa para headline em md.
- **Subtitle:** formulações do catálogo e números de dia.
- **Body:** leitura padrão herdada do body. O comprimento recorrente é até 62ch, com limites menores para introduções e metadados.
- **Body large:** propostas e práticas destacadas, frequentemente apenas em md.
- **Control:** texto de input e textarea; o controle fixa entrelinha de 1.5.
- **Label:** labels e botões em peso 500; metadados no mesmo tamanho geralmente ficam em 400 e podem usar entrelinha relaxada (1.625).
- **Caption:** calendário e autoria funcional; navegação mobile tem exceção explícita (0.68rem, entrelinha 1.25).

**The Serifa e Orientação Rule.** Títulos usam serifa; leitura, labels e ações usam sans. Metadados permanecem junto ao conteúdo e não viram etiquetas decorativas acima dos títulos.

**The Prática Primeiro Rule.** Em Hoje/Jornada, mantenha título e prática integral seguidos do acesso a “Registrar este dia”, antes de dificuldade, objetivo e horário. Na Jornada, contexto bíblico, princípio e três formulações continuam completos depois do resumo; a ação aponta para o formulário de registro.

O estilo base dos h1–h4 usa peso 500, entrelinha 1.05 e quebra balanceada. As utilidades de tamanho sobrescrevem a entrelinha com os valores do frontmatter; não aplicar 1.05 a todos os tamanhos documentados. Texto longo herda `overflow-wrap: anywhere`; relatos e contexto pessoal preservam quebras com `white-space: pre-wrap`, sem truncamento.

## Layout

A escala de espaço deriva da unidade Tailwind instalada (0.25rem); o frontmatter registra passos usados nos componentes amostrados. Não há uma grade global de cards: listas e seções usam filetes; painéis separam prática, contexto, escolha ou plano quando necessário.

| Área | Comportamento observado |
| --- | --- |
| Página pública | Máximo 72rem, margens automáticas e laterais de 1.25rem. Hero com espaço vertical de 1.5rem no celular e 2.5rem em md; demais seções geralmente 4rem/6rem. |
| Hero | Uma coluna até lg; em lg, 12 colunas com proposta em 7 e amostra em 5; gap 2rem/2.5rem. |
| App | Em md, lateral de 15.5rem e conteúdo `minmax(0, 1fr)`; conteúdo interno geralmente até 48rem. A faixa de avisos permite até 53rem. |
| Conta/onboarding | Fluxos centrados mais estreitos, até 36rem no formulário de onboarding; não tratar 48rem como largura de todo formulário. |
| Margens do app | Laterais 1.25rem/2.5rem; conteúdo vertical 1rem/1.5rem; reserva inferior 7rem no celular e 4rem em md. |
| Mobile | Cinco destinos fixos embaixo, cada item com mínimo de 4rem; padding inferior `max(0.35rem, env(safe-area-inset-bottom))`. Cabeçalho superior próprio. |
| Calendário | Três colunas no celular; sete a partir de sm. Índice de dias passa para três colunas em sm. |

Breakpoints usados, herdados do Tailwind instalado: sm (40rem), md (48rem), lg (64rem). Não são inferidos das dimensões das capturas. Contêineres e controles usam largura mínima zero para encolher sem cortar nomes, objetivos e reflexões. O viewport usa largura do dispositivo e escala inicial 1.

O veredito existente confirma essa prioridade nos viewports de 390×844 e 1280×900, e proposta, mecanismo e CTA juntos na landing. Esta documentação não executa outra inspeção visual nem amplia o aceite a outras dimensões.

## Elevation & Depth

A interface amostrada não declara sombras de elevação. Paper sobre sand, painéis pine e filetes de 1px criam separação. O diálogo nativo usa backdrop de ink com 48% de opacidade, centralização e superfície paper no formulário; isso é sobreposição funcional, sem sombra inventada.

Não há transições de marca nos componentes amostrados. Hover altera cor ou sublinhado. O esqueleto de carregamento tem pulso apenas quando movimento é permitido. `prefers-reduced-motion: reduce` limita animações e transições a 0.01ms, uma iteração, e força rolagem automática. Não adicionar motion como exigência deste sistema.

## Shapes

Cantos retos nos botões, campos e painéis: esses componentes não declaram raio. Por isso não há uma escala `rounded` inventada no frontmatter. Bordas finas definem campos, avisos e escolhas; painéis de prática usam borda superior pine, enquanto listas usam divisórias line. Radios e checkboxes mantêm forma nativa, com accent pine e dimensões de 1.15rem.

Ícones de interface vêm de Lucide, tipicamente com espessura 1.5 e dimensões de 1rem ou 1.25rem. O ícone de marca em `public/icon.svg` usa quadrado pine, filete gold e letra V em sand, sem cruz; a letra desse asset usa Georgia.

## Components

### Buttons

Ação compacta, retangular e sem sombra. Em `src/components/ui.tsx`, todas as variantes compartilham mínimo de 2.75rem em largura e altura, gap de 0.5rem, padding do frontmatter, label centralizado e peso 500.

- **Primary:** pine/sand; hover pine deep.
- **Secondary:** transparente, texto e borda pine; hover pine com 5% de opacidade.
- **Quiet:** texto pine, padding horizontal zero; hover sublinha com afastamento de 4px.
- **Danger:** transparente, texto e borda ink; hover ink com 5% de opacidade.
- **Inverse:** sand/pine; hover paper, usado sobre pine.
- **Disabled / Pending:** opacidade 0.5 e cursor indisponível. Pendente mostra “Aguarde”, define `aria-busy` e fica desabilitado mesmo com `disabled={false}`. Links que reutilizam a classe visual não ganham semântica de botão pendente.
- **Focus:** contorno global de 2px com afastamento de 3px, pine no claro e gold em `.surface-pine`. Não há tratamento `:active` próprio declarado.

### Inputs / Fields

Campos ocupam a largura disponível, com borda field de 1px, fundo paper, texto ink e padding uniforme. Labels em sans são associados por id; dicas e erros do componente Field usam `aria-describedby`, e o chamador recebe o estado inválido para aplicá-lo ao controle. Textareas têm mínimos locais conforme a tarefa, sem altura única global.

O foco usa o mesmo contorno global. Erros aparecem em texto com prefixo “Erro:” no Field ou em Alert com `role="alert"`; não existe borda vermelha ou estilo visual específico para `aria-invalid`. Checkboxes/radios são nativos; escolhas usam label com área de interação mínima de 2.75rem. Disabled pode usar o estado nativo e opacidade no contêiner; não há um token geral de campo desabilitado.

### Navigation

Lateral pine a partir de md, com marca em serifa e destinos em sans. Item atual tem fundo sand a 10%, filete gold e `aria-current="page"`. No celular, barra sand com cinco itens, ícone e rótulo empilhados; item atual passa a pine e mantém o filete gold. Os ícones são auxiliares e ocultos da árvore de acessibilidade. Não há hover de navegação próprio declarado; foco permanece visível.

A navegação pública quebra linha, preserva destinos e oferece alvos de pelo menos 2.75rem; a marca tem tamanho de title. Não é substituída por um menu oculto no mobile.

### Cards / Containers

Painel de prática: paper, borda superior pine, padding de practice-panel/practice-panel-md e título em title/headline. Contexto pessoal: paper, borda line e padding horizontal 1.25rem/vertical 1rem. Estado vazio: paper, borda line e padding horizontal 1.25rem/vertical 2rem. Planos usam colunas em md: gratuito com borda line sobre paper e planejado com superfície pine. Não transformar todo texto em cartão.

### Avisos e resumos expansíveis

ReviewNote em `practice.tsx` usa borda gold e fundo paper. A revisão aparece uma vez pelo chrome, com resumo acionável de pelo menos 2.75rem e explicação completa ao expandir. A demonstração usa resumo pine/sand em `demo-experience.tsx`. O bloqueio da prática mantém o aviso completo visível. `details`/`summary` usam comportamento nativo; não há chevron ou transição customizada.

Alert usa borda ink a 25%; Notice usa borda line e `role="status"`. Não esconder o caráter sintético, a ausência de conta ou a revisão pendente ao compactar os avisos.

### Diálogo, carregamento e mensagens

Diálogo de exclusão: largura `min(32rem, calc(100% - 2rem))`, backdrop descrito acima e formulário paper com padding horizontal 1.25rem/vertical 1.5rem. Carregamento usa blocos pine a 10%, rótulo de status e skeleton oculto de leitores de tela. Mentor separa mensagens por filetes, preserva quebras do texto e mantém autoria funcional em caixa alta; essa autoria não é eyebrow decorativo. Não há chip ou tag independente no conjunto amostrado.

## Do's and Don'ts

### Do:

- **Do** preservar a paleta do briefing e a combinação Cormorant Garamond/DM Sans.
- **Do** apresentar a prática concreta e o acesso ao registro antes do contexto pessoal em Hoje/Jornada.
- **Do** manter foco visível pine no claro e gold sobre pine, com contorno de 2px e afastamento de 3px.
- **Do** manter textos pessoais completos e quebráveis, avisos verdadeiros e metadados funcionais junto do conteúdo.
- **Do** respeitar a preferência por movimento reduzido e os estados nativos de campos e resumos.

### Don't:

- **Don't** usar gold como texto pequeno sobre sand.
- **Don't** introduzir ornamento religioso, ranking espiritual ou sequência punitiva.
- **Don't** recolocar eyebrows decorativos acima dos títulos ou transformar todas as seções em cards.
- **Don't** tratar `ship` das quatro correções como aprovação de produção ou inventar seed, comp e aprovação anteriores ao build.

**Não canonizado:** `SetupPanel` em `ui.tsx` e o cabeçalho de conta em `auth-screen.tsx` ainda carregam rótulos em caixa alta antes do título. São ocorrências preexistentes fora das superfícies pontuadas pelo veredito; não constituem regra para novas telas e não foram corrigidas nesta documentação. A lacuna do concept roll também permanece declarada. Nenhuma nova revisão, aprovação ou implementação é inferida deste registro.
