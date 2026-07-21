"use client";

import React, { useState } from "react";
import MobileNav from "@/components/MobileNav";
import { auth } from "@/lib/firebase";
import { startVipCheckout } from "@/lib/checkout";

type Lang = "pt" | "en" | "es";
type Feature = "progress" | "checklist" | "goals";
type NavActive = "home" | "plan" | "tools" | "progress" | "account";

const CONTENT: Record<
  Lang,
  {
    features: Record<Feature, { kicker: string; title: string; desc: string }>;
    benefitsTitle: string;
    benefits: string[];
    daily: string;
    perDay: string;
    monthly: string;
    reassure: string;
    cta: string;
    opening: string;
    free: string;
    loginNeeded: string;
  }
> = {
  pt: {
    features: {
      progress: {
        kicker: "PROGRESSO VIP",
        title: "Veja sua barriga secar dia após dia",
        desc: "O painel completo de evolução é exclusivo dos membros VIP. Acompanhe sua sequência, sua semana e cada avanço de verdade.",
      },
      checklist: {
        kicker: "CHECKLIST VIP",
        title: "Crie a disciplina que queima gordura",
        desc: "O checklist diário com sequência (streak) é exclusivo VIP. É ele que te faz cumprir o plano todo dia sem desanimar.",
      },
      goals: {
        kicker: "METAS VIP",
        title: "Bata metas toda semana",
        desc: "As metas semanais são exclusivas dos membros VIP. Defina o alvo, acompanhe o ritmo e mantenha a consistência até o resultado.",
      },
    },
    benefitsTitle: "Ao virar VIP você desbloqueia hoje:",
    benefits: [
      "365 dias de plano completo, sem travas",
      "Todas as receitas com ingredientes e passo a passo",
      "Checklist de hábitos e metas semanais",
      "Painel de progresso: sequência, semana e recordes",
      "Ferramentas sem limites: IMC, água, proteína e mais",
    ],
    daily: "R$ 0,66",
    perDay: "por dia",
    monthly: "Menos que um café por dia · R$ 19,90/mês",
    reassure: "Assinatura no cartão · Cancele quando quiser",
    cta: "Virar VIP agora",
    opening: "Abrindo pagamento...",
    free: "Ver área grátis",
    loginNeeded: "Entre para assinar",
  },
  en: {
    features: {
      progress: {
        kicker: "VIP PROGRESS",
        title: "Watch your belly shrink day after day",
        desc: "The full progress dashboard is exclusive to VIP members. Track your streak, your week and every real gain.",
      },
      checklist: {
        kicker: "VIP CHECKLIST",
        title: "Build the discipline that burns fat",
        desc: "The daily checklist with streak is VIP only. It's what makes you follow the plan every day without giving up.",
      },
      goals: {
        kicker: "VIP GOALS",
        title: "Hit your goals every week",
        desc: "Weekly goals are exclusive to VIP members. Set the target, track the pace and keep consistency until the result.",
      },
    },
    benefitsTitle: "Become VIP and unlock today:",
    benefits: [
      "365 days of the complete plan, no locks",
      "Every recipe with ingredients and step by step",
      "Habit checklist and weekly goals",
      "Progress dashboard: streak, week and records",
      "Unlimited tools: BMI, water, protein and more",
    ],
    daily: "R$ 0.66",
    perDay: "per day",
    monthly: "Less than a coffee a day · R$ 19.90/month",
    reassure: "Card subscription · Cancel anytime",
    cta: "Become VIP now",
    opening: "Opening payment...",
    free: "See free area",
    loginNeeded: "Sign in to subscribe",
  },
  es: {
    features: {
      progress: {
        kicker: "PROGRESO VIP",
        title: "Mira tu barriga reducirse día a día",
        desc: "El panel completo de evolución es exclusivo de los miembros VIP. Sigue tu racha, tu semana y cada avance real.",
      },
      checklist: {
        kicker: "CHECKLIST VIP",
        title: "Crea la disciplina que quema grasa",
        desc: "El checklist diario con racha es exclusivo VIP. Es lo que te hace cumplir el plan cada día sin desanimarte.",
      },
      goals: {
        kicker: "METAS VIP",
        title: "Cumple tus metas cada semana",
        desc: "Las metas semanales son exclusivas de los miembros VIP. Define el objetivo, sigue el ritmo y mantén la consistencia.",
      },
    },
    benefitsTitle: "Hazte VIP y desbloquea hoy:",
    benefits: [
      "365 días del plan completo, sin bloqueos",
      "Todas las recetas con ingredientes y paso a paso",
      "Checklist de hábitos y metas semanales",
      "Panel de progreso: racha, semana y récords",
      "Herramientas sin límites: IMC, agua, proteína y más",
    ],
    daily: "R$ 0,66",
    perDay: "por día",
    monthly: "Menos que un café al día · R$ 19,90/mes",
    reassure: "Suscripción con tarjeta · Cancela cuando quieras",
    cta: "Hazte VIP ahora",
    opening: "Abriendo pago...",
    free: "Ver área gratis",
    loginNeeded: "Inicia sesión para suscribirte",
  },
};

