disposition: fix

Entradas ausentes: contrato formal THESIS/OWN-WORLD/STORY/FIRST VIEWPORT/FORM com seed corroborável e card próprio do mundo; aplicados PRODUCT.md, DESIGN.md, BRIEF.md e o QUALITY BAR explícito do dispatch. Build code-led, sem comp aprovado ou referência visual fornecida; não se exigem comp, diff ou state de reprodução.

## persistence

- **Passa a persistência de produto e direção:** `virtude/PRODUCT.md` e `virtude/DESIGN.md` existem, foram lidos e descrevem o mundo renderizado; lidos também `docs/virtude/BRIEF.md`, `CONTRACT.md`, `FINAL-UI-FIX.md`, a definição integral de `impeccable_finish_reviewer.toml` e `reference/craft-floor.md`. O `CONTRACT.md` entregue é de implementação/API e não contém os cinco blocos de direção nem FORM/seed. **Falha documental:** não há como corroborar o concept roll; não inventar um registro retroativo nem substituir a direção já pedida pelo usuário.
- **Passa o gate 0:** todos os 12 arquivos abaixo foram abertos individualmente com `view_image`; dimensões conferidas nos cabeçalhos PNG. Não há região vazia, sobreposição indevida ou captura de outra tela. São viewports, não páginas completas; conteúdo abaixo deles não recebeu aprovação visual.

| Superfície | Desktop — 1280×900 | Mobile — 390×844 | Evidência observada |
| --- | --- | --- | --- |
| Landing | `landing-desktop.png` | `landing-mobile.png` | Marca, navegação, aviso de preparação, título e início da proposta; amostra à direita no desktop. |
| Hoje | `hoje-desktop.png` | `hoje-mobile.png` | Navegação ativa, demonstração identificada, avisos repetidos e contexto pessoal antes da prática. |
| Jornada | `jornada-desktop.png` | `jornada-mobile.png` | Jornada em curso, dia 1 de 21; contexto antes do conteúdo; feedback de registro no desktop. |
| Mentor | `mentor-desktop.png` | `mentor-mobile.png` | Modo Ensaio selecionado em ambos; troca de mensagens visível no desktop. No mobile o viewport termina junto ao aviso do ensaio, sem mostrar a resposta. |
| Evolução | `evolucao-desktop.png` | `evolucao-mobile.png` | Topo e navegação íntegros, estado Em curso, 1 registro/1 tentativa; calendário e relato visíveis no desktop. |
| Configurações | `configuracoes-desktop.png` | `configuracoes-mobile.png` | Plano identificado como planejado; campos e consentimentos no desktop, painel de plano no mobile. |

- Caminho comum das imagens: `virtude/.impeccable/review/`. Mentor é aceito no enquadramento fornecido; não se exige outro topo nem se presume conteúdo que o mobile não mostra.
- **Histórico preservado:** o parecer anterior foi exclusivamente `recapture` porque `evolucao-desktop.png` tinha a lateral superior apagada. Não continha matriz, aprovação ou lote de correções visuais. A imagem atual mostra marca, identificação, Hoje e demais destinos sobre a lateral verde contínua; esta é uma nova revisão completa após o reparo da evidência.
- Verificação estática limitada aos arquivos primários `globals.css`, `landing.tsx`, `app-chrome.tsx`, `journey-screens.tsx` e `practice.tsx`, após a inspeção das imagens. Nenhuma UI, teste ou código de produto foi editado, nenhum navegador/servidor foi iniciado e nenhum detector foi reexecutado.

## fidelity

Sem comp aprovado, a matriz confronta promessas e elementos do mundo solicitado; não atribui aprovação a um mock inexistente.

| Elemento / promessa | Estado | Evidência e consequência |
| --- | --- | --- |
| TYPE — Cormorant Garamond + DM Sans | match | Serifa editorial contrastante nos títulos e sans legível no corpo, coerentes nas 12 imagens; fontes e tokens corroborados no código amostrado. A família deve permanecer. |
| MATERIAL — editorial sereno, pouco ornamento | match | Fundos planos de leitura, filetes e ícones de traço consistente; sem física falsa, textura simulada ou ornamento religioso. O brief não exige fotografia, ilustração ou plate raster. |
| GROUND — bege #F6F1E7, verde #173F36, grafite e dourado | match | Campo bege e superfícies verdes/brancas correspondem aos tokens declarados e à leitura visual; dourado aparece em contornos e estado ativo, sem tomar o corpo pequeno. Não há comp para comparação pixel a pixel. |
| Landing Persuade — proposta e ação em segundos | contradicted | O CTA do cabeçalho existe e está visível. Entretanto, no desktop o título ocupa cinco linhas e o CTA do hero fica fora dos 900px; no mobile cabeçalho + aviso consomem aproximadamente 246px, a explicação começa em y≈683 e termina fora do viewport. A primeira tela entrega o slogan, mas não o mecanismo completo junto de sua ação contextual. |
| Hoje Operate — missão concreta lidera o dashboard | contradicted | No desktop o cartão do dia só começa em y≈661 e a ação de registro não aparece; no mobile nem título nem prática do dia chegam à área útil, encerrada pela navegação em y≈773. Aviso global, título genérico, informação de horário, aviso idêntico e contexto pessoal antecedem a tarefa. |
| Jornada — prática e ciclo curto | contradicted | A prática começa em y≈805 no desktop e está fora do mobile. Identificação da jornada, repetição do aviso e contexto pessoal antecedem o conteúdo. O tempo real do ciclo de 3–5 minutos não é comprovável por screenshots; a hierarquia atual acrescenta leitura antes de começar. |
| Navegação por dispositivo | adaptation | Lateral no desktop e cinco destinos fixos no mobile, conforme DESIGN.md e necessidade mobile-first. Rótulos e ícones permanecem visíveis; o estado ativo combina posição, fundo/filete e texto. |
| Mentor — ensaio identificado e limites verdadeiros | match | Ensaio/simulação está selecionado e explicitamente rotulado; desktop distingue as falas e diz que não prevê a reação real. Avisos de segurança e natureza da demonstração são legíveis. O mobile fornecido não permite julgar mensagens ou compositor abaixo do viewport. |
| Evolução — registros sem culpa ou métrica espiritual | match | “Um dia em branco não é falta”, contagem de registros/tentativas e dias identificados por texto. Estado Em curso corresponde à jornada atual. Não se infere valor espiritual, sucesso psicológico ou sequência a perder. |
| Configurações — verdade sobre plano e preferências | match | Preço planejado e ausência de cobrança claros; horário sem promessa de notificação; limites da persistência local identificados. Dificuldade pessoal de 600 caracteres foi informada no relatório funcional, mas seu campo está fora das capturas e não é certificado visualmente aqui. |
| Avisos e dados da prévia | match | Dados explicitamente sintéticos, sem conta ou chamada de modelo; conteúdo aguarda revisão humana. Não há aprovação humana falsa. A necessidade dos avisos é correta; sua repetição e posição são o problema de hierarquia descrito acima. |
| Floor — etiquetas acima de títulos | contradicted | Landing e todas as páginas do app exibem pequenos rótulos em caixa alta e tracking aberto acima do título (“JORNADA”, “MENTOR”, “EVOLUÇÃO”, “CONFIGURAÇÕES” etc.). São eyebrows expressamente proibidos pelo craft floor, ainda que o hook relatado não tenha encontrado achados determinísticos. |

