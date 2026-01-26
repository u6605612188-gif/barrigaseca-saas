"use client";

import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";

type DayDoc = {
  cycle?: number;
  day: number;
  isVip?: boolean;
  title: string;
  workout?: string[];
  meals: {
    cafe: string[];
    almoco: string[];
    lanche: string[];
    besteirinhas: string[];
    janta: string[];
  };
  tips?: string[];
};

type UserProfile = {
  createdAt?: any; // Timestamp | number | string
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

const FREE_DAYS = 7;

// Novo motor: cycleDays (ciclos)
const CYCLE_COLLECTION = "cycleDays";
const FREE_CYCLE = 1;
const DAYS_PER_CYCLE = 30;

function asMillis(v: any): number | null {
  if (!v) return null;

  // Firestore Timestamp
  if (v instanceof Timestamp) return v.toMillis();

  // Timestamp-like { seconds }
  if (typeof v?.seconds === "number") return v.seconds * 1000;

  // number (ms)
  if (typeof v === "number") return v;

  // string date
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }

  return null;
}

function diffDaysUtc(fromMs: number, toMs: number): number {
  const a = new Date(fromMs);
  const b = new Date(toMs);
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  const ms = bUtc - aUtc;
  return Math.floor(ms / 86400000);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function resolveUnlockedCycles(data: UserProfile): number {
  const direct = Number(data?.unlockedCycles);
  if (Number.isFinite(direct) && direct > 0) return direct;

  // compat: flags boolean
  const flag =
    data?.vipActive === true ||
    data?.isVip === true ||
    data?.vip === true ||
    data?.vip_enabled === true;

  // compat: status
  const statusOk =
    typeof data?.subscriptionStatus === "string" &&
    ["active", "trialing", "paid"].includes(String(data.subscriptionStatus).toLowerCase());

  // compat: until
  const until =
    data?.vipUntil ?? data?.vip_until ?? data?.vipExpiresAt ?? data?.vip_expires_at;
  const untilMs = asMillis(until);
  const untilOk = typeof untilMs === "number" ? untilMs > Date.now() : false;

  return flag || statusOk || untilOk ? 1 : 0;
}

function buildCycleFallback(): DayDoc[] {
  // fallback premium-friendly (pra não quebrar UX se Firestore cair)
  const out: DayDoc[] = [];
  const workouts = [
    ["Agachamento 3×12", "Polichinelo 3×30s", "Prancha 3×30s", "Alongamento 2 min"],
    ["Caminhada 15 min", "Abdominal 3×15", "Prancha lateral 3×20s", "Alongamento 2 min"],
    ["Afundo 3×10 (cada perna)", "Elevação pélvica 3×12", "Prancha 3×40s", "Alongamento 2 min"],
    ["HIIT leve 10 min", "Agachamento 4×10", "Abdominal curto 3×12", "Alongamento 2 min"],
  ];

  const cafe = [
    "Omelete de queijo + tomate (10min)",
    "Crepioca de frango (10min)",
    "Iogurte natural + granola + fruta",
    "Panqueca de banana (12min)",
  ];
  const almoco = [
    "Frango ao molho + legumes (20min)",
    "Tilápia assada + purê (25min)",
    "Carne moída com abobrinha + arroz (25min)",
    "Salada completa + proteína (15min)",
  ];
  const lanche = [
    "Iogurte + fruta + castanhas (porção)",
    "Sanduíche integral pequeno (queijo + tomate)",
    "Ovo cozido + fruta",
    "Mix de castanhas (30g)",
  ];
  const besteirinhas = [
    "Gelatina zero + chá",
    "Chocolate 70% (1–2 quadradinhos)",
    "Pipoca sem óleo (porção pequena)",
    "Banana com canela (airfryer 8min)",
  ];
  const janta = [
    "Sopa de legumes + frango (25min)",
    "Omelete + salada (15min)",
    "Salada + atum (10min)",
    "Wrap integral de frango + salada",
  ];

  for (let day = 1; day <= DAYS_PER_CYCLE; day++) {
    out.push({
      cycle: FREE_CYCLE,
      day,
      isVip: day > FREE_DAYS,
      title: `Dia ${day} — Ciclo ${FREE_CYCLE}`,
      workout: workouts[(day - 1) % workouts.length],
      meals: {
        cafe: [cafe[(day - 1) % cafe.length]],
        almoco: [almoco[(day - 1) % almoco.length]],
        lanche: [lanche[(day - 1) % lanche.length]],
        besteirinhas: [besteirinhas[(day - 1) % besteirinhas.length]],
        janta: [janta[(day - 1) % janta.length]],
      },
      tips: ["Meta do dia: água + consistência.", "Caminhada leve pós-refeição se possível."],
    });
  }

  return out;
}

export default function FreePage() {
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // Auth + Entitlement
  const [authReady, setAuthReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  // acesso por ciclos (novo modelo)
  const [unlockedCycles, setUnlockedCycles] = useState<number>(0);
  const vipActive = unlockedCycles >= 1;

  // onboarding date (dia 1 começa no cadastro)
  const [startAtMs, setStartAtMs] = useState<number | null>(null);

  // Firestore source of truth (cycleDays, ciclo 1)
  const [days, setDays] = useState<DayDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fallback = useMemo(() => buildCycleFallback(), []);

  const todayProgramDay = useMemo(() => {
    if (!startAtMs) return null;
    const elapsed = diffDaysUtc(startAtMs, Date.now()) + 1; // Dia 1 no cadastro
    return clamp(elapsed, 1, DAYS_PER_CYCLE);
  }, [startAtMs]);

  // sempre ciclo 1 nesta tela (FREE funnel)
  const dayPlan: DayDoc | null = useMemo(() => {
    const fromFs = days.find((d) => d.day === selectedDay);
    if (fromFs) return fromFs;
    return fallback.find((d) => d.day === selectedDay) ?? null;
  }, [days, fallback, selectedDay]);

  // Lock: grátis só 1–7; VIP libera 1–30 do ciclo 1
  const isVipLocked = !vipActive && selectedDay > FREE_DAYS;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid ?? null);
      setAuthReady(true);

      if (!u?.uid) {
        setUnlockedCycles(0);
        setStartAtMs(null);
        return;
      }

      try {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setUnlockedCycles(0);
          setStartAtMs(null);
          return;
        }

        const data = (snap.data() as UserProfile) ?? {};
        setUnlockedCycles(resolveUnlockedCycles(data));

        // Dia 1 começa no createdAt (se existir)
        const createdMs = asMillis(data.createdAt);
        setStartAtMs(createdMs);

        // Default do calendário: "hoje" do programa (se disponível)
        if (createdMs) {
          const d = clamp(diffDaysUtc(createdMs, Date.now()) + 1, 1, DAYS_PER_CYCLE);
          setSelectedDay((prev) => (prev ? prev : d));
          // Se estava em dia inválido, reposiciona
          setSelectedDay(d);
        }
      } catch {
        // fail-safe
        setUnlockedCycles(0);
        setStartAtMs(null);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    async function loadFromFirestore() {
      try {
        setLoading(true);
        setLoadError(null);

        // cycleDays: filtra ciclo 1 e ordena pelos dias
        const ref = collection(db, CYCLE_COLLECTION);
        const q = query(ref, where("cycle", "==", FREE_CYCLE), orderBy("day", "asc"));
        const snap = await getDocs(q);

        const list = snap.docs.map((d) => d.data() as DayDoc).filter(Boolean);
        setDays(list);

        if (list.length > 0 && !list.some((x) => x.day === selectedDay)) {
          setSelectedDay(list[0]?.day ?? 1);
        }
      } catch (e: any) {
        setLoadError(e?.message ?? "Falha ao carregar Firestore.");
      } finally {
        setLoading(false);
      }
    }

    loadFromFirestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerStatus = useMemo(() => {
    if (!authReady) return "Sincronizando…";
    if (!uid) return "Visitante";
    return vipActive ? `VIP • Ciclos liberados: ${unlockedCycles}` : "Grátis (7 dias)";
  }, [authReady, uid, vipActive, unlockedCycles]);

  return (
    <main style={{ padding: 28, maxWidth: 1100, margin: "28px auto" }}>
      {/* HERO */}
      <section
        style={{
          padding: 24,
          borderRadius: 18,
          border: "1px solid #eee",
          background: "#fff",
        }}
      >
        <h1 style={{ fontSize: 34, fontWeight: 900, margin: 0 }}>
          Calendário Barriga Seca — Ciclo {FREE_CYCLE}
        </h1>

        <p style={{ color: "#555", marginTop: 10, lineHeight: 1.5 }}>
          Operação: <strong>treino</strong> + <strong>receitas do dia</strong>.{" "}
          <strong>{FREE_DAYS} dias grátis</strong> e depois desbloqueio por assinatura.
        </p>

        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, color: "#111" }}>
          Status: {headerStatus}
          {uid && typeof todayProgramDay === "number" && (
            <span style={{ marginLeft: 10, color: "#555" }}>
              • Hoje no programa: Dia {todayProgramDay}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <a
            href="/login"
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              fontWeight: 900,
              textDecoration: "none",
              color: "#111",
              background: "#fff",
            }}
          >
            Entrar / Criar conta
          </a>

          <a
            href="/vip"
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #111",
              fontWeight: 900,
              textDecoration: "none",
              color: "#fff",
              background: "#111",
            }}
          >
            Virar VIP e liberar o ciclo
          </a>

          <a
            href="/app"
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #111",
              fontWeight: 900,
              textDecoration: "none",
              color: "#111",
              background: "#fff",
            }}
          >
            Abrir App (membro)
          </a>
        </div>

        {/* HUB VIP */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 950, color: "#111", marginBottom: 10 }}>
            Área VIP (quick wins)
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            <VipFeatureCard
              title="Checklist de hábitos"
              desc="Execução diária simples. Consistência vira resultado."
              href="/vip/checklist"
              badge="VIP"
            />
            <VipFeatureCard
              title="Metas"
              desc="Defina meta semanal e acompanhe o progresso."
              href="/vip/metas"
              badge="VIP"
            />
          </div>
        </div>

        <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
          {loading ? (
            <span>Carregando calendário…</span>
          ) : loadError ? (
            <span>
              Firestore: <strong>offline</strong> ({loadError}). Usando fallback.
            </span>
          ) : days.length > 0 ? (
            <span>
              Firestore: <strong>OK</strong> • {days.length} dias carregados (Ciclo {FREE_CYCLE}).
            </span>
          ) : (
            <span>Firestore sem dados. Usando fallback.</span>
          )}
        </div>
      </section>

      {/* LAYOUT */}
      <section
        style={{
          marginTop: 18,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "360px 1fr",
          alignItems: "start",
        }}
      >
        {/* CALENDAR */}
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            border: "1px solid #eee",
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 900 }}>Selecione o dia</h2>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(5, 1fr)" }}>
            {Array.from({ length: DAYS_PER_CYCLE }).map((_, i) => {
              const d = i + 1;
              const locked = !vipActive && d > FREE_DAYS;
              const active = d === selectedDay;

              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  style={{
                    padding: "12px 0",
                    borderRadius: 12,
                    border: active ? "2px solid #111" : "1px solid #e6e6e6",
                    cursor: "pointer",
                    fontWeight: 900,
                    background: locked ? "#fafafa" : "#fff",
                    color: locked ? "#999" : "#111",
                    position: "relative",
                  }}
                  aria-label={`Dia ${d}${locked ? " (VIP)" : ""}`}
                  title={locked ? "VIP" : "Grátis"}
                >
                  {d}
                  {locked && (
                    <span
                      style={{
                        position: "absolute",
                        right: 8,
                        top: 6,
                        fontSize: 11,
                        fontWeight: 900,
                        color: "#999",
                      }}
                    >
                      VIP
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 14, color: "#666", fontSize: 13, lineHeight: 1.4 }}>
            <strong>Grátis:</strong> dias 1–{FREE_DAYS}. <br />
            <strong>VIP:</strong> dias {FREE_DAYS + 1}–{DAYS_PER_CYCLE}.
          </div>
        </div>

        {/* DAY DETAILS */}
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            border: "1px solid #eee",
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ marginTop: 0, fontSize: 22, fontWeight: 900 }}>
              Dia {selectedDay} — {isVipLocked ? "Conteúdo VIP" : "Conteúdo liberado"}
            </h2>

            {isVipLocked && (
              <a
                href="/vip"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #111",
                  fontWeight: 900,
                  textDecoration: "none",
                  color: "#fff",
                  background: "#111",
                }}
              >
                Liberar agora (VIP)
              </a>
            )}
          </div>

          {!dayPlan ? (
            <p style={{ color: "#666" }}>Nenhum conteúdo encontrado para este dia.</p>
          ) : isVipLocked ? (
            <LockedPreview />
          ) : (
            <DayContent dayPlan={dayPlan} />
          )}

          {!isVipLocked && (
            <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setSelectedDay((d) => Math.max(1, d - 1))} style={navBtn}>
                ← Dia anterior
              </button>
              <button onClick={() => setSelectedDay((d) => Math.min(DAYS_PER_CYCLE, d + 1))} style={navBtn}>
                Próximo dia →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CTA FINAL */}
      <section
        style={{
          marginTop: 18,
          padding: 18,
          borderRadius: 18,
          border: "1px solid #eee",
          background: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 900 }}>Quer liberar o ciclo completo?</h3>
        <p style={{ color: "#555", marginTop: 8, lineHeight: 1.5 }}>
          No VIP você desbloqueia o ciclo inteiro (30 dias), receitas completas, treinos e também{" "}
          <strong>Checklist</strong> + <strong>Metas</strong>.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href="/vip"
            style={{
              display: "inline-block",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #111",
              fontWeight: 900,
              textDecoration: "none",
              color: "#fff",
              background: "#111",
            }}
          >
            Virar VIP
          </a>

          <a
            href="/vip/metas"
            style={{
              display: "inline-block",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              fontWeight: 900,
              textDecoration: "none",
              color: "#111",
              background: "#fff",
            }}
          >
            Ver Metas (VIP)
          </a>

          <a
            href="/vip/checklist"
            style={{
              display: "inline-block",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              fontWeight: 900,
              textDecoration: "none",
              color: "#111",
              background: "#fff",
            }}
          >
            Ver Checklist (VIP)
          </a>
        </div>
      </section>
    </main>
  );
}

