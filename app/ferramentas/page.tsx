"use client";

import MobileNav from "@/components/MobileNav";
import React, { useEffect, useMemo, useState } from "react";

type Lang = "pt" | "en" | "es";
type ToolId = "bmi" | "water" | "weightloss" | "muscle" | "measure" | "reminders";

const UI: Record<Lang, any> = {
  pt: {
    heroTitle: "Ferramentas",
    heroSub: "Calculos rapidos para transformar objetivo em rotina.",
    back: "Voltar",
    calc: "Calcular",
    weight: "Peso",
    height: "Altura",
    current: "Peso atual",
    target: "Peso desejado",
    disclaimer: "Os resultados sao estimativas educativas e nao substituem orientacao medica ou nutricional.",
    fillWH: "Preencha peso e altura corretamente.",
    validWeight: "Informe um peso valido.",
    targetLess: "Informe uma meta menor que o peso atual.",
    save: "Salvar",
    waist: "Cintura (cm)",
    history: "Historico",
    noHistory: "Nenhum registro ainda.",
    remindTitle: "Marque o que ja fez hoje",
    water: "Bebi agua",
    workout: "Fiz o treino",
    meals: "Segui as refeicoes",
    savedMeasure: "Registro salvo.",
    tools: {
      bmi: ["Calcular IMC", "Confira a relacao entre peso e altura."],
      water: ["Meta de agua", "Estime sua necessidade diaria de hidratacao."],
      weightloss: ["Meta de emagrecimento", "Visualize uma meta gradual de perda de peso."],
      muscle: ["Ganho de massa", "Calcule uma faixa diaria de proteina."],
      measure: ["Peso e medidas", "Registre e acompanhe sua evolucao."],
      reminders: ["Lembretes", "Organize agua, treino e refeicoes."],
    },
    bmiResult: (v: string, c: string) => `Seu IMC e ${v}: ${c}.`,
    bmiCats: ["abaixo do peso", "faixa considerada adequada", "sobrepeso", "obesidade grau 1", "obesidade grau 2", "obesidade grau 3"],
    waterResult: (ml: number, l: string) => `Meta estimada: ${ml} ml por dia (${l} litros).`,
    lossResult: (d: string, w: number) => `Meta: perder ${d} kg. Em um ritmo moderado de 0,5 kg por semana, a estimativa e de ${w} semanas.`,
    proteinResult: (a: number, b: number) => `Faixa de referencia para adultos ativos: ${a} a ${b} g de proteina por dia.`,
  },
  en: {
    heroTitle: "Tools",
    heroSub: "Quick calculations to turn goals into routine.",
    back: "Back",
    calc: "Calculate",
    weight: "Weight",
    height: "Height",
    current: "Current weight",
    target: "Target weight",
    disclaimer: "Results are educational estimates and do not replace medical or nutritional advice.",
    fillWH: "Fill in weight and height correctly.",
    validWeight: "Enter a valid weight.",
    targetLess: "Enter a target lower than the current weight.",
    save: "Save",
    waist: "Waist (cm)",
    history: "History",
    noHistory: "No records yet.",
    remindTitle: "Check what you did today",
    water: "Drank water",
    workout: "Did the workout",
    meals: "Followed the meals",
    savedMeasure: "Record saved.",
    tools: {
      bmi: ["Calculate BMI", "Check the ratio between weight and height."],
      water: ["Water goal", "Estimate your daily hydration need."],
      weightloss: ["Weight-loss goal", "Visualize a gradual weight-loss target."],
      muscle: ["Muscle gain", "Calculate a daily protein range."],
      measure: ["Weight & measures", "Record and track your evolution."],
      reminders: ["Reminders", "Organize water, workout and meals."],
    },
    bmiResult: (v: string, c: string) => `Your BMI is ${v}: ${c}.`,
    bmiCats: ["underweight", "considered adequate range", "overweight", "obesity grade 1", "obesity grade 2", "obesity grade 3"],
    waterResult: (ml: number, l: string) => `Estimated goal: ${ml} ml per day (${l} liters).`,
    lossResult: (d: string, w: number) => `Goal: lose ${d} kg. At a moderate pace of 0.5 kg per week, the estimate is ${w} weeks.`,
    proteinResult: (a: number, b: number) => `Reference range for active adults: ${a} to ${b} g of protein per day.`,
  },
  es: {
    heroTitle: "Herramientas",
    heroSub: "Calculos rapidos para convertir el objetivo en rutina.",
    back: "Volver",
    calc: "Calcular",
    weight: "Peso",
    height: "Altura",
    current: "Peso actual",
    target: "Peso deseado",
    disclaimer: "Los resultados son estimaciones educativas y no sustituyen la orientacion medica o nutricional.",
    fillWH: "Completa peso y altura correctamente.",
    validWeight: "Indica un peso valido.",
    targetLess: "Indica una meta menor que el peso actual.",
    save: "Guardar",
    waist: "Cintura (cm)",
    history: "Historial",
    noHistory: "Aun no hay registros.",
    remindTitle: "Marca lo que ya hiciste hoy",
    water: "Bebi agua",
    workout: "Hice el entrenamiento",
    meals: "Segui las comidas",
    savedMeasure: "Registro guardado.",
    tools: {
      bmi: ["Calcular IMC", "Comprueba la relacion entre peso y altura."],
      water: ["Meta de agua", "Estima tu necesidad diaria de hidratacion."],
      weightloss: ["Meta de adelgazamiento", "Visualiza una meta gradual de perdida de peso."],
      muscle: ["Ganancia muscular", "Calcula un rango diario de proteina."],
      measure: ["Peso y medidas", "Registra y sigue tu evolucion."],
      reminders: ["Recordatorios", "Organiza agua, entrenamiento y comidas."],
    },
    bmiResult: (v: string, c: string) => `Tu IMC es ${v}: ${c}.`,
    bmiCats: ["bajo peso", "rango considerado adecuado", "sobrepeso", "obesidad grado 1", "obesidad grado 2", "obesidad grado 3"],
    waterResult: (ml: number, l: string) => `Meta estimada: ${ml} ml por dia (${l} litros).`,
    lossResult: (d: string, w: number) => `Meta: perder ${d} kg. A un ritmo moderado de 0,5 kg por semana, la estimacion es de ${w} semanas.`,
    proteinResult: (a: number, b: number) => `Rango de referencia para adultos activos: ${a} a ${b} g de proteina por dia.`,
  },
};

