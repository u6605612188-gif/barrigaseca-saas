import "dotenv/config";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// ===== Validação de ENV (evita INVALID_ARGUMENT) =====
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!apiKey || !authDomain || !projectId) {
  console.error("ENV ausente. Verifique o arquivo .env.local na raiz do projeto com:");
  console.error("NEXT_PUBLIC_FIREBASE_API_KEY=...");
  console.error("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...");
  console.error("NEXT_PUBLIC_FIREBASE_PROJECT_ID=...");
  process.exit(1);
}

const firebaseConfig = { apiKey, authDomain, projectId };

// evita múltiplas inicializações
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const planId = "bs30";

function dayId(n) {
  return `day${String(n).padStart(2, "0")}`;
}

// Conteúdo placeholder pra validar o produto.
// Depois você troca por conteúdo real (ou importa via planilha).
function makeDay(day) {
  const isVip = day > 7; // 1–7 grátis / 8–30 VIP

  const workoutBase = [
    "Aquecimento 3 min (polichinelo leve)",
    "Agachamento 3×12",
    "Prancha 3×30s",
    "Alongamento 2 min",
  ];

  const workoutAlt = [
    "Aquecimento 3 min (caminhada no lugar)",
    "Afundo 3×10 (cada perna)",
    "Abdominal 3×15",
    "Alongamento 2 min",
  ];

  const workout = day % 2 === 0 ? workoutAlt : workoutBase;

  return {
    day,
    isVip,
    title: `Dia ${day} — Barriga Seca`,
    workout,
    meals: {
      cafe: ["Ovos mexidos", "Café sem açúcar", "1 fruta"],
      almoco: ["Arroz", "Feijão", "Frango grelhado", "Salada à vontade"],
      lanche: ["Fruta", "Iogurte natural"],
      besteirinhas: ["Gelatina zero", "Chá sem açúcar"],
      janta: ["Sopa leve + proteína", "Água"],
    },
    tips: [
      "Beba água ao longo do dia.",
      "Evite açúcar líquido (refrigerante/suco).",
      "Caminhe 10–15 min se puder.",
    ],
  };
}

async function main() {
  for (let d = 1; d <= 30; d++) {
    const ref = doc(db, `plans/${planId}/days/${dayId(d)}`);
    await setDoc(ref, makeDay(d));
    console.log("OK:", `plans/${planId}/days/${dayId(d)}`);
  }
  console.log("Seed finalizado.");
}

main().catch((e) => {
  console.error("Seed falhou:", e);
  process.exit(1);
});
