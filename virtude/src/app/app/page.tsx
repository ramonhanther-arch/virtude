import type { Metadata } from "next";
import { TodayScreen } from "@/components/journey-screens";

export const metadata: Metadata = { title: "Hoje" };

export default function Page() {
  return <TodayScreen />;
}
