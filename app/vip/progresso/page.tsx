"use client";

import MobileNav from "@/components/MobileNav";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import {
  defaultLanguage,
  isLanguage,
  languages,
  translations,
  type Language,
} from "@/lib/i18n";

type UserProfile = {
  vip?: boolean;
  vipUntil?: any;
};

type DailyHabitsDoc = {
  date: string;
  allDone?: boolean;
  items?: Record<string, boolean>;
};

type GoalsDoc = {
  weekStartISO?: string;
  goalDays?: number;
  goalWaterLiters?: number;
  goalWorkouts?: number;
  doneDays?: string[];
  doneWorkouts?: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function minusDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}
function startOfWeekMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function isVipFromProfile(data: UserProfile) {
  if (data?.vip === true) return true;

  const until = (data as any)?.vipUntil;
  if (until && typeof until?.seconds === "number") {
    return until.seconds * 1000 > Date.now();
  }
  return false;
}

const LOCK: Record<
  Language,
  {
    kicker: string;
    title: string;
    desc: string;
    benefitsTitle: string;
    benefits: string[];
    reassure: string;
    cta: string;
    free: string;
  }
> = {
  pt: {
    kicker: "PROGRESSO VIP",
    title: "Veja sua barriga secar dia após dia",
    desc: "O painel completo de evolução é exclusivo dos membros VIP. Acompanhe sua sequência, sua semana e cada avanço de verdade — o que te mantém firme até o resultado.",
    benefitsTitle: "Ao virar VIP você desbloqueia hoje:",
    benefits: [
      "Painel de progresso completo: sequência, semana e recordes",
      "365 dias de plano completo, sem travas",
      "Todas as receitas com ingredientes e passo a passo",
      "Checklist de hábitos e metas semanais",
      "Ferramentas sem limites: IMC, água, proteína e mais",
    ],
    reassure: "Assinatura mensal no cartão · Cancele quando quiser",
    cta: "Virar VIP agora",
    free: "Ver área grátis",
  },
  en: {
    kicker: "VIP PROGRESS",
    title: "Watch your belly shrink day after day",
    desc: "The full progress dashboard is exclusive to VIP members. Track your streak, your week and every real gain — what keeps you going until the result.",
    benefitsTitle: "Become VIP and unlock today:",
    benefits: [
      "Full progress dashboard: streak, week and records",
      "365 days of the complete plan, no locks",
      "Every recipe with ingredients and step by step",
      "Habit checklist and weekly goals",
      "Unlimited tools: BMI, water, protein and more",
    ],
    reassure: "Monthly card subscription · Cancel anytime",
    cta: "Become VIP now",
    free: "See free area",
  },
  es: {
    kicker: "PROGRESO VIP",
    title: "Mira tu barriga reducirse día a día",
    desc: "El panel completo de evolución es exclusivo de los miembros VIP. Sigue tu racha, tu semana y cada avance real — lo que te mantiene firme hasta el resultado.",
    benefitsTitle: "Hazte VIP y desbloquea hoy:",
    benefits: [
      "Panel de progreso completo: racha, semana y récords",
      "365 días del plan completo, sin bloqueos",
      "Todas las recetas con ingredientes y paso a paso",
      "Checklist de hábitos y metas semanales",
      "Herramientas sin límites: IMC, agua, proteína y más",
    ],
    reassure: "Suscripción mensual con tarjeta · Cancela cuando quieras",
    cta: "Hazte VIP ahora",
    free: "Ver área gratis",
  },
};

