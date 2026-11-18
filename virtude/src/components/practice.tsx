"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Pause } from "lucide-react";
import { focusLabels, getMission, missions } from "@/content/missions";
import type { AppState, Focus, PracticeStatus } from "@/lib/types";
import { purposeLink } from "@/lib/personalize";
import { focusNote, focuses, phaseName, practiceBody, statusLabel, variantLabel } from "@/components/labels";
import { Alert, Button, EmptyState, Notice, buttonClass, controlClass } from "@/components/ui";

export type CheckinDraft = { status: PracticeStatus; reflection: string; learned: string };

const statuses: PracticeStatus[] = ["completed", "attempted", "skipped"];

export function ReviewNote({ kind }: { kind: "blocked" | "released" | "sample" }) {
  const text = kind === "sample"
    ? "Amostra do catálogo. Este texto ainda aguarda revisão humana e não está publicado como conteúdo aprovado."
    : kind === "released"
      ? "Este conteúdo ainda aguarda revisão humana. A leitura foi liberada neste ambiente, e a publicação continua pendente."
      : "O conteúdo desta jornada aguarda revisão humana. A prática do dia fica indisponível até a aprovação. A espera não reduz nem pune o seu progresso.";
  if (kind === "blocked") return <p role="status" className="border border-gold bg-paper px-3 py-2 text-sm leading-relaxed">{text}</p>;
  return (
    <details className="border border-gold bg-paper px-3 text-sm">
      <summary className="min-h-11 content-center"><span role="status">{kind === "sample" ? "Amostra do catálogo · revisão humana pendente." : "Conteúdo com revisão humana pendente."}</span></summary>
      <p className="pb-3 leading-relaxed">{text}</p>
    </details>
  );
}

export function reviewKind(state: AppState): "blocked" | "released" | null {
  if (!state.contentPendingReview) return null;
  return state.today ? "released" : "blocked";
}

export function TodaySummary({ state, recordHref }: { state: AppState; recordHref: string; sample?: boolean }) {
  const journey = state.journey;
  if (!journey) return null;
  return (
    <div className="mx-auto grid w-full min-w-0 max-w-3xl gap-5">
      <header>
        <h1 className="text-4xl text-pine md:text-5xl">{state.profile.displayName ? `${state.profile.displayName}, o gesto de hoje.` : "O gesto de hoje."}</h1>
        <p className="mt-2 text-sm">{focusLabels[journey.focus]}</p>
      </header>
      {journey.status === "completed" || !state.today ? (
        journey.status === "completed" ? <CompletedCopy journey={journey} /> : <BlockedCopy />
      ) : (
        <>
          <PersonalizedLead today={state.today} goal={journey.goal} difficulty={journey.difficulty} />
          <Link href={recordHref} className={buttonClass("primary")}>Registrar este dia</Link>
          <details className="border border-line bg-paper px-4 py-3">
            <summary className="min-h-11 content-center text-sm font-medium">Base do dia</summary>
            <p className="mt-3 text-sm">{state.today.reference} · {phaseName(state.today.phase)}</p>
            <p className="mt-3 leading-relaxed">{state.today.context}</p>
            <p className="mt-3 leading-relaxed">{practiceBody(state.today, "standard")}</p>
          </details>
        </>
      )}
      {journey.status === "completed" ? <p>A escolha da próxima jornada está na página Jornada.</p> : null}
      <PersonalContext journey={journey} />
      <p className="max-w-[58ch] text-sm">Horário preferido: {state.profile.preferredTime}. O lembrete por e-mail só sai se você autorizar em Ajustes. Um dia sem abrir o app não é cobrado.</p>
    </div>
  );
}

function PersonalContext({ journey }: { journey: NonNullable<AppState["journey"]> }) {
  return (
    <section className="min-w-0 border border-line bg-paper px-5 py-4">
      <h2 className="text-3xl text-pine">O que você trouxe para esta jornada</h2>
      <p className="mt-3 break-words whitespace-pre-wrap"><span className="block text-sm font-medium">Dificuldade</span>{journey.difficulty}</p>
      <p className="mt-3 break-words whitespace-pre-wrap"><span className="block text-sm font-medium">Objetivo</span>{journey.goal}</p>
      <p className="mt-3 max-w-[62ch] text-sm leading-relaxed">Estes textos são os que você escreveu. A ação do dia usa esse propósito. A referência e o contexto continuam os do catálogo.</p>
    </section>
  );
}

