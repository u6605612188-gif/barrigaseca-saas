"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import MobileNav from "@/components/MobileNav";
import { auth, db } from "@/lib/firebase";

type Lang = "pt" | "en" | "es";

type UserProfile = {
  email?: string;
  vip?: boolean;
  vipActive?: boolean;
  isVip?: boolean;
  subscriptionStatus?: string;
  unlockedCycles?: number;
  vipUntil?: any;
  vip_until?: any;
  vipExpiresAt?: any;
  vip_expires_at?: any;
  language?: Lang;
  displayName?: string;
  customDisplayName?: string;
  currentWeightKg?: number;
  targetWeightKg?: number;
  bodyGoal?: string;
};

const SUPPORT_WA = "351961780568";

const UI: Record<Lang, any> = {
  pt: {
    profileTitle: "Seu perfil",
    hello: (n: string) => `Ola, ${n}`,
    vipActive: "VIP ativo",
    free: "Plano gratis",
    plan: "Plano",
    freeShort: "Gratis",
    renewal: "Renovacao",
    autoRenew: "Renovacao automatica",
    renewIn: (d: number) => (d === 1 ? "Renova em 1 dia" : `Renova em ${d} dias`),
    cycles: "Ciclos liberados",
    vipValidity: "Validade VIP",
    noDate: "Sem data definida",
    personalData: "Dados pessoais",
    name: "Nome",
    currentWeight: "Peso atual",
    targetWeight: "Meta de peso",
    goal: "Objetivo",
    lose: "Perder peso",
    maintain: "Manter peso atual",
    gain: "Ganhar massa muscular",
    saveProfile: "Salvar perfil",
    saved: "Perfil salvo.",
    subTitle: "Assinatura",
    subFreeDesc: "Assine o VIP e libere os 365 dias completos, receitas com passo a passo e ferramentas sem limites.",
    subVipDesc: "Voce e VIP. Gerencie sua assinatura quando quiser.",
    subscribe: "Assinar VIP",
    manage: "Gerenciar assinatura",
    healthTitle: "Aviso de saude",
    healthDesc: "O app oferece conteudo educativo e nao substitui orientacao medica ou nutricional.",
    terms: "Termos e aviso de saude",
    support: "Pedir suporte",
    privacyTitle: "Privacidade e conta",
    privacyDesc: "Acesse a politica de privacidade ou solicite a exclusao da conta e dados.",
    privacy: "Politica de privacidade",
    deleteAccount: "Solicitar exclusao da conta",
    language: "Idioma",
    logout: "Sair da conta",
    loading: "Carregando sua conta...",
    saveError: "Nao foi possivel salvar. Tente novamente.",
  },
  en: {
    profileTitle: "Your profile",
    hello: (n: string) => `Hi, ${n}`,
    vipActive: "VIP active",
    free: "Free plan",
    plan: "Plan",
    freeShort: "Free",
    renewal: "Renewal",
    autoRenew: "Automatic renewal",
    renewIn: (d: number) => (d === 1 ? "Renews in 1 day" : `Renews in ${d} days`),
    cycles: "Unlocked cycles",
    vipValidity: "VIP validity",
    noDate: "No date set",
    personalData: "Personal data",
    name: "Name",
    currentWeight: "Current weight",
    targetWeight: "Target weight",
    goal: "Goal",
    lose: "Lose weight",
    maintain: "Maintain current weight",
    gain: "Gain muscle",
    saveProfile: "Save profile",
    saved: "Profile saved.",
    subTitle: "Subscription",
    subFreeDesc: "Subscribe to VIP and unlock all 365 days, step-by-step recipes and unlimited tools.",
    subVipDesc: "You are VIP. Manage your subscription whenever you want.",
    subscribe: "Subscribe to VIP",
    manage: "Manage subscription",
    healthTitle: "Health notice",
    healthDesc: "The app offers educational content and does not replace medical or nutritional advice.",
    terms: "Terms and health notice",
    support: "Ask for support",
    privacyTitle: "Privacy and account",
    privacyDesc: "Access the privacy policy or request deletion of your account and data.",
    privacy: "Privacy policy",
    deleteAccount: "Request account deletion",
    language: "Language",
    logout: "Sign out",
    loading: "Loading your account...",
    saveError: "Could not save. Please try again.",
  },
  es: {
    profileTitle: "Tu perfil",
    hello: (n: string) => `Hola, ${n}`,
    vipActive: "VIP activo",
    free: "Plan gratis",
    plan: "Plan",
    freeShort: "Gratis",
    renewal: "Renovacion",
    autoRenew: "Renovacion automatica",
    renewIn: (d: number) => (d === 1 ? "Renueva en 1 dia" : `Renueva en ${d} dias`),
    cycles: "Ciclos desbloqueados",
    vipValidity: "Validez VIP",
    noDate: "Sin fecha definida",
    personalData: "Datos personales",
    name: "Nombre",
    currentWeight: "Peso actual",
    targetWeight: "Meta de peso",
    goal: "Objetivo",
    lose: "Perder peso",
    maintain: "Mantener el peso actual",
    gain: "Ganar masa muscular",
    saveProfile: "Guardar perfil",
    saved: "Perfil guardado.",
    subTitle: "Suscripcion",
    subFreeDesc: "Suscribete al VIP y desbloquea los 365 dias completos, recetas con paso a paso y herramientas sin limites.",
    subVipDesc: "Eres VIP. Gestiona tu suscripcion cuando quieras.",
    subscribe: "Suscribir VIP",
    manage: "Gestionar suscripcion",
    healthTitle: "Aviso de salud",
    healthDesc: "La app ofrece contenido educativo y no sustituye la orientacion medica o nutricional.",
    terms: "Terminos y aviso de salud",
    support: "Pedir soporte",
    privacyTitle: "Privacidad y cuenta",
    privacyDesc: "Accede a la politica de privacidad o solicita la eliminacion de la cuenta y los datos.",
    privacy: "Politica de privacidad",
    deleteAccount: "Solicitar eliminacion de la cuenta",
    language: "Idioma",
    logout: "Salir de la cuenta",
    loading: "Cargando tu cuenta...",
    saveError: "No se pudo guardar. Intenta de nuevo.",
  },
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
  const statusOk = ["active", "trialing", "paid"].includes(String(data.subscriptionStatus ?? "").toLowerCase());
  const until = data.vipUntil ?? data.vip_until ?? data.vipExpiresAt ?? data.vip_expires_at;
  const untilMs = asMillis(until);
  return flag || statusOk || (typeof untilMs === "number" && untilMs > Date.now());
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function weightText(v?: number) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "";
  return String(Math.round(v * 10) / 10).replace(".", ",");
}

