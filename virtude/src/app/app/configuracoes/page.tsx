import type { Metadata } from "next";
import { SettingsScreen } from "@/components/account-screens";

export const metadata: Metadata = { title: "Configurações" };

export default function Page() {
  return <SettingsScreen />;
}
