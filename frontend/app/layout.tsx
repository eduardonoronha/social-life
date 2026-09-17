import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Minha Vida",
  description: "Uma plataforma que não compete pelo seu tempo."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", background: "#f3f5f2", color: "#1d2926" }}>
        {children}
      </body>
    </html>
  );
}
