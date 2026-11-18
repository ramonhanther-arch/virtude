"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, CalendarDays, House, MessageCircle, Settings } from "lucide-react";
import { focusLabels, getMission, missions } from "@/content/missions";
import { fallbackPersonalization } from "@/lib/personalize";
import type { AppState, CheckIn, Focus, MentorReply } from "@/lib/types";
import { AppChrome } from "@/components/app-chrome";
import type { EvolutionJourney } from "@/components/evolution-panel";
import { EvolutionPanel } from "@/components/evolution-panel";
import { MentorPanel } from "@/components/mentor-panel";
import { PracticePanel, ReviewNote, TodaySummary, type CheckinDraft } from "@/components/practice";
import { SettingsPanel, type GoalDraft, type SettingsDraft } from "@/components/settings-panel";
import type { DemoScreenName } from "@/components/demo-screen";

export type { DemoScreenName };

type DemoValue = {
  state: AppState;
  archive: EvolutionJourney[];
  notice: string | null;
  setNotice: (value: string | null) => void;
  setState: (updater: (current: AppState) => AppState) => void;
  rememberJourney: () => void;
  reset: (message: string) => void;
  threads: Record<string, { role: "user" | "assistant"; content: string }[]>;
  setThreads: (value: Record<string, { role: "user" | "assistant"; content: string }[]>) => void;
};

const DemoContext = createContext<DemoValue | null>(null);

function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("A demonstração não está disponível nesta tela.");
  return value;
}

function createDemoState(): AppState {
  const mission = getMission("self_control", 1) ?? missions.find((item) => item.focus === "self_control" && item.day === 1);
  return {
    profile: { displayName: "Convidada", preferredTime: "08:00", locale: "pt-BR", reminderEmail: false },
    consents: { sensitiveData: true, ai: false, history: false, journeyContext: false },
    journey: {
      id: "demo-journey-self_control",
      focus: "self_control",
      currentDay: mission?.day ?? 1,
      status: "active",
      difficulty: "Na situação fictícia desta demo, respondo antes de ouvir uma frase inteira.",
      goal: "Na situação fictícia desta demo, quero ouvir uma frase inteira antes de responder.",
    },
    today: mission ? { ...withPersonalization(mission, "standard", "Na situação fictícia desta demo, quero ouvir uma frase inteira antes de responder.", "Na situação fictícia desta demo, respondo antes de ouvir uma frase inteira."), assignmentId: "demo-assignment-self_control-1" } : null,
    checkins: [],
    activities: [],
    conversations: [],
    plan: { code: "free", mentorDailyLimit: 5 },
    reviewer: false,
    contentPendingReview: !mission || mission.reviewStatus !== "approved",
  };
}

function withPersonalization(mission: NonNullable<ReturnType<typeof getMission>>, variant: "standard" | "simplified" | "deepened", goal: string, difficulty: string) {
  return { ...mission, ...fallbackPersonalization({ goal, difficulty }), variant };
}

function snapshot(state: AppState): EvolutionJourney | null {
  if (!state.journey) return null;
  return {
    id: state.journey.id,
    focus: state.journey.focus,
    currentDay: state.journey.currentDay,
    status: state.journey.status,
    createdAt: "",
    records: state.checkins.map((item) => ({ day: item.day, status: item.status, reflection: item.reflection, learned: item.learned, createdAt: item.createdAt })),
  };
}

