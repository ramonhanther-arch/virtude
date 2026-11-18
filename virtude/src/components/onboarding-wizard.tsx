"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { focusLabels } from "@/content/missions";
import type { Focus } from "@/lib/types";
import { ApiClientError, apiSend } from "@/components/api-client";
import { focuses, isTime, normalizeTime, pilotFocuses } from "@/components/labels";
import { useSession } from "@/components/session";
import { Alert, Button, controlClass } from "@/components/ui";

export function OnboardingWizard() {
  const router = useRouter();
  const { state } = useSession();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(state?.profile.displayName ?? "");
  const [focus, setFocus] = useState<Focus | "">("");
  const [goal, setGoal] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [preferredTime, setPreferredTime] = useState(state?.profile.preferredTime || "08:00");
  const [sensitive, setSensitive] = useState(false);
  const [ai, setAi] = useState(false);
  const [history, setHistory] = useState(false);
  const [journeyContext, setJourneyContext] = useState(false);
  const [reminderEmail, setReminderEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function next() {
    const problem = step === 1 ? validateIdentity(displayName, focus) : step === 2 ? validatePurpose(difficulty, goal) : null;
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((current) => Math.min(3, current + 1));
  }

  async function finish(event: FormEvent) {
    event.preventDefault();
    const time = normalizeTime(preferredTime);
    const problem = validateIdentity(displayName, focus) ?? validatePurpose(difficulty, goal) ?? (!isTime(time) ? "Use um horário válido, no formato 08:00." : null) ?? (!sensitive ? "O consentimento de dados sensíveis é necessário para começar." : null);
    if (problem || !focus) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          displayName: displayName.trim(),
          focus,
          difficulty: difficulty.trim(),
          goal: goal.trim(),
          preferredTime: time,
          reminderEmail,
          sensitiveDataConsent: true,
          aiConsent: ai,
          historyConsent: history,
          journeyContextConsent: journeyContext,
        }),
      });
      router.replace("/app");
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        router.replace("/entrar?next=/onboarding");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Não foi possível começar.");
      setBusy(false);
    }
  }

  return (
    <form className="mx-auto grid w-full max-w-xl gap-6" onSubmit={(event) => void finish(event)}>
      <header>
        <h1 className="text-5xl text-pine">Etapa {step} de 3</h1>
      </header>
      {step === 1 ? (
        <div className="grid gap-5">
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium">Qual área da sua vida você mais deseja transformar à luz dos ensinamentos de Cristo?</legend>
            {focuses.map((item) => (
              <div key={item} className="border border-line bg-paper px-3 py-3">
                <label className="flex min-h-11 items-start gap-3">
                  <input type="radio" name="foco" value={item} checked={focus === item} aria-describedby={`${item}-nota`} onChange={() => setFocus(item)} />
                  <span className="font-medium">{focusLabels[item]}</span>
                </label>
                <p id={`${item}-nota`} className="mt-1 text-sm">{pilotFocuses.has(item) ? "Parte do piloto inicial." : "Nova área, no mesmo formato de 21 dias. Também aguarda revisão humana."}</p>
              </div>
            ))}
          </fieldset>
          <div>
            <label htmlFor="nome" className="text-sm font-medium">Como você quer ser chamado</label>
            <p id="nome-dica" className="mt-1 text-sm">Pode ser um nome ou apelido.</p>
            <input id="nome" className={`${controlClass} mt-2`} autoComplete="name" aria-describedby="nome-dica" maxLength={80} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </div>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="grid gap-5">
          <div>
            <label htmlFor="dificuldade" className="text-sm font-medium">Qual sua principal dificuldade nessa área?</label>
            <p id="dificuldade-dica" className="mt-1 text-sm">Uma resposta curta basta. Não inclua nomes nem detalhes íntimos.</p>
            <textarea id="dificuldade" className={`${controlClass} mt-2 min-h-28`} aria-describedby="dificuldade-dica" maxLength={600} required value={difficulty} onChange={(event) => setDifficulty(event.target.value)} />
          </div>
          <div>
            <label htmlFor="objetivo" className="text-sm font-medium">O que você gostaria de melhorar nas próximas semanas?</label>
            <textarea id="objetivo" className={`${controlClass} mt-2 min-h-28`} maxLength={600} required value={goal} onChange={(event) => setGoal(event.target.value)} />
          </div>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="grid gap-5">
          <div>
            <label htmlFor="horario" className="text-sm font-medium">Horário em que você prefere praticar</label>
            <p id="horario-dica" className="mt-1 text-sm">O horário fica salvo no perfil. O lembrete por e-mail é opcional e pode ser desligado depois. Se você não abrir o app, nada é cobrado.</p>
            <input id="horario" className={`${controlClass} mt-2`} type="time" aria-describedby="horario-dica" required value={normalizeTime(preferredTime)} onChange={(event) => setPreferredTime(event.target.value)} />
            <label className="mt-3 flex items-start gap-3">
              <input type="checkbox" checked={reminderEmail} onChange={(event) => setReminderEmail(event.target.checked)} />
              <span>Quero receber um lembrete por e-mail neste horário.</span>
            </label>
          </div>
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium">Consentimentos</legend>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={sensitive} onChange={(event) => setSensitive(event.target.checked)} required />
              <span>Autorizo o tratamento dos dados sensíveis desta jornada, incluindo reflexões sobre fé e vida pessoal. Este consentimento é necessário.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={ai} onChange={(event) => setAi(event.target.checked)} />
              <span>Permitir que o Mentor use inteligência artificial nas respostas.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={history} onChange={(event) => setHistory(event.target.checked)} />
              <span>Guardar o histórico das conversas com o Mentor.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={journeyContext} onChange={(event) => setJourneyContext(event.target.checked)} />
              <span>Compartilhar o contexto da jornada atual com o Mentor.</span>
            </label>
            <p className="text-sm">Os três últimos começam desmarcados e podem mudar depois. Desligar o histórico apaga as conversas salvas. Desligar a IA impede novas respostas e a gravação de novas conversas, mas permite ler o histórico enquanto ele estiver autorizado.</p>
          </fieldset>
        </div>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex flex-wrap gap-3">
        {step > 1 ? <Button variant="secondary" onClick={() => { setError(null); setStep((current) => current - 1); }}>Voltar</Button> : null}
        {step < 3 ? <Button onClick={next}>Continuar</Button> : <Button type="submit" pending={busy}>Começar a jornada</Button>}
      </div>
    </form>
  );
}

function validateIdentity(displayName: string, focus: Focus | "") {
  if (displayName.trim().length < 1 || displayName.trim().length > 80) return "O nome precisa ter entre 1 e 80 caracteres.";
  if (!focus) return "Escolha uma das quatro jornadas.";
  return null;
}

function validatePurpose(difficulty: string, goal: string) {
  if (difficulty.trim().length < 1 || difficulty.trim().length > 600) return "Descreva a dificuldade em até 600 caracteres.";
  if (goal.trim().length < 1 || goal.trim().length > 600) return "Escreva um objetivo de até 600 caracteres.";
  return null;
}