const GRAD: Record<ToolId, [string, string]> = {
  bmi: ["#31D7FF", "#176CFF"],
  water: ["#49E5FF", "#0082C8"],
  weightloss: ["#FFC438", "#FF7A00"],
  muscle: ["#FF5D45", "#C6182D"],
  measure: ["#9AF23D", "#149B37"],
  reminders: ["#C16BFF", "#6931D4"],
};
const ICON: Record<ToolId, string> = {
  bmi: "⚖️",
  water: "💧",
  weightloss: "📉",
  muscle: "💪",
  measure: "📏",
  reminders: "🔔",
};
const ORDER: ToolId[] = ["bmi", "water", "weightloss", "muscle", "measure", "reminders"];

function num(s: string): number | null {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

export default function FerramentasPage() {
  const [lang, setLang] = useState<Lang>("pt");
  const [selected, setSelected] = useState<ToolId | null>(null);
  const t = UI[lang];

  useEffect(() => {
    const saved = window.localStorage.getItem("barrigaseca-language");
    if (saved === "pt" || saved === "en" || saved === "es") setLang(saved);
  }, []);

  return (
    <main style={S.page}>
      <div style={S.bg} aria-hidden />

      {selected === null ? (
        <>
          <section style={S.hero}>
            <div style={S.heroTitle}>{t.heroTitle}</div>
            <div style={S.heroSub}>{t.heroSub}</div>
          </section>

          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 12, marginTop: 12 }}>
            {ORDER.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id)}
                style={{ ...S.tile, background: `linear-gradient(180deg, ${GRAD[id][0]}, ${GRAD[id][1]})` }}
              >
                <span style={S.tileIcon}>{ICON[id]}</span>
                <span style={{ flex: 1, textAlign: "left" }}>
                  <span style={S.tileTitle}>{t.tools[id][0]}</span>
                  <span style={S.tileDesc}>{t.tools[id][1]}</span>
                </span>
                <span style={S.chev}>›</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <ToolDetail id={selected} t={t} onBack={() => setSelected(null)} />
      )}

      <MobileNav active="tools" />
    </main>
  );
}

