"use client";

import { useState } from "react";
import Link from "next/link";
import type { AppState, MentorReply } from "@/lib/types";
import { ApiClientError } from "@/components/api-client";
import { Alert, Button, EmptyState, controlClass } from "@/components/ui";

type ChatItem = {
  role: "user" | "assistant";
  content: string;
  references?: string[];
  questions?: string[];
  suggestedActivity?: { title: string; description: string } | null;
  safety?: string;
};

type SendInput = {
  message: string;
  mode: "reflection" | "rehearsal";
  conversationId?: string;
  history?: { role: "user" | "assistant"; content: string }[];
};

const starters = [
  "Quero separar fato e interpretação de uma conversa recente.",
  "Preciso de um gesto pequeno para hoje, sem aumentar a meta.",
];

export function MentorPanel({
  synthetic,
  consents,
  conversations,
  activities,
  settingsHref,
  planLimit,
  onUnauthorized,
  loadConversation,
  send,
  confirmActivity,
}: {
  synthetic: boolean;
  consents: AppState["consents"];
  conversations: AppState["conversations"];
  activities: AppState["activities"];
  settingsHref: string;
  planLimit: number;
  onUnauthorized: () => void;
  loadConversation: (id: string) => Promise<{ role: "user" | "assistant"; content: string }[]>;
  send: (input: SendInput) => Promise<MentorReply>;
  confirmActivity: (activity: { title: string; description: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<"reflection" | "rehearsal">("reflection");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<ChatItem[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const canSend = consents.sensitiveData && consents.ai;
  const canReadHistory = consents.sensitiveData && consents.history;

  async function submit(text: string) {
    if (!canSend || busy) return;
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Escreva uma mensagem.");
      return;
    }
    if (trimmed.length > 2000) {
      setError("A mensagem passa de 2000 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    const prior = items.slice(-8).map((item) => ({ role: item.role, content: item.content.slice(0, 1800) }));
    try {
      const reply = await send({
        message: trimmed,
        mode,
        ...(conversationId ? { conversationId } : {}),
        ...(!conversationId && prior.length ? { history: prior } : {}),
      });
      setItems((current) => [...current, { role: "user", content: trimmed }, {
        role: "assistant",
        content: reply.reply,
        references: reply.references,
        questions: reply.questions,
        suggestedActivity: reply.suggestedActivity,
        safety: reply.safety,
      }]);
      setConversationId(reply.conversationId);
      setMessage("");
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        onUnauthorized();
        return;
      }
      setError(caught instanceof Error ? caught.message : "Não foi possível falar com o Mentor.");
    } finally {
      setBusy(false);
    }
  }

  async function openConversation(id: string) {
    if (!canReadHistory || busy) return;
    setBusy(true);
    setError(null);
    try {
      const messages = await loadConversation(id);
      setItems(messages.map((item) => ({ role: item.role, content: item.content })));
      setConversationId(id);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        onUnauthorized();
        return;
      }
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir a conversa.");
    } finally {
      setBusy(false);
    }
  }

  const lastAssistant = [...items].reverse().find((item) => item.role === "assistant");

  return (
    <section className="mx-auto grid w-full min-w-0 max-w-3xl gap-6">
      <header>
        <h1 className="text-5xl text-pine">{canSend ? "Uma conversa, com limite." : "Mentor"}</h1>
        <p className="mt-3 max-w-[62ch]">O Mentor não substitui a Bíblia, pessoas próximas nem atendimento profissional. Em violência, a prioridade é a sua segurança. Limite diário deste plano: {planLimit}.</p>
      </header>
      {synthetic ? <p className="border border-gold bg-paper px-4 py-3 text-sm">Demonstração sintética. Nenhuma mensagem sai desta página e nenhum modelo é chamado.</p> : null}
      {!canSend ? (
        <EmptyState title="O Mentor está desligado">
          <p>A inteligência artificial só entra na conversa com a sua autorização. O padrão do cadastro é desligado. O consentimento de dados sensíveis também é necessário.</p>
          {canReadHistory ? <p>Você pode ler as conversas salvas enquanto o histórico estiver autorizado. O envio de novas mensagens está desligado.</p> : null}
          {synthetic ? <p>Nesta demonstração, autorizar não chama nenhum modelo. A resposta continua sintética.</p> : null}
          <Link href={settingsHref} className="inline-flex min-h-11 items-center text-pine underline underline-offset-4">Abrir configurações</Link>
        </EmptyState>
      ) : null}
      {canSend ? <fieldset className="flex flex-wrap gap-4">
        <legend className="w-full text-sm font-medium">Modo da conversa</legend>
        <label className="flex min-h-11 items-center gap-2"><input type="radio" name="modo" checked={mode === "reflection"} onChange={() => setMode("reflection")} />Reflexão</label>
        <label className="flex min-h-11 items-center gap-2"><input type="radio" name="modo" checked={mode === "rehearsal"} onChange={() => setMode("rehearsal")} />Ensaio, simulação</label>
      </fieldset> : null}
      {canSend && mode === "rehearsal" ? <p className="border border-gold bg-paper px-4 py-3 text-sm leading-relaxed">Ensaio. Isto é uma simulação textual. Não é a outra pessoa e não prevê a reação real.</p> : null}
      {canReadHistory ? (
        <div>
          <h2 className="text-3xl text-pine">Conversas salvas</h2>
          {conversations.length === 0 ? <p className="mt-2 text-sm">Nenhuma conversa salva ainda.</p> : (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left" onClick={() => void openConversation(conversation.id)} disabled={busy}>
                    <span className="min-w-0 break-words">{conversation.title || "Conversa"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {canSend ? <Button className="mt-3" variant="secondary" disabled={busy} onClick={() => { setItems([]); setConversationId(null); }}>Nova conversa</Button> : null}
        </div>
      ) : (
        canSend ? <p className="text-sm leading-relaxed">{synthetic ? "O histórico está desligado nesta amostra. A conversa fica só na memória da página." : "O histórico da conta está desligado. O que você escrever é enviado para gerar a resposta e não fica salvo nas conversas. No máximo as últimas 8 mensagens desta página seguem com o pedido."}</p> : null
      )}
      <div className="grid gap-4" aria-live="polite">
        {items.length === 0 ? (canSend ? <p className="text-sm">A conversa começa vazia.</p> : null) : items.map((item, index) => (
          <article key={`${item.role}-${index}`} className="border-t border-line pt-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-pine">{item.role === "user" ? "Você" : synthetic ? "Mentor da demonstração" : "Mentor"}</p>
            <p className="mt-2 break-words whitespace-pre-wrap leading-relaxed">{item.content}</p>
            {item.references && item.references.length > 0 ? (
              <ul className="mt-3 text-sm">
                {item.references.map((reference, referenceIndex) => <li key={`${reference}-${referenceIndex}`}>{reference}</li>)}
              </ul>
            ) : null}
            {item.safety ? <p className="mt-3 text-sm leading-relaxed">{safetyCopy(item.safety)}</p> : null}
          </article>
        ))}
      </div>
      {canSend && lastAssistant?.suggestedActivity ? (
        <div className="border border-line bg-paper px-4 py-4">
          <h2 className="text-3xl text-pine">Atividade sugerida</h2>
          <p className="mt-2 font-medium break-words">{lastAssistant.suggestedActivity.title}</p>
          <p className="mt-2 break-words">{lastAssistant.suggestedActivity.description}</p>
          <p className="mt-2 text-sm">Ela só entra na sua lista se você confirmar.</p>
          <Button className="mt-3" pending={busy} disabled={saved.includes(activityKey(lastAssistant.suggestedActivity))} onClick={() => void saveActivity(lastAssistant.suggestedActivity!)}>
            {saved.includes(activityKey(lastAssistant.suggestedActivity)) ? "Atividade incluída" : "Incluir esta atividade"}
          </Button>
        </div>
      ) : null}
      {canSend && lastAssistant?.questions && lastAssistant.questions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {lastAssistant.questions.map((question) => (
            <Button key={question} variant="secondary" disabled={busy} onClick={() => void submit(question)}>{question}</Button>
          ))}
        </div>
      ) : null}
      {canSend && items.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {starters.map((prompt) => <Button key={prompt} variant="secondary" disabled={busy} onClick={() => void submit(prompt)}>{prompt}</Button>)}
        </div>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}
      {canSend ? <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void submit(message); }}>
        <label htmlFor="mensagem" className="text-sm font-medium">Sua mensagem</label>
        <textarea id="mensagem" className={`${controlClass} min-h-32`} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} />
        <p className="text-sm">{message.length}/2000</p>
        <Button type="submit" pending={busy}>Enviar</Button>
      </form> : null}
      {activities.length > 0 ? (
        <div>
          <h2 className="text-3xl text-pine">Atividades confirmadas</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {activities.map((activity) => (
              <li key={activity.id} className="py-3">
                <p className="font-medium break-words">{activity.title}</p>
                <p className="break-words text-sm">{activity.description}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );

  async function saveActivity(activity: { title: string; description: string }) {
    if (!canSend || busy) return;
    setBusy(true);
    setError(null);
    try {
      await confirmActivity(activity);
      setSaved((current) => [...current, activityKey(activity)]);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        onUnauthorized();
        return;
      }
      setError(caught instanceof Error ? caught.message : "Não foi possível guardar a atividade.");
    } finally {
      setBusy(false);
    }
  }
}

function activityKey(activity: { title: string; description: string }) {
  return `${activity.title}::${activity.description}`;
}

function safetyCopy(safety: string) {
  if (safety === "urgent") return "Se existe risco agora, busque ajuda humana imediata. No Brasil, o CVV atende no 188 e emergências no 190. O Mentor não acompanha uma crise no seu lugar.";
  if (safety === "seek_support") return "Vale procurar uma pessoa de confiança ou apoio profissional. O Mentor não faz atendimento clínico, jurídico nem financeiro.";
  return "Reflexão de apoio. Não é voz de Deus, diagnóstico nem conselho profissional.";
}
