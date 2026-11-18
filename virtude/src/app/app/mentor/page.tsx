import type { Metadata } from "next";
import { MentorScreen } from "@/components/account-screens";

export const metadata: Metadata = { title: "Mentor" };

export default function Page() {
  return <MentorScreen />;
}
