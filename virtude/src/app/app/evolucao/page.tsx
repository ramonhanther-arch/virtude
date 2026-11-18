import type { Metadata } from "next";
import { EvolutionScreen } from "@/components/account-screens";

export const metadata: Metadata = { title: "Evolução" };

export default function Page() {
  return <EvolutionScreen />;
}
