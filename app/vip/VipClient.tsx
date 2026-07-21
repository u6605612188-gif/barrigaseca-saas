"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MobileNav from "@/components/MobileNav";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import {
  defaultLanguage,
  isLanguage,
  languages,
  translations,
  type Language,
} from "@/lib/i18n";

type CheckoutResponse = {
  url?: string;
  error?: string;
};

type UserProfile = {
  unlockedCycles?: number;
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
    const parsed = Date.parse(v);
    return Number.isNaN(parsed) ? null : parsed;
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

  return flag || statusOk || untilOk ? 1 : 0;
}

const SUPPORT_WA = "351961780568";

const MEMBER: Record<
  Language,
  {
    badge: string;
    title: string;
    sub: string;
    status: string;
    active: string;
    renewal: string;
    autoRenew: string;
    expiresOn: string;
    noDate: string;
    manageTitle: string;
    manageDesc: string;
    myProfile: string;
    myContentTitle: string;
    plan: string;
    progress: string;
    checklist: string;
    goals: string;
    tools: string;
    billingTitle: string;
    billingDesc: string;
    contactSupport: string;
  }
> = {
  pt: {
    badge: "Minha Assinatura VIP",
    title: "Você é VIP 🎉",
    sub: "Acompanhe seu acesso, veja o vencimento e gerencie sua conta.",
    status: "Status",
    active: "VIP ativo",
    renewal: "Renovação",
    autoRenew: "Renovação automática",
    expiresOn: "Vence em",
    noDate: "Sem data definida",
    manageTitle: "Seus dados",
    manageDesc: "Atualize seu nome, peso e objetivo — tudo salvo na sua conta.",
    myProfile: "Salvar meus dados",
    myContentTitle: "Seu conteúdo VIP",
    plan: "Plano de hoje",
    progress: "Progresso",
    checklist: "Checklist",
    goals: "Metas",
    tools: "Ferramentas",
    billingTitle: "Pagamento e cancelamento",
    billingDesc: "Precisa trocar o cartão ou cancelar? Fale com o suporte e resolvemos rápido.",
    contactSupport: "Falar com o suporte",
  },
  en: {
    badge: "My VIP Subscription",
    title: "You are VIP 🎉",
    sub: "Track your access, see the due date and manage your account.",
    status: "Status",
    active: "VIP active",
    renewal: "Renewal",
    autoRenew: "Automatic renewal",
    expiresOn: "Due on",
    noDate: "No date set",
    manageTitle: "Your data",
    manageDesc: "Update your name, weight and goal — all saved to your account.",
    myProfile: "Save my data",
    myContentTitle: "Your VIP content",
    plan: "Today's plan",
    progress: "Progress",
    checklist: "Checklist",
    goals: "Goals",
    tools: "Tools",
    billingTitle: "Billing and cancellation",
    billingDesc: "Need to change your card or cancel? Contact support and we'll sort it out fast.",
    contactSupport: "Contact support",
  },
  es: {
    badge: "Mi Suscripción VIP",
    title: "Eres VIP 🎉",
    sub: "Sigue tu acceso, mira el vencimiento y gestiona tu cuenta.",
    status: "Estado",
    active: "VIP activo",
    renewal: "Renovación",
    autoRenew: "Renovación automática",
    expiresOn: "Vence el",
    noDate: "Sin fecha definida",
    manageTitle: "Tus datos",
    manageDesc: "Actualiza tu nombre, peso y objetivo — todo guardado en tu cuenta.",
    myProfile: "Guardar mis datos",
    myContentTitle: "Tu contenido VIP",
    plan: "Plan de hoy",
    progress: "Progreso",
    checklist: "Checklist",
    goals: "Metas",
    tools: "Herramientas",
    billingTitle: "Pago y cancelación",
    billingDesc: "¿Necesitas cambiar la tarjeta o cancelar? Contacta al soporte y lo resolvemos rápido.",
    contactSupport: "Contactar soporte",
  },
};

