import type { Metadata } from "next";
import { Landing } from "@/components/landing";

export const metadata: Metadata = {
  title: { absolute: "VIRTUDE | Aprendizado bíblico para as escolhas do dia" },
  description: "Entenda passagens bíblicas no contexto e experimente atitudes no cotidiano. Jornadas de domínio próprio, relacionamentos, recursos e vida espiritual.",
};

export default function HomePage() {
  return <Landing />;
}
