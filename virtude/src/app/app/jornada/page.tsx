import type { Metadata } from "next";
import { JourneyScreen } from "@/components/journey-screens";

export const metadata: Metadata = { title: "Jornada" };

export default function Page() {
  return <JourneyScreen />;
}
