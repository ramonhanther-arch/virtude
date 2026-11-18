// Wrapper do worker gerado pelo OpenNext. Rode `npm run cf:build` antes do deploy.
import worker from "../.open-next/worker.js";

function bind(env) {
  if (env?.HYPERDRIVE?.connectionString) process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
  for (const key of ["AUTH_SECRET", "AUTH_URL", "AUTH_RATE_LIMIT_SECRET", "CRON_SECRET", "OPENAI_API_KEY", "OPENAI_MODEL", "VIRTUDE_CONTENT_REVIEWERS", "NEXT_PUBLIC_APP_URL"]) {
    if (env?.[key]) process.env[key] = env[key];
  }
}

export default {
  fetch(request, env, ctx) {
    bind(env);
    return worker.fetch(request, env, ctx);
  },
  scheduled(_event, env, ctx) {
    bind(env);
    const origin = env.AUTH_URL || env.NEXT_PUBLIC_APP_URL || "https://virtude.internal";
    const request = new Request(new URL("/api/cron/reminders", origin), {
      method: "POST",
      headers: { authorization: `Bearer ${env.CRON_SECRET || ""}` },
    });
    ctx.waitUntil(worker.fetch(request, env, ctx));
  },
};
