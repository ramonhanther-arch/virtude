import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth-screen";

export const metadata: Metadata = { title: "Entrar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; aviso?: string }> }) {
  const query = await searchParams;
  return <AuthScreen mode="login" nextPath={query.next ?? null} notice={query.aviso ?? null} />;
}
