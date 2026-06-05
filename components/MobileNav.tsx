"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type ActiveTab = "calendar" | "checklist" | "goals" | "progress" | "account";

const items: Array<{ key: ActiveTab; label: string; href: string }> = [
  { key: "calendar", label: "Calendario", href: "/free" },
  { key: "checklist", label: "Checklist", href: "/vip/checklist" },
  { key: "goals", label: "Metas", href: "/vip/metas" },
  { key: "progress", label: "Progresso", href: "/vip/progresso" },
  { key: "account", label: "Conta", href: "/conta" },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 760);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isMobile;
}

export default function MobileNav({ active }: { active?: ActiveTab }) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <>
      <nav style={styles.nav} aria-label="Navegacao principal">
        {items.map((item) => {
          const selected = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              style={{
                ...styles.link,
                ...(selected ? styles.linkActive : null),
              }}
              aria-current={selected ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ height: 88 }} aria-hidden />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: "fixed",
    left: 10,
    right: 10,
    bottom: 10,
    zIndex: 50,
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 6,
    padding: 8,
    borderRadius: 18,
    border: "1px solid rgba(17,17,17,0.14)",
    background: "rgba(255,255,255,0.96)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.24)",
    backdropFilter: "blur(10px)",
  },
  link: {
    minHeight: 44,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    textDecoration: "none",
    color: "#111",
    fontSize: 11,
    fontWeight: 950,
    lineHeight: 1.1,
    padding: "6px 4px",
  },
  linkActive: {
    background: "#111",
    color: "#fff",
  },
};

