"use client";

import MobileNav from "@/components/MobileNav";
import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Lang = "pt" | "en" | "es";

type UserProfile = {
  vip?: boolean;
  vipActive?: boolean;
  isVip?: boolean;
  subscriptionStatus?: string;
  vipUntil?: any;
  vip_until?: any;
  vipExpiresAt?: any;
  vip_expires_at?: any;
  displayName?: string;
  customDisplayName?: string;
};

function asMillis(v: any): number | null {
  if (!v) return null;
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const p = Date.parse(v);
    return Number.isNaN(p) ? null : p;
  }
  return null;
}

function isVipFromProfile(data: UserProfile) {
  const flag = data.vip === true || data.vipActive === true || data.isVip === true;
  const statusOk = ["active", "trialing", "paid"].includes(
    String(data.subscriptionStatus ?? "").toLowerCase()
  );
  const until = data.vipUntil ?? data.vip_until ?? data.vipExpiresAt ?? data.vip_expires_at;
  const untilMs = asMillis(until);
  return flag || statusOk || (typeof untilMs === "number" && untilMs > Date.now());
}

const UI: Record<Lang, any> = {
  pt: {
    hello: (n: string) => `Ola, ${n}`,
    guest: "Visitante",
    heroSub: "Continue hoje. Um passo simples por vez.",
    planToday: "PLANO DE HOJE",
    planSubtitle: "Treino e refeicoes",
    planDesc: "Abra o calendario para acompanhar o treino e todas as refeicoes do dia.",
    openPlan: "Abrir plano de hoje",
    vip: "VIP",
    free: "FREE",
    chooseStart: "Escolha por onde comecar",
    tPlan: "Plano",
    tPlanV: "Treino e refeicoes do dia",
    tPlanA: "Abrir",
    tTools: "Ferramentas",
    tToolsV: "IMC, agua e metas",
    tToolsA: "Calcular",
    tProg: "Progresso",
    tProgV: "Acompanhe sua evolucao",
    tProgA: "Ver",
    tVip: "VIP",
    tVipV: "Libere os 365 dias completos",
    tVipASub: "Assinar",
    tVipAMan: "Gerenciar",
    guestTitle: "Comece gratis",
    guestDesc: "Veja o plano de hoje e entre na conta quando quiser salvar seu progresso.",
    guestBtn: "Ver plano gratis",
    myProgTitle: "Seu progresso",
    myProgDesc: "Acompanhe seus dias, treinos e refeicoes concluidas.",
    myProgBtn: "Abrir progresso",
    login: "Entrar",
  },
  en: {
    hello: (n: string) => `Hi, ${n}`,
    guest: "Visitor",
    heroSub: "Keep going today. One simple step at a time.",
    planToday: "TODAY'S PLAN",
    planSubtitle: "Workout and meals",
    planDesc: "Open the calendar to follow the workout and all meals of the day.",
    openPlan: "Open today's plan",
    vip: "VIP",
    free: "FREE",
    chooseStart: "Choose where to start",
    tPlan: "Plan",
    tPlanV: "Workout and meals of the day",
    tPlanA: "Open",
    tTools: "Tools",
    tToolsV: "BMI, water and goals",
    tToolsA: "Calculate",
    tProg: "Progress",
    tProgV: "Track your evolution",
    tProgA: "View",
    tVip: "VIP",
    tVipV: "Unlock all 365 days",
    tVipASub: "Subscribe",
    tVipAMan: "Manage",
    guestTitle: "Start for free",
    guestDesc: "See today's plan and sign in whenever you want to save your progress.",
    guestBtn: "See free plan",
    myProgTitle: "Your progress",
    myProgDesc: "Track your days, workouts and completed meals.",
    myProgBtn: "Open progress",
    login: "Sign in",
  },
  es: {
    hello: (n: string) => `Hola, ${n}`,
    guest: "Visitante",
    heroSub: "Sigue hoy. Un paso simple a la vez.",
    planToday: "PLAN DE HOY",
    planSubtitle: "Entrenamiento y comidas",
    planDesc: "Abre el calendario para seguir el entrenamiento y todas las comidas del dia.",
    openPlan: "Abrir plan de hoy",
    vip: "VIP",
    free: "FREE",
    chooseStart: "Elige por donde empezar",
    tPlan: "Plan",
    tPlanV: "Entrenamiento y comidas del dia",
    tPlanA: "Abrir",
    tTools: "Herramientas",
    tToolsV: "IMC, agua y metas",
    tToolsA: "Calcular",
    tProg: "Progreso",
    tProgV: "Sigue tu evolucion",
    tProgA: "Ver",
    tVip: "VIP",
    tVipV: "Desbloquea los 365 dias",
    tVipASub: "Suscribir",
    tVipAMan: "Gestionar",
    guestTitle: "Empieza gratis",
    guestDesc: "Mira el plan de hoy e inicia sesion cuando quieras guardar tu progreso.",
    guestBtn: "Ver plan gratis",
    myProgTitle: "Tu progreso",
    myProgDesc: "Sigue tus dias, entrenamientos y comidas completadas.",
    myProgBtn: "Abrir progreso",
    login: "Entrar",
  },
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AppPage() {
  const [lang, setLang] = useState<Lang>("pt");
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isVip, setIsVip] = useState(false);
  const [name, setName] = useState("");

  const t = UI[lang];

  useEffect(() => {
    const saved = window.localStorage.getItem("barrigaseca-language");
    if (saved === "pt" || saved === "en" || saved === "es") setLang(saved);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setIsVip(false);
        setName("");
        setReady(true);
        return;
      }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = (snap.exists() ? (snap.data() as UserProfile) : {}) ?? {};
        setIsVip(isVipFromProfile(data));
        setName(
          data.customDisplayName ||
            data.displayName ||
            u.displayName ||
            (u.email ? u.email.split("@")[0] : "")
        );
      } catch {
        setIsVip(false);
        setName(u.email ? u.email.split("@")[0] : "");
      } finally {
        setReady(true);
      }
    });
    return () => unsub();
  }, []);

  const isGuest = ready && !user;
  const displayName = name || t.guest;

  function changeLang(next: Lang) {
    setLang(next);
    window.localStorage.setItem("barrigaseca-language", next);
  }

  const tiles = useMemo(
    () => [
      { title: t.tPlan, value: t.tPlanV, action: t.tPlanA, href: "/free", icon: "🍽️", grad: ["#FF8A00", "#E94015"] },
      { title: t.tTools, value: t.tToolsV, action: t.tToolsA, href: "/ferramentas", icon: "🧮", grad: ["#20D4FF", "#176CFF"] },
      { title: t.tProg, value: t.tProgV, action: t.tProgA, href: "/vip/progresso", icon: "📈", grad: ["#95F43A", "#149B37"] },
      { title: t.tVip, value: t.tVipV, action: isVip ? t.tVipAMan : t.tVipASub, href: "/vip", icon: "⭐", grad: ["#FFCC32", "#FF7A00"] },
    ],
    [t, isVip]
  );

  return (
    <main style={S.page}>
      <div style={S.bg} aria-hidden />

      <div style={S.langWrap}>
        <div style={S.langGroup} aria-label="Language">
          {(["pt", "en", "es"] as Lang[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => changeLang(code)}
              style={{ ...S.langBtn, ...(lang === code ? S.langBtnActive : null) }}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section style={S.hero}>
        <div style={S.heroGlow} aria-hidden />
        <div style={S.heroRow}>
          <div style={S.avatar}>{initials(displayName)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.heroHello}>{t.hello(displayName)}</div>
            <div style={S.heroSub}>{t.heroSub}</div>
          </div>
        </div>

        <div style={S.brand}>Barriga Seca</div>

        <div style={S.planCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={S.planKicker}>{t.planToday}</div>
              <div style={S.planTitle}>{t.planSubtitle}</div>
            </div>
            <span style={{ ...S.badge, background: isVip ? "#FFB000" : "#2C8E24" }}>
              {isVip ? t.vip : t.free}
            </span>
          </div>
          <div style={S.planDesc}>{t.planDesc}</div>
          <a href="/free" style={S.greenBtn}>{t.openPlan}</a>
        </div>
      </section>

      {/* SHORTCUTS */}
      <section style={S.board}>
        <div style={S.boardTitle}>{t.chooseStart}</div>
        <div style={S.tilesGrid}>
          {tiles.map((tile) => (
            <a
              key={tile.title + tile.href}
              href={tile.href}
              style={{ ...S.tile, background: `linear-gradient(160deg, ${tile.grad[0]}, ${tile.grad[1]})` }}
            >
              <div style={S.tileIcon}>{tile.icon}</div>
              <div>
                <div style={S.tileTitle}>{tile.title}</div>
                <div style={S.tileValue}>{tile.value}</div>
                <div style={S.tileAction}>{tile.action} ›</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* GUEST / PROGRESS */}
      <section style={S.softCard}>
        {isGuest ? (
          <>
            <div style={S.softTitle}>{t.guestTitle}</div>
            <div style={S.softDesc}>{t.guestDesc}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
              <a href="/free" style={S.greenBtn}>{t.guestBtn}</a>
              <a href="/login" style={S.ghostBtn}>{t.login}</a>
            </div>
          </>
        ) : (
          <>
            <div style={S.softTitle}>{t.myProgTitle}</div>
            <div style={S.softDesc}>{t.myProgDesc}</div>
            <a href="/vip/progresso" style={{ ...S.greenBtn, marginTop: 4 }}>{t.myProgBtn}</a>
          </>
        )}
      </section>

      <MobileNav active="home" />
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 18,
    maxWidth: 620,
    margin: "0 auto",
    background: "linear-gradient(180deg,#07152B,#111018 45%,#07070A)",
    position: "relative",
    color: "#fff",
  },
  bg: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(900px 500px at 80% 8%, rgba(255,214,90,0.12), transparent 55%), radial-gradient(900px 500px at 15% 70%, rgba(31,86,167,0.16), transparent 60%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  langWrap: { position: "relative", zIndex: 1, display: "flex", justifyContent: "flex-end", marginBottom: 12 },
  langGroup: {
    display: "inline-flex",
    gap: 4,
    padding: 4,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
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

  hero: {
    position: "relative",
    zIndex: 1,
    borderRadius: 28,
    padding: 18,
    background: "linear-gradient(180deg,#163F86,#1C2030 55%,#15110F)",
    border: "1px solid rgba(255,255,255,0.24)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(400px 240px at 30% 0%, rgba(255,209,92,0.33), transparent 60%)",
    pointerEvents: "none",
  },
  heroRow: { position: "relative", display: "flex", gap: 14, alignItems: "center", marginBottom: 14 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg,#B7FF42,#3BB928)",
    border: "2px solid rgba(255,255,255,0.45)",
    color: "#0B2A00",
    fontWeight: 950,
    fontSize: 20,
  },
  heroHello: { fontSize: 25, fontWeight: 950, color: "#fff", textShadow: "2px 3px 8px rgba(0,0,0,0.6)", lineHeight: 1.1 },
  heroSub: { color: "#E9F0FF", fontWeight: 700, marginTop: 4 },
  brand: {
    position: "relative",
    color: "#FFC33D",
    fontSize: 34,
    fontWeight: 950,
    textShadow: "3px 5px 8px rgba(95,36,0,0.9)",
    margin: "6px 0 14px",
  },
  planCard: {
    position: "relative",
    borderRadius: 22,
    padding: 16,
    background: "#F5FFF0",
    color: "#1B1B1B",
    boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  planKicker: { color: "#2B7A18", fontSize: 16, fontWeight: 950 },
  planTitle: { color: "#1B1B1B", fontSize: 22, fontWeight: 950 },
  badge: { color: "#fff", fontWeight: 950, fontSize: 12, padding: "8px 14px", borderRadius: 14 },
  planDesc: { color: "#444", fontWeight: 500, lineHeight: 1.45 },
  greenBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 18px",
    borderRadius: 16,
    background: "#83F02D",
    color: "#101010",
    fontWeight: 950,
    fontSize: 15,
    textDecoration: "none",
    boxShadow: "0 8px 18px rgba(131,240,45,0.35)",
  },
  ghostBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 18px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontWeight: 900,
    fontSize: 15,
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.18)",
  },

  board: {
    position: "relative",
    zIndex: 1,
    marginTop: 16,
    borderRadius: 24,
    padding: 14,
    background: "rgba(32,32,40,0.55)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  boardTitle: { color: "#fff", fontSize: 20, fontWeight: 950, marginBottom: 12 },
  tilesGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  tile: {
    minHeight: 132,
    borderRadius: 22,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.32)",
    boxShadow: "0 10px 22px rgba(0,0,0,0.3)",
    textDecoration: "none",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  tileIcon: { fontSize: 30, lineHeight: 1 },
  tileTitle: { color: "#fff", fontSize: 19, fontWeight: 950, textShadow: "2px 3px 4px rgba(0,0,0,0.45)" },
  tileValue: { color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: 700, marginTop: 2 },
  tileAction: { color: "#fff", fontSize: 12, fontWeight: 950, marginTop: 6 },

  softCard: {
    position: "relative",
    zIndex: 1,
    marginTop: 16,
    borderRadius: 22,
    padding: 16,
    background: "#19191F",
    border: "1px solid rgba(255,255,255,0.10)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
  },
  softTitle: { color: "#fff", fontSize: 21, fontWeight: 950 },
  softDesc: { color: "#D4D4DC", fontWeight: 500, lineHeight: 1.45 },
};
