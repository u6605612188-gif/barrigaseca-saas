"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import MobileNav from "@/components/MobileNav";
import { auth } from "@/lib/firebase";

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.sessionStorage.removeItem("barrigaseca-new-user");

    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  if (loading) return <main style={{ padding: 28, color: "#fff" }}>Preparando sua conta...</main>;

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.badge}>Barriga Seca</div>
        <h1 style={styles.h1}>Sua conta foi criada</h1>
        <p style={styles.sub}>
          Comece pelo calendario gratis. Depois, se quiser liberar o ciclo completo, voce pode virar VIP quando estiver pronto.
        </p>

        <div style={styles.email}>{user?.email}</div>

        <div style={styles.steps}>
          <div style={styles.step}>
            <strong>1. Abra o calendario</strong>
            <span>Veja treino e receitas do dia.</span>
          </div>
          <div style={styles.step}>
            <strong>2. Siga o Dia 1</strong>
            <span>Execute o basico sem complicar.</span>
          </div>
          <div style={styles.step}>
            <strong>3. Acompanhe evolucao</strong>
            <span>Use checklist, metas e progresso quando liberar o VIP.</span>
          </div>
        </div>

        <div style={styles.actions}>
          <a href="/free" style={styles.btnDark}>Abrir calendario</a>
          <a href="/app" style={styles.btnGhost}>Ir para o app</a>
          <a href="/conta" style={styles.btnGhost}>Minha conta</a>
        </div>
      </section>

      <MobileNav active="plan" />
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    alignItems: "center",
  },
  card: {
    width: "min(760px, 100%)",
    margin: "18px auto",
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.94)",
    color: "#111",
  },
  badge: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(17,17,17,0.10)",
    background: "#fff",
    fontWeight: 950,
    fontSize: 12,
  },
  h1: { margin: "12px 0 8px", fontSize: 34, fontWeight: 950, color: "#111", lineHeight: 1.08 },
  sub: { margin: 0, color: "#444", fontWeight: 800, lineHeight: 1.55 },
  email: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid #eee",
    background: "#fff",
    color: "#111",
    fontWeight: 950,
    wordBreak: "break-word",
  },
  steps: { marginTop: 14, display: "grid", gap: 10 },
  step: {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #eee",
    background: "#fff",
    display: "grid",
    gap: 4,
    color: "#111",
  },
  actions: { marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" },
  btnDark: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 950,
  },
  btnGhost: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.14)",
    background: "#fff",
    color: "#111",
    textDecoration: "none",
    fontWeight: 950,
  },
};
