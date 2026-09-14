import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Minha Vida",
  description: "Uma plataforma que não compete pelo seu tempo."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa", color: "#202020" }}>
        {children}
      </body>
    </html>
  );
}
