"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";

type CheckoutResponse = {
  url?: string;
  error?: string;
};

type UserProfile = {
  unlockedCycles?: number;

  // compat legado
  vip?: boolean;
  vipActive?: boolean;
  isVip?: boolean;
  vip_enabled?: boolean;
  subscriptionStatus?: string;

  vipUntil?: any;
  vip_until?: any;
  vipExpiresAt?: any;
  vip_expires_at?: any;
};

function asMillis(v: any): number | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

function resolveUnlockedCycles(data: UserProfile): number {
  const direct = Number((data as any)?.unlockedCycles);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const flag =
    (data as any)?.vipActive === true ||
    (data as any)?.isVip === true ||
    (data as any)?.vip === true ||
    (data as any)?.vip_enabled === true;

  const statusOk =
    typeof (data as any)?.subscriptionStatus === "string" &&
    ["active", "trialing", "paid"].includes(String((data as any).subscriptionStatus).toLowerCase());

  const until =
    (data as any)?.vipUntil ??
    (data as any)?.vip_until ??
    (data as any)?.vipExpiresAt ??
    (data as any)?.vip_expires_at;

  const untilMs = asMillis(until);
  const untilOk = typeof untilMs === "number" ? untilMs > Date.now() : false;

  // Legado: VIP ativo = pelo menos 1 ciclo liberado
  return flag || statusOk || untilOk ? 1 : 0;
}

export default function VipClient() {
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // Novo modelo
  const [entLoading, setEntLoading] = useState(true);
  const [unlockedCycles, setUnlockedCycles] = useState<number>(0);

  const searchParams = useSearchParams();
  const router = useRouter();

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid ?? null);
      setEmail(u?.email ?? null);
      setAuthReady(true);

      // sem user => sem entitlement
      if (!u?.uid) {
        setUnlockedCycles(0);
        setEntLoading(false);
        return;
      }

      try {
        setEntLoading(true);
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        const data = (snap.exists() ? (snap.data() as UserProfile) : {}) ?? {};
        setUnlockedCycles(resolveUnlockedCycles(data));
      } catch {
        setUnlockedCycles(0);
      } finally {
        setEntLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";

  const banner = useMemo(() => {
    if (success) {
      return {
        title: "Pagamento confirmado ✅",
        desc: "Se o acesso ainda não refletiu, aguarde alguns segundos e atualize a página (webhook).",
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

  const accessLine = useMemo(() => {
    if (!authReady) return "Sincronizando…";
    if (!uid) return "Você precisa estar logado para assinar.";

    if (entLoading) return "Validando seu acesso…";

    if (unlockedCycles >= 1) {
      return `Acesso ativo • Ciclos liberados: ${unlockedCycles} (Ciclo 1 já liberado).`;
    }

    return "Sem ciclos liberados ainda • Assine para liberar o Ciclo 1 (30 dias).";
  }, [authReady, uid, entLoading, unlockedCycles]);

  async function handleCheckout() {
    if (loading) return;

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
      } catch {}

      if (!res.ok) throw new Error(data?.error || "Falha ao iniciar checkout.");
      if (!data?.url) throw new Error("Checkout sem URL de redirecionamento.");

      window.location.href = data.url;
    } catch (e: any) {
      alert(e?.message ?? "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  const primaryCtaLabel = useMemo(() => {
    if (!authReady) return "Carregando…";
    if (!uid) return "Entrar para assinar";
    if (entLoading) return "Validando…";
    if (unlockedCycles >= 1) return "Renovar e liberar próximo ciclo";
    return "Assinar VIP e liberar Ciclo 1";
  }, [authReady, uid, entLoading, unlockedCycles]);

  return (
    <main style={styles.page}>
      <div style={styles.bg} aria-hidden />

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.badge}>Barriga Seca • VIP</div>
          <h1 style={styles.h1}>Seja membro VIP</h1>
          <p style={styles.sub}>
            Modelo novo: <strong>cada assinatura mensal libera +1 ciclo</strong> de 30 dias (conteúdo
            cumulativo). Você mantém acesso aos ciclos já liberados e evolui mês a mês.
          </p>

          {/* ✅ ATALHOS VIP */}
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/vip/progresso" style={styles.btnGhost}>
              Progresso
            </a>
            <a href="/vip/checklist" style={styles.btnGhost}>
              Checklist
            </a>
            <a href="/vip/metas" style={styles.btnGhost}>
              Metas
            </a>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, fontWeight: 900, color: "#111" }}>{accessLine}</div>
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
                banner.tone === "ok" ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.10)",
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
              <a href="/vip/progresso" style={styles.btnGhost}>
                Ver Progresso
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
              "Ciclo 1 completo (30 dias)",
              "Receitas do dia + variações",
              "Treinos guiados do dia",
              "Checklist de hábitos (VIP)",
              "Metas (VIP)",
              "Progresso (Dashboard VIP)",
              "A cada renovação: +1 ciclo liberado",
            ]}
          />
          <Card
            title="Pra quem é"
            items={[
              "Quer barriga mais seca com rotina objetiva",
              "Não tem tempo pra treinos longos",
              "Precisa de direção diária",
              "Quer praticidade nas refeições",
            ]}
          />
          <Card
            title="Como funciona"
            items={[
              "Assinatura mensal recorrente",
              "Acesso cumulativo: ciclos liberados não expiram",
              "Cancele quando quiser",
              "Você precisa estar logado para assinar",
            ]}
          />
        </section>

        <section style={styles.pricing}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#fff" }}>Plano VIP</div>
            <div style={{ marginTop: 8, opacity: 0.9, fontWeight: 700 }}>
              Assinatura recorrente • Cada mês libera +1 ciclo (30 dias)
            </div>
          </div>

          <button onClick={handleCheckout} disabled={loading} style={styles.payBtn}>
            {loading ? "Abrindo pagamento…" : primaryCtaLabel}
          </button>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
            Após pagar, você volta automaticamente e o acesso é liberado via webhook.
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/app" style={styles.btnLight}>
              Abrir o App
            </a>
            <a href="/vip/progresso" style={styles.btnGhostOnDark}>
              Abrir Progresso
            </a>
            <a href="/free" style={styles.btnGhostOnDark}>
              Ver área grátis
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
    maxWidth: 860,
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
