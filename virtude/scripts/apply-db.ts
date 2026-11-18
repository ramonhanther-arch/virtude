import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  process.stderr.write("Defina DATABASE_URL com a connection string pooled do Neon. Nada foi aplicado.\n");
  process.exitCode = 1;
} else {
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => undefined });
  try {
    const directory = path.resolve("db/migrations");
    const migrations = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
    for (const filename of migrations) {
      await sql.unsafe(await readFile(path.join(directory, filename), "utf8"));
      process.stdout.write(`Aplicada: ${filename}\n`);
    }
    process.stdout.write("Migrations do Virtude aplicadas no banco indicado por DATABASE_URL.\n");
  } catch (error) {
    process.stderr.write(`Falha ao aplicar migrations: ${error instanceof Error ? error.message : "erro desconhecido"}\n`);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}