function ToolDetail({ id, t, onBack }: { id: ToolId; t: any; onBack: () => void }) {
  return (
    <>
      <div style={{ ...S.detailHeader, background: `linear-gradient(180deg, ${GRAD[id][0]}, ${GRAD[id][1]})` }}>
        <button type="button" onClick={onBack} style={S.backBtn} aria-label={t.back}>‹</button>
        <span style={S.detailIcon}>{ICON[id]}</span>
        <div style={{ flex: 1 }}>
          <div style={S.detailTitle}>{t.tools[id][0]}</div>
          <div style={S.detailDesc}>{t.tools[id][1]}</div>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, marginTop: 14 }}>
        {id === "bmi" && <Bmi t={t} />}
        {id === "water" && <Water t={t} />}
        {id === "weightloss" && <WeightLoss t={t} />}
        {id === "muscle" && <Protein t={t} />}
        {id === "measure" && <Measure t={t} />}
        {id === "reminders" && <Reminders t={t} />}
      </div>

      {["bmi", "water", "weightloss", "muscle"].includes(id) && (
        <div style={S.disclaimer}>{t.disclaimer}</div>
      )}
    </>
  );
}

function Field({ value, onChange, label, suffix }: { value: string; onChange: (v: string) => void; label: string; suffix?: string }) {
  return (
    <label style={S.fieldWrap}>
      <span style={S.fieldLabel}>{label}</span>
      <span style={S.fieldRow}>
        <input
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v.length <= 7 && /^[0-9.,]*$/.test(v)) onChange(v);
          }}
          inputMode="decimal"
          style={S.input}
        />
        {suffix ? <span style={S.suffix}>{suffix}</span> : null}
      </span>
    </label>
  );
}

function CalcBtn({ t, onClick }: { t: any; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={S.calcBtn}>{t.calc}</button>
  );
}

function ResultCard({ text }: { text: string }) {
  return <div style={S.result}>{text}</div>;
}

function Bmi({ t }: { t: any }) {
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [r, setR] = useState<string | null>(null);
  return (
    <div style={S.card}>
      <Field value={w} onChange={setW} label={t.weight} suffix="kg" />
      <Field value={h} onChange={setH} label={t.height} suffix="cm / m" />
      <CalcBtn t={t} onClick={() => {
        const kg = num(w);
        const raw = num(h) ?? 0;
        const m = raw >= 0.5 && raw <= 3.0 ? raw : raw / 100;
        if (kg === null || kg <= 0 || m <= 0) { setR(t.fillWH); return; }
        const bmi = kg / (m * m);
        const cats = t.bmiCats;
        const cat = bmi < 18.5 ? cats[0] : bmi < 25 ? cats[1] : bmi < 30 ? cats[2] : bmi < 35 ? cats[3] : bmi < 40 ? cats[4] : cats[5];
        setR(t.bmiResult(bmi.toFixed(1), cat));
      }} />
      {r && <ResultCard text={r} />}
    </div>
  );
}

function Water({ t }: { t: any }) {
  const [w, setW] = useState("");
  const [r, setR] = useState<string | null>(null);
  return (
    <div style={S.card}>
      <Field value={w} onChange={setW} label={t.weight} suffix="kg" />
      <CalcBtn t={t} onClick={() => {
        const kg = num(w);
        if (kg === null || kg <= 0) { setR(t.validWeight); return; }
        const ml = Math.round(kg * 35);
        setR(t.waterResult(ml, (ml / 1000).toFixed(1)));
      }} />
      {r && <ResultCard text={r} />}
    </div>
  );
}

