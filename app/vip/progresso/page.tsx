"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";

type UserProfile = {
  vip?: boolean;
  vipUntil?: any; // Firestore Timestamp
};

type DailyHabitsDoc = {
  date: string; // YYYY-MM-DD
  allDone?: boolean;
  items?: Record<string, boolean>;
};

type GoalsDoc = {
  weekStartISO?: string; // segunda-feira
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
  const day = d.getDay(); // 0 dom, 1 seg...
  const diff = (day === 0 ? -6 : 1) - day; // volta pra segunda
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

export default function ProgressoPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [vipLoading, setVipLoading] = useState(true);
  const [isVip, setIsVip] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [habitsMap, setHabitsMap] = useState<Map<string, DailyHabitsDoc>>(new Map());
  const [goals, setGoals] = useState<GoalsDoc | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setAuthReady(true);

      if (!u) router.replace("/login");
    });

    return () => unsub();
  }, [router]);

  // Gate VIP + dados
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      if (!authReady) return;
      if (!user?.uid) return;

      setVipLoading(true);
      setLoading(true);
      setErr(null);

      try {
        // VIP profile
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

        // Habits
        const colHabits = collection(db, "users", user.uid, "habits");
        const habitsSnap = await getDocs(colHabits);

        const map = new Map<string, DailyHabitsDoc>();
        for (const d of habitsSnap.docs) {
          const data = d.data() as DailyHabitsDoc;
          const key = (data?.date ?? d.id) as string;
          map.set(key, { ...data, date: key });
        }

        // Goals
        const goalsRef = doc(db, "users", user.uid, "goals", "current");
        const goalsSnap = await getDoc(goalsRef);
        const goalsData = goalsSnap.exists() ? (goalsSnap.data() as GoalsDoc) : null;

        if (cancelled) return;

        setHabitsMap(map);
        setGoals(goalsData);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message ?? "Falha ao carregar progresso.");
        setVipLoading(false);
        setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [authReady, user?.uid]);

  const todayISO = useMemo(() => ymd(new Date()), []);

  const kpis = useMemo(() => {
    // streak atual (até 60 dias)
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

    // melhor streak (janela 180 dias)
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

    // últimos 7 / 30 dias
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

    // doneDays pode ter dados antigos, então filtramos pela semana
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
      pctDays: clamp(pctDays, 0, 999),
      pctWorkouts: clamp(pctWorkouts, 0, 999),
      pctAvg: Math.round((clamp(pctDays, 0, 100) + clamp(pctWorkouts, 0, 100)) / 2),
    };
  }, [goals]);

  if (!authReady || vipLoading) {
    return <main style={{ padding: 28 }}>Carregando…</main>;
  }

  if (!user?.uid) {
    return <main style={{ padding: 28 }}>Redirecionando…</main>;
  }

  if (err) {
    return (
      <main style={{ padding: 28, maxWidth: 980, margin: "28px auto" }}>
        <section style={styles.card}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950 }}>Erro no Progresso</h1>
          <p style={{ marginTop: 10, color: "#555", fontWeight: 800, lineHeight: 1.55 }}>{err}</p>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/app" style={styles.btnGhost}>Voltar</a>
            <a href="/vip" style={styles.btnDark}>VIP</a>
          </div>
        </section>
      </main>
    );
  }

  if (!isVip) {
    return (
      <main style={{ padding: 28, maxWidth: 980, margin: "28px auto" }}>
        <section style={styles.lock}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Progresso (VIP) 🔒</div>
          <p style={{ marginTop: 8, marginBottom: 0, color: "#444", fontWeight: 700, lineHeight: 1.5 }}>
            Dashboard de evolução é exclusivo para VIP. Libera agora e acompanha a jornada com governança.
          </p>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/vip" style={styles.btnDark}>Virar VIP</a>
            <a href="/free" style={styles.btnGhost}>Ver área grátis</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.bg} aria-hidden />

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.badge}>VIP • Progresso</div>
          <h1 style={styles.h1}>Dashboard do assinante</h1>
          <p style={styles.sub}>
            Visão executiva: consistência, streaks e performance semanal. Tudo em um lugar.
          </p>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/app" style={styles.btnGhost}>Voltar pro App</a>
            <a href="/vip/checklist" style={styles.btnGhost}>Checklist</a>
            <a href="/vip/metas" style={styles.btnGhost}>Metas</a>
          </div>
        </header>

        {loading ? (
          <section style={styles.card}>
            <strong>Carregando indicadores…</strong>
          </section>
        ) : (
          <>
            {/* KPIs */}
            <section style={styles.grid}>
              <KpiCard title="Streak atual" value={`${kpis.streakAtual} dias`} hint="sequência em execução" />
              <KpiCard title="Melhor streak" value={`${kpis.melhorStreak} dias`} hint="recorde histórico" />
              <KpiCard title="Últimos 7 dias" value={`${kpis.done7}/7 (${kpis.pct7}%)`} hint="consistência recente" />
              <KpiCard title="Últimos 30 dias" value={`${kpis.done30}/30 (${kpis.pct30}%)`} hint="visão mês" />
              <KpiCard title="Hoje" value={kpis.todayDone ? "✅ concluído" : "⏳ pendente"} hint={todayISO} />
              <KpiCard title="Semana" value={`${week.pctAvg}%`} hint={`início: ${week.weekStartISO}`} />
            </section>

            {/* Semana (metas) */}
            <section style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 16 }}>Resumo da semana</div>
                  <div style={{ marginTop: 6, color: "#555", fontWeight: 800 }}>
                    Semana iniciando em: <strong>{week.weekStartISO}</strong>
                  </div>
                </div>

                <a href="/vip/metas" style={styles.btnDark}>
                  Ajustar metas
                </a>
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <StatCard label="Dias executados" value={`${week.doneInWeek}/${week.goalDays}`} />
                <StatCard label="Treinos" value={`${week.doneWorkouts}/${week.goalWorkouts}`} />
                <StatCard label="Água (meta/dia)" value={`${week.goalWaterLiters} L`} />
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: "#666", fontWeight: 800, lineHeight: 1.5 }}>
                Observação: “Dias executados” aqui vem das Metas (check-in semanal). “Concluído” diário vem do Checklist.
              </div>
            </section>

            {/* Ações */}
            <section style={styles.card}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Ações rápidas</div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href="/vip/checklist" style={styles.btnDark}>Abrir Checklist</a>
                <a href="/vip/metas" style={styles.btnGhost}>Abrir Metas</a>
                <a href="/free" style={styles.btnGhost}>Calendário (30 dias)</a>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function KpiCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div style={styles.kpi}>
      <div style={{ fontSize: 12, fontWeight: 950, color: "#555" }}>{title}</div>
      <div style={{ marginTop: 10, fontSize: 22, fontWeight: 950, color: "#111" }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: "#666" }}>{hint}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.stat}>
      <div style={{ fontSize: 12, fontWeight: 950, color: "#555" }}>{label}</div>
      <div style={{ marginTop: 10, fontSize: 22, fontWeight: 950, color: "#111" }}>{value}</div>
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
    display: "grid",
    gap: 12,
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
  stat: {
    padding: 16,
    borderRadius: 18,
    border: "1px solid #eee",
    background: "#fff",
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
    maxWidth: 980,
    margin: "0 auto",
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
};