Contrato, promessa por promessa: **THESIS** inferível de PRODUCT/BRIEF, mas a ação concreta fica subordinada em Hoje; **OWN-WORLD** corresponde à paleta, tipo e serenidade solicitadas; **STORY** tem leitura → prática → registro descritos, porém a prática começa tarde; **FIRST VIEWPORT** falha na prioridade de Hoje e na combinação mecanismo/ação da landing; **FORM** não foi fornecido e não tem seed corroborável. O teste de memória da primeira tela da landing retém o slogan; o de Hoje retém avisos e contexto, sem conseguir dizer a ação concreta do dia.

Verdade e limite da evidência: o resultado do hook e os testes funcionais são informações do coordenador, não substituem este julgamento visual. Não foram revalidados os 76 casos, o reteste de onboarding em curso, unidades, SQL, segurança ou build; nada neste parecer aprova integração remota, IA real, revisão teológica ou lançamento em produção.

## ceiling

- O mundo editorial ainda não usa a escala para separar persuasão de operação: a landing investe altura no slogan e o app repete títulos e preâmbulos antes do trabalho. O recurso nativo a empregar é hierarquia editorial — ordem, escala e espaço — dentro das famílias, cores e estruturas atuais.
- Legibilidade do corpo, ícones coerentes e ausência de métricas culpabilizantes não apresentam defeito material visível. Nas combinações principais declaradas, ink/sand e pine/sand atendem ao contraste de texto; nenhum texto pequeno dourado sobre bege foi identificado nestes viewports.
- Movimento, foco por teclado, hover, carregamento, estados de erro e conteúdo abaixo dos viewports não são verificáveis por essas imagens. Não há justificativa para adicionar animação, profundidade, ornamento, imagens ou outro mundo como condição desta correção.

## material_fixes

1. **Persistência / check 4:** registrar os cinco blocos de direção que sustentam esta implementação e a situação real de FORM/seed; corroborar eventual registro original ou declarar que não existiu, sem fabricar seed, simular aprovação de comp ou abrir novo design.
2. **FIRST VIEWPORT / Hoje e Jornada / Operate:** em um único lote, colocar identificação breve, prática concreta do dia e acesso ao registro antes do contexto pessoal e do horário; manter dificuldade/objetivo completos disponíveis mais abaixo, consolidar o aviso de revisão duplicado e compactar os avisos globais sem apagar a condição sintética nem a revisão pendente. Aceite: em 390×844, Hoje mostra a prática e sua ação antes da barra inferior; em desktop, ambas aparecem integralmente sem rolagem.
3. **FIRST VIEWPORT / Landing / Persuade:** reduzir a altura da navegação mobile e ajustar escala/quebra/espaçamento do hero para reunir proposta, mecanismo curto e “Ver uma amostra” no primeiro viewport de 390×844 e 1280×900; preservar slogan, fontes, paleta, destino da ação e aviso verdadeiro de preparação, sem acrescentar promessa ou novo layout de marca.
4. **Floor / eyebrows:** remover etiquetas decorativas acima de títulos nas superfícies visíveis, incluindo o rótulo do hero e o do painel de amostra; quando o texto identifica de fato a jornada ou a condição futura, mantê-lo como metadado junto do conteúdo correspondente. Preservar rótulos de campos, autores de mensagens, estado de revisão, estado da jornada e números sequenciais que informam o dia.

## keep

Preservar Cormorant Garamond/DM Sans, paleta e campo editorial sereno, navegação lateral/inferior, missão do catálogo e funções atuais, dificuldade como texto pessoal, consentimentos independentes, verdade da prévia e linguagem de progresso sem culpa; corrigir o lote acima sem redesign, edição de conteúdo teológico ou alegação de prontidão de produção.
