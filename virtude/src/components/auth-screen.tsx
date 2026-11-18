"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import type { AppState } from "@/lib/types";
import { ApiClientError, apiSend, isSetupError, safeInternalPath } from "@/components/api-client";
import { SimpleHeader } from "@/components/site";
import { Alert, Button, Notice, PageMain, SetupPanel, controlClass } from "@/components/ui";

type Mode = "login" | "signup" | "forgot" | "reset";

const copy: Record<Mode, { title: string; action: "login" | "signup" | "forgot" | "reset"; submit: string }> = {
  login: { title: "Entrar", action: "login", submit: "Entrar" },
  signup: { title: "Criar conta", action: "signup", submit: "Criar conta" },
  forgot: { title: "Recuperar acesso", action: "forgot", submit: "Enviar instruções" },
  reset: { title: "Definir nova senha", action: "reset", submit: "Salvar senha" },
};

export function AuthScreen({ mode, nextPath, notice }: { mode: Mode; nextPath?: string | null; notice?: string | null }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "setup" | "form">("loading");
  const [sessionReady, setSessionReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(notice === "conta-excluida" ? "Conta excluída. A sessão foi encerrada." : null);
  const [busy, setBusy] = useState(false);
  const content = copy[mode];

  useEffect(() => {
    let active = true;
    apiSend<AppState>("/api/state").then((state) => {
      if (!active) return;
      setSessionReady(true);
      if (mode === "reset") {
        setPhase("form");
        return;
      }
      router.replace(safeInternalPath(nextPath, state.journey ? "/app" : "/onboarding"));
    }).catch((caught: unknown) => {
      if (!active) return;
      if (isSetupError(caught)) {
        setPhase("setup");
        return;
      }
      setSessionReady(false);
      setPhase("form");
    });
    return () => {
      active = false;
    };
  }, [mode, nextPath, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validate(mode, email, password);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const body = mode === "forgot"
      ? { action: "forgot" as const, email: email.trim() }
      : mode === "reset"
        ? { action: "reset" as const, password }
        : { action: content.action, email: email.trim(), password };
    try {
      const result = await apiSend<{ message?: string; redirectTo?: string }>("/api/auth", { method: "POST", body: JSON.stringify(body) });
      if (result.redirectTo) {
        router.replace(safeInternalPath(result.redirectTo, "/app"));
        return;
      }
      if (result.message) setMessage(result.message);
      setBusy(false);
    } catch (caught) {
      if (isSetupError(caught)) {
        setPhase("setup");
        return;
      }
      setError(caught instanceof ApiClientError ? caught.message : "Não foi possível concluir.");
      setBusy(false);
    }
  }

  if (phase === "loading") return <SetupShell><p role="status">Carregando</p></SetupShell>;
  if (phase === "setup") return <SetupPanel />;

  return (
    <SetupShell>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-pine">Conta</p>
      <h1 className="mt-3 text-5xl text-pine">{content.title}</h1>
      {mode === "signup" ? <p className="mt-4 max-w-[48ch]">O consentimento dos dados sensíveis acontece no passo seguinte, não nesta tela. A senha precisa ter pelo menos 12 caracteres.</p> : null}
      {mode === "reset" ? <p className="mt-4 max-w-[48ch]">{sessionReady ? "A sessão de recuperação está ativa. Defina uma senha nova, com pelo menos 12 caracteres." : "Abra o link recebido por e-mail. Sem essa sessão, a troca de senha não acontece."}</p> : null}
      {mode === "forgot" ? <p className="mt-4">Se houver uma conta, as instruções chegam por e-mail.</p> : null}
      <form className="mt-6 grid gap-4" onSubmit={(event) => void submit(event)}>
        {mode !== "reset" ? (
          <div>
            <label htmlFor="email" className="text-sm font-medium">E-mail</label>
            <input id="email" className={`${controlClass} mt-2`} type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
        ) : null}
        {mode !== "forgot" ? (
          <div>
            <label htmlFor="senha" className="text-sm font-medium">{mode === "reset" ? "Nova senha" : "Senha"}</label>
            <div className="mt-2 flex min-w-0 gap-2">
              <input id="senha" className={controlClass} type={visible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 1 : 12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center border border-line bg-paper px-3" aria-pressed={visible} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible((current) => !current)}>
                {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
              </button>
            </div>
          </div>
        ) : null}
        {error ? <Alert>{error}</Alert> : null}
        {message ? <Notice>{message}</Notice> : null}
        <Button type="submit" pending={busy}>{content.submit}</Button>
      </form>
      <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Outras entradas">
        {mode !== "login" ? <Link href="/entrar">Entrar</Link> : null}
        {mode !== "signup" ? <Link href="/cadastro">Criar conta</Link> : null}
        {mode !== "forgot" ? <Link href="/recuperar">Recuperar acesso</Link> : null}
      </nav>
    </SetupShell>
  );
}

function SetupShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SimpleHeader />
      <PageMain className="mx-auto flex min-h-[70dvh] w-full max-w-xl flex-col justify-center px-5 py-12">{children}</PageMain>
    </>
  );
}

function validate(mode: Mode, email: string, password: string) {
  if (mode !== "reset" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Informe um e-mail válido.";
  if (email.trim().length > 254) return "O e-mail passa de 254 caracteres.";
  if (mode === "forgot") return null;
  if (!password) return "Informe a senha.";
  if (password.length > 128) return "A senha passa de 128 caracteres.";
  if (mode !== "login" && password.length < 12) return "A senha precisa ter pelo menos 12 caracteres.";
  return null;
}