function PersonalizedLead({ today, goal, difficulty }: { today: NonNullable<AppState["today"]>; goal: string; difficulty: string }) {
  const model = today.personalizationSource === "model" && Boolean(today.personalizedPractice);
  const link = today.personalizedPractice || purposeLink(goal, difficulty);
  return (
    <article className="border-t border-pine bg-paper px-4 py-4 md:px-5 md:py-5">
      <p className="text-sm leading-relaxed">{model
        ? "Prática adaptada ao seu propósito. A referência bíblica permanece a do catálogo."
        : "A adaptação profunda não está disponível agora. A ação continua a do catálogo, com uma ligação ao que você escreveu."}</p>
      <h2 className="mt-3 text-3xl text-pine md:text-4xl">{model ? today.personalizedTitle ?? today.title : today.title}</h2>
      <p className="mt-2 text-sm">Dia {today.day} · {phaseName(today.phase)} · {today.reference} · {variantLabel[today.variant]}</p>
      {model && today.personalizedCommitment ? <p className="mt-3 leading-relaxed">{today.personalizedCommitment}</p> : null}
      {model ? <p className="mt-3 leading-relaxed md:text-lg">{today.personalizedPractice}</p> : (
        <>
          <p className="mt-3 leading-relaxed">{link}</p>
          <p className="mt-3 leading-relaxed md:text-lg">{practiceBody(today, today.variant)}</p>
        </>
      )}
    </article>
  );
}

function Formulation({ label, body, active }: { label: string; body: string; active: boolean }) {
  return (
    <article className="border-t border-line pt-3">
      <h4 className="text-2xl text-pine">{label}{active ? " · em uso" : ""}</h4>
      <p className="mt-2 leading-relaxed">{body}</p>
    </article>
  );
}

function CompletedCopy({ journey }: { journey: NonNullable<AppState["journey"]> }) {
  return (
    <EmptyState title="Jornada concluída">
      <p>Você concluiu os 21 dias de {focusLabels[journey.focus]}. O próximo passo é recomeçar ou escolher outra jornada. Nada aqui mede uma sequência.</p>
    </EmptyState>
  );
}

function BlockedCopy() {
  return (
    <EmptyState title="A prática de hoje ainda não abre">
      <p>Quando o texto do dia estiver disponível, ele aparece aqui por completo. Enquanto isso, o dia atual permanece.</p>
    </EmptyState>
  );
}

export function PracticePanel({
  state,
  busy,
  error,
  notice,
  onCheckin,
  onAdapt,
  onAdvance,
  onRestart,
  onSwitch,
}: {
  state: AppState;
  busy: boolean;
  error: string | null;
  notice: string | null;
  onCheckin: (draft: CheckinDraft) => Promise<void>;
  onAdapt: () => Promise<void>;
  onAdvance: () => Promise<void>;
  onRestart: () => Promise<void>;
  onSwitch: (focus: Focus) => Promise<void>;
  sample?: boolean;
}) {
  const journey = state.journey;
  if (!journey) return null;
  return (
    <div className="mx-auto grid w-full min-w-0 max-w-3xl gap-5">
      <header>
        <h1 className="text-4xl text-pine md:text-5xl">{focusLabels[journey.focus]}</h1>
        <p className="mt-2 text-sm">Dia {journey.currentDay} de 21 · {journey.status === "completed" ? "Concluída" : "Em curso"}</p>
      </header>
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Notice>{notice}</Notice> : null}
      {journey.status === "completed" || !state.today ? (
        journey.status === "completed" ? <CompletedCopy journey={journey} /> : <BlockedCopy />
      ) : (
        <MissionDay key={state.today.assignmentId} state={state} busy={busy} onCheckin={onCheckin} onAdapt={onAdapt} onAdvance={onAdvance} />
      )}
      <PersonalContext journey={journey} />
      <p className="max-w-[58ch]">{focusNote[journey.focus]}</p>
      <JourneyChooser current={journey.focus} completed={journey.status === "completed"} busy={busy} onRestart={onRestart} onSwitch={onSwitch} />
      <DayIndex focus={journey.focus} currentDay={journey.currentDay} checkins={state.checkins} />
    </div>
  );
}

