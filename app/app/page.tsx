"use client";

import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AppPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email ?? null);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  if (loading) return <main style={{ padding: 32, color: "#fff" }}>Carregando…</main>;

  return (
    <main style={styles.page}>
      <div style={styles.bg} aria-hidden />

      <section style={styles.card}>
        <header style={styles.header}>
          <div>
            <div style={styles.kicker}>Barriga Seca • App</div>
            <h1 style={styles.h1}>Área do Membro</h1>
            <p style={styles.sub}>
              Logado como: <strong style={{ color: "#fff" }}>{email ?? "usuário"}</strong>
            </p>
          </div>
        </header>

        <div style={styles.actions}>
          <a href="/free" style={styles.btnGhost}>
            Área grátis
          </a>

          <a href="/vip" style={styles.btnPrimary}>
            Conteúdo VIP
          </a>

          <a href="/vip/checklist" style={styles.btnGhost}>
            Checklist
          </a>

          <a href="/vip/metas" style={styles.btnGhost}>
            Metas
          </a>

          <button onClick={handleLogout} style={styles.btnNeutral}>
            Sair
          </button>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 18,
    background: "#0b0b0f",
    position: "relative",
    overflow: "hidden",
  },
  bg: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(900px 500px at 20% 25%, rgba(255,255,255,0.10), transparent 60%), radial-gradient(900px 500px at 80% 70%, rgba(255,255,255,0.08), transparent 60%)",
    pointerEvents: "none",
  },
  card: {
    width: "min(980px, 100%)",
    margin: "40px auto",
    position: "relative",
    zIndex: 1,
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(17,17,17,0.55)",
    backdropFilter: "blur(8px)",
    color: "#fff",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
  },
  kicker: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 950,
    fontSize: 12,
    color: "rgba(255,255,255,0.90)",
  },
  h1: {
    margin: "10px 0 6px",
    fontSize: 30,
    fontWeight: 950,
    color: "#fff",
  },
  sub: {
    margin: 0,
    color: "rgba(255,255,255,0.78)",
    fontWeight: 700,
    lineHeight: 1.5,
  },
  actions: {
    marginTop: 16,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  btnGhost: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    textDecoration: "none",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "#fff",
    fontWeight: 950,
    textDecoration: "none",
    color: "#111",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnNeutral: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    fontWeight: 950,
    color: "#fff",
    cursor: "pointer",
  },
};
