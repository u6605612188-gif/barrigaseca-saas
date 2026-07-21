"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type ActiveTab = "home" | "plan" | "tools" | "progress" | "account";

type Lang = "pt" | "en" | "es";

const LABELS: Record<ActiveTab, Record<Lang, string>> = {
  home: { pt: "Inicio", en: "Home", es: "Inicio" },
  plan: { pt: "Plano", en: "Plan", es: "Plan" },
  tools: { pt: "Ferramentas", en: "Tools", es: "Herramientas" },
  progress: { pt: "Progresso", en: "Progress", es: "Progreso" },
  account: { pt: "Perfil", en: "Profile", es: "Perfil" },
};

const items: Array<{ key: ActiveTab; href: string; icon: string; match: string[] }> = [
  { key: "home", href: "/app", icon: "🏠", match: ["/app"] },
  { key: "plan", href: "/free", icon: "🍽️", match: ["/free"] },
  { key: "tools", href: "/ferramentas", icon: "🧮", match: ["/ferramentas", "/vip/metas", "/vip/checklist"] },
  { key: "progress", href: "/vip/progresso", icon: "📈", match: ["/vip/progresso"] },
  { key: "account", href: "/conta", icon: "👤", match: ["/conta"] },
];

function useLang(): Lang {
  const [lang, setLang] = useState<Lang>("pt");
  useEffect(() => {
    const saved = window.localStorage.getItem("barrigaseca-language");
    if (saved === "pt" || saved === "en" || saved === "es") setLang(saved);
  }, []);
  return lang;
}

export default function MobileNav({ active }: { active?: ActiveTab }) {
  const pathname = usePathname() || "";
  const lang = useLang();

  // Aba ativa: prop tem prioridade; senao detecta pela rota atual.
  const current: ActiveTab | null =
    active ??
    items.find((it) => it.match.some((m) => pathname === m || pathname.startsWith(m + "/")))?.key ??
    null;

  return (
    <>
      <nav style={styles.nav} aria-label="Navegacao principal">
        {items.map((item) => {
          const selected = current === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              style={{ ...styles.link, ...(selected ? styles.linkActive : null) }}
              aria-current={selected ? "page" : undefined}
            >
              <span style={{ ...styles.icon, ...(selected ? styles.iconActive : null) }} aria-hidden>
                {item.icon}
              </span>
              <span style={styles.label}>{LABELS[item.key][lang]}</span>
            </Link>
          );
        })}
      </nav>
      <div style={{ height: 96 }} aria-hidden />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: "fixed",
    left: 10,
    right: 10,
    bottom: 12,
    zIndex: 50,
    margin: "0 auto",
    maxWidth: 520,
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 4,
    padding: 8,
    borderRadius: 20,
    border: "1px solid rgba(255,182,55,0.28)",
    background: "rgba(16,14,20,0.94)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.5)",
    backdropFilter: "blur(12px)",
  },
  link: {
    minHeight: 52,
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    textAlign: "center",
    textDecoration: "none",
    color: "#B9B2A6",
    padding: "6px 2px",
    transition: "background .15s ease, color .15s ease",
  },
  linkActive: {
    background: "rgba(255,182,55,0.14)",
    color: "#FFD86B",
  },
  icon: {
    fontSize: 18,
    lineHeight: 1,
    filter: "grayscale(0.35)",
    opacity: 0.85,
  },
  iconActive: {
    filter: "none",
    opacity: 1,
  },
  label: {
    fontSize: 10.5,
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: 0.1,
  },
};
