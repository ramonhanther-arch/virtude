import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/components/cn";

const buttonVariants = {
  primary: "bg-pine text-sand hover:bg-pine-deep",
  secondary: "border border-pine bg-transparent text-pine hover:bg-pine/5",
  quiet: "min-h-11 px-0 text-pine underline-offset-4 hover:underline",
  danger: "border border-ink bg-transparent text-ink hover:bg-ink/5",
  inverse: "bg-sand text-pine hover:bg-paper",
} as const;

export function buttonClass(variant: keyof typeof buttonVariants = "primary", className?: string) {
  return cn(
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
    buttonVariants[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  pending = false,
  className,
  children,
  type = "button",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants; pending?: boolean }) {
  return (
    <button type={type} className={buttonClass(variant, className)} {...props} aria-busy={pending || undefined} disabled={disabled || pending}>
      {pending ? "Aguarde" : children}
    </button>
  );
}

export const controlClass = "w-full min-w-0 border border-field bg-paper px-3 py-3 text-base leading-6 text-ink";

export function PageMain({ children, className }: { children: ReactNode; className?: string }) {
  return <main id="conteudo" className={cn("min-w-0", className)}>{children}</main>;
}

export function Alert({ children }: { children: ReactNode }) {
  return <p role="alert" className="border border-ink/25 bg-paper px-4 py-3 text-sm leading-relaxed text-ink">{children}</p>;
}

export function Notice({ children }: { children: ReactNode }) {
  return <p role="status" className="border border-line bg-paper px-4 py-3 text-sm leading-relaxed">{children}</p>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-line bg-paper px-5 py-8">
      <h2 className="text-4xl text-pine">{title}</h2>
      <div className="mt-4 max-w-[62ch] space-y-3 text-base leading-relaxed">{children}</div>
    </div>
  );
}

export function LoadingPanel({ label = "Carregando" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto w-full max-w-3xl px-5 py-16">
      <p className="text-sm">{label}</p>
      <div className="mt-6 space-y-3" aria-hidden="true">
        <div className="h-10 w-2/3 bg-pine/10 motion-safe:animate-pulse" />
        <div className="h-4 w-full bg-pine/10 motion-safe:animate-pulse" />
        <div className="h-4 w-5/6 bg-pine/10 motion-safe:animate-pulse" />
        <div className="h-36 w-full bg-pine/10 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

export function SetupPanel() {
  return (
    <PageMain className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-pine">Virtude</p>
      <h1 className="mt-3 text-5xl text-pine">O Virtude está em preparação</h1>
      <p className="mt-5 max-w-[48ch] text-lg leading-relaxed">
        O acesso à sua conta ainda não está disponível neste ambiente. Você pode ver uma amostra da prática, com dados fictícios, sem iniciar uma jornada.
      </p>
      <Link href="/demo" className={`${buttonClass("primary")} mt-8`}>Ver uma amostra</Link>
    </PageMain>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <PageMain className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-5 py-16">
      <h1 className="text-5xl text-pine">Não foi possível carregar</h1>
      <Alert>{message || "Tente novamente em instantes."}</Alert>
      <Button onClick={onRetry}>Tentar de novo</Button>
    </PageMain>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const hintId = hint ? `${id}-dica` : undefined;
  const errorId = error ? `${id}-erro` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      {hint ? <p id={hintId} className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink/80">{hint}</p> : null}
      <div className="mt-2">{children({ id, describedBy, invalid: Boolean(error) })}</div>
      {error ? <p id={errorId} role="alert" className="mt-2 text-sm leading-relaxed">Erro: {error}</p> : null}
    </div>
  );
}
