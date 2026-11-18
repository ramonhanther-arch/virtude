"use client";

import { focusLabels } from "@/content/missions";
import type { PracticeStatus } from "@/lib/types";
import { formatWhen, isFocus, statusLabel } from "@/components/labels";
import { EmptyState } from "@/components/ui";

export type EvolutionRecord = {
  day?: number;
  status: string;
  reflection: string | null;
  learned: string | null;
  createdAt: string;
};

export type EvolutionJourney = {
  id: string;
  focus: string;
  currentDay: number;
  status: string;
  createdAt: string;
  records: EvolutionRecord[];
};

const weeks = [
  { title: "Dias 1 a 7", from: 1, to: 7 },
  { title: "Dias 8 a 14", from: 8, to: 14 },
  { title: "Dias 15 a 21", from: 15, to: 21 },
];

export function EvolutionPanel({ journeys, currentId }: { journeys: EvolutionJourney[]; currentId: string | null }) {
  const ordered = [...journeys].sort((a, b) => Number(b.id === currentId) - Number(a.id === currentId));
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8">
      <header>
        <h1 className="text-5xl text-pine">O que foi registrado</h1>
        <p className="mt-3 max-w-[62ch]">Os números abaixo saem dos seus registros. Um dia em branco não é falta e não existe sequência para perder.</p>
      </header>
      {ordered.length === 0 ? (
        <EmptyState title="Ainda não há jornada">
          <p>Quando houver uma jornada, o calendário e as semanas aparecem aqui.</p>
        </EmptyState>
      ) : ordered.map((journey) => <JourneyEvolution key={journey.id} journey={journey} current={journey.id === currentId} />)}
    </div>
  );
}

function JourneyEvolution({ journey, current }: { journey: EvolutionJourney; current: boolean }) {
  const focus = isFocus(journey.focus) ? focusLabels[journey.focus] : journey.focus;
  const records = journey.records.filter((record) => typeof record.day === "number");
  const counts = countRecords(records);
  return (
    <article className="grid gap-5">
      <header>
        <h2 className="text-4xl text-pine">{focus}</h2>
        <p className="mt-2 text-sm">{statusName(journey.status)}{current ? " · jornada em tela" : ""} · dia {journey.currentDay}</p>
        {formatWhen(journey.createdAt) ? <p className="text-sm">Início em {formatWhen(journey.createdAt)}</p> : null}
      </header>
      {records.length === 0 ? <p>Sem registros nesta jornada. Dias em branco continuam em branco.</p> : <p>{sentence(counts)}</p>}
      <Calendar records={records} currentDay={journey.currentDay} />
      <div className="grid gap-4">
        {weeks.map((week) => {
          const slice = records.filter((record) => (record.day ?? 0) >= week.from && (record.day ?? 0) <= week.to);
          return (
            <section key={week.title} className="border-t border-line pt-4">
              <h3 className="text-3xl text-pine">{week.title}</h3>
              <p className="mt-2">{slice.length === 0 ? "Sem registros nesta semana." : sentence(countRecords(slice))}</p>
              <ul className="mt-3 grid gap-3">
                {slice.filter((record) => record.reflection || record.learned).map((record, index) => (
                  <li key={`${record.day}-${record.createdAt}-${index}`} className="break-words">
                    <p className="text-sm">Dia {record.day} · {knownStatus(record.status) ? statusLabel[knownStatus(record.status)!] : record.status}</p>
                    {record.reflection ? <p className="whitespace-pre-wrap">{record.reflection}</p> : null}
                    {record.learned ? <p className="whitespace-pre-wrap text-sm">{record.learned}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function Calendar({ records, currentDay }: { records: EvolutionRecord[]; currentDay: number }) {
  return (
    <div>
      <p className="text-sm">Calendário: Realizei, Tentei, Não realizei ou Em branco.</p>
      <ol className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-7">
        {Array.from({ length: 21 }, (_, index) => {
          const day = index + 1;
          const record = records.find((item) => item.day === day);
          const label = record ? (knownStatus(record.status) ? statusLabel[knownStatus(record.status)!] : record.status) : "Em branco";
          return (
            <li key={day} aria-current={day === currentDay ? "date" : undefined} aria-label={`Dia ${day}, ${label}`} className="min-w-0 border border-line bg-paper px-2 py-2">
              <span className="block font-serif text-2xl text-pine">{day}</span>
              <span className="block text-xs break-words">{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function knownStatus(value: string): PracticeStatus | null {
  if (value === "completed" || value === "attempted" || value === "skipped") return value;
  return null;
}

function countRecords(records: EvolutionRecord[]) {
  return {
    total: records.length,
    completed: records.filter((record) => record.status === "completed").length,
    attempted: records.filter((record) => record.status === "attempted").length,
    skipped: records.filter((record) => record.status === "skipped").length,
  };
}

function sentence(counts: ReturnType<typeof countRecords>) {
  const parts = [`${counts.total} ${counts.total === 1 ? "registro" : "registros"}`];
  if (counts.completed) parts.push(`${counts.completed} ${counts.completed === 1 ? "prática realizada" : "práticas realizadas"}`);
  if (counts.attempted) parts.push(`${counts.attempted} ${counts.attempted === 1 ? "tentativa" : "tentativas"}`);
  if (counts.skipped) parts.push(`${counts.skipped} ${counts.skipped === 1 ? "dia não realizado" : "dias não realizados"}`);
  return parts.join(", ");
}

function statusName(status: string) {
  if (status === "active") return "Em curso";
  if (status === "completed") return "Concluída";
  if (status === "archived") return "Arquivada";
  return status;
}
