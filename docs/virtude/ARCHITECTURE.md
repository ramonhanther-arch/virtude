# Arquitetura VIRTUDE

## Limites

`virtude/` é uma aplicação Next.js App Router independente. Os projetos existentes foram preservados. Componentes React usam APIs da mesma origem; somente o servidor possui cookies de sessão HttpOnly e acesso ao provedor de IA. Route Handlers validam origem, corpo limitado e Zod, autenticam via Supabase getUser e consultam a existência da sessão no banco. RLS repete a verificação para acessos diretos ao Data API.

Camadas: `src/components` e páginas; `src/app/api`; `src/lib/server` para autorização, domínio e persistência; `src/lib/ai` para o provedor e controles; `src/content` para o catálogo editorial original. Migrations versionadas mantêm conteúdo global separado de narrativas privadas. FKs compostas ligam recursos ao mesmo proprietário. Uma restrição parcial permite apenas uma jornada ativa por pessoa.

## Fluxos

Cadastro/confirmar e-mail → sessão → onboarding e consentimentos → uma jornada → missão → check-in/reflexão → próxima prática, sem avanço por ausência. RPCs transacionais impedem duplo avanço concorrente, alteração de proprietário e progressão arbitrária por cliente. Ao concluir, outra jornada ou reinício preservam os registros anteriores.

O objetivo e a dificuldade podem ser ajustados nas configurações sem apagar progresso; a RPC fixa o usuário pela sessão e limita 5 mudanças/hora. Evolução inclui registros de jornadas arquivadas. Gravações narrativas passam por RPCs com quotas no banco, inclusive se o titular chamar diretamente a Data API:20 atividades/dia, 5/30 pares de histórico/dia e 3/min. Cotas de armazenamento são distintas das de geração de IA.

Mentor: autenticação → consentimento IA → limites persistentes por pessoa/plano → biblioteca revisada → contexto autorizado mínimo → Responses API sem tools e `store:false` → JSON validado/referências permitidas → renderização de texto escapado → histórico opcional transacional. Atividades complementares só são persistidas por uma ação explícita de confirmação. Rehearsal permanece simulação.

## Escala e evolução

Sem microsserviços ou fila. Postgres mantém transações e limites distribuídos; índices cobrem proprietário e relacionamentos. Planos concedidos no servidor, cobrança ainda ausente. Locale e catálogo permitem evolução internacional, mas idioma/horário do MVP são PT-BR/America_Sao_Paulo. APIs de domínio e tipos reutilizáveis permitem cliente Expo futuro, exigindo revisão de autenticação apropriada ao mobile. PWA inicial instalável por manifest; não mantém cache de conversas ou dados privados.

## Fontes técnicas consultadas em 2026-10-27

- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
- [OpenAI controles de dados](https://developers.openai.com/api/docs/guides/your-data). `store:false` não implica ausência de logs de monitoramento de abuso nem uma conta com Zero Data Retention.
- [OWASP ASVS](https://asvs.owasp.org/) e [Top 10 para LLM](https://genai.owasp.org/llm-top-10/): referências de engenharia, não declaração de certificação.
