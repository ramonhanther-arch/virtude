import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sentinel = "VIRTUDE_SERVER_ONLY_SENTINEL_2026";
async function visit(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(entries.map((entry) => entry.isDirectory() ? visit(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
  return children.flat();
}
const files = (await visit(".next/static")).filter((file) => /\.(js|json|map)$/.test(file));
for (const file of files) {
  const content = await readFile(file, "utf8");
  if (content.includes(sentinel) || /NEXT_PUBLIC_(?:OPENAI_API_KEY|DATABASE_URL|AUTH_SECRET|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY)/.test(content)) throw new Error("Material privado encontrado no bundle público; release bloqueado.");
}
process.stdout.write(`${files.length} arquivos de cliente inspecionados; nenhum marcador privado ou variável pública de segredo encontrado.\n`);
