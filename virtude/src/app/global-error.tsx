"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: "100vh", background: "#F6F1E7", color: "#202925", fontFamily: "Georgia, serif", padding: "2rem" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: 500, color: "#173F36" }}>A aplicação encontrou um erro</h1>
        <p style={{ fontFamily: '"Segoe UI", sans-serif', maxWidth: "36rem" }}>Recarregue a página. Nenhum relato é exibido nesta mensagem.</p>
        <button type="button" onClick={reset} style={{ marginTop: "1.5rem", minHeight: "2.75rem", background: "#173F36", color: "#F6F1E7", border: 0, padding: "0.5rem 1rem" }}>Tentar de novo</button>
      </body>
    </html>
  );
}
