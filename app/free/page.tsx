"use client";

import MobileNav from "@/components/MobileNav";
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
import {
  defaultLanguage,
  isLanguage,
  languages,
  translations,
  type Language,
} from "@/lib/i18n";
import { localizeDayPlan } from "@/lib/contentI18n";

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
  createdAt?: any;
  unlockedCycles?: number;
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
const CYCLE_COLLECTION = "cycleDays";
const FREE_CYCLE = 1;
const DAYS_PER_CYCLE = 30;

function asMillis(v: any): number | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  if (typeof v === "number") return v;
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
  return Math.floor((bUtc - aUtc) / 86400000);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function resolveUnlockedCycles(data: UserProfile): number {
  const direct = Number(data?.unlockedCycles);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const flag =
    data?.vipActive === true ||
    data?.isVip === true ||
    data?.vip === true ||
    data?.vip_enabled === true;

  const statusOk =
    typeof data?.subscriptionStatus === "string" &&
    ["active", "trialing", "paid"].includes(String(data.subscriptionStatus).toLowerCase());

  const until =
    data?.vipUntil ?? data?.vip_until ?? data?.vipExpiresAt ?? data?.vip_expires_at;
  const untilMs = asMillis(until);
  const untilOk = typeof untilMs === "number" ? untilMs > Date.now() : false;

  return flag || statusOk || untilOk ? 1 : 0;
}

function buildCycleFallback(): DayDoc[] {
  const out: DayDoc[] = [];
  const workouts = [
    ["Agachamento 3x12", "Polichinelo 3x30s", "Prancha 3x30s", "Alongamento 2 min"],
    ["Caminhada 15 min", "Abdominal 3x15", "Prancha lateral 3x20s", "Alongamento 2 min"],
    ["Afundo 3x10 (cada perna)", "Elevacao pelvica 3x12", "Prancha 3x40s", "Alongamento 2 min"],
    ["HIIT leve 10 min", "Agachamento 4x10", "Abdominal curto 3x12", "Alongamento 2 min"],
  ];

  const cafe = [
    "Omelete de queijo + tomate (10min)",
    "Crepioca de frango (10min)",
    "Iogurte natural + granola + fruta",
    "Panqueca de banana (12min)",
  ];
  const almoco = [
    "Frango ao molho + legumes (20min)",
    "Tilapia assada + pure (25min)",
    "Carne moida com abobrinha + arroz (25min)",
    "Salada completa + proteina (15min)",
  ];
  const lanche = [
    "Iogurte + fruta + castanhas (porcao)",
    "Sanduiche integral pequeno (queijo + tomate)",
    "Ovo cozido + fruta",
    "Mix de castanhas (30g)",
  ];
  const besteirinhas = [
    "Gelatina zero + cha",
    "Chocolate 70% (1-2 quadradinhos)",
    "Pipoca sem oleo (porcao pequena)",
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
      title: `Dia ${day} - Ciclo ${FREE_CYCLE}`,
      workout: workouts[(day - 1) % workouts.length],
      meals: {
        cafe: [cafe[(day - 1) % cafe.length]],
        almoco: [almoco[(day - 1) % almoco.length]],
        lanche: [lanche[(day - 1) % lanche.length]],
        besteirinhas: [besteirinhas[(day - 1) % besteirinhas.length]],
        janta: [janta[(day - 1) % janta.length]],
      },
      tips: ["Meta do dia: agua + consistencia.", "Caminhada leve pos-refeicao se possivel."],
    });
  }

  return out;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 760);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isMobile;
}

