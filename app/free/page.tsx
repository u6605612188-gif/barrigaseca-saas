"use client";

import React, { useEffect, useMemo, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type DayDoc = {
  day: number;
  isVip: boolean;
  title: string;
  workout: string[];
  meals: {
    cafe: string[];
    almoco: string[];
    lanche: string[];
    besteirinhas: string[];
    janta: string[];
  };
  tips?: string[];
};

const FREE_DAYS = 7;
const PLAN_ID = "bs30";

export default function FreePage() {
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // Auth + VIP
  const [authReady, setAuthReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [vipActive, setVipActive] = useState(false);

  // Firestore source of truth
  const [days, setDays] = useState<DayDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // fallback local (só se Firestore estiver vazio/erro)
  const fallback = useMemo(() => build30DayPlanFallback(), []);

  const dayPlan: DayDoc | null = useMemo(() => {
    const fromFs = days.find((d) => d.day === selectedDay);
    if (fromFs) return fromFs;
    const fromFallback = fallback.find((d) => d.day === selectedDay) ?? null;
    return fromFallback;
  }, [days, fallback, selectedDay]);

  // ✅ CORREÇÃO: trava VIP só se o usuário NÃO for VIP
  const isVipLocked = !vipActive && selectedDay > FREE_DAYS;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid ?? null);
      setAuthReady(true);

      // Se não tem user, não é VIP
      if (!u?.uid) {
        setVipActive(false);
        return;
      }

      // ✅ CORREÇÃO: buscar flag VIP do usuário no Firestore
      try {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setVipActive(false);
          return;
        }

        const data = snap.data() as any;

        // Aceita vários formatos de schema sem quebrar assinantes ativos:
        // boolean flags
        const flag =
          data?.vipActive === true ||
          data?.isVip === true ||
          data?.vip === true ||
          data?.vip_enabled === true;

        // status string comum de assinatura
        const statusOk =
          typeof data?.subscriptionStatus === "string" &&
          ["active", "trialing", "paid"].includes(String(data.subscriptionStatus).toLowerCase());

        // data de expiração (timestamp/ms/seconds ou ISO)
        let untilOk = false;
        const until = data?.vipUntil ?? data?.vip_until ?? data?.vipExpiresAt ?? data?.vip_expires_at;
        if (until) {
          const now = Date.now();

          // Firestore Timestamp-like {seconds}
          if (typeof until?.seconds === "number") {
            untilOk = until.seconds * 1000 > now;
          } else if (typeof until === "number") {
            // milliseconds
            untilOk = until > now;
          } else if (typeof until === "string") {
            const t = Date.parse(until);
            if (!Number.isNaN(t)) untilOk = t > now;
          }
        }

        setVipActive(Boolean(flag || statusOk || untilOk));
      } catch {
        // Em caso de erro, não libera (segurança)
        setVipActive(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    async function loadFromFirestore() {
      try {
        setLoading(true);
        setLoadError(null);

        const ref = collection(db, "plans", PLAN_ID, "days");
        const q = query(ref, orderBy("day", "asc"));
        const snap = await getDocs(q);

        const list = snap.docs.map((d) => d.data() as DayDoc).filter(Boolean);
        setDays(list);

        // se Firestore veio vazio, mantemos fallback sem quebrar a tela
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
          Calendário Barriga Seca (30 dias)
        </h1>

        <p style={{ color: "#555", marginTop: 10, lineHeight: 1.5 }}>
          Clique no dia e siga o plano: <strong>treino</strong> +{" "}
          <strong>receitas do dia</strong>. Os primeiros{" "}
          <strong>{FREE_DAYS} dias são grátis</strong>. Do dia 8 ao 30 é{" "}
          <strong>VIP</strong>.
        </p>

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
            Virar VIP e liberar 30 dias
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
            Área VIP (rápido acesso)
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
              desc="Rotina diária com execução simples. Consistência vira resultado."
              href="/vip/checklist"
              badge="VIP"
            />
            <VipFeatureCard
              title="Metas"
              desc="Defina meta semanal e acompanhe o progresso com clareza."
              href="/vip/metas"
              badge="VIP"
            />
          </div>

          <div style={{ marginTop: 10, color: "#666", fontSize: 12, lineHeight: 1.5 }}>
            Observação: o bloqueio “VIP de verdade” a gente consolida no Firestore (regras + flag no
            user). Por enquanto é navegação + tela.
          </div>
        </div>

        <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
          {loading ? (
            <span>Carregando calendário…</span>
          ) : loadError ? (
            <span>
              Firestore: <strong>offline</strong> ({loadError}). Usando conteúdo local.
            </span>
          ) : days.length > 0 ? (
            <span>
              Firestore: <strong>OK</strong> • {days.length} dias carregados.
            </span>
          ) : (
            <span>Firestore sem dados. Usando conteúdo local.</span>
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
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 900 }}>
            Selecione o dia
          </h2>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(5, 1fr)",
            }}
          >
            {Array.from({ length: 30 }).map((_, i) => {
              const d = i + 1;
              // ✅ CORREÇÃO: dias VIP só aparecem travados se NÃO for VIP
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
            <strong>VIP:</strong> dias {FREE_DAYS + 1}–30.
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: 22, fontWeight: 900 }}>
              Dia {selectedDay} — {isVipLocked ? "Conteúdo VIP" : "Conteúdo grátis"}
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
              <button
                onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
                style={navBtn}
              >
                ← Dia anterior
              </button>
              <button
                onClick={() => setSelectedDay((d) => Math.min(30, d + 1))}
                style={navBtn}
              >
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
        <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 900 }}>
          Quer o calendário completo + evolução?
        </h3>
        <p style={{ color: "#555", marginTop: 8, lineHeight: 1.5 }}>
          No VIP você desbloqueia os 30 dias, receitas completas, treinos guiados e agora
          também: <strong>Checklist</strong> + <strong>Metas</strong>.
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
      <p style={{ color: "#555", lineHeight: 1.5 }}>
        Esse dia faz parte do calendário VIP. Ao liberar, você vê:
      </p>

      <ul style={{ lineHeight: 1.8, fontWeight: 700, color: "#222" }}>
        <li>Treino completo do dia</li>
        <li>Receitas detalhadas (porções e substituições)</li>
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
        Prévia: “Treino do Dia + Cardápio do Dia + Checklist + Metas”
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

/**
 * Fallback local (se Firestore estiver vazio/offline).
 * Mantém o app navegável.
 */
function build30DayPlanFallback(): DayDoc[] {
  const baseWorkouts = [
    ["Agachamento 3×12", "Polichinelo 3×30s", "Prancha 3×30s", "Alongamento 2 min"],
    ["Caminhada 15 min", "Abdominal curto 3×12", "Prancha lateral 3×20s", "Alongamento 2 min"],
    ["Agachamento 4×10", "Elevação pélvica 3×12", "Prancha 3×40s", "Alongamento 2 min"],
    ["HIIT leve 10 min", "Afundo 3×10", "Abdominal 3×15", "Alongamento 2 min"],
  ];

  const cafe = [
    ["Ovos mexidos + café sem açúcar", "1 fruta"],
    ["Iogurte natural + aveia", "1 fruta"],
    ["Tapioca com ovo", "Chá"],
    ["Pão integral + queijo", "1 fruta"],
  ];

  const almoco = [
    ["Arroz + feijão + frango", "Salada à vontade"],
    ["Carne magra + legumes", "Salada à vontade"],
    ["Omelete + salada", "1 porção de carbo (arroz/batata)"],
    ["Peixe + legumes", "Salada à vontade"],
  ];

  const lanche = [
    ["Fruta + iogurte"],
    ["Castanhas (pequena porção)"],
    ["Sanduíche integral pequeno"],
    ["Fruta + queijo"],
  ];

  const besteirinhas = [
    ["1 quadrado de chocolate 70%"],
    ["1 cookie pequeno (1 unidade)"],
    ["Gelatina sem açúcar"],
    ["Pipoca sem óleo (porção pequena)"],
  ];

  const janta = [
    ["Sopa + proteína", "Água"],
    ["Salada + frango desfiado", "Chá"],
    ["Omelete + legumes", "Água"],
    ["Carne magra + salada", "Água"],
  ];

  const out: DayDoc[] = [];
  for (let day = 1; day <= 30; day++) {
    const wi = (day - 1) % baseWorkouts.length;
    const mi = (day - 1) % cafe.length;

    out.push({
      day,
      isVip: day > FREE_DAYS,
      title: `Dia ${day} — Barriga Seca`,
      workout: baseWorkouts[wi],
      meals: {
        cafe: cafe[mi],
        almoco: almoco[mi],
        lanche: lanche[mi],
        besteirinhas: besteirinhas[mi],
        janta: janta[mi],
      },
      tips: [
        "Beba água ao longo do dia.",
        "Evite açúcar líquido (refrigerante/suco).",
        "Caminhe 10–15 min se puder.",
      ],
    });
  }
  return out;
}
