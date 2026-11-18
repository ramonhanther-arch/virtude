import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const db = new PGlite();
const started = new Date();
const applied: string[] = [];
try {
  await db.exec("do $$ begin if not exists (select 1 from pg_roles where rolname = 'virtude_app') then create role virtude_app nologin; end if; end $$;");
  const directory = path.resolve("db/migrations");
  const migrations = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const filename of migrations) {
    const sql = await readFile(path.join(directory, filename), "utf8");
    if (/auth\.(uid|jwt|users)\b/.test(sql)) throw new Error(`${filename} ainda depende do schema auth do Supabase`);
    await db.exec(sql);
    applied.push(filename);
    process.stdout.write(`Migration aplicada: ${filename}\n`);
  }
  const testFiles = (await readdir(path.resolve("db/tests"))).filter((file) => file.endsWith(".sql")).sort();
  for (const testFile of testFiles) {
    await db.exec(await readFile(path.resolve("db/tests", testFile), "utf8"));
    process.stdout.write(`Teste SQL passou: ${testFile}\n`);
  }
  process.stdout.write("Schema Neon aplicado e testes de autorização passaram.\n");
  await mkdir("test-results", { recursive: true });
  await writeFile("test-results/database.json", JSON.stringify({
    passed: true, engine: "PGlite/PostgreSQL", migrations: applied, testFiles, startedAt: started.toISOString(), finishedAt: new Date().toISOString(),
    limitation: "Não conecta ao Neon. Aplica db/migrations numa instância descartável.",
  }, null, 2));
} catch (error) {
  process.stderr.write(`Falha no banco de teste isolado: ${error instanceof Error ? error.message : "erro desconhecido"}\n`);
  process.exitCode = 1;
} finally {
  await db.close();
}
