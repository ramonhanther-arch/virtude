"use client";

import { useRef, useState, type FormEvent } from "react";
import type { AppState, Consents } from "@/lib/types";
import { isTime, normalizeTime } from "@/components/labels";
import { Alert, Button, Notice, controlClass } from "@/components/ui";

export type SettingsDraft = {
  displayName: string;
  preferredTime: string;
  reminderEmail: boolean;
  consents: Pick<Consents, "ai" | "history" | "journeyContext">;
};

export type GoalDraft = {
  goal: string;
  difficulty: string;
};

export function SettingsPanel({
  state,
  synthetic,
  busy,
  error,
  notice,
  onSave,
  onSaveGoal,
  onExport,
  onDelete,
  onLogout,
}: {
  state: AppState;
  synthetic: boolean;
  busy: boolean;
  error: string | null;
  notice: string | null;
  onSave: (draft: SettingsDraft) => Promise<void>;
  onSaveGoal: (draft: GoalDraft) => Promise<void>;
  onExport: () => Promise<void>;
  onDelete: (input: { confirmation: string; password: string }) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const profileKey = [
    state.profile.displayName,
    state.profile.preferredTime,
    state.profile.reminderEmail,
    state.consents.ai,
    state.consents.history,
    state.consents.journeyContext,
  ].join("|");
  const journey = state.journey;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8">
      <header>
        <h1 className="text-5xl text-pine">Sua conta e seus consentimentos</h1>
      </header>
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Notice>{notice}</Notice> : null}
      <section className="border border-line bg-paper px-5 py-5">
        <h2 className="text-3xl text-pine">Plano</h2>
        <p className="mt-3">{state.plan.code === "premium" ? "Premium" : "Gratuito"}. Limite diário do Mentor: {state.plan.mentorDailyLimit}.</p>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed">Premium está planejado por R$ 29,90. Esta tela não cobra, não pede cartão e não muda o seu plano.</p>
      </section>
      <AccountForm key={profileKey} state={state} busy={busy} onSave={onSave} />
      {journey?.status === "active" ? (
        <GoalForm
          key={`${journey.id}|${journey.goal}|${journey.difficulty}`}
          goal={journey.goal}
          difficulty={journey.difficulty}
          busy={busy}
          onSave={onSaveGoal}
        />
      ) : journey ? (
        <section className="grid gap-3">
          <h2 className="text-3xl text-pine">Objetivo desta jornada</h2>
          <p className="break-words whitespace-pre-wrap"><span className="block text-sm font-medium">Dificuldade</span>{journey.difficulty}</p>
          <p className="break-words whitespace-pre-wrap"><span className="block text-sm font-medium">Objetivo</span>{journey.goal}</p>
          <p className="max-w-[62ch] text-sm">Esta jornada já foi concluída. O ajuste volta a ficar disponível quando houver uma jornada em curso.</p>
        </section>
      ) : null}
      <section className="grid gap-3">
        <h2 className="text-3xl text-pine">Seus dados</h2>
        <p className="max-w-[62ch] text-sm">{synthetic ? "A exportação da demonstração baixa só o estado desta página, marcado como amostra." : "A exportação reúne os dados privados da conta em um arquivo JSON."}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" pending={busy} onClick={() => void onExport()}>Exportar dados</Button>
          <Button variant="secondary" pending={busy} onClick={() => void onLogout()}>{synthetic ? "Encerrar demonstração" : "Sair"}</Button>
        </div>
      </section>
      <DeleteAccount busy={busy} error={error} synthetic={synthetic} onDelete={onDelete} />
    </div>
  );
}

function AccountForm({ state, busy, onSave }: { state: AppState; busy: boolean; onSave: (draft: SettingsDraft) => Promise<void> }) {
  const [name, setName] = useState(state.profile.displayName);
  const [time, setTime] = useState(state.profile.preferredTime);
  const [reminderEmail, setReminderEmail] = useState(state.profile.reminderEmail);
  const [ai, setAi] = useState(state.consents.ai);
  const [history, setHistory] = useState(state.consents.history);
  const [journeyContext, setJourneyContext] = useState(state.consents.journeyContext);
  const [localError, setLocalError] = useState<string | null>(null);
  const removesHistory = state.consents.history && !history;

  async function save(event: FormEvent) {
    event.preventDefault();
    const preferredTime = normalizeTime(time);
    if (name.trim().length < 1 || name.trim().length > 80) {
      setLocalError("O nome precisa ter entre 1 e 80 caracteres.");
      return;
    }
    if (!isTime(preferredTime)) {
      setLocalError("Use um horário válido, no formato 08:00.");
      return;
    }
    setLocalError(null);
    try {
      await onSave({ displayName: name.trim(), preferredTime, reminderEmail, consents: { ai, history, journeyContext } });
    } catch {
      return;
    }
  }

  return (
    <form className="grid gap-5" onSubmit={(event) => void save(event)}>
      {localError ? <Alert>{localError}</Alert> : null}
      <div>
        <label htmlFor="nome" className="text-sm font-medium">Nome</label>
        <input id="nome" className={`${controlClass} mt-2`} autoComplete="name" maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div>
        <label htmlFor="horario" className="text-sm font-medium">Horário preferido</label>
        <p id="horario-dica" className="mt-1 text-sm">O lembrete por e-mail, se você autorizar, usa este horário. Desligar não apaga a jornada. Um dia sem prática não é cobrado.</p>
        <input id="horario" className={`${controlClass} mt-2`} type="time" aria-describedby="horario-dica" required value={normalizeTime(time)} onChange={(event) => setTime(event.target.value)} />
        <label className="mt-3 flex min-h-11 items-start gap-3">
          <input type="checkbox" checked={reminderEmail} onChange={(event) => setReminderEmail(event.target.checked)} />
          <span>Receber lembrete por e-mail neste horário.</span>
        </label>
      </div>
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Consentimentos</legend>
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" checked disabled readOnly />
          <span>Dados sensíveis autorizados. Retirar este consentimento só acontece ao excluir a conta.</span>
        </label>
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" checked={ai} onChange={(event) => setAi(event.target.checked)} />
          <span>Permitir que o Mentor use inteligência artificial.</span>
        </label>
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" checked={history} onChange={(event) => setHistory(event.target.checked)} />
          <span>Guardar o histórico das conversas.</span>
        </label>
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" checked={journeyContext} onChange={(event) => setJourneyContext(event.target.checked)} />
          <span>Compartilhar o contexto da jornada atual com o Mentor.</span>
        </label>
        {removesHistory ? <p className="text-sm">Desativar o histórico apaga as conversas salvas agora.</p> : null}
      </fieldset>
      <Button type="submit" pending={busy}>Salvar</Button>
    </form>
  );
}

