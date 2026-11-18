import { describe, expect, it } from "vitest";
import { dueReminders, reminderCopy, reminderSummary } from "./reminders";

describe("lembrete por e-mail", () => {
  it("considera devido quem optou e está na janela de 15 minutos", () => {
    const now = new Date("2026-11-05T11:07:00Z");
    const due = dueReminders([
      { userId: "a", preferredTime: "08:00" },
      { userId: "b", preferredTime: "08:20" },
      { userId: "c", preferredTime: "09:00" },
    ], now);
    expect(due.map((item) => item.userId)).toEqual(["a"]);
  });

  it("não envia e não usa linguagem de culpa", () => {
    const summary = reminderSummary([{ userId: "a", preferredTime: "08:00" }], new Date("2026-11-05T11:00:00Z"));
    expect(summary.sent).toBe(0);
    expect(summary.provider).toBe("stub");
    expect(summary.due).toBe(1);
    expect(reminderCopy.text).toMatch(/tudo bem/i);
    expect(reminderCopy.text).not.toMatch(/culpa|falhou|sequência/i);
    expect(JSON.stringify(summary)).not.toContain("@");
  });
});