export default function FreePage() {
  const isMobile = useIsMobile();
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const t = translations[language].free;

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [authReady, setAuthReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [unlockedCycles, setUnlockedCycles] = useState<number>(0);
  const vipActive = unlockedCycles >= 1;
  const [startAtMs, setStartAtMs] = useState<number | null>(null);
  const [days, setDays] = useState<DayDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const fallback = useMemo(() => buildCycleFallback(), []);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("barrigaseca-language");
    if (isLanguage(savedLanguage)) setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("barrigaseca-language", language);
  }, [language]);

  const todayProgramDay = useMemo(() => {
    if (!startAtMs) return null;
    const elapsed = diffDaysUtc(startAtMs, Date.now()) + 1;
    return clamp(elapsed, 1, DAYS_PER_CYCLE);
  }, [startAtMs]);

  const dayPlan: DayDoc | null = useMemo(() => {
    const fromFs = days.find((d) => d.day === selectedDay);
    const plan = fromFs ?? fallback.find((d) => d.day === selectedDay) ?? null;
    return plan ? localizeDayPlan(plan, language) : null;
  }, [days, fallback, selectedDay, language]);

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

        const createdMs = asMillis(data.createdAt);
        setStartAtMs(createdMs);

        if (createdMs) {
          const d = clamp(diffDaysUtc(createdMs, Date.now()) + 1, 1, DAYS_PER_CYCLE);
          setSelectedDay(d);
        }
      } catch {
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
        const ref = collection(db, CYCLE_COLLECTION);
        const q = query(ref, where("cycle", "==", FREE_CYCLE), orderBy("day", "asc"));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => d.data() as DayDoc).filter(Boolean);
        setDays(list);

        if (list.length > 0 && !list.some((x) => x.day === selectedDay)) {
          setSelectedDay(list[0]?.day ?? 1);
        }
      } catch {
        setDays([]);
      } finally {
        setLoading(false);
      }
    }

    loadFromFirestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerStatus = useMemo(() => {
    if (!authReady) return t.syncing;
    if (!uid) return t.visitor;
    return vipActive ? `${t.vipCycles}: ${unlockedCycles}` : t.freeStatus;
  }, [authReady, uid, vipActive, unlockedCycles, t]);

  return (
    <main style={isMobile ? mobilePage : page}>
      <section style={isMobile ? mobileSectionCard : sectionCard}>
        <div style={topRow}>
          <h1 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 900, margin: 0, lineHeight: 1.08 }}>
            {t.heroTitle} - {t.cycle} {FREE_CYCLE}
          </h1>

          <div style={languageGroup} aria-label="Language">
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                style={{
                  ...languageButton,
                  ...(language === item.code ? languageButtonActive : null),
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <p style={{ color: "#555", marginTop: 10, lineHeight: 1.5 }}>
          {t.heroTextStart} <strong>{t.workout}</strong> + <strong>{t.recipes}</strong>.{" "}
          <strong>{FREE_DAYS} {t.heroTextEnd}</strong>
        </p>

        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, color: "#111" }}>
          {t.status}: {headerStatus}
          {uid && typeof todayProgramDay === "number" && (
            <span style={{ marginLeft: 10, color: "#555" }}>
              - {t.todayProgram}: {t.day} {todayProgramDay}
            </span>
          )}
        </div>

        <div style={isMobile ? mobileActionRow : actionRow}>
          <a href="/login" style={isMobile ? mobileLinkGhost : linkGhost}>{t.loginCreate}</a>
          <a href="/vip" style={isMobile ? mobileLinkDark : linkDark}>{t.becomeVip}</a>
          <a href="/app" style={isMobile ? mobileLinkGhost : linkGhostStrong}>{t.openApp}</a>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 950, color: "#111", marginBottom: 10 }}>
            {t.vipArea}
          </div>

          <div style={featureGrid}>
            <VipFeatureCard
              title={t.checklistTitle}
              desc={t.checklistDesc}
              href="/vip/checklist"
              badge={t.vipLabel}
              openLabel={t.open}
            />
            <VipFeatureCard
              title={t.goalsTitle}
              desc={t.goalsDesc}
              href="/vip/metas"
              badge={t.vipLabel}
              openLabel={t.open}
            />
          </div>
        </div>

        {loading && (
          <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
            {t.loadingCalendar}
          </div>
        )}
      </section>

      <section style={isMobile ? mobileMainGrid : mainGrid}>
        <div style={isMobile ? mobileSectionCardSmall : sectionCardSmall}>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 900 }}>{t.selectDay}</h2>

          <div style={isMobile ? mobileCalendarGrid : calendarGrid}>
            {Array.from({ length: DAYS_PER_CYCLE }).map((_, i) => {
              const d = i + 1;
              const locked = !vipActive && d > FREE_DAYS;
              const active = d === selectedDay;

              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  style={{
                    minHeight: isMobile ? 48 : undefined,
                    padding: isMobile ? "10px 0" : "12px 0",
                    borderRadius: isMobile ? 10 : 12,
                    border: active ? "2px solid #111" : "1px solid #e6e6e6",
                    cursor: "pointer",
                    fontWeight: 900,
                    background: locked ? "#fafafa" : "#fff",
                    color: locked ? "#999" : "#111",
                    position: "relative",
                  }}
                  aria-label={`${t.day} ${d}${locked ? ` (${t.vipLabel})` : ""}`}
                  title={locked ? t.vipLabel : t.freeLabel}
                >
                  {d}
                  {locked && <span style={vipChip}>{t.vipLabel}</span>}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 14, color: "#666", fontSize: 13, lineHeight: 1.4 }}>
            <strong>{t.freeLabel}:</strong> {t.day.toLowerCase()}s 1-{FREE_DAYS}. <br />
            <strong>{t.vipLabel}:</strong> {t.day.toLowerCase()}s {FREE_DAYS + 1}-{DAYS_PER_CYCLE}.
          </div>
        </div>

        <div style={isMobile ? mobileSectionCardSmall : sectionCardSmall}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ marginTop: 0, fontSize: isMobile ? 20 : 22, fontWeight: 900, lineHeight: 1.15 }}>
              {t.day} {selectedDay} - {isVipLocked ? t.contentVip : t.contentUnlocked}
            </h2>

            {isVipLocked && <a href="/vip" style={isMobile ? mobileLinkDark : linkDark}>{t.unlockNow}</a>}
          </div>

          {!dayPlan ? (
            <p style={{ color: "#666" }}>{t.noContent}</p>
          ) : isVipLocked ? (
            <LockedPreview t={t} />
          ) : (
            <DayContent dayPlan={dayPlan} t={t} />
          )}

          {!isVipLocked && (
            <div style={isMobile ? mobileNavRow : navRow}>
              <button onClick={() => setSelectedDay((d) => Math.max(1, d - 1))} style={isMobile ? mobileNavBtn : navBtn}>
                {"<"} {t.previousDay}
              </button>
              <button onClick={() => setSelectedDay((d) => Math.min(DAYS_PER_CYCLE, d + 1))} style={isMobile ? mobileNavBtn : navBtn}>
                {t.nextDay} {">"}
              </button>
            </div>
          )}
        </div>
      </section>

      <section style={{ ...(isMobile ? mobileSectionCard : sectionCard), marginTop: isMobile ? 12 : 18 }}>
        <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 900 }}>{t.finalTitle}</h3>
        <p style={{ color: "#555", marginTop: 8, lineHeight: 1.5 }}>
          {t.finalText} <strong>Checklist</strong> + <strong>{t.goalsTitle}</strong>.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/vip" style={isMobile ? mobileLinkDark : linkDark}>{t.becomeVip}</a>
          <a href="/vip/metas" style={isMobile ? mobileLinkGhost : linkGhost}>{t.viewGoals}</a>
          <a href="/vip/checklist" style={isMobile ? mobileLinkGhost : linkGhost}>{t.viewChecklist}</a>
        </div>
      </section>
      <MobileNav active="calendar" />
    </main>
  );
}

