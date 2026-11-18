# Entrega VIRTUDE — implementação local do MVP

2026-10-27. Aplicação em `virtude/`, no worktree isolado `VIRTUDE`. A inspeção inicial foi realizada antes da implementação; os arquivos rastreados anteriormente não foram alterados. A entrega usa workers reais do OpenSquad coordenados pelo Orca; o registro completo está em `squads/virtude/output/run_e67e0e22b994/execution.md`.

## Produto implementado

- Landing responsiva com identidade editorial, demonstração, jornadas, Mentor, planos propostos e FAQ.
- Cadastro, login, confirmação PKCE, recuperação de senha, cookies HttpOnly, verificação de usuário e sessão real no servidor.
- Onboarding com propósito, dificuldade pessoal em texto, objetivo, horário e consentimentos independentes.
- Três jornadas de 21 dias e 63 missões originais, versões simplificadas/aprofundadas, check-in, reflexão, avanço controlado e continuidade sem punição por ausência.
- Mentor server-only com contexto autorizado, ensaio identificado como simulação, histórico opcional, confirmação explícita de atividades, referências restritas, saídas validadas e quotas persistentes.
- Evolução com calendário, revisões por semana e jornadas anteriores; edição do objetivo sem apagar progresso.
- Preferências, exportação e exclusão reautenticada com revogação de sessões e cascatas; plano gratuito e permissões Premium sem cobrança.
- PostgreSQL/Supabase com quatro migrations, RLS, FKs por proprietário, capacidades limitadas e bloqueio de conteúdo não aprovado em produção. PWA por manifesto, sem cache de informações privadas.

## Evidências executadas no código final

| Verificação | Resultado e limite |
|---|---|
| ESLint e TypeScript | Passaram, sem erros. |
| Vitest | 104 testes passaram em 8 arquivos; inclui provas independentes de segurança e limites da IA. |
| PostgreSQL local | Quatro migrations e dois arquivos SQL passaram em PGlite, com fixtures sintéticas de Auth. CRUD/RLS A/B/anon, quotas, sessões revogadas, consentimentos, exclusão e objetivo pessoal exercitados. |
| Navegador | 76/76 testes funcionais passaram na execução final: 70 UI/mock/demonstração/axe e 6 HTTP locais reais. As duas tarefas adicionais de captura também passaram, produzindo 12 PNGs. |
| Acessibilidade automática | 20 scans axe A/AA passaram nas superfícies e viewports exercitados; isso não substitui avaliação manual completa. |
| SAST | Semgrep: 230 regras configuradas, 27 aplicáveis executadas em 71 arquivos; nenhum achado, sem filtro de severidade. |
| SCA / segredos | `npm audit` sem vulnerabilidades reportadas; secretlint passou. A instalação registrou aviso de depreciação do ESLint 9.39.5, mantido fixado para a toolchain efetivamente testada; atualização de manutenção deve ser avaliada antes do lançamento. |
| Build | Build de produção passou em todas as rotas. Marcador privado de teste ausente dos 22 arquivos de cliente inspecionados. |
| Revisão independente | Três achados médios de AppSec reproduzidos, corrigidos e revalidados. Quatro correções de hierarquia/design classificadas `resolved` em `VISUAL-VERDICT.md`; o `ship` tem esse escopo, não autoriza produção. |

Os testes autenticados da interface usam respostas HTTP mockadas; os testes HTTP privados exercitam a aplicação local sem sessão. O banco usa PostgreSQL real em WASM com fixtures para `auth.users` e `auth.sessions`. Nenhum resultado acima comprova integração remota com GoTrue, SMTP, PostgREST ou OpenAI. A prévia `/demo` é explícita e inteiramente sintética, com estado em memória.

## Ativação e release

O código e a prévia estão disponíveis para revisão; **o lançamento em produção permanece bloqueado** até:

1. Configurar projeto Supabase exclusivo, aplicar migrations e validar Auth/recuperação/revogação/RLS entre dois usuários no ambiente real; configurar SMTP e callbacks exatos.
2. Configurar OpenAI e modelo, validar geração estruturada real, custos, casos adversariais, retenção contratual e tratamento de dados.
3. Concluir revisão teológica humana das 63 missões e revisão jurídica das bases legais, controlador/contato, política e transferências internacionais. Todos os conteúdos continuam `pending_review`.
4. Contratar e testar infraestrutura: HTTPS/ingress confiável para IP, segredos/rotação, limites, logs mínimos, backup e restauração. Proteção de branch e recursos de segurança do host Git precisam de configuração administrativa.

Não houve publicação ou cobrança. Notificações, WhatsApp, grupos, jornada de vida espiritual e app Expo permanecem futuras conforme o briefing. A última seção do briefing recebido estava truncada na política de release; nenhum conteúdo ausente foi inventado.

Instruções de execução e configuração: `virtude/README.md` e `virtude/.env.example`. Credenciais reais devem ficar em `.env.local` ou no gerenciador do host, nunca no chat ou no repositório.
