"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Focus } from "@/lib/types";
import { ApiClientError, apiSend } from "@/components/api-client";
import { PracticePanel, TodaySummary, type CheckinDraft } from "@/components/practice";
import { useSession } from "@/components/session";

export function TodayScreen() {
  const { state } = useSession();
  if (!state) return null;
  return <TodaySummary state={state} recordHref="/app/jornada" />;
}

export function JourneyScreen() {
  const router = useRouter();
  const { state, reload } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  if (!state?.journey) return null;

  async function run(task: () => Promise<void>, success: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await task();
      await reload();
      setNotice(success);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.replace("/entrar");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PracticePanel
      state={state}
      busy={busy}
      error={error}
      notice={notice}
      onCheckin={(draft: CheckinDraft) => run(async () => {
        if (!state.today) return;
        await apiSend("/api/checkins", {
          method: "POST",
          body: JSON.stringify({
            assignmentId: state.today.assignmentId,
            status: draft.status,
            reflection: draft.reflection,
            ...(draft.learned ? { learned: draft.learned } : {}),
          }),
        });
      }, "Registro salvo. O dia só avança quando você pedir.")}
      onAdapt={() => run(() => apiSend("/api/journey", { method: "POST", body: JSON.stringify({ action: "adapt" }) }), "A missão de hoje passou a usar a alternativa simplificada. O dia não avançou.")}
      onAdvance={() => run(() => apiSend("/api/journey", { method: "POST", body: JSON.stringify({ action: "advance" }) }), state.journey?.currentDay === 21 ? "Jornada concluída. Escolha a próxima quando quiser." : "Progresso pedido. Se este dia já avançou, o servidor recusa sem punir a ausência.")}
      onRestart={() => run(() => apiSend("/api/journey", { method: "POST", body: JSON.stringify({ action: "restart" }) }), "A jornada recomeçou no dia 1.")}
      onSwitch={(focus: Focus) => run(() => apiSend("/api/journey", { method: "POST", body: JSON.stringify({ action: "switch", focus }) }), "A outra jornada começou no dia 1.")}
    />
  );
}
