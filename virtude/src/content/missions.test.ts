import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Focus, Mission } from "../lib/types";
import { focusLabels, getMission, missions } from "./missions";

const focuses: Focus[] = ["self_control", "relationships", "stewardship", "spiritual_life"];
const expectedDays = Array.from({ length: 21 }, (_, index) => index + 1);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const copyFields = ["context", "principle", "practice", "simplified", "deepened", "reflectionQuestion"] as const;

// Canonical chapter bounds for this edition; a typo cannot create a nonexistent verse.
// This checks addresses, not the theological validity of an application.
const chapterBounds: Record<string, number> = {
  "Lamentações 3": 66, "Tiago 1": 27, "Tiago 2": 26,
  "Provérbios 4": 27, "Provérbios 11": 31, "Provérbios 14": 35,
  "Provérbios 15": 33, "Provérbios 18": 24, "Provérbios 21": 31,
  "Provérbios 25": 28, "Provérbios 27": 27,
  "Gálatas 5": 26, "Gálatas 6": 18,
  "Marcos 1": 45, "Marcos 6": 56, "Marcos 10": 52,
  "1 Coríntios 4": 21, "1 Coríntios 6": 20, "1 Coríntios 10": 33,
  "1 Coríntios 13": 13, "2 Coríntios 8": 24, "2 Coríntios 9": 15,
  "Efésios 2": 22, "Efésios 4": 32, "Mateus 5": 48, "Mateus 6": 34,
  "Mateus 7": 29, "Mateus 18": 35, "Salmos 4": 8, "Salmos 139": 24,
  "Tito 2": 15, "Eclesiastes 4": 16, "Eclesiastes 5": 20,
  "Filipenses 2": 30, "Filipenses 3": 21, "Filipenses 4": 23,
  "Lucas 10": 42, "Lucas 12": 59, "Lucas 14": 35, "Lucas 19": 48,
  "João 4": 54, "João 6": 71, "João 13": 38, "Romanos 12": 21,
  "Colossenses 3": 25, "Atos 6": 15, "1 Timóteo 6": 21,
  "Gênesis 2": 25, "Êxodo 16": 36, "Deuteronômio 24": 22,
  "Levítico 19": 37, "Hebreus 13": 25,
  "Salmos 1": 6, "Salmos 23": 6, "Salmos 42": 11, "Salmos 46": 11,
  "Salmos 63": 11, "Salmos 100": 5, "Lucas 5": 39, "Lucas 11": 54,
  "Josué 1": 18, "Atos 2": 47, "Romanos 8": 39, "Hebreus 10": 39,
  "1 Pedro 5": 14, "1 Tessalonicenses 5": 28, "Colossenses 4": 18,
  "2 Timóteo 3": 17, "João 15": 27, "Mateus 11": 30,
};

