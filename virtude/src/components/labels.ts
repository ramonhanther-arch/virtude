import type { Focus, Mission, PracticeStatus } from "@/lib/types";

export const focuses = ["self_control", "relationships", "stewardship", "spiritual_life"] as const satisfies readonly Focus[];
export const pilotFocuses = new Set<Focus>(["self_control", "relationships", "stewardship"]);

export const focusNote: Record<Focus, string> = {
  self_control: "Perceba o impulso antes da resposta. Observe seus padrões, experimente pausas e prepare escolhas mais cuidadosas nas situações comuns do dia.",
  relationships: "Escute com atenção, expresse pedidos e preserve limites. Pratique formas de cuidar que respeitam a dignidade, a liberdade e a segurança de cada pessoa.",
  stewardship: "Olhe com clareza para o que está sob seu cuidado. Organize recursos, considere necessidades reais e pense em generosidade dentro das suas possibilidades.",
  spiritual_life: "Cultive oração, leitura e presença sem medir sua fé pela ausência. A prática cabe no dia e pode recomeçar pequena.",
};

export const statusLabel: Record<PracticeStatus, string> = {
  completed: "Realizei",
  attempted: "Tentei",
  skipped: "Não realizei",
};

export const variantLabel = {
  standard: "Prática do dia",
  simplified: "Alternativa simplificada",
  deepened: "Aprofundamento",
} as const;

export const phaseLabel: Record<string, string> = {
  autoconhecimento: "Autoconhecimento",
  aprendizado: "Aprendizado",
  aplicação: "Aplicação",
  consolidação: "Consolidação",
  reflexão: "Reflexão",
};

export const difficulties = [
  { value: "Um passo pequeno", detail: "A alternativa mais simples precisa caber no dia." },
  { value: "Um desafio moderado", detail: "A prática comum do dia, com liberdade para simplificar." },
  { value: "Quero ir mais fundo", detail: "Há espaço para o aprofundamento, e a simplificação continua disponível." },
] as const;

export function isFocus(value: string): value is Focus {
  return value === "self_control" || value === "relationships" || value === "stewardship" || value === "spiritual_life";
}

export function phaseName(phase: string) {
  return phaseLabel[phase] ?? phase;
}

export function practiceBody(mission: Pick<Mission, "practice" | "simplified" | "deepened">, variant: "standard" | "simplified" | "deepened") {
  if (variant === "simplified") return mission.simplified;
  if (variant === "deepened") return mission.deepened;
  return mission.practice;
}

const whenFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatWhen(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return whenFormat.format(date);
}

export function normalizeTime(value: string) {
  const match = /^(\d{2}:\d{2})/.exec(value);
  return match?.[1] ?? value;
}

export function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
