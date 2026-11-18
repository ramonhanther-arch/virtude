import { rm, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

// Only disposable test output: persistent Turbopack state can retain stale route types.
const testRoot = process.cwd();
const manifest = JSON.parse(await readFile(path.join(testRoot, "package.json"), "utf8"));
if (manifest.name !== "virtude" || process.env.NEXT_DIST_DIR !== ".next-e2e") {
  throw new Error("The isolated E2E server must run in the Virtude test directory.");
}
await rm(path.join(testRoot, ".next-e2e"), { recursive: true, force: true });
const child = spawn(process.execPath, [path.join(testRoot, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3211"], { stdio: "inherit", env: process.env });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("error", () => { process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 0; });
