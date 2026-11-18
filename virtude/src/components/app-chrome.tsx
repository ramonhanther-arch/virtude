"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import { cn } from "@/components/cn";

export type ChromeItem = { href: string; label: string; icon: LucideIcon; current: boolean };

export function AppChrome({
  homeHref,
  items,
  displayName,
  exitLabel,
  onExit,
  exitPending,
  exitError,
  banners,
  children,
}: {
  homeHref: string;
  items: ChromeItem[];
  displayName: string;
  exitLabel: string;
  onExit: () => void;
  exitPending?: boolean;
  exitError?: string | null;
  banners?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="surface-pine hidden min-w-0 bg-pine text-sand md:flex md:min-h-dvh md:flex-col md:justify-between md:px-4 md:py-6">
        <div className="min-w-0">
          <Link href={homeHref} className="block px-2 font-serif text-4xl">Virtude</Link>
          {displayName ? <p className="mt-2 px-2 text-sm break-words">{displayName}</p> : null}
          <nav aria-label="Jornada" className="mt-8 grid gap-1">
            {items.map((item) => <NavLink key={item.href} item={item} />)}
          </nav>
        </div>
        <div className="px-2">
          {exitError ? <p role="alert" className="mb-3 text-sm">{exitError}</p> : null}
          <button type="button" onClick={onExit} disabled={exitPending} className="inline-flex min-h-11 items-center gap-2 text-sm disabled:opacity-50">
            <LogOut aria-hidden="true" className="size-4" strokeWidth={1.5} />
            {exitPending ? "Aguarde" : exitLabel}
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 md:hidden">
          <Link href={homeHref} className="font-serif text-3xl text-pine">Virtude</Link>
          <button type="button" onClick={onExit} disabled={exitPending} className="inline-flex min-h-11 items-center text-sm disabled:opacity-50">
            {exitPending ? "Aguarde" : exitLabel}
          </button>
        </header>
        {exitError ? <p role="alert" className="px-5 pt-3 text-sm md:hidden">{exitError}</p> : null}
        {banners ? <div className="mx-auto grid max-w-[53rem] gap-1.5 px-5 pt-3 md:px-10">{banners}</div> : null}
        <div className="min-w-0 px-5 py-4 pb-28 md:px-10 md:py-6 md:pb-16">{children}</div>
        <nav aria-label="Jornada" className={`fixed inset-x-0 bottom-0 z-20 grid border-t border-line bg-sand pb-[max(0.35rem,env(safe-area-inset-bottom))] md:hidden ${items.length > 5 ? "grid-cols-6" : "grid-cols-5"}`}>
          {items.map((item) => <NavLink key={item.href} item={item} compact />)}
        </nav>
      </div>
    </div>
  );
}

function NavLink({ item, compact = false }: { item: ChromeItem; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={item.current ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[0.68rem] leading-tight",
        compact ? "min-h-16 text-ink" : "min-h-11 flex-row justify-start gap-2 px-2 py-2 text-sm text-sand",
        item.current && compact && "text-pine",
        item.current && !compact && "bg-sand/10",
      )}
    >
      <Icon aria-hidden="true" className={cn("size-5", item.current && compact && "text-pine")} strokeWidth={1.5} />
      <span className="max-w-full break-words">{item.label}</span>
      {item.current ? <span className={cn("h-px w-4 bg-gold", compact ? "block" : "ml-auto block w-4")} aria-hidden="true" /> : <span className="h-px w-4" aria-hidden="true" />}
    </Link>
  );
}