export default function ProgressoPage() {
  const router = useRouter();

  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const t = translations[language].progressPage;

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [vipLoading, setVipLoading] = useState(true);
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [habitsMap, setHabitsMap] = useState<Map<string, DailyHabitsDoc>>(new Map());
  const [goals, setGoals] = useState<GoalsDoc | null>(null);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("barrigaseca-language");
    if (isLanguage(savedLanguage)) setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("barrigaseca-language", language);
  }, [language]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setAuthReady(true);

      if (!u) router.replace("/login");
    });

    return () => unsub();
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      if (!authReady) return;
      if (!user?.uid) return;

      setVipLoading(true);
      setLoading(true);
      setErr(null);

      try {
        const profileRef = doc(db, "users", user.uid);
        const profileSnap = await getDoc(profileRef);
        const profile = (profileSnap.exists() ? (profileSnap.data() as UserProfile) : {}) ?? {};
        const vip = isVipFromProfile(profile);

        if (cancelled) return;

        setIsVip(vip);
        setVipLoading(false);

        if (!vip) {
          setLoading(false);
          return;
        }

        const colHabits = collection(db, "users", user.uid, "habits");
        const habitsSnap = await getDocs(colHabits);

        const map = new Map<string, DailyHabitsDoc>();
        for (const d of habitsSnap.docs) {
          const data = d.data() as DailyHabitsDoc;
          const key = (data?.date ?? d.id) as string;
          map.set(key, { ...data, date: key });
        }

        const goalsRef = doc(db, "users", user.uid, "goals", "current");
        const goalsSnap = await getDoc(goalsRef);
        const goalsData = goalsSnap.exists() ? (goalsSnap.data() as GoalsDoc) : null;

        if (cancelled) return;

        setHabitsMap(map);
        setGoals(goalsData);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message ?? t.loadError);
        setVipLoading(false);
        setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [authReady, user?.uid, t.loadError]);

  const todayISO = useMemo(() => ymd(new Date()), []);

  const kpis = useMemo(() => {
    let cur = 0;
    let cursor = new Date();
    for (let i = 0; i < 60; i++) {
      const key = ymd(cursor);
      const docu = habitsMap.get(key);
      if (docu?.allDone === true) {
        cur++;
        cursor = minusDays(cursor, 1);
      } else {
        break;
      }
    }

    let best = 0;
    let run = 0;
    let scan = new Date();
    for (let i = 0; i < 180; i++) {
      const key = ymd(scan);
      const docu = habitsMap.get(key);
      if (docu?.allDone === true) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
      scan = minusDays(scan, 1);
    }

    let done7 = 0;
    for (let i = 0; i < 7; i++) {
      const key = ymd(minusDays(new Date(), i));
      if (habitsMap.get(key)?.allDone === true) done7++;
    }

    let done30 = 0;
    for (let i = 0; i < 30; i++) {
      const key = ymd(minusDays(new Date(), i));
      if (habitsMap.get(key)?.allDone === true) done30++;
    }

    const pct7 = Math.round((done7 / 7) * 100);
    const pct30 = Math.round((done30 / 30) * 100);
    const todayDone = habitsMap.get(todayISO)?.allDone === true;

    return {
      streakAtual: cur,
      melhorStreak: best,
      done7,
      pct7: clamp(pct7, 0, 100),
      done30,
      pct30: clamp(pct30, 0, 100),
      todayDone,
    };
  }, [habitsMap, todayISO]);

  const week = useMemo(() => {
    const weekStart = goals?.weekStartISO
      ? startOfWeekMonday(new Date(goals.weekStartISO))
      : startOfWeekMonday(new Date());

    const weekStartISO = ymd(weekStart);
    const weekDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(ymd(minusDays(minusDays(new Date(weekStart), -i), 0)));
    }

    const doneDays = Array.isArray(goals?.doneDays) ? goals!.doneDays : [];
    const start = weekDays[0];
    const end = weekDays[6];
    const doneInWeek = doneDays.filter((d) => d >= start && d <= end).length;
    const goalDays = clamp(Number(goals?.goalDays ?? 5), 1, 7);
    const goalWorkouts = clamp(Number(goals?.goalWorkouts ?? 4), 0, 14);
    const doneWorkouts = clamp(Number(goals?.doneWorkouts ?? 0), 0, 50);
    const pctDays = goalDays > 0 ? Math.round((doneInWeek / goalDays) * 100) : 0;
    const pctWorkouts = goalWorkouts > 0 ? Math.round((doneWorkouts / goalWorkouts) * 100) : 0;

    return {
      weekStartISO,
      goalDays,
      goalWorkouts,
      goalWaterLiters: clamp(Number(goals?.goalWaterLiters ?? 2), 0.5, 10),
      doneInWeek,
      doneWorkouts,
      pctAvg: Math.round((clamp(pctDays, 0, 100) + clamp(pctWorkouts, 0, 100)) / 2),
    };
  }, [goals]);

  if (!authReady || vipLoading) {
    return <main style={styles.loading}>{t.loading}</main>;
  }

  if (!user?.uid) {
    return <main style={styles.loading}>{t.redirecting}</main>;
  }

  if (err) {
    return (
      <main style={styles.centerPage}>
        <div style={styles.bg} aria-hidden />
        <section style={styles.lock}>
          <LanguageSwitcher language={language} onChange={setLanguage} />
          <div style={styles.lockMedal} aria-hidden>⚠️</div>
          <h1 style={styles.lockTitle}>{t.errorTitle}</h1>
          <p style={styles.lockDesc}>{err}</p>

          <div style={styles.lockBtns}>
            <a href="/vip" style={styles.btnPrimary}>{t.vip}</a>
            <a href="/app" style={styles.btnGhost}>{t.back}</a>
          </div>
        </section>
        <MobileNav active="progress" />
      </main>
    );
  }

  if (!isVip) {
    const L = LOCK[language];
    return (
      <main style={styles.centerPage}>
        <div style={styles.bg} aria-hidden />
        <section style={styles.lock}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <LanguageSwitcher language={language} onChange={setLanguage} />
          </div>

          <div style={styles.lockMedal} aria-hidden>👑</div>
          <div style={styles.lockKicker}>{L.kicker}</div>
          <h1 style={styles.lockTitle}>{L.title}</h1>
          <p style={styles.lockDesc}>{L.desc}</p>

          <div style={styles.benefitsCard}>
            <div style={styles.benefitsTitle}>{L.benefitsTitle}</div>
            {L.benefits.map((b) => (
              <div key={b} style={styles.benefitRow}>
                <span style={styles.benefitCheck} aria-hidden>✓</span>
                <span style={styles.benefitText}>{b}</span>
              </div>
            ))}
          </div>

          <a href="/vip" style={styles.ctaBig}>{L.cta}</a>
          <div style={styles.reassure}>🔒 {L.reassure}</div>
          <a href="/free" style={styles.freeLink}>{L.free}</a>
        </section>
        <MobileNav active="progress" />
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
            <LanguageSwitcher language={language} onChange={setLanguage} />
          </div>
          <h1 style={styles.h1}>{t.title}</h1>
          <p style={styles.sub}>{t.subtitle}</p>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/app" style={styles.btnGhost}>{t.backApp}</a>
            <a href="/vip/checklist" style={styles.btnGhost}>{t.checklist}</a>
            <a href="/vip/metas" style={styles.btnGhost}>{t.goals}</a>
          </div>
        </header>

        {loading ? (
          <section style={styles.card}>
            <strong>{t.loadingIndicators}</strong>
          </section>
        ) : (
          <>
            <section style={styles.grid}>
              <KpiCard title={t.currentStreak} value={`${kpis.streakAtual} ${t.days}`} hint={t.executionSequence} />
              <KpiCard title={t.bestStreak} value={`${kpis.melhorStreak} ${t.days}`} hint={t.historicRecord} />
              <KpiCard title={t.last7} value={`${kpis.done7}/7 (${kpis.pct7}%)`} hint={t.recentConsistency} />
              <KpiCard title={t.last30} value={`${kpis.done30}/30 (${kpis.pct30}%)`} hint={t.monthView} />
              <KpiCard title={t.today} value={kpis.todayDone ? t.done : t.pending} hint={todayISO} />
              <KpiCard title={t.week} value={`${week.pctAvg}%`} hint={`${t.start}: ${week.weekStartISO}`} />
            </section>

            <section style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 16, color: "#fff" }}>{t.weekSummary}</div>
                  <div style={{ marginTop: 6, color: "#C9C4D6", fontWeight: 800 }}>
                    {t.weekStarting}: <strong style={{ color: "#FFD86B" }}>{week.weekStartISO}</strong>
                  </div>
                </div>

                <a href="/vip/metas" style={styles.btnPrimary}>{t.adjustGoals}</a>
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <StatCard label={t.daysExecuted} value={`${week.doneInWeek}/${week.goalDays}`} />
                <StatCard label={t.workouts} value={`${week.doneWorkouts}/${week.goalWorkouts}`} />
                <StatCard label={t.waterGoal} value={`${week.goalWaterLiters} L`} />
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: "#9A94A6", fontWeight: 800, lineHeight: 1.5 }}>
                {t.note}
              </div>
            </section>

            <section style={styles.card}>
              <div style={{ fontWeight: 950, fontSize: 16, color: "#fff" }}>{t.quickActions}</div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href="/vip/checklist" style={styles.btnPrimary}>{t.openChecklist}</a>
                <a href="/vip/metas" style={styles.btnGhost}>{t.openGoals}</a>
                <a href="/free" style={styles.btnGhost}>{t.calendar}</a>
              </div>
            </section>
          </>
        )}
        <MobileNav active="progress" />
      </div>
    </main>
  );
}