type FreeTexts = (typeof translations)[Language]["free"];

const page: React.CSSProperties = {
  padding: 28,
  maxWidth: 1100,
  margin: "28px auto",
};

const mobilePage: React.CSSProperties = {
  padding: 12,
  maxWidth: 520,
  margin: "12px auto",
};

const sectionCard: React.CSSProperties = {
  padding: 24,
  borderRadius: 18,
  border: "1px solid #eee",
  background: "#fff",
  color: "#111",
};

const mobileSectionCard: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid #eee",
  background: "#fff",
  color: "#111",
};

const sectionCardSmall: React.CSSProperties = {
  padding: 16,
  borderRadius: 18,
  border: "1px solid #eee",
  background: "#fff",
  color: "#111",
};

const mobileSectionCardSmall: React.CSSProperties = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid #eee",
  background: "#fff",
  color: "#111",
};

const topRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const languageGroup: React.CSSProperties = {
  display: "inline-flex",
  gap: 6,
  padding: 4,
  borderRadius: 999,
  border: "1px solid rgba(17,17,17,0.10)",
  background: "#fff",
};

const languageButton: React.CSSProperties = {
  border: "none",
  borderRadius: 999,
  background: "transparent",
  color: "#111",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 950,
  padding: "7px 10px",
};

const languageButtonActive: React.CSSProperties = {
  background: "#111",
  color: "#fff",
};

const featureGrid: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
};

const mainGrid: React.CSSProperties = {
  marginTop: 18,
  display: "grid",
  gap: 16,
  gridTemplateColumns: "360px 1fr",
  alignItems: "start",
};

