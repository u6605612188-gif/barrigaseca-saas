"use client";

import MobileNav from "@/components/MobileNav";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

/* ============ Tipos ============ */
type LangMap = Record<string, string>;
type ListMap = Record<string, string[]>;

type PlanDay = {
  day: number;
  isVip: boolean;
  workout: ListMap;
  tips: ListMap;
  meals: Record<string, string>;
  summary: Record<string, LangMap>;
};

type Recipe = {
  id: string;
  mealType: string;
  timeMin: number;
  kcal: number;
  title: LangMap;
  ingredients: ListMap;
  steps: ListMap;
};

/* ============ Idioma / textos ============ */
type Lang = "pt" | "en" | "es";
const SLOTS = ["cafe", "almoco", "lanche", "besteirinhas", "janta"] as const;
const FREE_DAYS = 7;
const TOTAL_DAYS = 365;

const pick = (m: LangMap | undefined, lang: Lang) => m?.[lang] ?? m?.pt ?? "";
const pickList = (m: ListMap | undefined, lang: Lang) => m?.[lang] ?? m?.pt ?? [];

const UI: Record<Lang, Record<string, string>> = {
  pt: {
    today: "Plano de Hoje", sub: "Treino e refeições do dia", day: "Dia", of: "de", month: "Mês",
    workout: "Treino do dia", ingredients: "Ingredientes", steps: "Modo de preparo",
    free: "GRÁTIS", prev: "Anterior", next: "Próximo", loading: "Carregando...",
    freeTitle: "7 dias grátis liberados 🎉",
    freeText: "Aproveite! Assine o VIP e libere os 365 dias completos.",
    seeVip: "Ver plano completo (VIP)", unlockAll: "Assinar VIP e liberar tudo",
    lockedDay: "Dia %d é exclusivo do VIP", seeFull: "Ver receita completa no VIP",
    tips: "Dicas do dia", tipsLocked: "As dicas que aceleram o resultado ficam no VIP.",
    social: "Milhares de pessoas já seguem o plano completo.",
    benefits1: "Todos os 365 dias, treinos e receitas liberados",
    benefits2: "Ingredientes, quantidades e passo a passo",
    benefits3: "Sem limites",
    errLoad: "Não foi possível carregar o plano.",
  },
  en: {
    today: "Today's Plan", sub: "Today's workout and meals", day: "Day", of: "of", month: "Month",
    workout: "Today's workout", ingredients: "Ingredients", steps: "Steps",
    free: "FREE", prev: "Previous", next: "Next", loading: "Loading...",
    freeTitle: "7 free days unlocked 🎉",
    freeText: "Enjoy! Subscribe to VIP and unlock all 365 days.",
    seeVip: "See the full plan (VIP)", unlockAll: "Subscribe to VIP and unlock everything",
    lockedDay: "Day %d is VIP only", seeFull: "See the full recipe on VIP",
    tips: "Daily tips", tipsLocked: "The tips that speed up results are on VIP.",
    social: "Thousands already follow the full plan.",
    benefits1: "All 365 days, workouts and recipes unlocked",
    benefits2: "Ingredients, amounts and step by step",
    benefits3: "No limits",
    errLoad: "Could not load the plan.",
  },
  es: {
    today: "Plan de hoy", sub: "Entrenamiento y comidas del día", day: "Día", of: "de", month: "Mes",
    workout: "Entrenamiento del día", ingredients: "Ingredientes", steps: "Preparación",
    free: "GRATIS", prev: "Anterior", next: "Siguiente", loading: "Cargando...",
    freeTitle: "7 días gratis desbloqueados 🎉",
    freeText: "¡Aprovecha! Suscríbete al VIP y desbloquea los 365 días.",
    seeVip: "Ver el plan completo (VIP)", unlockAll: "Suscribirse a VIP y desbloquear todo",
    lockedDay: "El día %d es solo VIP", seeFull: "Ver la receta completa en VIP",
    tips: "Consejos del día", tipsLocked: "Los consejos que aceleran el resultado están en VIP.",
    social: "Miles ya siguen el plan completo.",
    benefits1: "Los 365 días, entrenamientos y recetas desbloqueados",
    benefits2: "Ingredientes, cantidades y paso a paso",
    benefits3: "Sin límites",
    errLoad: "No se pudo cargar el plan.",
  },
};

const MEAL_LABEL: Record<string, Record<Lang, string>> = {
  cafe: { pt: "Café da manhã", en: "Breakfast", es: "Desayuno" },
  almoco: { pt: "Almoço", en: "Lunch", es: "Almuerzo" },
  lanche: { pt: "Lanche", en: "Snack", es: "Merienda" },
  besteirinhas: { pt: "Besteirinha controlada", en: "Controlled treat", es: "Antojo controlado" },
  janta: { pt: "Jantar", en: "Dinner", es: "Cena" },
};