function parseWeight(s: string): number | null {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : null;
}

export default function ContaPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("pt");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [bodyGoal, setBodyGoal] = useState("lose_weight");

  const t = UI[lang];

  useEffect(() => {
    const saved = window.localStorage.getItem("barrigaseca-language");
    if (saved === "pt" || saved === "en" || saved === "es") setLang(saved);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = (snap.exists() ? (snap.data() as UserProfile) : {}) ?? {};
        setProfile(data);
        setName(data.customDisplayName || data.displayName || u.displayName || (u.email ? u.email.split("@")[0] : ""));
        setCurrentWeight(weightText(data.currentWeightKg));
        setTargetWeight(weightText(data.targetWeightKg));
        setBodyGoal(data.bodyGoal || "lose_weight");
        if (data.language === "pt" || data.language === "en" || data.language === "es") {
          setLang(data.language);
          window.localStorage.setItem("barrigaseca-language", data.language);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  const isVip = useMemo(() => (profile ? isVipFromProfile(profile) : false), [profile]);
  const vipUntil = profile?.vipUntil ?? profile?.vip_until ?? profile?.vipExpiresAt ?? profile?.vip_expires_at;
  const cycles = Number(profile?.unlockedCycles ?? (isVip ? 1 : 0));

  const renewalLabel = useMemo(() => {
    if (!isVip) return t.free;
    const ms = asMillis(vipUntil);
    if (!ms) return t.autoRenew;
    const days = Math.max(0, Math.floor((ms - Date.now()) / 86400000) + 1);
    return t.renewIn(days);
  }, [isVip, vipUntil, t]);

  const vipDateLabel = useMemo(() => {
    const ms = asMillis(vipUntil);
    if (!ms) return t.noDate;
    const loc = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
    return new Intl.DateTimeFormat(loc, { dateStyle: "medium" }).format(new Date(ms));
  }, [vipUntil, t, lang]);

  const displayName = name || (user?.email ? user.email.split("@")[0] : "");

  async function changeLanguage(next: Lang) {
    setLang(next);
    window.localStorage.setItem("barrigaseca-language", next);
    if (!user?.uid) return;
    try {
      await setDoc(doc(db, "users", user.uid), { language: next, updatedAt: serverTimestamp() }, { merge: true });
    } catch {}
  }

  async function saveProfile() {
    if (!user?.uid) return;
    setSaving(true);
    setMessage(null);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          customDisplayName: name.trim(),
          currentWeightKg: parseWeight(currentWeight),
          targetWeightKg: parseWeight(targetWeight),
          bodyGoal,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setMessage(t.saved);
    } catch {
      setMessage(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  function openSupport() {
    const msg = encodeURIComponent(
      `Ola, preciso de suporte no Barriga Seca.\nConta: ${user?.email ?? ""}\nStatus: ${isVip ? "VIP" : "Gratis"}`
    );
    window.open(`https://wa.me/${SUPPORT_WA}?text=${msg}`, "_blank");
  }

  function openDelete() {
    const msg = encodeURIComponent(
      `Ola, quero solicitar a exclusao da minha conta e dados no Barriga Seca.\nConta: ${user?.email ?? ""}`
    );
    window.open(`https://wa.me/${SUPPORT_WA}?text=${msg}`, "_blank");
  }

  if (loading) return <main style={S.loading}>{t.loading}</main>;

  return (
    <main style={S.page}>
      <div style={S.bg} aria-hidden />

      {/* HERO */}
      <section style={S.hero}>
        <div style={S.heroRow}>
          <div style={S.avatar}>{initials(displayName)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.heroTitle}>{t.profileTitle}</div>
            <div style={S.heroHello}>{t.hello(displayName)}</div>
            <div style={S.heroEmail}>{user?.email ?? profile?.email ?? ""}</div>
            <span style={{ ...S.statusBadge, background: isVip ? "#FFB000" : "#8EEA35" }}>
              {isVip ? t.vipActive : t.free}
            </span>
          </div>
        </div>

        <div style={S.pillRow}>
          <div style={S.pill}>
            <div style={S.pillLabel}>{t.plan}</div>
            <div style={S.pillValue}>{isVip ? t.vipActive : t.freeShort}</div>
          </div>
          <div style={S.pill}>
            <div style={S.pillLabel}>{t.renewal}</div>
            <div style={S.pillValue}>{renewalLabel}</div>
          </div>
        </div>

        <div style={S.summaryBox}>
          <div style={S.summaryLine}>
            <span style={S.sLabel}>{t.cycles}</span>
            <span style={S.sValue}>{Number.isFinite(cycles) ? cycles : 0}</span>
          </div>
          <div style={S.summaryLine}>
            <span style={S.sLabel}>{t.vipValidity}</span>
            <span style={S.sValue}>{vipDateLabel}</span>
          </div>
        </div>
      </section>

      {/* DADOS PESSOAIS */}
      <section style={S.card}>
        <div style={S.cardTitleGold}>{t.personalData}</div>
        <Field label={t.name} value={name} onChange={(v) => setName(v.slice(0, 40))} />
        <Field label={t.currentWeight} value={currentWeight} onChange={setCurrentWeight} suffix="kg" numeric />
        <Field label={t.targetWeight} value={targetWeight} onChange={setTargetWeight} suffix="kg" numeric />
        <div style={{ color: "#fff", fontWeight: 900, marginTop: 4 }}>{t.goal}</div>
        <GoalBtn label={t.lose} selected={bodyGoal === "lose_weight"} onClick={() => setBodyGoal("lose_weight")} />
        <GoalBtn label={t.maintain} selected={bodyGoal === "maintain"} onClick={() => setBodyGoal("maintain")} />
        <GoalBtn label={t.gain} selected={bodyGoal === "gain_muscle"} onClick={() => setBodyGoal("gain_muscle")} />
        {message && <div style={{ color: "#8EEA35", fontWeight: 800 }}>{message}</div>}
        <button type="button" onClick={saveProfile} disabled={saving} style={S.greenBtn}>{t.saveProfile}</button>
      </section>

      {/* ASSINATURA (Stripe) */}
      <section style={S.subCard}>
        <div style={S.cardTitleGold}>{t.subTitle}</div>
        <div style={{ color: "#FFEBC1", fontWeight: 500, lineHeight: 1.45 }}>
          {isVip ? t.subVipDesc : t.subFreeDesc}
        </div>
        <a href="/vip" style={S.goldBtn}>{isVip ? t.manage : t.subscribe}</a>
      </section>

      {/* AVISO DE SAUDE */}
      <section style={S.healthCard}>
        <div style={S.cardTitleGold}>{t.healthTitle}</div>
        <div style={{ color: "#FFEBC1", fontWeight: 500, lineHeight: 1.45 }}>{t.healthDesc}</div>
        <a href="/termos" style={S.darkBtn}>{t.terms}</a>
      </section>

      <button type="button" onClick={openSupport} style={{ ...S.greenBtn, marginTop: 14 }}>{t.support}</button>

      {/* PRIVACIDADE */}
      <section style={{ ...S.card, marginTop: 14 }}>
        <div style={{ color: "#fff", fontWeight: 950, fontSize: 20 }}>{t.privacyTitle}</div>
        <div style={{ color: "#C9C4D6", lineHeight: 1.45 }}>{t.privacyDesc}</div>
        <a href="/privacidade" style={S.lightBtn}>{t.privacy}</a>
        <button type="button" onClick={openDelete} style={S.dangerBtn}>{t.deleteAccount}</button>
      </section>

      {/* IDIOMA */}
      <div style={{ color: "#fff", fontWeight: 950, fontSize: 19, marginTop: 16, position: "relative", zIndex: 1 }}>{t.language}</div>
      <div style={S.langRow}>
        {(["pt", "en", "es"] as Lang[]).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => changeLanguage(code)}
            style={{ ...S.langBtn, ...(lang === code ? S.langBtnActive : null) }}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>

      <button type="button" onClick={handleLogout} style={S.lightBtnFull}>{t.logout}</button>

      <MobileNav active="account" />
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  numeric?: boolean;
}) {
  return (
    <label style={S.fieldWrap}>
      <span style={S.fieldLabel}>{label}</span>
      <span style={S.fieldRow}>
        <input
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (numeric) {
              if (v.length <= 7 && /^[0-9.,]*$/.test(v)) onChange(v);
            } else {
              onChange(v);
            }
          }}
          inputMode={numeric ? "decimal" : "text"}
          style={S.input}
        />
        {suffix ? <span style={S.suffix}>{suffix}</span> : null}
      </span>
    </label>
  );
}

function GoalBtn({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...S.goalBtn,
        ...(selected ? S.goalBtnOn : null),
      }}
    >
      <span style={{ ...S.radio, ...(selected ? S.radioOn : null) }}>{selected ? "●" : ""}</span>
      {label}
    </button>
  );
}

