"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
} from "firebase/firestore";

type HabitKey = "water" | "workout" | "steps" | "protein" | "sleep";

type HabitDef = {
  key: HabitKey;
  title: string;
  desc: string;
};

type UserProfile = {
  vip?: boolean;
  vipUntil?: any; // Firestore Timestamp
};

type DailyHabitsDoc = {
  date: string; // YYYY-MM-DD
  items: Record<HabitKey, boolean>;
  allDone: boolean;
  updatedAt?: any;
  createdAt?: any;
};

const HABITS: HabitDef[] = [
  { key: "water", title: "Água", desc: "2L no dia (meta simples)" },
  { key: "workout", title: "Treino", desc: "10–15 min do calendário" },
  { key: "steps", title: "Passos", desc: "Caminhada curta (mín. 15 min)" },
  { key: "protein", title: "Proteína", desc: "Incluiu proteína nas refeições" },
  { key: "sleep", title: "Sono", desc: "Dormiu bem / tentou 7h+" },
];

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

function defaultItems(): Record<HabitKey, boolean> {
  return {
    water: false,
    workout: false,
    steps: false,
    protein: false,
    sleep: false,
  };
}

function calcProgress(items: Record<HabitKey, boolean>) {
  const total = HABITS.length;
  let done = 0;
  for (const h of HABITS) if (items[h.key]) done++;
  const pct = Math.round((done / total) * 100);
  return { done, total, pct, allDone: done === total };
}

function formatErr(e: unknown) {
  const msg =
    typeof e === "object" && e && "message" in e ? String((e as any).message) : String(e);
  const code =
    typeof e === "object" && e && "code" in e ? String((e as any).code) : "";
  return code ? `${code}: ${msg}` : msg;
}

function isOfflineErr(message: string) {
  const m = (message || "").toLowerCase();
  return (
    m.includes("client is offline") ||
    m.includes("unavailable") ||
    m.includes("network") ||
    m.includes("failed to get document") ||
    m.includes("offline")
  );
}

function isVipFromProfile(data: UserProfile) {
  if (data?.vip === true) return true;

  const until = (data as any)?.vipUntil;
  if (until && typeof until?.seconds === "number") {
    return until.seconds * 1000 > Date.now();
  }

  return false;
}