function LanguageSwitcher({
  language,
  onChange,
}: {
  language: Language;
  onChange: (language: Language) => void;
}) {
  return (
    <div style={styles.languageGroup} aria-label="Language">
      {languages.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => onChange(item.code)}
          style={{
            ...styles.languageButton,
            ...(language === item.code ? styles.languageButtonActive : null),
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function KpiCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div style={styles.kpi}>
      <div style={{ fontSize: 12, fontWeight: 950, color: "#C9C4D6" }}>{title}</div>
      <div style={{ marginTop: 10, fontSize: 22, fontWeight: 950, color: "#fff" }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: "#9A94A6" }}>{hint}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.stat}>
      <div style={{ fontSize: 12, fontWeight: 950, color: "#C9C4D6" }}>{label}</div>
      <div style={{ marginTop: 10, fontSize: 22, fontWeight: 950, color: "#FFD86B" }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    minHeight: "100vh",
    padding: 28,
    color: "#fff",
    background: "linear-gradient(180deg,#07152B,#12101A 45%,#07070A)",
  },
  page: {
    minHeight: "100vh",
    padding: 18,
    background: "linear-gradient(180deg,#07152B,#12101A 45%,#07070A)",
    position: "relative",
    overflow: "hidden",
  },
  centerPage: {
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
  shell: {
    width: "min(1100px, 100%)",
    margin: "8px auto",
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: 12,
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
    gap: 4,
    padding: 4,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
  },
  languageButton: {
    border: "none",
    borderRadius: 999,
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 950,
    padding: "7px 12px",
  },
  languageButtonActive: {
    background: "#FFB637",
    color: "#111",
  },
  h1: {
    margin: "12px 0 6px",
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
    maxWidth: 820,
  },
  grid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  },
  kpi: {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#19191F",
    color: "#fff",
    boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
  },
  stat: {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#101014",
    color: "#fff",
  },
  card: {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#17161D",
    color: "#fff",
    boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
  },
  lock: {
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
  lockMedal: {
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
  lockTitle: {
    margin: "8px 0 0",
    fontSize: 24,
    fontWeight: 950,
    color: "#FFD86B",
    textShadow: "0 2px 5px rgba(0,0,0,0.5)",
  },
  lockDesc: {
    margin: "6px 0 0",
    color: "#E7DFD0",
    fontWeight: 600,
    lineHeight: 1.55,
    maxWidth: 360,
  },
  lockBtns: {
    marginTop: 16,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
  },
  lockKicker: {
    marginTop: 10,
    color: "#FFB637",
    fontWeight: 950,
    fontSize: 12,
    letterSpacing: 2,
  },
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
  benefitsTitle: {
    color: "#FFD86B",
    fontWeight: 950,
    fontSize: 14,
    marginBottom: 2,
  },
  benefitRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
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
  benefitText: {
    color: "#EFE7D6",
    fontWeight: 700,
    lineHeight: 1.4,
    fontSize: 14,
  },
  ctaBig: {
    marginTop: 18,
    width: "100%",
    padding: "16px 18px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(180deg,#FFB000,#FF7A00)",
    fontWeight: 950,
    fontSize: 17,
    textDecoration: "none",
    color: "#20120A",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 12px 26px rgba(255,138,0,0.4)",
  },
  reassure: {
    marginTop: 10,
    color: "#C9C4D6",
    fontWeight: 700,
    fontSize: 12.5,
  },
  freeLink: {
    marginTop: 12,
    color: "#DDE7F5",
    fontWeight: 900,
    fontSize: 14,
    textDecoration: "underline",
  },
  btnPrimary: {
    padding: "13px 18px",
    borderRadius: 14,
    border: "none",
    background: "#FF8A00",
    fontWeight: 950,
    textDecoration: "none",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 18px rgba(255,138,0,0.3)",
  },
  btnGhost: {
    padding: "13px 18px",
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
};



