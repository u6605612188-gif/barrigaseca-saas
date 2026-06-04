"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import {
  defaultLanguage,
  isLanguage,
  languages,
  translations,
  type Language,
} from "@/lib/i18n";

type GoalsDoc = {
  uid: string;
  email: string | null;
  weekStartISO: string;
  goalDays: number;
  goalWaterLiters: number;
  goalWorkouts: number;
  doneDays: string[];
  doneWorkouts: number;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
};

type UserProfile = {
  vip?: boolean;
  vipUntil?: any;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
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

export default function MetasPage() {
  const router = useRouter();

  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const t = translations[language].goalsPage;

  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isVip, setIsVip] = useState(false);
  const [vipLoading, setVipLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [goalDays, setGoalDays] = useState(5);
  const [goalWaterLiters, setGoalWaterLiters] = useState(2);
  const [goalWorkouts, setGoalWorkouts] = useState(4);
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday());
  const [doneDays, setDoneDays] = useState<string[]>([]);
  const [doneWorkouts, setDoneWorkouts] = useState(0);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("barrigaseca-language");
    if (isLanguage(savedLanguage)) setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("barrigaseca-language", language);
  }, [language]);

  const weekDays = useMemo(() => {
    const out: Date[] = [];
    const base = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push(d);
    }
    return out;
  }, [weekStart]);

  const weekStartISO = useMemo(() => isoDate(weekStart), [weekStart]);

  const goalsRef = useMemo(() => {
    if (!authUser?.uid) return null;
    return doc(db, "users", authUser.uid, "goals", "current");
  }, [authUser?.uid]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setAuthUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    async function loadVipAndGoals() {
      if (!authUser?.uid) return;

      setVipLoading(true);
      setErr(null);

      try {
        const userRef = doc(db, "users", authUser.uid);
        const snap = await getDoc(userRef);
        const profile = (snap.exists() ? (snap.data() as UserProfile) : {}) ?? {};
        const vip = isVipFromProfile(profile);
        setIsVip(vip);

        if (goalsRef) {
          const g = await getDoc(goalsRef);
          if (g.exists()) {
            const data = g.data() as GoalsDoc;
            if (data.weekStartISO) setWeekStart(startOfWeekMonday(new Date(data.weekStartISO)));
            setGoalDays(clamp(Number(data.goalDays ?? 5), 1, 7));
            setGoalWaterLiters(clamp(Number(data.goalWaterLiters ?? 2), 0.5, 10));
            setGoalWorkouts(clamp(Number(data.goalWorkouts ?? 4), 0, 14));
            setDoneDays(Array.isArray(data.doneDays) ? data.doneDays : []);
            setDoneWorkouts(clamp(Number(data.doneWorkouts ?? 0), 0, 50));
          }
        }
      } catch (e: any) {
        setErr(e?.message ?? t.loadError);
      } finally {
        setVipLoading(false);
      }
    }

    loadVipAndGoals();
  }, [authUser?.uid, goalsRef, t.loadError]);

  function toggleDay(dateISO: string) {
    setDoneDays((prev) => {
      if (prev.includes(dateISO)) return prev.filter((x) => x !== dateISO);
      return [...prev, dateISO];
    });
  }

  async function saveGoals() {
    if (!authUser?.uid || !goalsRef) return;

    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      const payload: GoalsDoc = {
        uid: authUser.uid,
        email: authUser.email ?? null,
        weekStartISO,
        goalDays: clamp(goalDays, 1, 7),
        goalWaterLiters: clamp(goalWaterLiters, 0.5, 10),
        goalWorkouts: clamp(goalWorkouts, 0, 14),
        doneDays: doneDays.filter((x) => typeof x === "string"),
        doneWorkouts: clamp(doneWorkouts, 0, 50),
        updatedAt: serverTimestamp() as any,
        createdAt: serverTimestamp() as any,
      };

      await setDoc(goalsRef, payload, { merge: true });
      setMsg(t.success);
    } catch (e: any) {
      setErr(e?.message ?? t.saveError);
    } finally {
      setSaving(false);
    }
  }

  const daysDoneCount = useMemo(() => {
    const start = weekDays[0] ? isoDate(weekDays[0]) : weekStartISO;
    const end = weekDays[6] ? isoDate(weekDays[6]) : weekStartISO;
    return doneDays.filter((d) => d >= start && d <= end).length;
  }, [doneDays, weekDays, weekStartISO]);

  const kpi = useMemo(() => {
    const pctDays = goalDays > 0 ? Math.round((daysDoneCount / goalDays) * 100) : 0;
    const pctWork = goalWorkouts > 0 ? Math.round((doneWorkouts / goalWorkouts) * 100) : 0;
    return {
      pctDays: clamp(pctDays, 0, 999),
      pctWork: clamp(pctWork, 0, 999),
      daysDoneCount,
    };
  }, [daysDoneCount, goalDays, goalWorkouts, doneWorkouts]);

  if (loading) return <main style={{ padding: 28 }}>{t.loading}</main>;

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
            <a href="/vip/checklist" style={styles.btnGhost}>{t.openChecklist}</a>
            <a href="/vip" style={styles.btnDark}>{t.vipPlan}</a>
          </div>
        </header>

        {vipLoading ? (
          <section style={styles.card}>
            <strong>{t.validatingVip}</strong>
          </section>
        ) : !isVip ? (
          <section style={styles.lock}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>{t.lockedTitle}</div>
            <p style={{ marginTop: 8, marginBottom: 0, color: "#444", fontWeight: 700, lineHeight: 1.5 }}>
              {t.lockedDesc}
            </p>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="/vip" style={styles.btnDark}>{t.becomeVip}</a>
              <a href="/free" style={styles.btnGhost}>{t.freeArea}</a>
            </div>
          </section>
        ) : (
          <>
            <section style={styles.grid}>
              <KpiCard title={t.daysExecuted} value={`${kpi.daysDoneCount}/${goalDays}`} hint={t.dailyCheckin} />
              <KpiCard title={t.workouts} value={`${doneWorkouts}/${goalWorkouts}`} hint={t.weeklyVolume} />
              <KpiCard title={t.progress} value={`${Math.round((kpi.pctDays + kpi.pctWork) / 2)}%`} hint={t.averageKpi} />
            </section>

            <section style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 16 }}>{t.config}</div>
                  <div style={{ marginTop: 6, color: "#555", fontWeight: 700 }}>
                    {t.weekStarting}: <strong>{weekStartISO}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => setWeekStart(startOfWeekMonday(new Date(Date.now() - 7 * 86400000)))} style={styles.btnGhostBtn} type="button">
                    {t.previousWeek}
                  </button>
                  <button onClick={() => setWeekStart(startOfWeekMonday(new Date()))} style={styles.btnGhostBtn} type="button">
                    {t.currentWeek}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <Field label={t.goalDays} value={goalDays} onChange={(v) => setGoalDays(clamp(v, 1, 7))} min={1} max={7} step={1} />
                <Field label={t.water} value={goalWaterLiters} onChange={(v) => setGoalWaterLiters(clamp(v, 0.5, 10))} min={0.5} max={10} step={0.5} />
                <Field label={t.goalWorkouts} value={goalWorkouts} onChange={(v) => setGoalWorkouts(clamp(v, 0, 14))} min={0} max={14} step={1} />
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={saveGoals} disabled={saving} style={{ ...styles.btnDarkBtn, opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }} type="button">
                  {saving ? t.saving : t.saveGoals}
                </button>

                {msg && <span style={{ color: "#166534", fontWeight: 900 }}>{msg}</span>}
                {err && <span style={{ color: "crimson", fontWeight: 900 }}>{err}</span>}
              </div>
            </section>

            <section style={styles.card}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>{t.weekCheckin}</div>
              <div style={{ marginTop: 8, color: "#555", fontWeight: 700 }}>{t.weekCheckinDesc}</div>

              <div style={{ marginTop: 14, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                {weekDays.map((d) => {
                  const dIso = isoDate(d);
                  const checked = doneDays.includes(dIso);
                  const label = d.toLocaleDateString(language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                  });

                  return (
                    <button
                      key={dIso}
                      type="button"
                      onClick={() => toggleDay(dIso)}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: checked ? "2px solid #111" : "1px solid #e6e6e6",
                        background: checked ? "#111" : "#fff",
                        color: checked ? "#fff" : "#111",
                        fontWeight: 950,
                        cursor: "pointer",
                      }}
                      title={dIso}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900, color: "#111" }}>{t.doneWorkouts}:</div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button type="button" onClick={() => setDoneWorkouts((v) => clamp(v - 1, 0, 50))} style={styles.stepBtn}>-</button>
                  <div style={{ minWidth: 44, textAlign: "center", fontWeight: 950 }}>{doneWorkouts}</div>
                  <button type="button" onClick={() => setDoneWorkouts((v) => clamp(v + 1, 0, 50))} style={styles.stepBtn}>+</button>
                </div>

                <button type="button" onClick={saveGoals} disabled={saving} style={{ ...styles.btnGhostBtn, borderColor: "#111", fontWeight: 950, opacity: saving ? 0.7 : 1 }}>
                  {saving ? t.saving : t.saveProgress}
                </button>
              </div>
            </section>
          </>
        )}
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
      <div style={{ fontSize: 12, fontWeight: 950, color: "#555" }}>{title}</div>
      <div style={{ marginTop: 10, fontSize: 26, fontWeight: 950, color: "#111" }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: "#666" }}>{hint}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 950, color: "#111" }}>{label}</div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 14,
          border: "1px solid #e6e6e6",
          fontWeight: 900,
          outline: "none",
          color: "#111",
          background: "#fff",
          caretColor: "#111",
        }}
      />
    </label>
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
    display: "grid",
    gap: 12,
  },
  header: {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.92)",
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
    border: "1px solid rgba(17,17,17,0.10)",
    background: "#fff",
    fontWeight: 950,
    fontSize: 12,
    color: "#111",
  },
  languageGroup: {
    display: "inline-flex",
    gap: 6,
    padding: 4,
    borderRadius: 999,
    border: "1px solid rgba(17,17,17,0.10)",
    background: "#fff",
  },
  languageButton: {
    border: "none",
    borderRadius: 999,
    background: "transparent",
    color: "#111",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 950,
    padding: "7px 10px",
  },
  languageButtonActive: {
    background: "#111",
    color: "#fff",
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
  grid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  },
  kpi: {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.92)",
  },
  card: {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.92)",
  },
  lock: {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(245,158,11,0.25)",
    background: "rgba(245,158,11,0.10)",
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
  btnDarkBtn: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#111",
    fontWeight: 950,
    color: "#fff",
  },
  btnGhostBtn: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#fff",
    fontWeight: 900,
    color: "#111",
    cursor: "pointer",
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#fff",
    fontWeight: 950,
    cursor: "pointer",
    color: "#111",
  },
};
