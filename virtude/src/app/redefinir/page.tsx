import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth-screen";

export const metadata: Metadata = { title: "Definir nova senha" };

export default function Page() {
  return <AuthScreen mode="reset" />;
}