function withMission(state: AppState, focus: Focus, day: number, status: "active" | "completed", variant: "standard" | "simplified" = "standard"): AppState {
  const mission = getMission(focus, day);
  const journey = state.journey;
  if (!journey) return state;
  return {
    ...state,
    journey: { ...journey, id: `demo-journey-${focus}-${crypto.randomUUID()}`, focus, currentDay: day, status },
    today: status === "active" && mission ? { ...withPersonalization(mission, variant, journey.goal, journey.difficulty), assignmentId: `demo-assignment-${focus}-${day}` } : null,
    checkins: [],
    contentPendingReview: !mission || mission.reviewStatus !== "approved",
  };
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setStateValue] = useState<AppState>(() => createDemoState());
  const [archive, setArchive] = useState<EvolutionJourney[]>([]);
  const [threads, setThreads] = useState<DemoValue["threads"]>({});
  const [notice, setNotice] = useState<string | null>(null);
  const value: DemoValue = {
    state,
    archive,
    notice,
    setNotice,
    setState: (updater) => setStateValue((current) => updater(current)),
    rememberJourney: () => {
      const item = snapshot(state);
      if (item) setArchive((current) => [{ ...item, status: item.status === "active" ? "archived" : item.status }, ...current.filter((journey) => journey.id !== item.id)]);
    },
    reset: (message) => {
      setStateValue(createDemoState());
      setArchive([]);
      setThreads({});
      setNotice(message);
    },
    threads,
    setThreads,
  };
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function DemoScreen({ tela }: { tela: DemoScreenName }) {
  const routerRef = useRef<HTMLDivElement>(null);
  const demo = useDemo();
  const { state } = demo;
  useEffect(() => {
    routerRef.current?.focus();
  }, [tela]);
  const items = [
    { href: "/demo", label: "Hoje", icon: House, current: tela === "hoje" },
    { href: "/demo?tela=jornada", label: "Jornada", icon: BookOpen, current: tela === "jornada" },
    { href: "/demo?tela=mentor", label: "Mentor", icon: MessageCircle, current: tela === "mentor" },
    { href: "/demo?tela=evolucao", label: "Evolução", icon: CalendarDays, current: tela === "evolucao" },
    { href: "/demo?tela=configuracoes", label: "Ajustes", icon: Settings, current: tela === "configuracoes" },
  ];
  return (
    <AppChrome
      homeHref="/demo"
      items={items}
      displayName={state.profile.displayName}
      exitLabel="Sair da amostra"
      onExit={() => demo.reset("Demonstração encerrada na memória desta página. Nenhuma conta real foi acessada.")}
      banners={(
        <>
          <details className="surface-pine bg-pine px-3 text-sm text-sand">
            <summary className="min-h-11 content-center">Demonstração sintética · dados efêmeros, sem conta.</summary>
            <p className="pb-3 leading-relaxed">Demonstração sintética. Os dados existem só na memória desta página, somem ao sair e não usam sua conta.</p>
          </details>
          {state.contentPendingReview ? <ReviewNote kind="sample" /> : null}
        </>
      )}
    >
      <main id="conteudo" ref={routerRef} tabIndex={-1} className="min-w-0 outline-none">
        {tela === "hoje" ? <TodaySummary state={state} recordHref="/demo?tela=jornada" sample /> : null}
        {tela === "jornada" ? <DemoJourney /> : null}
        {tela === "mentor" ? <DemoMentor /> : null}
        {tela === "evolucao" ? <EvolutionPanel journeys={[...(snapshot(state) ? [snapshot(state)!] : []), ...demo.archive]} currentId={state.journey?.id ?? null} /> : null}
        {tela === "configuracoes" ? <DemoSettings /> : null}
      </main>
    </AppChrome>
  );
}

function DemoJourney() {
  const demo = useDemo();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function checked(state: AppState) {
    return state.checkins.some((item) => item.assignmentId === state.today?.assignmentId);
  }

  return (
    <PracticePanel
      sample
      state={demo.state}
      busy={false}
      error={error}
      notice={notice ?? demo.notice}
      onCheckin={async (draft: CheckinDraft) => {
        demo.setState((current) => saveCheckin(current, draft));
        setNotice("Registro salvo só nesta demonstração. O dia não avança sozinho.");
        setError(null);
      }}
      onAdapt={async () => {
        if (!demo.state.today) return;
        demo.setState((current) => current.today ? { ...current, today: { ...current.today, variant: "simplified" } } : current);
        setNotice("A amostra passou a mostrar a alternativa simplificada.");
      }}
      onAdvance={async () => {
        const current = demo.state;
        if (!current.journey || !checked(current)) {
          setError("Registre o dia antes de avançar.");
          return;
        }
        if (current.journey.currentDay >= 21) {
          demo.setState((state) => state.journey ? { ...state, journey: { ...state.journey, status: "completed" }, today: null } : state);
          setNotice("A amostra concluiu a jornada. Escolha a próxima aqui mesmo.");
          return;
        }
        const nextDay = current.journey.currentDay + 1;
        const focus = current.journey.focus;
        const variant = current.checkins.find((item) => item.assignmentId === current.today?.assignmentId)?.status === "completed" ? "standard" as const : "simplified" as const;
        demo.setState((state) => {
          if (!state.journey) return state;
          const mission = getMission(focus, nextDay);
          return {
            ...state,
            journey: { ...state.journey, currentDay: nextDay },
            today: mission ? { ...withPersonalization(mission, variant, state.journey.goal, state.journey.difficulty), assignmentId: `demo-assignment-${focus}-${nextDay}` } : null,
            contentPendingReview: !mission || mission.reviewStatus !== "approved",
          };
        });
        setNotice("A amostra avançou um dia. Os registros anteriores continuam na evolução. Nada foi enviado ao servidor.");
      }}
      onRestart={async () => {
        if (!demo.state.journey) return;
        demo.rememberJourney();
        const focus = demo.state.journey.focus;
        demo.setState((state) => withMission(state, focus, 1, "active"));
        setNotice("A amostra recomeçou no dia 1.");
      }}
      onSwitch={async (focus: Focus) => {
        demo.rememberJourney();
        demo.setState((state) => withMission(state, focus, 1, "active"));
        setNotice(`A amostra abriu ${focusLabels[focus]} no dia 1.`);
      }}
    />
  );
}

