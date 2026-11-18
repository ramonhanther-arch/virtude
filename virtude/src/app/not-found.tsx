import Link from "next/link";
import { SimpleHeader } from "@/components/site";
import { PageMain, buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <SimpleHeader />
      <PageMain className="mx-auto flex min-h-[70dvh] max-w-xl flex-col justify-center px-5 py-16">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-pine">404</p>
        <h1 className="mt-3 text-6xl text-pine">Esta página não existe.</h1>
        <p className="mt-4">O endereço não corresponde a uma tela do Virtude.</p>
        <Link href="/" className={`${buttonClass("primary")} mt-6 w-fit`}>Voltar ao início</Link>
      </PageMain>
    </>
  );
}
