"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MentorReply } from "@/lib/types";
import { ApiClientError, apiSend, downloadExport, isSetupError } from "@/components/api-client";
import { EvolutionPanel, type EvolutionJourney } from "@/components/evolution-panel";
import { MentorPanel } from "@/components/mentor-panel";
import { useSession } from "@/components/session";
import { SettingsPanel, type GoalDraft, type SettingsDraft } from "@/components/settings-panel";
import { Alert } from "@/components/ui";

function useAuthorizedAction() {
  const router = useRouter();
  const { reload } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(task: () => Promise<void>, success?: string) {
    setBusy(true);
    setError(null);
    if (success) setNotice(null);
    try {
      await task();
      if (success) {
        await reload();
        setNotice(success);
      }
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.replace("/entrar");
        return;
      }
      setError(isSetupError(caught) ? "Configuração indisponível. Nenhuma sessão foi criada." : caught instanceof Error ? caught.message : "Não foi possível concluir.");
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, notice, setNotice, run, reload, router };
}

export function MentorScreen() {
  const { state } = useSession();
  const { reload, router, run } = useAuthorizedAction();
  if (!state) return null;
  return (
    <MentorPanel
      synthetic={false}
      consents={state.consents}
      conversations={state.conversations}
      activities={state.activities}
      settingsHref="/app/configuracoes"
      planLimit={state.plan.mentorDailyLimit}
      onUnauthorized={() => router.replace("/entrar?next=/app/mentor")}
      loadConversation={async (id) => {
        const data = await apiSend<{ messages: { role: "user" | "assistant"; content: string }[] }>(`/api/mentor?conversationId=${encodeURIComponent(id)}`);
        return data.messages;
      }}
      send={async (input) => {
        const reply = await apiSend<MentorReply>("/api/mentor", { method: "POST", body: JSON.stringify(input) });
        await reload().catch(() => undefined);
        return reply;
      }}
      confirmActivity={async (activity) => {
        await run(async () => {
          await apiSend("/api/activities", { method: "POST", body: JSON.stringify({ ...activity, confirmed: true }) });
        }, "Atividade guardada.");
      }}
    />
  );
}

export function SettingsScreen() {
  const { state } = useSession();
  const { busy, error, notice, run, router } = useAuthorizedAction();
  if (!state) return null;
  return (
    <SettingsPanel
      state={state}
      synthetic={false}
      busy={busy}
      error={error}
      notice={notice}
      onSave={(draft: SettingsDraft) => run(() => apiSend("/api/settings", { method: "PATCH", body: JSON.stringify(draft) }), "Alterações salvas.")}
      onSaveGoal={(draft: GoalDraft) => run(() => apiSend("/api/goal", { method: "PATCH", body: JSON.stringify(draft) }), "Objetivo atualizado.")}
      onExport={() => run(async () => { await downloadExport(); }, "Arquivo gerado neste dispositivo.")}
      onDelete={(input) => run(async () => {
        await apiSend("/api/account", { method: "DELETE", body: JSON.stringify(input) });
        router.replace("/entrar?aviso=conta-excluida");
      })}
      onLogout={() => run(async () => {
        await apiSend("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) });
        router.replace("/entrar");
      })}
    />
  );
}

export function EvolutionScreen() {
  const router = useRouter();
  const { state } = useSession();
  const [journeys, setJourneys] = useState<EvolutionJourney[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiSend<{ journeys: EvolutionJourney[] }>("/api/evolution").then((data) => {
      if (!active) return;
      setJourneys(data.journeys);
      setLoading(false);
    }).catch((caught: unknown) => {
      if (!active) return;
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.replace("/entrar?next=/app/evolucao");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar a evolução.");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (!state) return null;
  if (loading) return <p role="status">Carregando registros</p>;
  return (
    <div className="grid gap-4">
      {error ? <Alert>{error}</Alert> : null}
      <EvolutionPanel journeys={journeys ?? []} currentId={state.journey?.id ?? null} />
    </div>
  );
}
