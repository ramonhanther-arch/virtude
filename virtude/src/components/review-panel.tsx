"use client";

import { useMemo, useState } from "react";
import { focusLabels } from "@/content/missions";
import type { Focus, ReviewStatus } from "@/lib/types";
import { ApiClientError, apiSend } from "@/components/api-client";
import { focuses } from "@/components/labels";
import { Alert, Button, EmptyState, controlClass } from "@/components/ui";

type ReviewItem = {
  id: string;
  focus: Focus;
  day: number;
  phase: string;
  title: string;
  reference: string;
  context: string;
  principle: string;
  practice: string;
  simplified: string;
  deepened: string;
  reflectionQuestion: string;
  status: ReviewStatus;
  attention: string;
  referenceUrl: string | null;
  latest: { decision: ReviewStatus; note: string; reviewerEmail: string; createdAt: string } | null;
};

type ReviewPayload = {
  items: ReviewItem[];
  counts: Record<ReviewStatus, number>;
  persistence: "ready" | "unavailable";
};

const statusLabel: Record<ReviewStatus, string> = {
  pending_review: "Pendente",
  approved: "Aprovada",
  needs_changes: "Ajustar",
  rejected: "Rejeitada",
};

export function ReviewPanel({ initial, denied }: { initial: ReviewPayload | null; denied: boolean }) {
  const [payload, setPayload] = useState<ReviewPayload | null>(initial);
  const [error, setError] = useState<string | null>(denied ? "Esta página é só da equipe editorial. O acesso usa a lista VIRTUDE_CONTENT_REVIEWERS ou o papel admin no servidor." : null);
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState<Focus | "all">("all");
  const [status, setStatus] = useState<ReviewStatus | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPayload(await apiSend<ReviewPayload>("/api/revisao"));
    } catch (caught) {
      setPayload(null);
      setError(caught instanceof ApiClientError && caught.status === 403 ? "Esta página é só da equipe editorial. O acesso usa a lista VIRTUDE_CONTENT_REVIEWERS ou o papel admin no servidor." : caught instanceof Error ? caught.message : "Não foi possível abrir a revisão.");
    } finally {
      setLoading(false);
    }
  }

  const visible = useMemo(() => (payload?.items ?? []).filter((item) => (focus === "all" || item.focus === focus) && (status === "all" || item.status === status)), [payload, focus, status]);
  const current = visible.find((item) => item.id === selected) ?? visible[0] ?? null;

  async function decide(decision: "approved" | "needs_changes" | "rejected") {
    if (!current) return;
    if (decision !== "approved" && note.trim().length < 8) {
      setError("Ajuste e rejeição pedem uma nota de pelo menos 8 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/revisao", { method: "POST", body: JSON.stringify({ focus: current.focus, day: current.day, decision, note: note.trim() }) });
      setNote("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível registrar o parecer.");
    } finally {
      setBusy(false);
    }
  }

  async function download(format: "csv" | "json") {
    const response = await fetch(`/api/revisao/export?format=${format}`, { credentials: "same-origin" });
    if (!response.ok) {
      setError("Não foi possível exportar o relatório.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = format === "csv" ? "virtude-revisao.csv" : "virtude-revisao.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p role="status">Carregando a revisão.</p>;
  if (!payload) return <EmptyState title="Revisão indisponível">{error ? <p>{error}</p> : <p>Não foi possível carregar as missões.</p>}</EmptyState>;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <header>
        <h1 className="text-5xl text-pine">Revisão teológica</h1>
        <p className="mt-3 max-w-[62ch] leading-relaxed">Nenhuma missão começa aprovada. Um parecer grava o seu e-mail, a data e a decisão. Produção continua servindo só o que estiver aprovado no banco.</p>
      </header>
      {error ? <Alert>{error}</Alert> : null}
      {payload.persistence === "unavailable" ? <Alert>A lista vem do catálogo. Para gravar pareceres, defina DATABASE_URL com o Postgres do Neon.</Alert> : null}
      <p className="text-sm">Pendentes {payload.counts.pending_review} · Aprovadas {payload.counts.approved} · Ajustar {payload.counts.needs_changes} · Rejeitadas {payload.counts.rejected}</p>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">Foco
          <select className={`${controlClass} mt-1`} value={focus} onChange={(event) => setFocus(event.target.value as Focus | "all")}>
            <option value="all">Todos</option>
            {focuses.map((item) => <option key={item} value={item}>{focusLabels[item]}</option>)}
          </select>
        </label>
        <label className="text-sm">Estado
          <select className={`${controlClass} mt-1`} value={status} onChange={(event) => setStatus(event.target.value as ReviewStatus | "all")}>
            <option value="all">Todos</option>
            {(Object.keys(statusLabel) as ReviewStatus[]).map((item) => <option key={item} value={item}>{statusLabel[item]}</option>)}
          </select>
        </label>
        <Button variant="secondary" onClick={() => void download("csv")}>Exportar CSV</Button>
        <Button variant="secondary" onClick={() => void download("json")}>Exportar JSON</Button>
      </div>
      {visible.length === 0 ? <EmptyState title="Nenhuma missão neste filtro"><p>Mude o foco ou o estado para ver outras missões.</p></EmptyState> : (
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <ul className="max-h-[36rem] divide-y divide-line overflow-auto border-y border-line">
            {visible.map((item) => (
              <li key={item.id}>
                <button type="button" className="grid w-full gap-1 px-2 py-3 text-left" aria-current={current?.id === item.id ? "true" : undefined} onClick={() => setSelected(item.id)}>
                  <span className="text-sm">Dia {item.day} · {statusLabel[item.status]}</span>
                  <span className="font-medium">{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
          {current ? (
            <article className="min-w-0 border border-line bg-paper px-4 py-4">
              <h2 className="text-4xl text-pine">{current.title}</h2>
              <p className="mt-2 text-sm">{focusLabels[current.focus]} · dia {current.day} · {current.phase} · {statusLabel[current.status]}</p>
              <p className="mt-2 text-sm">{current.referenceUrl ? <a className="underline" href={current.referenceUrl}>{current.reference}</a> : current.reference}</p>
              <p className="mt-4 leading-relaxed">{current.context}</p>
              <p className="mt-3 leading-relaxed">{current.principle}</p>
              <h3 className="mt-5 text-2xl text-pine">Prática</h3>
              <p className="mt-2 leading-relaxed">{current.practice}</p>
              <h3 className="mt-5 text-2xl text-pine">Simplificada</h3>
              <p className="mt-2 leading-relaxed">{current.simplified}</p>
              <h3 className="mt-5 text-2xl text-pine">Aprofundamento</h3>
              <p className="mt-2 leading-relaxed">{current.deepened}</p>
              <p className="mt-4 leading-relaxed">{current.reflectionQuestion}</p>
              <p className="mt-4 border border-gold bg-sand px-3 py-3 text-sm leading-relaxed">Nota editorial: {current.attention}</p>
              {current.latest ? <p className="mt-3 text-sm">Último parecer: {statusLabel[current.latest.decision]} em {current.latest.createdAt}. {current.latest.note}</p> : <p className="mt-3 text-sm">Ainda não há parecer humano.</p>}
              <label className="mt-4 block text-sm" htmlFor="parecer">Parecer</label>
              <textarea id="parecer" className={`${controlClass} mt-2 min-h-28`} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} />
              <div className="mt-3 flex flex-wrap gap-3">
                <Button pending={busy} disabled={payload.persistence !== "ready"} onClick={() => void decide("approved")}>Aprovar</Button>
                <Button variant="secondary" pending={busy} disabled={payload.persistence !== "ready"} onClick={() => void decide("needs_changes")}>Pedir ajuste</Button>
                <Button variant="secondary" pending={busy} disabled={payload.persistence !== "ready"} onClick={() => void decide("rejected")}>Rejeitar</Button>
              </div>
            </article>
          ) : null}
        </div>
      )}
    </div>
  );
}