export default function VipClient() {
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const t = translations[language].vip;

  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [entLoading, setEntLoading] = useState(true);
  const [unlockedCycles, setUnlockedCycles] = useState<number>(0);
  const [vipUntilMs, setVipUntilMs] = useState<number | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  React.useEffect(() => {
    const savedLanguage = window.localStorage.getItem("barrigaseca-language");
    if (isLanguage(savedLanguage)) setLanguage(savedLanguage);
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem("barrigaseca-language", language);
  }, [language]);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid ?? null);
      setEmail(u?.email ?? null);
      setAuthReady(true);

      if (!u?.uid) {
        setUnlockedCycles(0);
        setVipUntilMs(null);
        setEntLoading(false);
        return;
      }

      try {
        setEntLoading(true);
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        const data = (snap.exists() ? (snap.data() as UserProfile) : {}) ?? {};
        setUnlockedCycles(resolveUnlockedCycles(data));
        const until = data.vipUntil ?? data.vip_until ?? data.vipExpiresAt ?? data.vip_expires_at;
        setVipUntilMs(asMillis(until));
      } catch {
        setUnlockedCycles(0);
        setVipUntilMs(null);
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
        title: t.successTitle,
        desc: t.successDesc,
        tone: "ok" as const,
      };
    }
    if (canceled) {
      return {
        title: t.canceledTitle,
        desc: t.canceledDesc,
        tone: "warn" as const,
      };
    }
    return null;
  }, [success, canceled, t]);

  const accessLine = useMemo(() => {
    if (!authReady) return t.syncing;
    if (!uid) return t.loginRequired;
    if (entLoading) return t.validatingAccess;
    if (unlockedCycles >= 1) {
      return `${t.activeAccess}: ${unlockedCycles} (${t.cycleOneUnlocked}).`;
    }
    return t.noCycles;
  }, [authReady, uid, entLoading, unlockedCycles, t]);

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

      if (!res.ok) throw new Error(data?.error || t.checkoutError);
      if (!data?.url) throw new Error(t.missingCheckoutUrl);

      window.location.href = data.url;
    } catch (e: any) {
      alert(e?.message ?? t.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  const primaryCtaLabel = useMemo(() => {
    if (!authReady) return t.loading;
    if (!uid) return t.signInToSubscribe;
    if (entLoading) return t.validatingAccess;
    if (unlockedCycles >= 1) return t.renewing;
    return t.subscribe;
  }, [authReady, uid, entLoading, unlockedCycles, t]);

  // ==== Area do membro: so quando a pessoa JA e VIP ====
  const isVipMember = authReady && !!uid && !entLoading && unlockedCycles >= 1;

  if (isVipMember) {
    const m = MEMBER[language];
    const loc = language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US";
    const vipDateLabel = vipUntilMs
      ? new Intl.DateTimeFormat(loc, { dateStyle: "medium" }).format(new Date(vipUntilMs))
      : m.noDate;

    function openSupport() {
      const msg = encodeURIComponent(
        `Ola, sou membro VIP do Barriga Seca e preciso de ajuda com a assinatura.\nConta: ${email ?? ""}`
      );
      window.open(`https://wa.me/${SUPPORT_WA}?text=${msg}`, "_blank");
    }

    return (
      <main style={styles.page}>
        <div style={styles.bg} aria-hidden />

        <div style={styles.shell}>
          <header style={styles.header}>
            <div style={styles.topRow}>
              <div style={styles.badge}>{m.badge}</div>
              <div style={styles.languageGroup} aria-label="Language">
                {languages.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setLanguage(item.code)}
                    style={{
                      ...styles.languageButton,
                      ...(language === item.code ? styles.languageButtonActive : null),
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.heroRow}>
              <div style={styles.crown} aria-hidden>👑</div>
              <div style={{ minWidth: 0 }}>
                <h1 style={styles.h1}>{m.title}</h1>
                <p style={styles.sub}>{m.sub}</p>
              </div>
            </div>
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
              <div style={{ fontWeight: 950, fontSize: 14, color: "#fff" }}>{banner.title}</div>
              <div style={{ marginTop: 6, fontWeight: 700, color: "#E7E1D6", lineHeight: 1.5 }}>
                {banner.desc}
              </div>
            </section>
          )}

          <section style={styles.grid}>
            <div style={styles.card}>
              <div style={memberStyles.label}>{m.status}</div>
              <div style={{ ...memberStyles.value, color: "#8EEA35" }}>✅ {m.active}</div>
            </div>
            <div style={styles.card}>
              <div style={memberStyles.label}>{vipUntilMs ? m.expiresOn : m.renewal}</div>
              <div style={{ ...memberStyles.value, color: "#FFD86B" }}>
                {vipUntilMs ? vipDateLabel : m.autoRenew}
              </div>
            </div>
          </section>

          <section style={styles.pricing}>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#FFD86B" }}>{m.manageTitle}</div>
            <div style={{ marginTop: 8, fontWeight: 700, color: "#E7E1D6", lineHeight: 1.5 }}>
              {m.manageDesc}
            </div>
            <a href="/conta" style={{ ...styles.btnLight, marginTop: 14, width: "100%", maxWidth: 460 }}>
              {m.myProfile}
            </a>
          </section>

          <section style={styles.card}>
            <div style={{ fontSize: 16, fontWeight: 950, color: "#fff" }}>{m.myContentTitle}</div>
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="/free" style={styles.btnDark}>{m.plan}</a>
              <a href="/vip/progresso" style={styles.btnDark}>{m.progress}</a>
              <a href="/vip/checklist" style={styles.btnDark}>{m.checklist}</a>
              <a href="/vip/metas" style={styles.btnDark}>{m.goals}</a>
              <a href="/ferramentas" style={styles.btnDark}>{m.tools}</a>
            </div>
          </section>

          <section style={styles.card}>
            <div style={{ fontSize: 16, fontWeight: 950, color: "#fff" }}>{m.billingTitle}</div>
            <div style={{ marginTop: 8, fontWeight: 700, color: "#C9C4D6", lineHeight: 1.5 }}>
              {m.billingDesc}
            </div>
            <button type="button" onClick={openSupport} style={{ ...styles.btnGhost, marginTop: 12, cursor: "pointer" }}>
              {m.contactSupport}
            </button>
          </section>
        </div>
        <MobileNav />
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.bg} aria-hidden />

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.topRow}>
            <div style={styles.badge}>{t.brand}</div>
            <div style={styles.languageGroup} aria-label="Language">
              {languages.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLanguage(item.code)}
                  style={{
                    ...styles.languageButton,
                    ...(language === item.code ? styles.languageButtonActive : null),
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.heroRow}>
            <div style={styles.crown} aria-hidden>👑</div>
            <div style={{ minWidth: 0 }}>
              <h1 style={styles.h1}>{t.title}</h1>
              <p style={styles.sub}>{t.subtitle}</p>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/vip/progresso" style={styles.btnGhost}>{t.progress}</a>
            <a href="/vip/checklist" style={styles.btnGhost}>{t.checklist}</a>
            <a href="/vip/metas" style={styles.btnGhost}>{t.goals}</a>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, fontWeight: 900, color: "#DCCAA4" }}>{accessLine}</div>
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
            <div style={{ fontWeight: 950, fontSize: 14, color: "#fff" }}>{banner.title}</div>
            <div style={{ marginTop: 6, fontWeight: 700, color: "#E7E1D6", lineHeight: 1.5 }}>
              {banner.desc}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="/app" style={styles.btnDark}>{t.goApp}</a>
              <a href="/vip/progresso" style={styles.btnGhost}>{t.viewProgress}</a>
              <a href="/free" style={styles.btnGhost}>{t.freeArea}</a>
            </div>
          </section>
        )}

        <section style={styles.grid}>
          <Card title={t.unlockTitle} items={t.unlockItems} />
          <Card title={t.audienceTitle} items={t.audienceItems} />
          <Card title={t.howTitle} items={t.howItems} />
        </section>

        <section style={styles.pricing}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#fff" }}>{t.planTitle}</div>
            <div style={{ marginTop: 8, opacity: 0.9, fontWeight: 700 }}>{t.planDesc}</div>
          </div>

          <button onClick={handleCheckout} disabled={loading} style={styles.payBtn}>
            {loading ? t.openingPayment : primaryCtaLabel}
          </button>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/app" style={styles.btnLight}>{t.openApp}</a>
            <a href="/vip/progresso" style={styles.btnGhostOnDark}>{t.openProgress}</a>
            <a href="/free" style={styles.btnGhostOnDark}>{t.freeArea}</a>
          </div>
        </section>
      </div>
      <MobileNav />
    </main>
  );
}

