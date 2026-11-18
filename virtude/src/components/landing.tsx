import Link from "next/link";
import { focusLabels, getMission, missions } from "@/content/missions";
import type { Focus } from "@/lib/types";
import { focuses, phaseName, practiceBody } from "@/components/labels";
import { PageMain, buttonClass } from "@/components/ui";
import { SiteFooter, SiteHeader } from "@/components/site";

const preview = missions.length === 0 || missions.some((mission) => mission.reviewStatus !== "approved");

const journeyCopy: Record<Focus, { text: string; detail: string }> = {
  self_control: {
    text: "Perceba o impulso antes da resposta. Observe seus padrões, experimente pausas e prepare escolhas mais cuidadosas nas situações comuns do dia.",
    detail: "Da observação de uma reação ao plano para continuar uma prática possível.",
  },
  relationships: {
    text: "Escute com atenção, expresse pedidos e preserve limites. Pratique formas de cuidar que respeitam a dignidade, a liberdade e a segurança de cada pessoa.",
    detail: "Perdão não obriga reconciliação ou contato com quem oferece risco.",
  },
  stewardship: {
    text: "Olhe com clareza para o que está sob seu cuidado. Organize recursos, considere necessidades reais e pense em generosidade dentro das suas possibilidades.",
    detail: "Sem recomendação de investimentos, promessa de riqueza ou pressão para doar.",
  },
  spiritual_life: {
    text: "Ore, leia e volte à prática no tamanho de um dia comum. A ausência não apaga o que você já fez e não mede o valor da sua fé.",
    detail: "Parte nova do catálogo, ainda em revisão humana, no mesmo formato de 21 dias.",
  },
};

const steps = [
  ["Escolha o que quer trabalhar.", "Selecione uma área, conte qual dificuldade deseja enfrentar e defina um objetivo e um horário que façam sentido para você."],
  ["Entenda antes de aplicar.", "Leia a referência, situe a passagem no seu contexto e considere um princípio para o dia. A missão oferece uma prática, uma alternativa mais simples e um aprofundamento."],
  ["Experimente fora da tela.", "Faça a ação possível e depois registre se realizou, tentou ou não realizou. Sua reflexão pode ajudar a ajustar o próximo passo."],
];

const questions = [
  ["Preciso conhecer muito a Bíblia para começar?", "Cada missão oferece uma referência e uma explicação de contexto antes de propor a prática. Você pode consultar a passagem na sua própria Bíblia e levar dúvidas à sua comunidade de fé."],
  ["São 21 dias seguidos?", "Não precisam ser consecutivos. A jornada acompanha dias de jornada, sem punição por ausência. Você pode retomar, adaptar uma prática ou escolher recomeçar."],
  ["E se eu não conseguir fazer a missão?", "Registre se tentou ou não realizou e considere a alternativa simplificada. A reflexão serve para entender o que aconteceu e encontrar um próximo passo possível."],
  ["Preciso usar o Mentor?", "O uso de IA é uma escolha separada. Você pode praticar as missões sem conversar com o Mentor. Se optar por usá-lo, também escolhe se deseja manter histórico e compartilhar o contexto da jornada."],
  ["A VIRTUDE interpreta a Bíblia por mim?", "As missões apresentam uma leitura contextualizada e uma proposta de aplicação, sem substituir sua leitura ou o diálogo com sua comunidade. Existem diferenças entre tradições cristãs; quando relevantes à missão, elas devem ser consideradas. O Mentor é uma IA e pode errar."],
  ["Preciso me reconciliar para concluir a jornada de relacionamentos?", "Não. Nenhuma missão exige retomar contato com alguém que oferece risco. Refletir sobre perdão não obriga convivência, reconciliação, retirada de denúncia ou confiança imediata."],
  ["A jornada de finanças indica investimentos ou exige doações?", "Não. O foco está no cuidado com recursos e nas necessidades da vida cotidiana. Não há indicação de investimento, promessa de enriquecimento ou contribuição obrigatória. Dívidas e dificuldades materiais não definem o valor da sua fé."],
  ["A VIRTUDE substitui terapia ou outro atendimento?", "Não. O aplicativo oferece aprendizado e reflexão. Ele não realiza diagnóstico e não substitui atendimento psicológico, médico, jurídico ou financeiro qualificado, nem uma rede segura de apoio."],
  ["Já posso assinar o Premium?", "Ainda não. O plano está em planejamento, com preço previsto de R$ 29,90. Não há cobrança ou assinatura disponível nesta etapa."],
];