function MissionDay({
  state,
  busy,
  onCheckin,
  onAdapt,
  onAdvance,
}: {
  state: AppState;
  busy: boolean;
  onCheckin: (draft: CheckinDraft) => Promise<void>;
  onAdapt: () => Promise<void>;
  onAdvance: () => Promise<void>;
}) {
  const today = state.today;
  const journey = state.journey;
  const existing = state.checkins.find((item) => item.assignmentId === today?.assignmentId);
  const [status, setStatus] = useState<PracticeStatus | "">(existing?.status ?? "");
  const [reflection, setReflection] = useState(existing?.reflection ?? "");
  const [learned, setLearned] = useState(existing?.learned ?? "");
  const [paused, setPaused] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!today || !journey) return null;
  const checked = Boolean(existing);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!status) {
      setLocalError("Escolha se realizou, tentou ou não realizou.");
      return;
    }
    if (!reflection.trim()) {
      setLocalError("Escreva uma reflexão, mesmo que breve.");
      return;
    }
    if (reflection.trim().length > 4000 || learned.trim().length > 4000) {
      setLocalError("O texto passa de 4000 caracteres.");
      return;
    }
    setLocalError(null);
    await onCheckin({ status, reflection: reflection.trim(), learned: learned.trim() });
  }

  return (
    <div className="grid gap-6">
      <PersonalizedLead today={today} goal={journey.goal} difficulty={journey.difficulty} />
      <a href="#registro" className={buttonClass("primary")}>Registrar este dia</a>
      <section className="grid gap-4">
        <h3 className="text-3xl text-pine">Base do dia</h3>
        <p className="max-w-[62ch] text-sm leading-relaxed">A referência, o contexto e as três formulações são do catálogo. A personalização não cria outra passagem. O aprofundamento passa a abrir no dia seguinte quando duas práticas seguidas foram realizadas. Se a de hoje não foi realizada por completo, o próximo dia abre na alternativa.</p>
        <p className="leading-relaxed">{today.context}</p>
        <p className="leading-relaxed">{today.principle}</p>
        <Formulation label="Prática do dia" body={today.practice} active={today.variant === "standard"} />
        <Formulation label="Alternativa simplificada" body={today.simplified} active={today.variant === "simplified"} />
        <Formulation label="Aprofundamento" body={today.deepened} active={today.variant === "deepened"} />
      </section>

      <form id="registro" className="grid scroll-mt-6 gap-5" onSubmit={(event) => void submit(event)}>
        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium">Como foi a prática de hoje?</legend>
          {statuses.map((item) => (
            <label key={item} className="flex min-h-11 items-center gap-3">
              <input type="radio" name="status" value={item} checked={status === item} onChange={() => setStatus(item)} />
              {statusLabel[item]}
            </label>
          ))}
        </fieldset>
        <div>
          <label htmlFor="reflexao" className="block text-sm font-medium">{today.reflectionQuestion}</label>
          <textarea id="reflexao" className={`${controlClass} mt-2 min-h-32`} maxLength={4000} required value={reflection} onChange={(event) => setReflection(event.target.value)} />
          <p className="mt-1 text-sm">{reflection.length}/4000</p>
        </div>
        <div>
          <label htmlFor="aprendi" className="block text-sm font-medium">O que você percebeu, se quiser registrar</label>
          <textarea id="aprendi" className={`${controlClass} mt-2 min-h-24`} maxLength={4000} value={learned} onChange={(event) => setLearned(event.target.value)} />
        </div>
        {localError ? <Alert>{localError}</Alert> : null}
        <Button type="submit" pending={busy}>{existing ? "Atualizar registro" : "Salvar registro"}</Button>
      </form>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" pending={busy} disabled={today.variant === "simplified"} onClick={() => void onAdapt()}>
          {today.variant === "simplified" ? "Alternativa já em uso" : "Usar alternativa simplificada"}
        </Button>
        {journey.currentDay === 21 ? (
          confirmFinish ? (
            <Button pending={busy} disabled={!checked} onClick={() => void onAdvance()}>Confirmar conclusão</Button>
          ) : (
            <Button variant="secondary" disabled={!checked || busy} onClick={() => setConfirmFinish(true)}>Concluir jornada</Button>
          )
        ) : (
          <Button pending={busy} disabled={!checked} onClick={() => void onAdvance()}>Avançar para o próximo dia</Button>
        )}
      </div>
      {!checked ? <p className="text-sm">Avançar fica disponível depois do registro de hoje. O servidor também aceita só uma progressão por data.</p> : null}
      {journey.currentDay === 21 ? <p className="text-sm">No dia 21, concluir encerra esta jornada. Em seguida você escolhe a próxima.</p> : null}

      <details className="border border-line bg-paper px-4 py-3">
        <summary className="inline-flex min-h-11 items-center gap-2"><Pause aria-hidden="true" className="size-4" strokeWidth={1.5} />Pausar sem punição</summary>
        <p className="mt-3 max-w-[62ch] text-sm leading-relaxed">Você pode ficar um ou vários dias sem praticar. O dia atual continua aberto. Não há sequência para quebrar e nenhum dia é descontado. Pausar não envia um registro.</p>
        <Button className="mt-3" variant="secondary" onClick={() => setPaused(true)}>Vou pausar hoje</Button>
        {paused ? <p className="mt-3 text-sm" role="status">Pausa anotada só nesta tela. Nada foi enviado.</p> : null}
      </details>
    </div>
  );
}