function Card({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 950, color: "#FFD86B" }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
        {items.map((x) => (
          <li key={x} style={{ fontWeight: 700, color: "#E7E1D6" }}>
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
    background: "linear-gradient(180deg,#07152B,#151018 45%,#07070A)",
    position: "relative",
    overflow: "hidden",
  },
  bg: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(900px 500px at 80% 8%, rgba(255,214,90,0.14), transparent 55%), radial-gradient(900px 500px at 15% 70%, rgba(31,86,167,0.18), transparent 60%)",
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
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "linear-gradient(160deg,#1F56A7,#1B2538 55%,#211712)",
    color: "#fff",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,216,107,0.35)",
    background: "rgba(255,176,0,0.15)",
    fontWeight: 950,
    fontSize: 12,
    color: "#FFD86B",
  },
  languageGroup: {
    display: "inline-flex",
    gap: 6,
    padding: 4,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.2)",
  },
  languageButton: {
    border: "none",
    borderRadius: 999,
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 950,
    padding: "7px 10px",
  },
  languageButtonActive: {
    background: "#FF8A00",
    color: "#fff",
  },
  heroRow: {
    marginTop: 14,
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  crown: {
    width: 74,
    height: 74,
    flexShrink: 0,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 34,
    background: "radial-gradient(circle at 50% 35%, #FFF6A8, #FFC928 55%, #B96B00)",
    border: "2px solid #FFF1A8",
    boxShadow: "0 14px 28px rgba(0,0,0,0.4)",
  },
  h1: {
    margin: "0 0 6px",
    fontSize: 32,
    fontWeight: 950,
    color: "#FFB637",
    textShadow: "0 3px 6px rgba(0,0,0,0.5)",
  },
  sub: {
    margin: 0,
    color: "#C9D3E0",
    fontWeight: 700,
    lineHeight: 1.55,
    maxWidth: 860,
  },
  banner: {
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
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
    border: "1px solid rgba(255,255,255,0.1)",
    background: "#19191F",
    color: "#fff",
    boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
  },
  pricing: {
    marginTop: 12,
    padding: 18,
    borderRadius: 22,
    border: "1px solid rgba(255,216,107,0.4)",
    background: "linear-gradient(160deg,#2B2118,#18161D 55%,#111017)",
    color: "#fff",
  },
  payBtn: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    border: "none",
    background: "#FF8A00",
    color: "#fff",
    fontWeight: 950,
    cursor: "pointer",
    width: "100%",
    maxWidth: 460,
  },
  btnDark: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "#2A2A31",
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
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    fontWeight: 950,
    textDecoration: "none",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnLight: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    background: "#8EEA35",
    fontWeight: 950,
    textDecoration: "none",
    color: "#102000",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostOnDark: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    fontWeight: 950,
    textDecoration: "none",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

const memberStyles: Record<string, React.CSSProperties> = {
  label: { color: "#C9C4D6", fontSize: 12, fontWeight: 950 },
  value: { marginTop: 10, fontSize: 22, fontWeight: 950, color: "#fff", wordBreak: "break-word" },
};
