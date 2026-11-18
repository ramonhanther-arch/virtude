import { parseDemoScreen } from "@/components/demo-screen";
import { DemoScreen } from "@/components/demo-experience";

export default async function Page({ searchParams }: { searchParams: Promise<{ tela?: string }> }) {
  const query = await searchParams;
  return <DemoScreen tela={parseDemoScreen(query.tela)} />;
}