export default function ChecklistPage() {
  const router = useRouter();

  // Auth
  const [authReady, setAuthReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  // VIP
  const [isVip, setIsVip] = useState<boolean>(false);
  const [vipLoading, setVipLoading] = useState(true);

  // Day / Habits
  const [day] = useState<string>(() => ymd(new Date()));
  const [items, setItems] = useState<Record<HabitKey, boolean>>(defaultItems());
  const [saving, setSaving] = useState(false);

  // Stats
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // UI
  const [screenError, setScreenError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  // -------- Auth gate --------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setAuthReady(true);

      if (!u) {
        router.replace("/login");
      }
    });

    return () => unsub();
  }, [router]);

  // -------- VIP gate (users/{uid}.vip OR vipUntil) --------
  useEffect(() => {
    let cancelled = false;

    async function loadVip() {
      if (!authReady) return;

      if (!uid) {
        setVipLoading(false);
        return;
      }

      setScreenError(null);

      try {
        setVipLoading(true);

        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);

        if (cancelled) return;

        const data = (snap.exists() ? (snap.data() as UserProfile) : {}) ?? {};
        setIsVip(isVipFromProfile(data));
      } catch (e) {
        if (cancelled) return;
        setScreenError(formatErr(e));
      } finally {
        if (cancelled) return;
        setVipLoading(false);
      }
    }

    loadVip();
    return () => {
      cancelled = true;
    };
  }, [authReady, uid, retryTick]);

  // -------- Load today doc --------
  useEffect(() => {
    let cancelled = false;

    async function loadToday() {
      if (!authReady) return;
      if (!uid) return;
      if (!isVip) return;

      setScreenError(null);

      try {
        const ref = doc(db, "users", uid, "habits", day);
        const snap = await getDoc(ref);

        if (cancelled) return;

        if (!snap.exists()) {
          setItems(defaultItems());
          return;
        }

        const data = snap.data() as DailyHabitsDoc;
        const merged = { ...defaultItems(), ...(data.items ?? {}) };
        setItems(merged);
      } catch (e) {
        if (cancelled) return;
        setItems(defaultItems());
        setScreenError(formatErr(e));
      }
    }

    loadToday();
    return () => {
      cancelled = true;
    };
  }, [authReady, uid, isVip, day, retryTick]);

  // -------- Streak calc --------
  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      if (!authReady) return;
      if (!uid) return;
      if (!isVip) return;

      setScreenError(null);

      try {
        setStatsLoading(true);

        const colRef = collection(db, "users", uid, "habits");
        const snap = await getDocs(colRef);

        if (cancelled) return;

        const map = new Map<string, DailyHabitsDoc>();
        for (const d of snap.docs) {
          const data = d.data() as DailyHabitsDoc;
          if (data?.date) map.set(data.date, data);
          else map.set(d.id, { ...data, date: d.id } as DailyHabitsDoc);
        }

        // streak atual (até 60 dias)
        let cur = 0;
        let cursor = new Date();
        for (let i = 0; i < 60; i++) {
          const key = ymd(cursor);
          const docu = map.get(key);
          if (docu?.allDone === true) {
            cur++;
            cursor = minusDays(cursor, 1);
            continue;
          }
          break;
        }

        // best streak (janela 120 dias)
        let best = 0;
        let run = 0;
        let scan = new Date();
        for (let i = 0; i < 120; i++) {
          const key = ymd(scan);
          const docu = map.get(key);
          if (docu?.allDone === true) {
            run++;
            if (run > best) best = run;
          } else {
            run = 0;
          }
          scan = minusDays(scan, 1);
        }

        setStreak(cur);
        setBestStreak(best);
      } catch (e) {
        if (cancelled) return;
        setStreak(0);
        setBestStreak(0);
        setScreenError(formatErr(e));
      } finally {
        if (cancelled) return;
        setStatsLoading(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [authReady, uid, isVip, retryTick]);

  const progress = useMemo(() => calcProgress(items), [items]);

  async function persistCurrent(nextItems: Record<HabitKey, boolean>) {
    if (!authReady) return;
    if (!uid) return;
    if (!isVip) return;

    const p = calcProgress(nextItems);
    const ref = doc(db, "users", uid, "habits", day);

    setSaving(true);
    setScreenError(null);

    try {
      const existing = await getDoc(ref);

      const payload: any = {
        date: day,
        items: nextItems,
        allDone: p.allDone,
        updatedAt: serverTimestamp(),
      };
      if (!existing.exists()) payload.createdAt = serverTimestamp();

      await setDoc(ref, payload, { merge: true });
    } finally {
      setSaving(false);
    }
  }

  // Mantém autosave no clique (como já está no seu produto)
  async function toggleHabit(k: HabitKey) {
    if (!authReady) return;
    if (!uid) return;
    if (!isVip) return;
    if (saving) return;

    const prev = items;
    const next = { ...items, [k]: !items[k] };
    setItems(next);

    try {
      await persistCurrent(next);
    } catch (e) {
      setItems(prev);
      setScreenError(formatErr(e));
    }
  }

  // ✅ BOTÃO SALVAR (explicitamente)
  async function handleSave() {
    if (!authReady) return;
    if (!uid) return;
    if (!isVip) return;
    if (saving) return;

    try {
      await persistCurrent(items);
    } catch (e) {
      setScreenError(formatErr(e));
    }
  }

  // ----- Rendering -----

  if (!authReady || vipLoading) {
    return <main style={{ padding: 28 }}>Carregando…</main>;
  }

  if (!uid) {
    return <main style={{ padding: 28 }}>Redirecionando…</main>;
  }

  if (screenError) {
    const msg = screenError;
    const offline = isOfflineErr(msg);

    return (
      <main style={{ padding: 28, maxWidth: 980, margin: "28px auto" }}>
        <section style={card}>
          <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0 }}>
            Erro ao carregar Checklist
          </h1>

          <p style={{ marginTop: 10, color: "#555", fontWeight: 800, lineHeight: 1.55 }}>
            {msg}
          </p>

          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              border: "1px solid #eee",
              background: "#fafafa",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>
              Ação recomendada
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                lineHeight: 1.8,
                fontWeight: 800,
                color: "#222",
              }}
            >
              {offline ? (
                <>
                  <li>
                    Validar se o Firestore está habilitado no Firebase (Database criado).
                  </li>
                  <li>
                    Confirmar que as variáveis <code>NEXT_PUBLIC_FIREBASE_*</code> estão iguais ao projeto correto.
                  </li>
                  <li>
                    Tentar novamente (às vezes é handshake/rede).
                  </li>
                </>
              ) : (
                <>
                  <li>
                    Validar regras do Firestore (read em{" "}
                    <code>users/{`{uid}`}/habits</code> e{" "}
                    <code>users/{`{uid}`}</code>)
                  </li>
                  <li>Confirmar usuário autenticado</li>
                </>
              )}
            </ul>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setRetryTick((x) => x + 1)}
              style={{ ...btnGhost, cursor: "pointer" }}
            >
              Tentar novamente
            </button>

            <a href="/app" style={btnGhost}>Voltar</a>
            <a href="/vip" style={btnDark}>VIP</a>
          </div>
        </section>
      </main>
    );
  }

  if (!isVip) {
    return (
      <main style={{ padding: 28, maxWidth: 980, margin: "28px auto" }}>
        <section style={card}>
          <h1 style={{ fontSize: 28, fontWeight: 950, margin: 0 }}>
            Checklist de hábitos (VIP)
          </h1>
          <p style={{ marginTop: 10, color: "#555", fontWeight: 700, lineHeight: 1.55 }}>
            Isso é um recurso VIP pra gerar disciplina diária (streak + progresso).
          </p>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/vip" style={btnDark}>Virar VIP</a>
            <a href="/vip/metas" style={btnGhost}>Metas</a>
            <a href="/app" style={btnGhost}>Voltar</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: 28, maxWidth: 1100, margin: "28px auto" }}>
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 950, color: "#111", opacity: 0.75 }}>
              Barriga Seca • VIP
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 950, margin: "6px 0 0" }}>
              Checklist de hábitos
            </h1>
            <p style={{ marginTop: 8, color: "#555", fontWeight: 700, lineHeight: 1.55 }}>
              Marque o que você fez hoje. Quanto mais dias seguidos, mais disciplina.
            </p>
          </div>

          <div style={{ display: "grid", gap: 8, minWidth: 240 }}>
            <div style={pill}>
              <span style={{ fontWeight: 950 }}>Hoje</span>
              <span style={{ fontWeight: 900, color: "#111" }}>{day}</span>
            </div>
            <div style={pill}>
              <span style={{ fontWeight: 950 }}>Progresso</span>
              <span style={{ fontWeight: 950 }}>{progress.pct}%</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <div style={statCard}>
            <div style={statLabel}>Streak atual</div>
            <div style={statValue}>
              {statsLoading ? "…" : streak}
              <span style={{ fontSize: 14, fontWeight: 900, color: "#555" }}> dias</span>
            </div>
          </div>

          <div style={statCard}>
            <div style={statLabel}>Melhor streak</div>
            <div style={statValue}>
              {statsLoading ? "…" : bestStreak}
              <span style={{ fontSize: 14, fontWeight: 900, color: "#555" }}> dias</span>
            </div>
          </div>

          <div style={statCard}>
            <div style={statLabel}>Feitos hoje</div>
            <div style={statValue}>
              {progress.done}/{progress.total}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, padding: 14, borderRadius: 16, border: "1px solid #eee", background: "#fff" }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Hábitos de hoje</div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {HABITS.map((h) => {
              const checked = !!items[h.key];
              return (
                <button
                  key={h.key}
                  onClick={() => toggleHabit(h.key)}
                  disabled={saving}
                  style={{
                    textAlign: "left",
                    padding: 14,
                    borderRadius: 14,
                    border: checked ? "1px solid rgba(34,197,94,0.35)" : "1px solid #eee",
                    background: checked ? "rgba(34,197,94,0.08)" : "#fff",
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 950, color: "#111" }}>{h.title}</div>
                    <div style={{ marginTop: 4, fontWeight: 800, color: "#555" }}>{h.desc}</div>
                  </div>

                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      border: checked ? "1px solid rgba(34,197,94,0.55)" : "1px solid #ddd",
                      background: checked ? "rgba(34,197,94,0.15)" : "#fafafa",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 950,
                      color: checked ? "#16a34a" : "#999",
                    }}
                    aria-label={checked ? "Concluído" : "Pendente"}
                    title={checked ? "Concluído" : "Pendente"}
                  >
                    {checked ? "✓" : "•"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ✅ BOTÃO SALVAR (NOVO) */}
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                ...btnDark,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>

            <a href="/app" style={btnGhost}>Voltar</a>
            <a href="/vip/metas" style={btnGhost}>Metas</a>
            <a href="/vip" style={btnGhost}>Gerenciar assinatura</a>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#777", fontWeight: 700 }}>
            {saving ? "Salvando…" : "Status sincronizado com Firestore."}
          </div>
        </div>
      </section>
    </main>
  );
}

const card: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  border: "1px solid #eee",
  background: "#fff",
};

const pill: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid #eee",
  background: "#fff",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};

const statCard: React.CSSProperties = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid #eee",
  background: "#fff",
};

const statLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 950,
  color: "#555",
};

const statValue: React.CSSProperties = {
  marginTop: 6,
  fontSize: 26,
  fontWeight: 950,
  color: "#111",
};

const btnDark: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #111",
  background: "#111",
  fontWeight: 950,
  textDecoration: "none",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const btnGhost: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #ddd",
  background: "#fff",
  fontWeight: 950,
  textDecoration: "none",
  color: "#111",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