/* ============ Página ============ */
export default function FreePage() {
  const [lang, setLang] = useState<Lang>("pt");
  const t = UI[lang];

  const [authReady, setAuthReady] = useState(false);
  const [isVip, setIsVip] = useState(false);

  const [days, setDays] = useState<PlanDay[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("barrigaseca-language");
    if (saved === "pt" || saved === "en" || saved === "es") setLang(saved);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        // Acesso livre (visitante). Login so e pedido para virar VIP.
        setIsVip(false);
        setAuthReady(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data() as
          | { vip?: boolean; vipUntil?: { seconds?: number }; isVip?: boolean; vipActive?: boolean }
          | undefined;
        const until = data?.vipUntil?.seconds ? data.vipUntil.seconds * 1000 > Date.now() : false;
        setIsVip(Boolean(data?.vip || data?.isVip || data?.vipActive || until));
      } catch {
        setIsVip(false);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "planCalendar"));
        const list: PlanDay[] = snap.docs
          .map((d) => {
            const x = d.data() as Record<string, unknown>;
            return {
              day: Number(x.day ?? 0),
              isVip: Boolean(x.isVip ?? Number(x.day) > FREE_DAYS),
              workout: (x.workout as ListMap) ?? {},
              tips: (x.tips as ListMap) ?? {},
              meals: (x.meals as Record<string, string>) ?? {},
              summary: (x.summary as Record<string, LangMap>) ?? {},
            };
          })
          .filter((d) => d.day > 0)
          .sort((a, b) => a.day - b.day);
        if (alive) {
          setDays(list);
          setLoading(false);
        }
      } catch {
        if (alive) {
          setError(t.errLoad);
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [t.errLoad]);

  const plan = useMemo(() => days.find((d) => d.day === selectedDay), [days, selectedDay]);
  // 7 dias liberados de verdade (para todos, sem login). Dias 8+ so no VIP.
  const dayUnlocked = isVip || selectedDay <= FREE_DAYS;
  const lockedDay = !dayUnlocked;

  useEffect(() => {
    if (!dayUnlocked || !plan) return;
    let alive = true;
    (async () => {
      const ids = SLOTS.map((s) => plan.meals[s]).filter(Boolean);
      if (ids.length === 0) return;
      try {
        const snap = await getDocs(
          query(collection(db, "recipesLibrary"), where(documentId(), "in", ids))
        );
        const map: Record<string, Recipe> = {};
        snap.docs.forEach((d) => {
          const x = d.data() as Record<string, unknown>;
          map[d.id] = {
            id: d.id,
            mealType: String(x.mealType ?? ""),
            timeMin: Number(x.timeMin ?? 0),
            kcal: Number(x.kcal ?? 0),
            title: (x.title as LangMap) ?? {},
            ingredients: (x.ingredients as ListMap) ?? {},
            steps: (x.steps as ListMap) ?? {},
          };
        });
        if (alive) setRecipes((prev) => ({ ...prev, ...map }));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [dayUnlocked, plan]);

  if (!authReady) {
    return (
      <main style={S.page}>
        <div style={S.center}>{t.loading}</div>
      </main>
    );
  }

  return (
    <main style={S.page}>
      <div style={S.container}>
        <div style={S.hero}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={S.heroTitle}>{t.today}</div>
              <div style={S.heroSub}>{t.sub}</div>
            </div>
            <span style={isVip ? S.badgeVip : S.badgeFree}>{isVip ? "VIP" : t.free}</span>
          </div>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: `${(selectedDay / TOTAL_DAYS) * 100}%` }} />
          </div>
        </div>

        <div style={S.monthRow}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <button key={m} style={S.monthChip} onClick={() => setSelectedDay((m - 1) * 30 + 1)}>
              {t.month} {m}
            </button>
          ))}
        </div>

        <div style={S.dayRow}>
          {days.map((d) => {
            const isLocked = !isVip && d.day > FREE_DAYS;
            const sel = d.day === selectedDay;
            return (
              <button
                key={d.day}
                onClick={() => setSelectedDay(d.day)}
                style={{ ...S.dayBtn, ...(sel ? S.dayBtnSel : isLocked ? S.dayBtnLocked : {}) }}
              >
                {isLocked && !sel ? "🔒" : d.day}
              </button>
            );
          })}
        </div>

        <div style={S.dayTitle}>
          {t.day} {selectedDay} {t.of} {TOTAL_DAYS}
        </div>

        {loading && <div style={S.center}>{t.loading}</div>}
        {error && <div style={S.errorCard}>{error}</div>}

        {!loading && plan && (
          <>
            <Card accent="orange" title={t.workout} items={pickList(plan.workout, lang)} />

            {lockedDay ? (
              <LockedDay day={selectedDay} plan={plan} lang={lang} t={t} />
            ) : (
              <>
                {!isVip && <FreeBanner t={t} />}
                {SLOTS.map((slot) => (
                  <RecipeCard
                    key={slot}
                    label={MEAL_LABEL[slot][lang]}
                    recipe={recipes[plan.meals[slot]]}
                    lang={lang}
                    t={t}
                  />
                ))}
                {pickList(plan.tips, lang).length > 0 && (
                  <Card accent="green" title={t.tips} items={pickList(plan.tips, lang)} highlight />
                )}
              </>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button style={{ ...S.navBtn, background: "#1FB83F" }} disabled={selectedDay <= 1} onClick={() => setSelectedDay((v) => Math.max(1, v - 1))}>{t.prev}</button>
              <button style={{ ...S.navBtn, background: "#1677FF" }} disabled={selectedDay >= TOTAL_DAYS} onClick={() => setSelectedDay((v) => Math.min(TOTAL_DAYS, v + 1))}>{t.next}</button>
            </div>
          </>
        )}
      </div>
      <MobileNav active="plan" />
    </main>
  );
}

/* ============ Componentes ============ */
function Card({ accent, title, items, highlight }: { accent: "orange" | "green"; title: string; items: string[]; highlight?: boolean }) {
  return (
    <div style={{ ...S.card, ...(highlight ? { background: "#2B2F18" } : {}) }}>
      <div style={{ ...S.cardBar, background: accent === "orange" ? "linear-gradient(90deg,#FFC438,#FF7A00)" : "linear-gradient(90deg,#8EEA35,#2AC04D)" }} />
      <div style={S.cardTitle}>{title}</div>
      {items.map((it, i) => (<div key={i} style={S.line}>- {it}</div>))}
    </div>
  );
}

function RecipeCard({ label, recipe, lang, t }: { label: string; recipe?: Recipe; lang: Lang; t: Record<string, string> }) {
  return (
    <div style={S.card}>
      <div style={{ ...S.cardBar, background: "linear-gradient(90deg,#8EEA35,#2AC04D)" }} />
      <div style={S.mealLabel}>{label}</div>
      {!recipe ? (
        <div style={S.line}>{t.loading}</div>
      ) : (
        <>
          <div style={S.recipeTitle}>{pick(recipe.title, lang)}</div>
          <div style={S.meta}>{recipe.timeMin} min · {recipe.kcal} kcal</div>
          <div style={S.subTitle}>{t.ingredients}</div>
          {pickList(recipe.ingredients, lang).map((it, i) => (<div key={i} style={S.line}>- {it}</div>))}
          <div style={{ ...S.subTitle, marginTop: 6 }}>{t.steps}</div>
          {pickList(recipe.steps, lang).map((it, i) => (<div key={i} style={S.line}>{i + 1}. {it}</div>))}
        </>
      )}
    </div>
  );
}

function FreeBanner({ t }: { t: Record<string, string> }) {
  return (
    <div style={S.banner}>
      <div style={S.bannerTitle}>{t.freeTitle}</div>
      <div style={S.bannerText}>{t.freeText}</div>
      <Link href="/vip" style={S.bannerBtn}>{t.seeVip}</Link>
    </div>
  );
}

function LockedDay({ day, plan, lang, t }: { day: number; plan: PlanDay; lang: Lang; t: Record<string, string> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={S.vipHero}>
        <div style={S.vipHeroTitle}>🔒 {t.lockedDay.replace("%d", String(day))}</div>
        <Benefit text={t.benefits1} />
        <Benefit text={t.benefits2} />
        <Benefit text={t.benefits3} />
        <Link href="/vip" style={S.vipHeroBtn}>{t.unlockAll}</Link>
        <div style={S.social}>{t.social}</div>
      </div>
      {SLOTS.map((slot) => (
        <div key={slot} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={S.mealLabel}>{MEAL_LABEL[slot][lang]}</div>
            <span style={S.vipChip}>🔒 VIP</span>
          </div>
          <div style={S.recipeTitle}>{pick(plan.summary[slot], lang)}</div>
          <RedactedLines n={2} />
        </div>
      ))}
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#EDE7DA", fontSize: 14 }}>
      <span style={{ color: "#8EEA35" }}>✓</span> {text}
    </div>
  );
}

function RedactedLines({ n }: { n: number }) {
  const widths = ["92%", "72%", "60%"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 4 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ width: widths[i % widths.length], height: 11, borderRadius: 6, background: "rgba(255,255,255,0.12)" }} />
      ))}
    </div>
  );
}

