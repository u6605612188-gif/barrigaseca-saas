import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Barriga Seca | 30 dias de treinos e receitas",
    template: "%s | Barriga Seca",
  },
  description:
    "Calendário de 30 dias com treinos rápidos e receitas simples para uma rotina saudável. Área grátis e plano VIP.",
  applicationName: "Barriga Seca",
  keywords: [
    "vida saudável",
    "barriga seca",
    "treino em casa",
    "receitas saudáveis",
    "emagrecimento",
    "rotina fitness",
  ],
  authors: [{ name: "Barriga Seca" }],
  creator: "Barriga Seca",
  metadataBase: new URL("https://barrigaseca-saas.vercel.app"),
  openGraph: {
    title: "Barriga Seca | 30 dias de treinos e receitas",
    description:
      "Treinos rápidos + receitas do dia. Disciplina simples para resultados contínuos.",
    url: "https://barrigaseca-saas.vercel.app",
    siteName: "Barriga Seca",
    locale: "pt_BR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          margin: 0,
          padding: 0,
          background: "#0b0b0f",
          color: "#f5f5f7",
        }}
      >
        {children}
      </body>
    </html>
  );
}