const navBtn: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #ddd",
  fontWeight: 900,
  cursor: "pointer",
  background: "#fff",
};

function VipFeatureCard({
  title,
  desc,
  href,
  badge,
}: {
  title: string;
  desc: string;
  href: string;
  badge: string;
}) {
  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        color: "#111",
        borderRadius: 18,
        border: "1px solid #eee",
        background: "#fff",
        padding: 16,
        display: "block",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 950 }}>{title}</div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 950,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          {badge}
        </div>
      </div>
      <div style={{ marginTop: 10, color: "#555", fontWeight: 700, lineHeight: 1.5 }}>{desc}</div>
      <div style={{ marginTop: 12, fontWeight: 950 }}>Abrir →</div>
    </a>
  );
}

function DayContent({ dayPlan }: { dayPlan: DayDoc }) {
  const title =
    dayPlan.title && dayPlan.title.trim().length > 0
      ? dayPlan.title
      : `Dia ${dayPlan.day} — Barriga Seca`;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Block title={title} items={[]} hideList />

      <Block title="Treino do dia (10–15 min)" items={dayPlan.workout ?? []} />

      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <Block title="Café da manhã" items={dayPlan.meals?.cafe ?? []} />
        <Block title="Almoço" items={dayPlan.meals?.almoco ?? []} />
        <Block title="Café da tarde" items={dayPlan.meals?.lanche ?? []} />
        <Block title="Besteirinhas (controladas)" items={dayPlan.meals?.besteirinhas ?? []} />
        <Block title="Janta" items={dayPlan.meals?.janta ?? []} />
      </div>

      {Array.isArray(dayPlan.tips) && dayPlan.tips.length > 0 && (
        <Block title="Dicas do dia" items={dayPlan.tips} />
      )}
    </div>
  );
}

function LockedPreview() {
  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ color: "#555", lineHeight: 1.5 }}>Esse dia faz parte do calendário VIP. Ao liberar, você vê:</p>

      <ul style={{ lineHeight: 1.8, fontWeight: 700, color: "#222" }}>
        <li>Treino completo do dia</li>
        <li>Receitas do dia (premium)</li>
        <li>Checklist de hábitos</li>
        <li>Metas</li>
      </ul>

      <div
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 14,
          border: "1px dashed #ddd",
          background: "#fafafa",
          color: "#666",
          fontWeight: 700,
        }}
      >
        Prévia: “Treino + Cardápio + Checklist + Metas”
      </div>
    </div>
  );
}

function Block({
  title,
  items,
  hideList,
}: {
  title: string;
  items: string[];
  hideList?: boolean;
}) {
  return (
    <div style={{ padding: 14, borderRadius: 16, border: "1px solid #eee", background: "#fff" }}>
      <h4 style={{ marginTop: 0, marginBottom: hideList ? 0 : 10, fontSize: 16, fontWeight: 900 }}>
        {title}
      </h4>

      {!hideList && (
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          {items.map((x, i) => (
            <li key={`${x}-${i}`} style={{ fontWeight: 700, color: "#222" }}>
              {x}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