function JourneyChooser({
  current,
  completed,
  busy,
  onRestart,
  onSwitch,
}: {
  current: Focus;
  completed: boolean;
  busy: boolean;
  onRestart: () => Promise<void>;
  onSwitch: (focus: Focus) => Promise<void>;
}) {
  const [choice, setChoice] = useState<Focus | "restart" | null>(null);
  return (
    <section className="grid gap-4">
      <h2 className="text-4xl text-pine">{completed ? "Escolher a próxima" : "Trocar ou recomeçar"}</h2>
      <p className="max-w-[62ch] text-sm leading-relaxed">Trocar ou recomeçar arquiva a jornada atual e começa outra no dia 1. O objetivo anterior pode vir junto e você pode corrigi-lo em Ajustes. Os dias já registrados continuam na página Evolução.</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={busy} onClick={() => setChoice("restart")}>Recomeçar {focusLabels[current]}</Button>
        {focuses.filter((focus) => focus !== current).map((focus) => (
          <Button key={focus} variant="secondary" disabled={busy} onClick={() => setChoice(focus)}>Começar {focusLabels[focus]}</Button>
        ))}
      </div>
      <p className="text-sm">As quatro áreas estão disponíveis. As três primeiras seguem como piloto; vida espiritual entra no mesmo formato de 21 dias.</p>
      {choice ? (
        <div className="border border-line bg-paper px-4 py-4">
          <p>{choice === "restart" ? `Confirmar o recomeço de ${focusLabels[current]}?` : `Confirmar o início de ${focusLabels[choice]}?`}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button pending={busy} onClick={() => void (choice === "restart" ? onRestart() : onSwitch(choice))}>Confirmar</Button>
            <Button variant="quiet" onClick={() => setChoice(null)}>Cancelar</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DayIndex({ focus, currentDay, checkins }: { focus: Focus; currentDay: number; checkins: AppState["checkins"] }) {
  const days = missions.filter((mission) => mission.focus === focus).sort((a, b) => a.day - b.day);
  return (
    <section>
      <h2 className="text-4xl text-pine">Dias no catálogo</h2>
      {days.length === 0 ? <p className="mt-3">Os textos desta jornada ainda não estão no catálogo carregado.</p> : (
        <ol className="mt-4 divide-y divide-line border-y border-line">
          {days.map((mission) => {
            const record = checkins.find((item) => item.day === mission.day);
            return (
              <li key={mission.id} className="grid gap-1 py-3 sm:grid-cols-[4rem_1fr_auto] sm:items-baseline" aria-current={mission.day === currentDay ? "step" : undefined}>
                <span className="font-serif text-2xl text-pine">{mission.day}</span>
                <span className="min-w-0 break-words">{mission.title} <span className="text-sm">· {phaseName(mission.phase)}</span></span>
                <span className="text-sm">{record ? statusLabel[record.status] : mission.day === currentDay ? "Dia atual" : "Em branco"}</span>
              </li>
            );
          })}
        </ol>
      )}
      {days.length > 0 && days.length < 21 ? <p className="mt-3 text-sm">O catálogo carregado tem {days.length} de 21 dias desta jornada. {getMission(focus, currentDay) ? "" : "O dia atual ainda não tem texto no catálogo."}</p> : null}
    </section>
  );
}
