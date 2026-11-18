import type { Metadata } from "next";
import { SimpleHeader, SiteFooter } from "@/components/site";
import { PageMain } from "@/components/ui";

export const metadata: Metadata = { title: "Privacidade" };

export default function Page() {
  return (
    <>
      <SimpleHeader />
      <PageMain className="mx-auto w-full max-w-3xl px-5 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-pine">Privacidade</p>
        <h1 className="mt-3 text-6xl text-pine">O que esta versão guarda</h1>
        <div className="mt-8 grid gap-5 leading-relaxed">
          <p>Esta página descreve o funcionamento da versão em construção. A revisão jurídica humana continua sendo um gate do projeto.</p>
          <p>A conta pode guardar perfil, consentimentos, jornada, registros de prática, reflexões, conversas do Mentor e atividades confirmadas. O texto livre das reflexões não entra em eventos de produto.</p>
          <p>O consentimento de dados sensíveis é separado do uso de IA, do histórico e do contexto da jornada. IA e histórico começam desligados. Desligar qualquer um dos dois apaga as conversas salvas.</p>
          <p>Sem o histórico, a conversa não fica na conta. O pedido ao Mentor pode incluir as últimas mensagens da página para manter o fio.</p>
          <p>Quando a IA está autorizada, o servidor pede ao provedor do modelo que não armazene a requisição (`store: false`). Isso não é uma garantia absoluta sobre registros internos do provedor.</p>
          <p>Você pode baixar um JSON com os dados privados da conta e excluir a conta informando a senha e a palavra EXCLUIR. A exclusão revoga as sessões.</p>
          <p>O horário preferido fica no perfil. O lembrete por e-mail só é enviado se você marcar essa opção, e pode ser desligado em Ajustes. Não há WhatsApp nesta versão. Um dia sem abrir o app não gera cobrança nem culpa.</p>
          <p>Eventos de uso (cadastro, conclusão do onboarding, visão da missão, check-in, mensagem ao Mentor e retorno no sétimo dia) guardam apenas o tipo do evento e códigos curtos como foco, dia e plano. Não incluem e-mail, nome, reflexão nem texto da conversa.</p>
          <p>Não há checkout. Nenhum dado de pagamento é coletado aqui.</p>
        </div>
      </PageMain>
      <SiteFooter />
    </>
  );
}
