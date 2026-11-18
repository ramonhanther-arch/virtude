"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, CalendarDays, ClipboardCheck, House, MessageCircle, Settings } from "lucide-react";
import { ApiClientError, apiSend, isSetupError } from "@/components/api-client";
import { AppChrome } from "@/components/app-chrome";
import { ReviewNote, reviewKind } from "@/components/practice";
import { RequireApp, SessionProvider, useSession } from "@/components/session";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <RequireApp>
        <AuthenticatedChrome>{children}</AuthenticatedChrome>
      </RequireApp>
    </SessionProvider>
  );
}

function AuthenticatedChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSession();
  const [exitPending, setExitPending] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);
  if (!state) return null;
  const items = [
    { href: "/app", label: "Hoje", icon: House, current: pathname === "/app" },
    { href: "/app/jornada", label: "Jornada", icon: BookOpen, current: pathname.startsWith("/app/jornada") },
    { href: "/app/mentor", label: "Mentor", icon: MessageCircle, current: pathname.startsWith("/app/mentor") },
    { href: "/app/evolucao", label: "Evolução", icon: CalendarDays, current: pathname.startsWith("/app/evolucao") },
    { href: "/app/configuracoes", label: "Ajustes", icon: Settings, current: pathname.startsWith("/app/configuracoes") },
    ...(state.reviewer ? [{ href: "/app/revisao", label: "Revisão", icon: ClipboardCheck, current: pathname.startsWith("/app/revisao") }] : []),
  ];
  const kind = reviewKind(state);

  async function exit() {
    setExitPending(true);
    setExitError(null);
    try {
      await apiSend("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) });
      router.replace("/entrar");
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        router.replace("/entrar");
        return;
      }
      setExitError(isSetupError(error) ? "Configuração indisponível. Nenhuma sessão nova foi criada." : error instanceof Error ? error.message : "Não foi possível sair.");
      setExitPending(false);
    }
  }

  return (
    <AppChrome homeHref="/app" items={items} displayName={state.profile.displayName} exitLabel="Sair" onExit={() => void exit()} exitPending={exitPending} exitError={exitError} banners={kind ? <ReviewNote kind={kind} /> : null}>
      <main id="conteudo" className="min-w-0">{children}</main>
    </AppChrome>
  );
}
