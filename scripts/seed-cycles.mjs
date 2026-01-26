import "dotenv/config";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  setDoc,
} from "firebase/firestore";

// ===== Validação de ENV =====
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!apiKey || !authDomain || !projectId) {
  console.error("ENV ausente. Verifique .env.local com:");
  console.error("NEXT_PUBLIC_FIREBASE_API_KEY=...");
  console.error("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...");
  console.error("NEXT_PUBLIC_FIREBASE_PROJECT_ID=...");
  process.exit(1);
}

const firebaseConfig = { apiKey, authDomain, projectId };
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== Config =====
const PLAN_ID = process.env.PLAN_ID || "bs30";
const SOURCE_PATH = `plans/${PLAN_ID}/days`;
const TARGET_COLLECTION = process.env.TARGET_COLLECTION || "cycleDays";
const CYCLES = Number(process.env.CYCLES || 12);
const DAYS = Number(process.env.DAYS || 30);
const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "true";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function targetId(cycle, day) {
  return `c${pad2(cycle)}_d${pad2(day)}`;
}

async function main() {
  console.log("[seed-cycles] Source:", SOURCE_PATH);
  console.log("[seed-cycles] Target:", TARGET_COLLECTION);
  console.log("[seed-cycles] Cycles:", CYCLES, "Days:", DAYS, "DryRun:", DRY_RUN);

  // 1) Ler base 30 dias
  const ref = collection(db, SOURCE_PATH);
  const snap = await getDocs(query(ref, orderBy("day", "asc")));

  if (snap.empty) {
    throw new Error(`Sem docs em ${SOURCE_PATH}. Confere se existe day=1..${DAYS}.`);
  }

  const byDay = new Map();
  snap.docs.forEach((d) => {
    const data = d.data();
    const day = Number(data.day);
    if (day >= 1) byDay.set(day, data);
  });

  for (let d = 1; d <= DAYS; d++) {
    if (!byDay.has(d)) throw new Error(`Faltando day=${d} em ${SOURCE_PATH}.`);
  }

  // 2) Escrever 12x30 na coleção nova
  let writes = 0;

  for (let c = 1; c <= CYCLES; c++) {
    for (let d = 1; d <= DAYS; d++) {
      const base = byDay.get(d);
      const id = targetId(c, d);

      const payload = {
        ...base,
        cycle: c,
        day: d,
      };

      if (DRY_RUN) {
        // só simula
        writes++;
        continue;
      }

      const outRef = doc(db, TARGET_COLLECTION, id);
      // merge: true = idempotente (se rodar de novo, não quebra)
      await setDoc(outRef, payload, { merge: true });
      writes++;

      if (writes % 25 === 0) console.log("[seed-cycles] progress:", writes);
    }
  }

  console.log(`[seed-cycles] DONE. Writes: ${writes}.`);
  console.log("Exemplos:", targetId(1, 1), targetId(1, 30), targetId(12, 1), targetId(12, 30));
}

main().catch((e) => {
  console.error("[seed-cycles] falhou:", e);
  process.exit(1);
});