/* ============ Estilos (visual do app) ============ */
const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg,#07152B,#151018 45%,#07070A)", color: "#fff", paddingBottom: 90 },
  container: { maxWidth: 620, margin: "0 auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 },
  center: { textAlign: "center", padding: 36, color: "#C9C4D6" },
  hero: { borderRadius: 24, padding: 18, background: "linear-gradient(160deg,#1F56A7,#1B2538 55%,#211712)", border: "1px solid rgba(255,255,255,0.18)" },
  heroTitle: { fontSize: 30, fontWeight: 900, color: "#FFB637", textShadow: "0 3px 6px rgba(0,0,0,0.5)" },
  heroSub: { fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 2 },
  badgeVip: { background: "#8EEA35", color: "#102000", fontWeight: 900, fontSize: 12, padding: "6px 14px", borderRadius: 999 },
  badgeFree: { background: "#34343A", color: "#fff", fontWeight: 900, fontSize: 12, padding: "6px 14px", borderRadius: 999 },
  progressTrack: { marginTop: 12, height: 8, borderRadius: 999, background: "#0E0E12", overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999, background: "linear-gradient(90deg,#FFD743,#FF8A00)" },
  monthRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 },
  monthChip: { flex: "0 0 auto", background: "rgba(17,24,39,0.5)", border: "1px solid rgba(69,183,255,0.25)", color: "#CFE4FF", borderRadius: 999, padding: "7px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  dayRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 },
  dayBtn: { flex: "0 0 auto", width: 52, height: 52, borderRadius: 12, border: "1px solid rgba(255,255,255,0.5)", background: "linear-gradient(180deg,#fff,#E9EDF5)", color: "#111", fontWeight: 900, fontSize: 16, cursor: "pointer" },
  dayBtnSel: { background: "linear-gradient(180deg,#FFD44A,#FF8A00)", color: "#102000", border: "1px solid rgba(255,255,255,0.6)" },
  dayBtnLocked: { background: "linear-gradient(180deg,#3A3A43,#18181D)", color: "#9A9AA1", border: "1px solid rgba(255,255,255,0.14)" },
  dayTitle: { fontSize: 24, fontWeight: 900, color: "#fff" },
  card: { borderRadius: 18, background: "#19191F", border: "1px solid rgba(255,255,255,0.1)", padding: 16, display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 8px 16px rgba(0,0,0,0.3)" },
  cardBar: { height: 5, borderRadius: 999, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: 900, color: "#fff" },
  mealLabel: { fontSize: 13, fontWeight: 800, color: "#FFB637" },
  recipeTitle: { fontSize: 19, fontWeight: 900, color: "#fff" },
  meta: { fontSize: 12, fontWeight: 700, color: "#B9C2D0" },
  subTitle: { fontSize: 14, fontWeight: 900, color: "#FFD86B" },
  line: { color: "#E7E1D6", lineHeight: 1.5 },
  vipChip: { background: "rgba(255,176,0,0.2)", color: "#FFD86B", fontSize: 11, fontWeight: 900, padding: "3px 10px", borderRadius: 999 },
  lockCta: { color: "#FFD86B", fontWeight: 900, fontSize: 13, textDecoration: "none", marginTop: 4 },
  banner: { borderRadius: 20, padding: 16, border: "1px solid rgba(255,216,107,0.4)", background: "linear-gradient(160deg,#3B2A12,#241A10)", display: "flex", flexDirection: "column", gap: 10 },
  bannerTitle: { fontSize: 18, fontWeight: 900, color: "#FFD86B" },
  bannerText: { color: "#FFE7B5", lineHeight: 1.4 },
  bannerBtn: { textAlign: "center", background: "#FF8A00", color: "#fff", fontWeight: 900, padding: "12px", borderRadius: 14, textDecoration: "none" },
  vipHero: { borderRadius: 22, padding: 18, border: "1px solid rgba(255,216,107,0.4)", background: "linear-gradient(160deg,#2B2118,#18161D 55%,#111017)", display: "flex", flexDirection: "column", gap: 10 },
  vipHeroTitle: { fontSize: 21, fontWeight: 900, color: "#fff" },
  vipHeroBtn: { textAlign: "center", background: "#FF8A00", color: "#fff", fontWeight: 900, padding: "12px", borderRadius: 14, textDecoration: "none", marginTop: 4 },
  social: { color: "#DCCAA4", fontSize: 12 },
  navBtn: { flex: 1, color: "#fff", fontWeight: 900, border: "none", borderRadius: 14, padding: "12px", cursor: "pointer" },
  errorCard: { borderRadius: 12, background: "#321A1D", padding: 16, color: "#fff", fontWeight: 700 },
};
