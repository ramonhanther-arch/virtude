import type { Metadata } from "next";
import { SimpleHeader, SiteFooter } from "@/components/site";
import { PageMain } from "@/components/ui";

export const metadata: Metadata = { title: "Termos" };

export default function Page() {
  return (
    <>
      <SimpleHeader />
      <PageMain className="mx-auto w-full max-w-3xl px-5 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-pine">Termos</p>
        <h1 className="mt-3 text-6xl text-pine">Como usar esta versão</h1>
        <div className="mt-8 grid gap-5 leading-relaxed">
          <p>Estes termos descrevem a versão em construção do Virtude. A revisão jurídica humana ainda não foi concluída e continua sendo um gate de publicação.</p>
          <p>O Virtude oferece práticas de 21 dias e um Mentor de reflexão. Ele não substitui a Bíblia, acompanhamento pastoral, nem atendimento médico, psicológico, jurídico ou financeiro. Não promete transformação, cura, prosperidade nem mensagem de Deus.</p>
          <p>Em situação de violência ou risco, a segurança vem antes de reconciliação. O ensaio do Mentor é uma simulação e não prevê outra pessoa.</p>
          <p>Os textos das jornadas permanecem pendentes até a revisão humana. A prática autenticada não é liberada enquanto essa revisão não acontecer, salvo liberação explícita de um ambiente de desenvolvimento.</p>
          <p>Uma jornada fica ativa por vez. A ausência não pune nem avança o dia. Há no máximo uma progressão por data.</p>
          <p>O plano gratuito não tem cobrança. O Premium está planejado por R$ 29,90 e não pode ser comprado nem ativado por esta interface.</p>
          <p>Você pode exportar seus dados e excluir a conta. O uso depende dos consentimentos marcados por você.</p>
        </div>
      </PageMain>
      <SiteFooter />
    </>
  );
}
