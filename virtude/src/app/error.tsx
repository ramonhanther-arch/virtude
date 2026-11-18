"use client";

import { PageMain, Button } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageMain className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-5 py-16">
      <h1 className="text-5xl text-pine">Não foi possível abrir esta página</h1>
      <p>O conteúdo do seu relato não é mostrado aqui.</p>
      <Button onClick={reset}>Tentar de novo</Button>
    </PageMain>
  );
}
