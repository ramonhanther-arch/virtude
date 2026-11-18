import { writeFile } from "node:fs/promises";
import { missions } from "../src/content/missions";

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const original = missions.filter((mission) => mission.focus !== "spiritual_life");
const added = missions.filter((mission) => mission.focus === "spiritual_life");
if (original.length !== 63 || added.length !== 21) throw new Error("Catálogo incompleto: a edição inicial tem 63 missões e Vida espiritual tem 21.");
if (missions.some((mission) => mission.reviewStatus !== "pending_review")) throw new Error("O seed não pode gravar aprovação.");

const output = [
  "-- Vida espiritual. Gerado por npm run content:seed. Não regrava a migration das 63 missões.",
  "-- Todas as linhas entram como pending_review. Nenhuma base externa é alterada.",
  "begin;",
];
for (const mission of added) {
  output.push(`insert into public.biblical_contents(id,reference,context,review_status) values (${quote(mission.id)}::uuid,${quote(mission.reference)},${quote(mission.context)},'pending_review') on conflict(id) do nothing;`);
  const values = [mission.focus, mission.day.toString(), mission.id, mission.phase, mission.title, mission.reference, mission.context, mission.principle, mission.practice, mission.simplified, mission.deepened, mission.reflectionQuestion];
  const columns = ["focus", "day", "biblical_content_id", "phase", "title", "reference", "context", "principle", "practice", "simplified", "deepened", "reflection_question"];
  output.push(`insert into public.mission_templates(${columns.join(",")},review_status) values (${values.map((value, index) => index === 1 ? value : quote(value)).join(",")},'pending_review') on conflict(focus,day) do nothing;`);
}
output.push("commit;", "");
const destination = "db/migrations/0003_spiritual_life_content.sql";
await writeFile(destination, output.join("\n"));
process.stdout.write(`21 missões de vida espiritual gravadas em ${destination}. Nenhuma base externa foi alterada.\n`);