const S: Record<string, React.CSSProperties> = {
  loading: { minHeight: "100vh", padding: 28, color: "#fff", background: "#07070A" },
  page: {
    minHeight: "100vh",
    padding: 18,
    maxWidth: 620,
    margin: "0 auto",
    background: "linear-gradient(180deg,#07152B,#12101A 45%,#07070A)",
    position: "relative",
    color: "#fff",
  },
  bg: {
    position: "fixed",
    inset: 0,
    background: "radial-gradient(900px 500px at 80% 6%, rgba(69,183,255,0.14), transparent 60%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  hero: {
    position: "relative",
    zIndex: 1,
    borderRadius: 28,
    padding: 16,
    background: "linear-gradient(180deg,#163F86,#1C2030 55%,#15110F)",
    border: "1px solid rgba(84,199,255,0.4)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  heroRow: { display: "flex", gap: 14, alignItems: "center" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg,#54C7FF,#176CFF)",
    border: "2px solid rgba(255,255,255,0.45)",
    color: "#fff",
    fontWeight: 950,
    fontSize: 21,
  },
  heroTitle: { color: "#FFD86B", fontSize: 26, fontWeight: 950, textShadow: "1px 2px 4px rgba(0,0,0,0.6)" },
  heroHello: { color: "#fff", fontSize: 17, fontWeight: 900, marginTop: 2 },
  heroEmail: { color: "#DDE7F5", fontWeight: 700, fontSize: 13, marginTop: 2, wordBreak: "break-word" },
  statusBadge: {
    display: "inline-block",
    marginTop: 8,
    color: "#111",
    fontWeight: 950,
    fontSize: 12,
    padding: "5px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.4)",
  },
  pillRow: { display: "flex", gap: 10 },
  pill: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    background: "rgba(17,17,24,0.4)",
    border: "1px solid rgba(69,183,255,0.2)",
  },
  pillLabel: { color: "#C9C4D6", fontSize: 12, fontWeight: 700 },
  pillValue: { color: "#fff", fontSize: 15, fontWeight: 950, marginTop: 4 },
  summaryBox: {
    borderRadius: 18,
    padding: 14,
    background: "rgba(17,17,24,0.27)",
    border: "1px solid rgba(69,183,255,0.2)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  summaryLine: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  sLabel: { color: "#C9C4D6", fontWeight: 700 },
  sValue: { color: "#fff", fontWeight: 950 },

  card: {
    position: "relative",
    zIndex: 1,
    marginTop: 14,
    borderRadius: 22,
    padding: 16,
    background: "#17161D",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  subCard: {
    position: "relative",
    zIndex: 1,
    marginTop: 14,
    borderRadius: 22,
    padding: 16,
    background: "#17161D",
    border: "1px solid rgba(255,182,55,0.25)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  healthCard: {
    position: "relative",
    zIndex: 1,
    marginTop: 14,
    borderRadius: 22,
    padding: 16,
    background: "#2A2112",
    border: "1px solid rgba(255,182,55,0.25)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  cardTitleGold: { color: "#FFD86B", fontWeight: 950, fontSize: 20, textShadow: "1px 2px 3px rgba(0,0,0,0.5)" },

  fieldWrap: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { color: "#D7D7DE", fontSize: 13, fontWeight: 800 },
  fieldRow: { display: "flex", alignItems: "center", gap: 8, border: "1px solid #4A4A55", borderRadius: 12, padding: "0 12px", background: "#101014" },
  input: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 16, fontWeight: 700, padding: "12px 0" },
  suffix: { color: "#8EEA35", fontWeight: 800 },

  goalBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#101014",
    color: "#fff",
    fontWeight: 800,
  },
  goalBtnOn: { border: "1px solid #8EEA35", background: "#17240C" },
  radio: {
    width: 22,
    height: 22,
    flexShrink: 0,
    borderRadius: "50%",
    border: "2px solid #62626D",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8EEA35",
    fontSize: 14,
  },
  radioOn: { borderColor: "#8EEA35" },

  greenBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 16px",
    borderRadius: 16,
    border: "none",
    background: "#8EEA35",
    color: "#111",
    fontWeight: 950,
    fontSize: 15,
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 8px 18px rgba(142,234,53,0.3)",
  },
  goldBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 16px",
    borderRadius: 16,
    background: "#FF8A00",
    color: "#151006",
    fontWeight: 950,
    fontSize: 15,
    textDecoration: "none",
    boxShadow: "0 8px 18px rgba(255,138,0,0.3)",
  },
  darkBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "13px 16px",
    borderRadius: 14,
    background: "#111",
    color: "#fff",
    fontWeight: 950,
    fontSize: 14,
    textDecoration: "none",
  },
  lightBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "13px 16px",
    borderRadius: 14,
    background: "#F7F7F8",
    color: "#111",
    fontWeight: 950,
    fontSize: 14,
    textDecoration: "none",
  },
  lightBtnFull: {
    position: "relative",
    zIndex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 16px",
    borderRadius: 16,
    border: "none",
    background: "#F7F7F8",
    color: "#111",
    fontWeight: 950,
    fontSize: 15,
    cursor: "pointer",
    marginTop: 12,
  },
  dangerBtn: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 14,
    border: "none",
    background: "#FFE8E8",
    color: "#991B1B",
    fontWeight: 950,
    fontSize: 14,
    cursor: "pointer",
  },
  langRow: { position: "relative", zIndex: 1, display: "flex", gap: 8, marginTop: 10 },
  langBtn: {
    border: "none",
    borderRadius: 14,
    background: "#F7F7F8",
    color: "#111",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 950,
    padding: "10px 18px",
  },
  langBtnActive: { background: "#8EEA35", color: "#111" },
};
