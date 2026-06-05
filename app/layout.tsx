import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaInstaller from "@/components/PwaInstaller";
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
    "Calendario de 30 dias com treinos rapidos e receitas simples para uma rotina saudavel. Area gratis e plano VIP.",
  applicationName: "Barriga Seca",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/app-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Barriga Seca",
    statusBarStyle: "black-translucent",
  },
  keywords: [
    "vida saudavel",
    "barriga seca",
    "treino em casa",
    "receitas saudaveis",
    "emagrecimento",
    "rotina fitness",
  ],
  authors: [{ name: "Barriga Seca" }],
  creator: "Barriga Seca",
  metadataBase: new URL("https://barrigaseca-saas.vercel.app"),
  openGraph: {
    title: "Barriga Seca | 30 dias de treinos e receitas",
    description: "Treinos rapidos + receitas do dia. Comece gratis.",
    url: "https://barrigaseca-saas.vercel.app/free",
    siteName: "Barriga Seca",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/share-barriga-seca.png",
        width: 1200,
        height: 630,
        alt: "Barriga Seca - comece gratis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Barriga Seca | Comece gratis",
    description: "30 dias de treinos e receitas.",
    images: ["/share-barriga-seca.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
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
        <PwaInstaller />
      </body>
    </html>
  );
}