export default function VipGate({
  feature,
  navActive,
  language,
  onChangeLanguage,
  freeHref = "/free",
}: {
  feature: Feature;
  navActive: NavActive;
  language: Lang;
  onChangeLanguage: (lang: Lang) => void;
  freeHref?: string;
}) {
  const [loading, setLoading] = useState(false);
  const L = CONTENT[language];
  const f = L.features[feature];

  async function goVip() {
    if (loading) return;
    const user = auth.currentUser;
    if (!user?.uid) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    const r = await startVipCheckout(user.uid, user.email);
    if (!r.ok) {
      setLoading(false);
      // fallback: leva para a pagina VIP se o checkout falhar
      window.location.href = "/vip";
    }
  }

  return (
    <main style={S.page}>
      <div style={S.bg} aria-hidden />
      <section style={S.card}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={S.langGroup} aria-label="Language">
            {(["pt", "en", "es"] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onChangeLanguage(code)}
                style={{ ...S.langBtn, ...(language === code ? S.langBtnActive : null) }}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={S.medal} aria-hidden>👑</div>
        <div style={S.kicker}>{f.kicker}</div>
        <h1 style={S.title}>{f.title}</h1>
        <p style={S.desc}>{f.desc}</p>

        <div style={S.benefitsCard}>
          <div style={S.benefitsTitle}>{L.benefitsTitle}</div>
          {L.benefits.map((b) => (
            <div key={b} style={S.benefitRow}>
              <span style={S.benefitCheck} aria-hidden>✓</span>
              <span style={S.benefitText}>{b}</span>
            </div>
          ))}
        </div>

        <div style={S.priceBox}>
          <div style={S.priceMain}>
            <span style={S.priceValue}>{L.daily}</span>
            <span style={S.priceDay}>{L.perDay}</span>
          </div>
          <div style={S.priceNote}>{L.monthly}</div>
        </div>

        <button type="button" onClick={goVip} disabled={loading} style={S.ctaBig}>
          {loading ? L.opening : L.cta}
        </button>
        <div style={S.reassure}>🔒 {L.reassure}</div>
        <a href={freeHref} style={S.freeLink}>{L.free}</a>
      </section>
      <MobileNav active={navActive} />
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 18,
    background: "linear-gradient(180deg,#07152B,#12101A 45%,#07070A)",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  bg: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(900px 500px at 80% 6%, rgba(255,214,90,0.12), transparent 55%), radial-gradient(900px 500px at 15% 75%, rgba(31,86,167,0.16), transparent 60%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    padding: "26px 22px",
    borderRadius: 26,
    border: "1px solid rgba(255,216,107,0.4)",
    background: "linear-gradient(160deg,#2B2118,#18161D 55%,#111017)",
    maxWidth: 460,
    width: "100%",
    margin: "0 auto",
    color: "#fff",
    textAlign: "center",
    boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  langGroup: {
    display: "inline-flex",
    gap: 4,
    padding: 4,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
  },
  langBtn: {
    border: "none",
    borderRadius: 999,
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 950,
    padding: "6px 12px",
  },
  langBtnActive: { background: "#FFB637", color: "#111" },
  medal: {
    marginTop: 14,
    width: 76,
    height: 76,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 34,
    background: "radial-gradient(circle at 50% 35%, #FFF6A8, #FFC928 55%, #B96B00)",
    border: "2px solid #FFF1A8",
    boxShadow: "0 14px 28px rgba(0,0,0,0.4)",
  },
  kicker: { marginTop: 10, color: "#FFB637", fontWeight: 950, fontSize: 12, letterSpacing: 2 },
  title: {
    margin: "8px 0 0",
    fontSize: 25,
    fontWeight: 950,
    color: "#FFD86B",
    textShadow: "0 2px 5px rgba(0,0,0,0.5)",
    lineHeight: 1.2,
  },
  desc: { margin: "8px 0 0", color: "#E7DFD0", fontWeight: 600, lineHeight: 1.55, maxWidth: 380 },
  benefitsCard: {
    marginTop: 16,
    width: "100%",
    textAlign: "left",
    borderRadius: 18,
    padding: 16,
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,216,107,0.22)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  benefitsTitle: { color: "#FFD86B", fontWeight: 950, fontSize: 14, marginBottom: 2 },
  benefitRow: { display: "flex", alignItems: "flex-start", gap: 10 },
  benefitCheck: {
    flexShrink: 0,
    width: 22,
    height: 22,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#8EEA35",
    color: "#0F1A00",
    fontWeight: 950,
    fontSize: 13,
    marginTop: 1,
  },
  benefitText: { color: "#EFE7D6", fontWeight: 700, lineHeight: 1.4, fontSize: 14 },
  priceBox: {
    marginTop: 18,
    width: "100%",
    borderRadius: 18,
    padding: "14px 16px",
    background: "rgba(255,182,55,0.10)",
    border: "1px solid rgba(255,182,55,0.35)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  priceMain: { display: "flex", alignItems: "baseline", gap: 6 },
  priceValue: {
    color: "#FFD86B",
    fontWeight: 950,
    fontSize: 40,
    lineHeight: 1,
    textShadow: "0 2px 6px rgba(0,0,0,0.5)",
  },
  priceDay: { color: "#FFE7A8", fontWeight: 900, fontSize: 16 },
  priceNote: { color: "#E7DFD0", fontWeight: 700, fontSize: 13 },
  ctaBig: {
    marginTop: 14,
    width: "100%",
    padding: "16px 18px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(180deg,#FFB000,#FF7A00)",
    fontWeight: 950,
    fontSize: 17,
    color: "#20120A",
    cursor: "pointer",
    boxShadow: "0 12px 26px rgba(255,138,0,0.4)",
  },
  reassure: { marginTop: 10, color: "#C9C4D6", fontWeight: 700, fontSize: 12.5 },
  freeLink: { marginTop: 12, color: "#DDE7F5", fontWeight: 900, fontSize: 14, textDecoration: "underline" },
};
