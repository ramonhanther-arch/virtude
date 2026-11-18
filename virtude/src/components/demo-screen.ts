export type DemoScreenName = "hoje" | "jornada" | "mentor" | "evolucao" | "configuracoes";

export function parseDemoScreen(value: string | undefined): DemoScreenName {
  if (value === "jornada" || value === "mentor" || value === "evolucao" || value === "configuracoes") return value;
  return "hoje";
}
