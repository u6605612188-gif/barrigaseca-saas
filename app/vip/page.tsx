"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";

/**
 * ✅ FIX BUILD (Vercel / Next prerender):
 * /vip não pode ser prerenderizado estático porque depende de auth + querystring.
 * Força render dinâmico em runtime.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CheckoutResponse = {
  url?: string;
  error?: string;
};

export default function VipPage() {
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setEmail(u?.email ?? null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";

  const banner = useMemo(() => {
    if (success) {
      return {
        title: "Pagamento confirmado ✅",
        desc: "Se o VIP ainda não liberou, aguarde alguns segundos e atualize a página (webhook).",
        tone: "ok" as const,
      };
    }
    if (canceled) {
      return {
        title: "Pagamento cancelado",
        desc: "Sem estresse. Você pode tentar novamente quando quiser.",
        tone: "warn" as const,
      };
    }
    return null;
  }, [success, canceled]);

  async function handleCheckout() {
    if (loading) return;

    // ✅ checkout só com usuário logado (garante uid no webhook)
    if (!authReady) return;
    if (!uid) {
      router.push("/login");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          email,
        }),
      });

      let data: CheckoutResponse = {};
      try {
        data = (await res.json()) as CheckoutResponse;
      } catch {
        // sem JSON -> cai no erro genérico
      }

      if (!res.ok) throw new Error(data?.error || "Falha ao iniciar checkout.");
      if (!data?.url) throw new Error("Checkout sem URL de redirecionamento.");

      window.location.href = data.url;
    } catch (e: any) {
      alert(e?.message ?? "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.bg} aria-hidden />

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.badge}>Barriga Seca • VIP</div>
          <h1 style={styles.h1}>Seja membro VIP</h1>
          <p style={styles.sub}>
            Libere o <strong>Calendário completo de 30 dias</strong>, checklist de hábitos e metas.
            Produto simples, direto e com execução diária.
          </p>
        </header>

        {banner && (
          <section
            style={{
              ...styles.banner,
              border:
                banner.tone === "ok"
                  ? "1px solid rgba(34,197,94,0.25)"
                  : "1px solid rgba(245,158,11,0.25)",
              background:
                banner.tone === "ok"
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(245,158,11,0.10)",
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 14 }}>{banner.title}</div>
            <div style={{ marginTop: 6, fontWeight: 700, color: "#333", lineHeight: 1.5 }}>
              {banner.desc}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="/app" style={styles.btnDark}>
                Ir para o App
              </a>
              <a href="/free" style={styles.btnGhost}>
                Ver área grátis
              </a>
            </div>
          </section>
        )}

        <section style={styles.grid}>
          <Card
            title="O que você desbloqueia"
            items={[
              "Dias 8–30 liberados",
              "Receitas completas e variações",
              "Treinos guiados do dia",
              "Checklist de hábitos (VIP)",
              "Metas (VIP)",
            ]}
          />
          <Card
            title="Pra quem é"
            items={[
              "Quer barriga mais seca e rotina simples",
              "Não tem tempo pra treinos longos",
              "Precisa de direção diária",
              "Quer praticidade nas refeições",
            ]}
          />
          <Card
            title="Como funciona"
            items={[
              "Assinatura mensal recorrente",
              "Cancele quando quiser",
              "Acesso libera após pagamento",
              "Você precisa estar logado para assinar",
            ]}
          />
        </section>

        <section style={styles.pricing}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#fff" }}>Plano VIP</div>
            <div style={{ marginTop: 8, opacity: 0.9, fontWeight: 700 }}>
              Assinatura recorrente • Cancele quando quiser
            </div>
          </div>

          <button onClick={handleCheckout} disabled={loading} style={styles.payBtn}>
            {loading ? "Abrindo pagamento…" : uid ? "Assinar VIP agora" : "Entrar para assinar"}
          </button>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
            Após pagar, você volta automaticamente e o acesso VIP é liberado via webhook.
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/app" style={styles.btnLight}>
              Abrir o App
            </a>
            <a href="/free" style={styles.btnGhostOnDark}>
              Voltar para o grátis
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 950, color: "#111" }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
        {items.map((x) => (
          <li key={x} style={{ fontWeight: 800, color: "#222" }}>
            {x}
          </li>
        ))}
      </ul>
    </div>
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
      "radial-gradient(900px 500px at 20% 25%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(900px 500px at 80% 70%, rgba(255,255,255,0.06), transparent 60%)",
    pointerEvents: "none",
  },
  shell: {
    width: "min(1100px, 100%)",
    margin: "18px auto",
    position: "relative",
    zIndex: 1,
  },
  header: {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.92)",
  },
  badge: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(17,17,17,0.10)",
    background: "#fff",
    fontWeight: 950,
    fontSize: 12,
    color: "#111",
  },
  h1: {
    margin: "10px 0 6px",
    fontSize: 34,
    fontWeight: 950,
    color: "#111",
  },
  sub: {
    margin: 0,
    color: "#444",
    fontWeight: 700,
    lineHeight: 1.55,
    maxWidth: 820,
  },
  banner: {
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.92)",
  },
  grid: {
    marginTop: 12,
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  },
  card: {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.92)",
  },
  pricing: {
    marginTop: 12,
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#111",
    color: "#fff",
  },
  payBtn: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    border: "1px solid #fff",
    background: "#fff",
    color: "#111",
    fontWeight: 950,
    cursor: "pointer",
    width: "100%",
    maxWidth: 460,
  },
  btnDark: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#111",
    fontWeight: 950,
    textDecoration: "none",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#fff",
    fontWeight: 950,
    textDecoration: "none",
    color: "#111",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnLight: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.20)",
    background: "#fff",
    fontWeight: 950,
    textDecoration: "none",
    color: "#111",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostOnDark: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.20)",
    background: "transparent",
    fontWeight: 950,
    textDecoration: "none",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
