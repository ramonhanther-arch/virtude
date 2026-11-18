import "server-only";

export type ReminderCandidate = { userId: string; preferredTime: string };

export const reminderCopy = {
  subject: "Sua prática de hoje está disponível",
  text: "Se fizer sentido hoje, a Virtude tem uma prática curta esperando. Se hoje não for o dia, tudo bem: nenhum dia é descontado e você pode voltar quando quiser. Para parar estes e-mails, desligue o lembrete em Ajustes.",
};

export function dueReminders(candidates: ReminderCandidate[], now = new Date(), timeZone = "America/Sao_Paulo") {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const current = hour * 60 + minute;
  return candidates.filter((candidate) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(candidate.preferredTime);
    if (!match) return false;
    const preferred = Number(match[1]) * 60 + Number(match[2]);
    const delta = current - preferred;
    return delta >= 0 && delta < 15;
  });
}

export function reminderSummary(candidates: ReminderCandidate[], now = new Date()) {
  const due = dueReminders(candidates, now);
  return { eligible: candidates.length, due: due.length, sent: 0, channel: "email" as const, provider: "stub" as const, copy: reminderCopy };
}
