"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { AppState } from "@/lib/types";
import { ApiClientError, isSetupError, loadAccount, safeInternalPath } from "@/components/api-client";
import { ErrorPanel, LoadingPanel, SetupPanel } from "@/components/ui";

type SessionStatus = "loading" | "ready" | "anonymous" | "setup" | "error";

type SessionValue = {
  status: SessionStatus;
  state: AppState | null;
  error: string | null;
  reload: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("A sessão ainda não está disponível nesta tela.");
  return value;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settle = useCallback((caught: unknown) => {
    if (caught instanceof ApiClientError && caught.status === 401) {
      setState(null);
      setStatus("anonymous");
      setError(caught.message);
      return;
    }
    if (isSetupError(caught)) {
      setStatus("setup");
      setError(caught instanceof Error ? caught.message : null);
      return;
    }
    setError(caught instanceof Error ? caught.message : "Não foi possível carregar.");
    setStatus((current) => (current === "ready" ? current : "error"));
  }, []);

  const reload = useCallback(async () => {
    try {
      const next = await loadAccount();
      setState(next);
      setStatus("ready");
      setError(null);
    } catch (caught: unknown) {
      settle(caught);
    }
  }, [settle]);

  useEffect(() => {
    let active = true;
    loadAccount().then(
      (next) => {
        if (!active) return;
        setState(next);
        setStatus("ready");
        setError(null);
      },
      (caught: unknown) => {
        if (!active) return;
        settle(caught);
      },
    );
    return () => {
      active = false;
    };
  }, [settle]);

  return <SessionContext.Provider value={{ status, state, error, reload }}>{children}</SessionContext.Provider>;
}

export function RequireApp({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.status === "anonymous") {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/entrar?next=${encodeURIComponent(safeInternalPath(next, "/app"))}`);
    } else if (session.status === "ready" && session.state && !session.state.journey) {
      router.replace("/onboarding");
    }
  }, [router, session.state, session.status]);

  if (session.status === "loading" || session.status === "anonymous") return <LoadingPanel />;
  if (session.status === "setup") return <SetupPanel />;
  if (session.status === "error" || !session.state) return <ErrorPanel message={session.error} onRetry={() => void session.reload()} />;
  if (!session.state.journey) return <LoadingPanel label="Abrindo o início da jornada" />;
  return children;
}

export function RequireOnboarding({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.status === "anonymous") router.replace("/entrar?next=/onboarding");
    else if (session.status === "ready" && session.state?.journey) router.replace("/app");
  }, [router, session.state, session.status]);

  if (session.status === "loading" || session.status === "anonymous") return <LoadingPanel />;
  if (session.status === "setup") return <SetupPanel />;
  if (session.status === "error" || !session.state) return <ErrorPanel message={session.error} onRetry={() => void session.reload()} />;
  if (session.state.journey) return <LoadingPanel label="Abrindo sua jornada" />;
  return <main id="conteudo" className="mx-auto w-full max-w-3xl px-5 py-10">{children}</main>;
}