describe("catálogo editorial VIRTUDE", () => {
  it("exporta exatamente 84 missões e os quatro focos", () => {
    expect(missions).toHaveLength(84);
    expect([...new Set(missions.map((mission) => mission.focus))].sort()).toEqual([...focuses].sort());
    expect(Object.keys(focusLabels).sort()).toEqual([...focuses].sort());
    for (const label of Object.values(focusLabels)) expect(label.trim().length).toBeGreaterThan(3);
  });

  it.each(focuses)("oferece os dias 1–21 sem lacunas ou duplicatas em %s", (focus) => {
    const journey = missions.filter((mission) => mission.focus === focus);
    expect(journey).toHaveLength(21);
    expect(journey.map((mission) => mission.day).sort((a, b) => a - b)).toEqual(expectedDays);
  });

  it.each(focuses)("mantém as cinco fases e limites de progressão em %s", (focus) => {
    const journey = missions.filter((mission) => mission.focus === focus);
    const phases = [
      { name: "autoconhecimento", first: 1, last: 3, count: 3 },
      { name: "aprendizado", first: 4, last: 7, count: 4 },
      { name: "aplicação", first: 8, last: 14, count: 7 },
      { name: "consolidação", first: 15, last: 18, count: 4 },
      { name: "reflexão", first: 19, last: 21, count: 3 },
    ];
    for (const phase of phases) {
      const inPhase = journey.filter((mission) => mission.phase === phase.name);
      expect(inPhase).toHaveLength(phase.count);
      expect(inPhase.map((mission) => mission.day)).toEqual(expectedDays.filter((day) => day >= phase.first && day <= phase.last));
    }
  });

  it("tem UUIDs únicos e pares foco/dia únicos", () => {
    expect(new Set(missions.map((mission) => mission.id)).size).toBe(84);
    expect(new Set(missions.map((mission) => `${mission.focus}/${mission.day}`)).size).toBe(84);
    for (const mission of missions) expect(mission.id).toMatch(uuid);
  });

  it("preserva identificadores de integração já definidos nesta edição", () => {
    const fixtures: [Focus, number, string][] = [
      ["self_control", 1, "10000001-0000-4000-8000-000000000001"],
      ["self_control", 21, "10000001-0000-4000-8000-000000000021"],
      ["relationships", 1, "10000002-0000-4000-8000-000000000001"],
      ["relationships", 21, "10000002-0000-4000-8000-000000000021"],
      ["stewardship", 1, "10000003-0000-4000-8000-000000000001"],
      ["stewardship", 21, "10000003-0000-4000-8000-000000000021"],
      ["spiritual_life", 1, "10000004-0000-4000-8000-000000000001"],
      ["spiritual_life", 21, "10000004-0000-4000-8000-000000000021"],
    ];
    for (const [focus, day, id] of fixtures) expect(getMission(focus, day)?.id).toBe(id);
  });

  it("preenche todos os campos do contrato sem placeholders ou campos extras", () => {
    const keys: (keyof Mission)[] = [
      "id", "focus", "day", "phase", "title", "reference", "context", "principle", "practice",
      "simplified", "deepened", "reflectionQuestion", "reviewStatus",
    ];
    for (const mission of missions) {
      expect(Object.keys(mission).sort()).toEqual([...keys].sort());
      expect(mission.title.trim().length).toBeGreaterThan(5);
      for (const field of copyFields) {
        expect(mission[field].trim().length, `${mission.id}: ${field}`).toBeGreaterThan(20);
        expect(mission[field]).not.toMatch(/\b(?:TODO|TBD)\b|lorem ipsum/);
      }
      expect(mission.reflectionQuestion).toMatch(/\?$/);
    }
  });

  it("mantém 84 pendências reais, sem aprovação simulada", () => {
    expect(missions.every((mission) => mission.reviewStatus === "pending_review")).toBe(true);
  });

  it("não repete literalmente títulos, contextos, princípios, práticas ou perguntas", () => {
    for (const field of ["title", ...copyFields] as const) {
      const normalized = missions.map((mission) => mission[field].trim().toLocaleLowerCase("pt-BR"));
      expect(new Set(normalized).size, `campo repetido: ${field}`).toBe(84);
    }
    for (const mission of missions) {
      expect(new Set([mission.practice, mission.simplified, mission.deepened]).size).toBe(3);
    }
  });

  it("endereça trechos existentes sem extrapolar os capítulos usados", () => {
    for (const mission of missions) {
      const match = /^(.+ \d+):(\d+)(?:-(\d+))?$/.exec(mission.reference);
      expect(match, mission.reference).not.toBeNull();
      if (!match) continue;
      const [, chapter, first, last = first] = match;
      expect(chapterBounds[chapter], chapter).toBeDefined();
      expect(Number(first)).toBeGreaterThanOrEqual(1);
      expect(Number(last)).toBeGreaterThanOrEqual(Number(first));
      expect(Number(last)).toBeLessThanOrEqual(chapterBounds[chapter]);
    }
  });

  it("rastreia cada missão uma vez no registro com fonte primária, data e pendência", () => {
    const review = readFileSync(resolve(__dirname, "../../../docs/virtude/CONTENT-REVIEW.md"), "utf8");
    const rows = review.split("\n").filter((line) => /^\| \d+ \| `/.test(line));
    expect(rows).toHaveLength(84);
    for (const mission of missions) {
      const matches = rows.filter((row) => row.includes(`\`${mission.id}\``));
      expect(matches, mission.id).toHaveLength(1);
      expect(matches[0]).toContain(`[${mission.reference}](https://ebible.org/`);
      expect(matches[0]).toMatch(/https:\/\/ebible\.org\/engweb[pu]\/[A-Z0-9]+\.htm\)/);
      expect(matches[0]).toMatch(/\| 2026-1[01]-\d{2} \| pending_review \|/);
      expect(matches[0]).toMatch(/\| — \|$/);
    }
  });
});

describe("getMission", () => {
  it("retorna exatamente a missão solicitada em cada par válido", () => {
    for (const mission of missions) expect(getMission(mission.focus, mission.day)).toBe(mission);
  });

  it.each([0, -1, 22, 100, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejeita o dia inválido %s", (day) => {
    expect(getMission("self_control", day)).toBeUndefined();
  });

  it("não usa outro foco como fallback para entrada inválida em runtime", () => {
    expect(getMission("unknown_focus" as Focus, 1)).toBeUndefined();
    expect(getMission("spiritual_life", 1)?.focus).toBe("spiritual_life");
  });
});