function WeightLoss({ t }: { t: any }) {
  const [c, setC] = useState("");
  const [tg, setTg] = useState("");
  const [r, setR] = useState<string | null>(null);
  return (
    <div style={S.card}>
      <Field value={c} onChange={setC} label={t.current} suffix="kg" />
      <Field value={tg} onChange={setTg} label={t.target} suffix="kg" />
      <CalcBtn t={t} onClick={() => {
        const cur = num(c);
        const tar = num(tg);
        if (cur === null || tar === null || cur <= 0 || tar <= 0 || tar >= cur) { setR(t.targetLess); return; }
        const diff = cur - tar;
        const weeks = Math.ceil(diff / 0.5);
        setR(t.lossResult(diff.toFixed(1), weeks));
      }} />
      {r && <ResultCard text={r} />}
    </div>
  );
}

function Protein({ t }: { t: any }) {
  const [w, setW] = useState("");
  const [r, setR] = useState<string | null>(null);
  return (
    <div style={S.card}>
      <Field value={w} onChange={setW} label={t.weight} suffix="kg" />
      <CalcBtn t={t} onClick={() => {
        const kg = num(w);
        if (kg === null || kg <= 0) { setR(t.validWeight); return; }
        setR(t.proteinResult(Math.round(kg * 1.6), Math.round(kg * 2.2)));
      }} />
      {r && <ResultCard text={r} />}
    </div>
  );
}

type MeasureEntry = { date: string; weight: string; waist: string };