function GoalForm({
  goal: initialGoal,
  difficulty: initialDifficulty,
  busy,
  onSave,
}: {
  goal: string;
  difficulty: string;
  busy: boolean;
  onSave: (draft: GoalDraft) => Promise<void>;
}) {
  const [goal, setGoal] = useState(initialGoal);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [localError, setLocalError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (goal.trim().length < 1 || goal.trim().length > 600) {
      setLocalError("Escreva um objetivo de até 600 caracteres.");
      return;
    }
    if (difficulty.trim().length < 1 || difficulty.trim().length > 600) {
      setLocalError("Descreva a dificuldade em até 600 caracteres.");
      return;
    }
    setLocalError(null);
    try {
      await onSave({ goal: goal.trim(), difficulty: difficulty.trim() });
    } catch {
      return;
    }
  }

  return (
    <form className="grid gap-5" onSubmit={(event) => void save(event)}>
      <h2 className="text-3xl text-pine">Objetivo da jornada</h2>
      <p className="max-w-[62ch] text-sm">Ao trocar de jornada, o texto anterior pode continuar. Ajuste aqui a dificuldade e o objetivo da jornada em curso, sem apagar os dias já registrados.</p>
      {localError ? <Alert>{localError}</Alert> : null}
      <div>
        <label htmlFor="dificuldade-jornada" className="text-sm font-medium">Qual sua principal dificuldade nessa área?</label>
        <p id="dificuldade-jornada-dica" className="mt-1 text-sm">Uma resposta curta basta. Não inclua nomes nem detalhes íntimos.</p>
        <textarea id="dificuldade-jornada" className={`${controlClass} mt-2 min-h-28`} aria-describedby="dificuldade-jornada-dica" maxLength={600} required value={difficulty} onChange={(event) => setDifficulty(event.target.value)} />
        <p className="mt-1 text-sm">{difficulty.length}/600</p>
      </div>
      <div>
        <label htmlFor="objetivo-jornada" className="text-sm font-medium">Objetivo</label>
        <textarea id="objetivo-jornada" className={`${controlClass} mt-2 min-h-28`} maxLength={600} required value={goal} onChange={(event) => setGoal(event.target.value)} />
        <p className="mt-1 text-sm">{goal.length}/600</p>
      </div>
      <Button type="submit" pending={busy}>Salvar objetivo</Button>
    </form>
  );
}

function DeleteAccount({
  busy,
  error,
  synthetic,
  onDelete,
}: {
  busy: boolean;
  error: string | null;
  synthetic: boolean;
  onDelete: (input: { confirmation: string; password: string }) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);

  return (
    <section className="grid gap-3">
      <h2 className="text-3xl text-pine">Excluir conta</h2>
      <p className="max-w-[62ch] text-sm">{synthetic ? "Na amostra, a exclusão só apaga a memória desta página. A senha não é verificada." : "A exclusão pede a palavra EXCLUIR e a sua senha. Ela apaga a conta e os dados associados. Não há como desfazer nesta tela."}</p>
      <Button variant="danger" onClick={() => { setDialogError(null); dialogRef.current?.showModal(); }}>Quero excluir</Button>
      <dialog ref={dialogRef} aria-labelledby="excluir-titulo">
        <form className="grid gap-4 bg-paper px-5 py-6" method="dialog" onSubmit={(event) => {
          event.preventDefault();
          if (confirmation !== "EXCLUIR") {
            setDialogError("Digite EXCLUIR em maiúsculas.");
            return;
          }
          if (!password || password.length > 128) {
            setDialogError("Informe a senha da conta.");
            return;
          }
          setDialogError(null);
          void onDelete({ confirmation, password }).then(() => {
            dialogRef.current?.close();
            setPassword("");
            setConfirmation("");
          }).catch(() => undefined);
        }}>
          <h2 id="excluir-titulo" className="text-4xl text-pine">Confirmar exclusão</h2>
          {dialogError ? <Alert>{dialogError}</Alert> : null}
          {error ? <Alert>{error}</Alert> : null}
          <div>
            <label htmlFor="confirmacao" className="text-sm font-medium">Digite EXCLUIR</label>
            <input id="confirmacao" className={`${controlClass} mt-2`} autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </div>
          <div>
            <label htmlFor="senha-exclusao" className="text-sm font-medium">Senha</label>
            <input id="senha-exclusao" className={`${controlClass} mt-2`} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="danger" pending={busy}>Excluir conta</Button>
            <Button variant="quiet" onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