function StartLink({ inverse = false }: { inverse?: boolean }) {
  if (preview) {
    return (
      <div className="grid gap-2">
        <Link href="/demo" className={buttonClass(inverse ? "inverse" : "primary")}>Ver uma amostra</Link>
        <p className="max-w-[42ch] text-sm leading-relaxed">Exemplo demonstrativo com dados fictícios. Não inicia uma jornada nem cria um histórico pessoal.</p>
      </div>
    );
  }
  return <Link href="/cadastro" className={buttonClass(inverse ? "inverse" : "primary")}>Começar minha jornada</Link>;
}

export function Landing() {
  const sample = getMission("self_control", 1) ?? missions.find((mission) => mission.day === 1) ?? null;
  return (
    <>
      <SiteHeader />
      <PageMain>
        {preview ? (
          <p className="border-b border-gold bg-paper px-5 py-3 text-center text-sm leading-relaxed">VIRTUDE está em preparação. O conteúdo aguarda revisão teológica humana e as jornadas ainda não estão liberadas para uso em produção.</p>
        ) : null}
        <section className="mx-auto grid w-full max-w-6xl items-start gap-8 px-5 py-6 md:gap-10 md:py-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <h1 className="max-w-[18ch] text-5xl text-pine md:text-6xl lg:text-7xl">Não apenas conhecer a Palavra. Aprender a vivê-la.</h1>
            <p className="mt-4 max-w-[46ch] leading-relaxed md:text-lg">Você lê, reflete e chega a uma atitude possível para hoje. Escolha uma jornada de 21 dias para praticar domínio próprio, cuidar dos relacionamentos, lidar com seus recursos ou cultivar a vida espiritual à luz da Bíblia.</p>
            <div className="mt-5 flex flex-wrap items-start gap-x-6 gap-y-2">
              <StartLink />
              <a href="#como-funciona" className="inline-flex min-h-11 items-center text-sm text-pine underline-offset-4 hover:underline">Ver como funciona</a>
            </div>
            <p className="mt-4 max-w-[42ch] text-sm">Comece pelo plano gratuito. Seu caminho avança nos dias de jornada, sem punição por uma pausa.</p>
          </div>
          <div className="min-w-0 lg:col-span-5" id="missao">
            {sample ? (
              <article className="border-t border-pine bg-paper px-5 py-6 md:px-7">
                <h2 className="text-4xl text-pine">{sample.title}</h2>
                <p className="mt-2 text-sm">Dia {sample.day} · {focusLabels[sample.focus]} · {phaseName(sample.phase)}</p>
                <p className="mt-4 text-sm">{sample.reference}</p>
                <p className="mt-5 leading-relaxed">{practiceBody(sample, "standard")}</p>
                {sample.reviewStatus !== "approved" ? (
                  <p className="mt-5 text-sm leading-relaxed">Amostra em revisão. Este texto ainda não está publicado como conteúdo aprovado.</p>
                ) : null}
              </article>
            ) : (
              <p className="border border-line bg-paper px-5 py-8">A amostra da primeira missão ainda está sendo preparada.</p>
            )}
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-16 md:py-24">
            <h2 className="max-w-[16ch] text-5xl text-pine md:text-6xl">A conversa termina. A escolha fica.</h2>
            <p className="max-w-[62ch] text-lg leading-relaxed">Uma resposta atravessada. Um pedido que você não consegue assumir. Uma compra feita sem pensar. Nem sempre falta saber o que importa. Às vezes, falta encontrar um passo que caiba naquela situação.</p>
            <p className="max-w-[62ch] leading-relaxed">Na VIRTUDE, cada missão conecta uma passagem bíblica, seu contexto e uma prática fora da tela. Você pode tentar, adaptar e refletir sobre o que aconteceu, sem precisar acertar de primeira.</p>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-6 border-t border-line bg-paper">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 md:grid-cols-12 md:py-24">
            <div className="md:col-span-4">
              <h2 className="text-5xl text-pine md:text-6xl">Da leitura à prática, um dia de cada vez.</h2>
              <p className="mt-4 text-sm">Uma jornada ativa por vez. São 21 dias de jornada, que não precisam ser consecutivos.</p>
            </div>
            <ol className="min-w-0 md:col-span-8">
              {steps.map(([title, text], index) => (
                <li key={title} className="grid grid-cols-[auto_1fr] gap-4 border-t border-line py-5">
                  <span className="font-serif text-3xl text-pine">0{index + 1}</span>
                  <div>
                    <h3 className="text-3xl text-pine">{title}</h3>
                    <p className="mt-2 max-w-[58ch] leading-relaxed">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="jornadas" className="scroll-mt-6 border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 md:py-24">
            <h2 className="max-w-[16ch] text-5xl text-pine md:text-6xl">Comece por uma área da sua vida.</h2>
            <div className="mt-10 grid gap-px bg-line md:grid-cols-2">
              {focuses.map((focus) => (
                <article key={focus} className="min-w-0 bg-sand px-5 py-7">
                  <h3 className="text-4xl text-pine">{focusLabels[focus]}</h3>
                  {focus !== "spiritual_life" ? <p className="mt-2 text-sm text-pine">Piloto</p> : <p className="mt-2 text-sm text-pine">Nova área</p>}
                  <p className="mt-3 leading-relaxed">{journeyCopy[focus].text}</p>
                  <p className="mt-3 text-sm leading-relaxed">{journeyCopy[focus].detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-paper">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-16 md:py-24">
            <h2 className="max-w-[16ch] text-5xl text-pine md:text-6xl">Primeiro perceber. Depois experimentar.</h2>
            <p className="max-w-[62ch] leading-relaxed">Nos primeiros dias, você observa sua situação e aprende com as passagens. Depois, experimenta ações, consolida o que faz sentido e revê o caminho. As perguntas finais ajudam a escolher o que deseja levar adiante.</p>
            <p className="max-w-[62ch] leading-relaxed">Uma ausência não apaga os dias que você já praticou. Retome do ponto em que parou ou escolha recomeçar quando isso fizer sentido para você.</p>
          </div>
        </section>

        <section id="mentor" className="scroll-mt-6 border-t border-line">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
            <div className="min-w-0">
              <h2 className="text-5xl text-pine md:text-6xl">Um espaço para pensar no próximo passo.</h2>
              <p className="mt-4 max-w-[48ch] leading-relaxed">O Mentor é uma IA para apoiar sua reflexão sobre situações do cotidiano. Ele pode ajudar a separar fatos de interpretações, propor perguntas e apontar referências do catálogo autorizado.</p>
              <p className="mt-4 max-w-[48ch] leading-relaxed">Quer ensaiar como expressar um pedido ou um limite? Use uma simulação textual, identificada como ensaio. Uma sugestão só vira atividade no seu plano depois da sua confirmação.</p>
              <p className="mt-4 max-w-[48ch] text-sm leading-relaxed">Você escolhe se quer usar IA, manter histórico e compartilhar o contexto da jornada. Essas escolhas são separadas.</p>
            </div>
            <figure className="min-w-0 border border-line bg-paper px-5 py-6">
              <figcaption className="text-sm leading-relaxed">Exemplo de como uma conversa pode começar. Não é relato de uma pessoa usuária.</figcaption>
              <div className="mt-5 space-y-4">
                <p><span className="block text-xs font-medium uppercase tracking-[0.14em] text-pine">Você</span>Tive uma conversa difícil e misturei o que aconteceu com o que imaginei.</p>
                <p><span className="block text-xs font-medium uppercase tracking-[0.14em] text-pine">Mentor</span>Qual foi o fato, em uma frase, sem explicar a intenção da outra pessoa?</p>
              </div>
              <p className="mt-5 text-sm leading-relaxed">O Mentor pode errar. Ele não fala em nome de Deus e não substitui acompanhamento pastoral ou atendimento profissional. Em uma situação de violência, sua proteção vem antes de qualquer tentativa de reconciliação.</p>
            </figure>
          </div>
        </section>

        <section id="planos" className="scroll-mt-6 border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 md:py-24">
            <h2 className="text-5xl text-pine md:text-6xl">Comece com uma prática possível.</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <article className="min-w-0 border border-line bg-paper px-6 py-7">
                <h3 className="text-4xl text-pine">Gratuito</h3>
                <p className="mt-3 font-serif text-3xl text-pine">Grátis</p>
                <p className="mt-3 max-w-[42ch]">Para começar uma jornada e acompanhar seus dias de jornada, com acesso limitado ao Mentor.</p>
                <ul className="mt-5 space-y-2">
                  <li>Missões da jornada</li>
                  <li>Registro de prática e reflexão</li>
                  <li>Acompanhamento da evolução</li>
                  <li>Mentor com limite de uso</li>
                </ul>
                <div className="mt-6"><StartLink /></div>
              </article>
              <article className="surface-pine min-w-0 bg-pine px-6 py-7 text-sand">
                <h3 className="text-4xl">Premium</h3>
                <p className="mt-2 text-sm text-sand">Em planejamento</p>
                <p className="mt-3 font-serif text-3xl">R$ 29,90, preço planejado</p>
                <p className="mt-3 max-w-[42ch]">O Premium está em planejamento. Assinatura e pagamento ainda não estão disponíveis.</p>
                <p className="mt-6 inline-flex min-h-11 items-center border border-sand/40 px-4 text-sm">Indisponível no momento</p>
              </article>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-paper">
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-16 md:py-24">
            <h2 className="text-5xl text-pine">Sua reflexão continua sendo sua.</h2>
            <p className="max-w-[62ch] leading-relaxed">Nas configurações, você controla o uso de IA, o histórico de conversas e o compartilhamento do contexto da jornada. Também pode exportar seus dados ou solicitar a exclusão da conta.</p>
            <p className="max-w-[62ch] leading-relaxed">Você não precisa contar detalhes íntimos para realizar uma missão. Pode refletir fora do aplicativo e registrar apenas como foi a tentativa.</p>
            <Link href="/privacidade" className="inline-flex min-h-11 items-center text-sm text-pine underline-offset-4 hover:underline">Entender como meus dados são tratados</Link>
          </div>
        </section>

        <section id="duvidas" className="scroll-mt-6 border-t border-line">
          <div className="mx-auto w-full max-w-3xl px-5 py-16 md:py-24">
            <h2 className="text-5xl text-pine">Dúvidas frequentes</h2>
            <div className="mt-8 border-t border-line">
              {questions.map(([question, answer]) => (
                <details key={question} className="border-b border-line py-4">
                  <summary className="text-lg font-medium">{question}</summary>
                  <p className="mt-3 max-w-[62ch] leading-relaxed">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="surface-pine bg-pine text-sand">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-16 md:py-20">
            <div className="h-px w-16 bg-gold" aria-hidden="true" />
            <h2 className="max-w-[14ch] text-5xl md:text-7xl">Qual escolha você quer começar a praticar?</h2>
            <p className="max-w-[42ch] text-lg leading-relaxed">Escolha uma área, entenda uma passagem e encontre um gesto possível para hoje.</p>
            <StartLink inverse />
            <p className="text-sm">Plano gratuito. Uma jornada por vez. Espaço para retomar.</p>
          </div>
        </section>
      </PageMain>
      <SiteFooter />
    </>
  );
}
