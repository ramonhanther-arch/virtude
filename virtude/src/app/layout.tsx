import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-500-italic.css";
import "./globals.css";

// O nonce da CSP muda a cada request. Render estático gravaria scripts sem o valor vigente.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Virtude", template: "%s — Virtude" },
  description: "Não apenas conhecer a Palavra. Aprender a vivê-la.",
  applicationName: "Virtude",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Virtude", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#173F36",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await headers();
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
        {children}
      </body>
    </html>
  );
}
