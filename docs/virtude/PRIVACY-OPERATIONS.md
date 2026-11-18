# Privacidade e operação — proposta de política do MVP

Documento de implementação e operação. Identidade do controlador, contato do encarregado, fornecedores, região e contratos precisam ser preenchidos e revisados juridicamente antes de receber usuários reais. Não representa aprovação jurídica ou infraestrutura já contratada.

## Inventário e bases propostas

E-mail e autenticação sustentam prestação do serviço e segurança. Objetivo, dificuldade, prática e reflexão podem revelar convicção religiosa e outros dados sensíveis: consentimento específico e destacado é exigido no onboarding. IA, armazenamento de histórico e uso do contexto da jornada são opções separadas, inicialmente desativadas. Confirmar a adequação de cada base legal e transferências internacionais com responsável jurídico. A [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) trata convicção religiosa como dado sensível (art. 5º II) e disciplina seu tratamento (art. 11).

Não solicitar confissões, documentos, renda ou dados de terceiros. Campos limitados. Sem analytics de texto livre, rastreadores de sessão, anúncios ou treinamento próprio de modelos. Eventos operacionais só possuem um identificador de evento permitido e data; nunca relato, reflexão ou transcrição. Plano grátis não altera direitos de privacidade.

No ingress de produção, omitir corpos e query strings dos logs de acesso, especialmente códigos PKCE e identificadores de conversas. A aplicação já desabilita logs de URLs de requisições; isso não configura automaticamente o provedor de hospedagem.

## Retenção e direitos

- Jornada, check-ins e atividades: enquanto a conta estiver ativa, até exclusão solicitada. Revisar necessidade de contas inativas no lançamento; não instituir retenção indefinida silenciosa.
- Conversas: somente com autorização de IA e histórico; apagar imediatamente da base ativa ao desativar histórico; desativar somente IA interrompe chamadas e novas gravações, mantendo acessível o histórico ainda autorizado. Histórico não autorizado permanece só na memória da página e no pedido de IA.
- Contadores de abuso: UUID/HMAC de IP e operações, expiram por janela; remoção oportunista limitada e tarefa de manutenção diária antes de produção. Não armazenar IP bruto.
- Exportação: JSON autenticado, inclui todos registros próprios das tabelas de produto e perfil de autenticação autorizado, sem segredos ou dados de terceiros. Não inclui backups ou logs externos que a aplicação não acessa.
- Exclusão: senha confirmada novamente, sessão recente verificada, remoção das sessões e conta Auth com cascata dos dados privados em transação; limpar cookies. A política de backups e fornecedores abaixo continua aplicável. Revogar consentimento sensível usa o fluxo de exclusão para encerrar o processamento.

## OpenAI e outros operadores

Enviar somente mensagem atual, histórico recente necessário e contexto autorizado. Sem e-mail, UUID do usuário ou demais conversas no prompt. `store:false`, nenhuma ferramenta, saída limitada. A [política de dados da API](https://developers.openai.com/api/docs/guides/your-data) distingue estado de aplicação de logs de abuso. Verificar retenção contratual e elegibilidade ZDR da conta; não prometer eliminação imediata de logs legais ou de segurança externos. Registrar pedido ao operador quando aplicável. Nenhum dado real foi enviado durante a construção sem credenciais.

## Backups e restauração

Proposta para contratação: backup criptografado diário, retenção máxima de 7 dias, RPO 24h/RTO 24h, acesso apenas ao operador autorizado e MFA. Validar que o plano contratado de Supabase oferece esses recursos e ajustar os compromissos antes de publicá-los. Nunca baixar backup real para este repositório. Não foi executado teste de restauração de infraestrutura externa nesta rodada.

Restauração em ambiente isolado, acesso bloqueado aos usuários, verificar integridade/isolamento e reaplicar exclusões realizadas após o snapshot antes de liberar tráfego. Manter comprovantes mínimos de exclusão em registro operacional protegido fora do snapshot; não incluir narrativas. A eliminação de backups ocorre por expiração do ciclo, sem prometer edição granular de snapshots imutáveis. Fazer exercício de restauração trimestral e antes do lançamento; registrar duração, falhas e responsável.

## Incidentes e segredos

Interromper tráfego de operações afetadas; revogar sessões; rotacionar chaves de IA/Supabase e segredo de HMAC; substituir variáveis no provedor e redeploy; verificar que credenciais anteriores falham. Investigar com registros mínimos e acesso restrito, preservar evidência sem conteúdo de usuários em issues públicas. Avaliar obrigações de comunicação a titulares/ANPD conforme norma vigente e jurídico. Atualizar o teste que detecta a falha antes de reabrir. Secret scanning e CI são controles de código; proteção de branch obrigatória e alertas organizacionais precisam ser habilitados no host Git por um administrador.
