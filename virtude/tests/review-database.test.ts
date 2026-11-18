import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("schema Neon", () => {
  it("não depende de auth.users, auth.uid ou auth.jwt", async () => {
    const files = (await readdir("db/migrations")).filter((file) => file.endsWith(".sql"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const sql = await readFile(`db/migrations/${file}`, "utf8");
      expect(sql, file).not.toMatch(/auth\.(uid|jwt|users)\b/);
      expect(sql, file).not.toMatch(/@supabase/);
    }
  });

  it("declara as tabelas do Auth.js e a missão personalizada", async () => {
    const sql = await readFile("db/migrations/0001_schema.sql", "utf8");
    for (const table of ["public.users", "public.accounts", "public.sessions", "public.verification_tokens", "personalized_practice", "analytics_events", "spiritual_life"]) {
      expect(sql).toContain(table);
    }
  });
});