function saveCheckin(state: AppState, draft: CheckinDraft): AppState {
  if (!state.today || !state.journey) return state;
  const checkin: CheckIn = {
    id: `demo-checkin-${state.today.assignmentId}`,
    assignmentId: state.today.assignmentId,
    day: state.journey.currentDay,
    status: draft.status,
    reflection: draft.reflection || null,
    learned: draft.learned || null,
    createdAt: new Date().toISOString(),
  };
  return { ...state, checkins: [...state.checkins.filter((item) => item.assignmentId !== checkin.assignmentId), checkin] };
}

function DemoMentor() {
  const demo = useDemo();
  return (
    <MentorPanel
      synthetic
      consents={demo.state.consents}
      conversations={demo.state.conversations}
      activities={demo.state.activities}
      settingsHref="/demo?tela=configuracoes"
      planLimit={demo.state.plan.mentorDailyLimit}
      onUnauthorized={() => undefined}
      loadConversation={async (id) => demo.threads[id] ?? []}
      send={async (input) => syntheticReply(demo, input)}
      confirmActivity={async (activity) => {
        demo.setState((current) => ({
          ...current,
          activities: [{ id: `demo-activity-${current.activities.length + 1}`, ...activity, createdAt: new Date().toISOString() }, ...current.activities],
        }));
      }}
    />
  );
}

function syntheticReply(demo: DemoValue, input: { message: string; mode: "reflection" | "rehearsal"; conversationId?: string; history?: { role: "user" | "assistant"; content: string }[] }): MentorReply {
  const reference = demo.state.today?.reference;
  const reply: MentorReply = input.mode === "rehearsal"
    ? {
      reply: "Simulação da demonstração: uma resposta plausível seria reconhecer o que você disse e pedir um tempo. Isso não prevê a reação real da outra pessoa.",
      references: reference ? [reference] : [],
      questions: ["O que você precisa que fique claro nessa conversa?"],
      suggestedActivity: { title: "Ensaio em voz baixa", description: "Leia sua frase uma vez, sozinho, e ajuste o que soar como cobrança." },
      conversationId: null,
      safety: "standard",
    }
    : {
      reply: "Demonstração sintética. Nenhum modelo foi chamado. Um próximo passo é nomear o fato, separar a interpretação e escolher um gesto pequeno.",
      references: reference ? [reference] : [],
      questions: ["Qual parte está sob a sua responsabilidade hoje?"],
      suggestedActivity: { title: "Anotar o fato", description: "Escreva em papel privado uma frase só com o que aconteceu, sem julgar a outra pessoa." },
      conversationId: null,
      safety: "standard",
    };
  if (demo.state.consents.history) {
    const id = input.conversationId ?? `demo-conversa-${demo.state.conversations.length + 1}`;
    reply.conversationId = id;
    const prior = demo.threads[id] ?? [];
    demo.setThreads({ ...demo.threads, [id]: [...prior, { role: "user", content: input.message }, { role: "assistant", content: reply.reply }] });
    demo.setState((current) => current.conversations.some((item) => item.id === id) ? current : {
      ...current,
      conversations: [{ id, title: input.message.slice(0, 80), createdAt: "" }, ...current.conversations],
    });
  }
  return reply;
}

function DemoSettings() {
  const demo = useDemo();
  const [error, setError] = useState<string | null>(null);
  return (
    <SettingsPanel
      state={demo.state}
      synthetic
      busy={false}
      error={error}
      notice={demo.notice}
      onSave={async (draft: SettingsDraft) => {
        demo.setState((current) => ({
          ...current,
          profile: { ...current.profile, displayName: draft.displayName, preferredTime: draft.preferredTime, reminderEmail: draft.reminderEmail },
          consents: { ...current.consents, ...draft.consents },
          conversations: draft.consents.history ? current.conversations : [],
        }));
        if (!draft.consents.history) demo.setThreads({});
        demo.setNotice("Preferências salvas só na memória desta demonstração.");
        setError(null);
      }}
      onSaveGoal={async (draft: GoalDraft) => {
        demo.setState((current) => current.journey?.status === "active" ? {
          ...current,
          journey: { ...current.journey, goal: draft.goal, difficulty: draft.difficulty },
        } : current);
        demo.setNotice("Objetivo atualizado só na memória desta demonstração.");
        setError(null);
      }}
      onExport={async () => {
        const payload = { amostra: true, aviso: "Demonstração sintética. Nenhum dado foi lido do servidor.", estado: demo.state };
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "virtude-amostra.json";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        demo.setNotice("Arquivo da amostra gerado neste dispositivo.");
      }}
      onDelete={async (input) => {
        if (input.confirmation !== "EXCLUIR" || !input.password) {
          setError("Digite EXCLUIR e uma senha qualquer. Nesta amostra a senha não é verificada.");
          throw new Error("confirmação incompleta");
        }
        demo.reset("Amostra apagada da memória desta página. Nenhuma conta real foi excluída.");
      }}
      onLogout={async () => {
        demo.reset("Demonstração encerrada na memória desta página. Nenhuma conta real foi acessada.");
      }}
    />
  );
}
