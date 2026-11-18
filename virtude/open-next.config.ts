import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// vinext 1.4 é um app Vite/RSC, não um adaptador deste Next.js.
// OpenNext publica o app existente em Workers. O cron entra por cloudflare/entry.mjs.
export default defineCloudflareConfig({});
