import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DemoProvider } from "@/components/demo-experience";

export const metadata: Metadata = {
  title: "Demonstração",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <DemoProvider>{children}</DemoProvider>;
}
