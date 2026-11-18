import Link from "next/link";
import { missions } from "@/content/missions";
import { buttonClass } from "@/components/ui";

const preview = missions.length === 0 || missions.some((mission) => mission.reviewStatus !== "approved");

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-2 md:py-4">
        <Link href="/" className="font-serif text-3xl text-pine">Virtude</Link>
        <nav aria-label="Páginas públicas" className="flex flex-wrap items-center gap-x-4 gap-y-0 text-sm md:justify-end [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center">
          <a href="#como-funciona">Como funciona</a>
          <a href="#jornadas">Jornadas</a>
          <a href="#mentor">Mentor</a>
          <a href="#planos">Planos</a>
          <a href="#duvidas">Dúvidas</a>
          <Link href="/entrar">Entrar</Link>
          <Link href={preview ? "/demo" : "/cadastro"} className={buttonClass("primary")}>{preview ? "Ver uma amostra" : "Começar minha jornada"}</Link>
        </nav>
      </div>
    </header>
  );
}

export function SimpleHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link href="/" className="font-serif text-3xl text-pine">Virtude</Link>
        <nav aria-label="Acesso" className="flex flex-wrap gap-4 text-sm">
          <Link href="/entrar">Entrar</Link>
          <Link href="/cadastro">Criar conta</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-6 px-5 py-10 text-sm">
        <div className="max-w-md">
          <p className="font-serif text-3xl text-pine">Virtude</p>
          <p className="mt-2 leading-relaxed">Não apenas conhecer a Palavra. Aprender a vivê-la.</p>
          <p className="mt-2 leading-relaxed">Aprendizado bíblico e reflexão para o cotidiano. Não é um serviço de emergência.</p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de uso</Link>
          <Link href="/entrar">Entrar</Link>
        </nav>
      </div>
    </footer>
  );
}