const mobileMainGrid: React.CSSProperties = {
  marginTop: 12,
  display: "grid",
  gap: 12,
  gridTemplateColumns: "1fr",
  alignItems: "start",
};

const calendarGrid: React.CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(5, 1fr)",
};

const mobileCalendarGrid: React.CSSProperties = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
};

const actionRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 14,
};

const mobileActionRow: React.CSSProperties = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "1fr",
  marginTop: 14,
};

const linkGhost: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #ddd",
  fontWeight: 900,
  textDecoration: "none",
  color: "#111",
  background: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const mobileLinkGhost: React.CSSProperties = {
  ...linkGhost,
  width: "100%",
  minHeight: 46,
};

const linkGhostStrong: React.CSSProperties = {
  ...linkGhost,
  border: "1px solid #111",
};

const linkDark: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #111",
  fontWeight: 900,
  textDecoration: "none",
  color: "#fff",
  background: "#111",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const mobileLinkDark: React.CSSProperties = {
  ...linkDark,
  width: "100%",
  minHeight: 46,
};

const navBtn: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #ddd",
  fontWeight: 900,
  cursor: "pointer",
  background: "#fff",
};

const navRow: React.CSSProperties = {
  marginTop: 18,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const mobileNavRow: React.CSSProperties = {
  marginTop: 14,
  display: "grid",
  gap: 8,
  gridTemplateColumns: "1fr 1fr",
};

const mobileNavBtn: React.CSSProperties = {
  ...navBtn,
  minHeight: 44,
  padding: "10px 8px",
};

const vipChip: React.CSSProperties = {
  position: "absolute",
  right: 8,
  top: 6,
  fontSize: 11,
  fontWeight: 900,
  color: "#999",
};

function VipFeatureCard({
  title,
  desc,
  href,
  badge,
  openLabel,
}: {
  title: string;
  desc: string;
  href: string;
  badge: string;
  openLabel: string;
}) {
  return (
    <a href={href} style={featureCard}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 950 }}>{title}</div>
        <div style={featureBadge}>{badge}</div>
      </div>
      <div style={{ marginTop: 10, color: "#555", fontWeight: 700, lineHeight: 1.5 }}>{desc}</div>
      <div style={{ marginTop: 12, fontWeight: 950 }}>{openLabel} {">"}</div>
    </a>
  );
}

const featureCard: React.CSSProperties = {
  textDecoration: "none",
  color: "#111",
  borderRadius: 18,
  border: "1px solid #eee",
  background: "#fff",
  padding: 16,
  display: "block",
};

const featureBadge: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 950,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  whiteSpace: "nowrap",
};

function DayContent({ dayPlan, t }: { dayPlan: DayDoc; t: FreeTexts }) {
  const title =
    dayPlan.title && dayPlan.title.trim().length > 0
      ? dayPlan.title
      : `${t.day} ${dayPlan.day} - ${t.dayFallbackTitle}`;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Block title={title} items={[]} hideList />
      <Block title={t.workoutBlock} items={dayPlan.workout ?? []} />

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <Block title={t.breakfast} items={dayPlan.meals?.cafe ?? []} />
        <Block title={t.lunch} items={dayPlan.meals?.almoco ?? []} />
        <Block title={t.snack} items={dayPlan.meals?.lanche ?? []} />
        <Block title={t.treats} items={dayPlan.meals?.besteirinhas ?? []} />
        <Block title={t.dinner} items={dayPlan.meals?.janta ?? []} />
      </div>

      {Array.isArray(dayPlan.tips) && dayPlan.tips.length > 0 && (
        <Block title={t.dailyTips} items={dayPlan.tips} />
      )}
    </div>
  );
}

function LockedPreview({ t }: { t: FreeTexts }) {
  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ color: "#555", lineHeight: 1.5 }}>{t.lockedText}</p>
      <ul style={{ lineHeight: 1.8, fontWeight: 700, color: "#222" }}>
        {t.lockedItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div style={previewBox}>{t.preview}</div>
    </div>
  );
}

const previewBox: React.CSSProperties = {
  marginTop: 12,
  padding: 14,
  borderRadius: 14,
  border: "1px dashed #ddd",
  background: "#fafafa",
  color: "#666",
  fontWeight: 700,
};

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
    <div style={{ padding: 14, borderRadius: 16, border: "1px solid #eee", background: "#fff", color: "#111" }}>
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