function Measure({ t }: { t: any }) {
  const [w, setW] = useState("");
  const [waist, setWaist] = useState("");
  const [list, setList] = useState<MeasureEntry[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("barrigaseca-measures");
      if (raw) setList(JSON.parse(raw));
    } catch {}
  }, []);

  function save() {
    if (num(w) === null && num(waist) === null) return;
    const entry: MeasureEntry = { date: new Date().toISOString().slice(0, 10), weight: w, waist };
    const next = [entry, ...list].slice(0, 20);
    setList(next);
    window.localStorage.setItem("barrigaseca-measures", JSON.stringify(next));
    setW("");
    setWaist("");
    setMsg(t.savedMeasure);
  }

  return (
    <div style={S.card}>
      <Field value={w} onChange={setW} label={t.weight} suffix="kg" />
      <Field value={waist} onChange={setWaist} label={t.waist} />
      <button type="button" onClick={save} style={S.calcBtn}>{t.save}</button>
      {msg && <div style={{ color: "#8EEA35", fontWeight: 800 }}>{msg}</div>}
      <div style={{ color: "#FFD86B", fontWeight: 900, marginTop: 4 }}>{t.history}</div>
      {list.length === 0 ? (
        <div style={{ color: "#C9C4D6" }}>{t.noHistory}</div>
      ) : (
        list.map((e, i) => (
          <div key={i} style={S.measureRow}>
            <span style={{ color: "#C9C4D6", fontWeight: 700 }}>{e.date}</span>
            <span style={{ color: "#fff", fontWeight: 900 }}>
              {e.weight ? `${e.weight} kg` : ""} {e.waist ? `· ${e.waist} cm` : ""}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function Reminders({ t }: { t: any }) {
  const today = new Date().toISOString().slice(0, 10);
  const [state, setState] = useState<{ water: boolean; workout: boolean; meals: boolean }>({
    water: false,
    workout: false,
    meals: false,
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("barrigaseca-reminders");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === today) setState(parsed.state);
      }
    } catch {}
  }, [today]);

  function toggle(key: "water" | "workout" | "meals") {
    const next = { ...state, [key]: !state[key] };
    setState(next);
    window.localStorage.setItem("barrigaseca-reminders", JSON.stringify({ date: today, state: next }));
  }

  const rows: Array<["water" | "workout" | "meals", string]> = [
    ["water", t.water],
    ["workout", t.workout],
    ["meals", t.meals],
  ];

  return (
    <div style={S.card}>
      <div style={{ color: "#FFD86B", fontWeight: 900 }}>{t.remindTitle}</div>
      {rows.map(([key, label]) => (
        <button key={key} type="button" onClick={() => toggle(key)} style={{ ...S.remindRow, ...(state[key] ? S.remindRowOn : null) }}>
          <span style={{ ...S.check, ...(state[key] ? S.checkOn : null) }}>{state[key] ? "✓" : ""}</span>
          <span style={{ fontWeight: 800 }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
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
    background: "radial-gradient(900px 500px at 80% 5%, rgba(31,86,167,0.18), transparent 60%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  hero: {
    position: "relative",
    zIndex: 1,
    borderRadius: 26,
    padding: 18,
    background: "linear-gradient(180deg,#1E58A8,#1B2438 55%,#1A1512)",
    border: "1px solid rgba(255,255,255,0.22)",
    boxShadow: "0 16px 36px rgba(0,0,0,0.45)",
  },
  heroTitle: { color: "#FFB637", fontSize: 32, fontWeight: 950, textShadow: "2px 3px 4px rgba(0,0,0,0.65)" },
  heroSub: { color: "#fff", fontSize: 15, fontWeight: 900, marginTop: 6 },
  tile: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
    borderRadius: 18,
    padding: 16,
    border: "1px solid rgba(255,255,255,0.20)",
    boxShadow: "0 10px 22px rgba(0,0,0,0.3)",
    color: "#fff",
  },
  tileIcon: {
    width: 48,
    height: 48,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    borderRadius: 14,
    background: "rgba(255,255,255,0.22)",
    border: "1px solid rgba(255,255,255,0.32)",
  },
  tileTitle: { display: "block", color: "#fff", fontSize: 18, fontWeight: 950, textShadow: "1px 2px 3px rgba(0,0,0,0.45)" },
  tileDesc: { display: "block", color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 3, lineHeight: 1.35 },
  chev: { fontSize: 26, color: "#fff", fontWeight: 900 },

  detailHeader: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.24)",
    boxShadow: "0 12px 26px rgba(0,0,0,0.4)",
  },
  backBtn: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 14,
    border: "none",
    background: "rgba(255,255,255,0.22)",
    color: "#fff",
    fontSize: 26,
    fontWeight: 900,
    cursor: "pointer",
    lineHeight: 1,
  },
  detailIcon: { fontSize: 28 },
  detailTitle: { color: "#fff", fontSize: 22, fontWeight: 950, textShadow: "1px 2px 3px rgba(0,0,0,0.45)" },
  detailDesc: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 2 },

  card: {
    borderRadius: 18,
    padding: 16,
    background: "#19191F",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { color: "#D7D7DE", fontSize: 13, fontWeight: 800 },
  fieldRow: { display: "flex", alignItems: "center", gap: 8, border: "1px solid #62626D", borderRadius: 12, padding: "0 12px", background: "#101014" },
  input: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 16, fontWeight: 700, padding: "12px 0" },
  suffix: { color: "#8EEA35", fontWeight: 800 },
  calcBtn: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 14,
    border: "none",
    background: "#8EEA35",
    color: "#102000",
    fontWeight: 950,
    fontSize: 15,
    cursor: "pointer",
  },
  result: {
    borderRadius: 14,
    padding: 14,
    background: "#263D18",
    color: "#E9FFE2",
    fontWeight: 700,
    lineHeight: 1.45,
  },
  disclaimer: { position: "relative", zIndex: 1, marginTop: 12, color: "#9A94A6", fontSize: 12, lineHeight: 1.4 },
  measureRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.08)" },
  remindRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#101014",
    color: "#fff",
  },
  remindRowOn: { border: "1px solid #8EEA35", background: "#17240C" },
  check: {
    width: 26,
    height: 26,
    flexShrink: 0,
    borderRadius: 8,
    border: "2px solid #62626D",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#101010",
    fontWeight: 950,
  },
  checkOn: { background: "#8EEA35", borderColor: "#8EEA35" },
};
