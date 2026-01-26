import admin from "firebase-admin";

const PLAN_ID = process.env.PLAN_ID || "bs30";
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
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();

  const sourcePath = `plans/${PLAN_ID}/days`;
  console.log("[seed-cycles-admin] Source:", sourcePath);
  console.log("[seed-cycles-admin] Target:", TARGET_COLLECTION);
  console.log("[seed-cycles-admin] Cycles:", CYCLES, "Days:", DAYS, "DryRun:", DRY_RUN);

  const snap = await db.collection(sourcePath).orderBy("day", "asc").get();
  if (snap.empty) throw new Error(`Sem docs em ${sourcePath}.`);

  const byDay = new Map();
  snap.docs.forEach((d) => {
    const data = d.data();
    const day = Number(data.day);
    if (day >= 1) byDay.set(day, data);
  });
  for (let d = 1; d <= DAYS; d++) {
    if (!byDay.has(d)) throw new Error(`Faltando day=${d} em ${sourcePath}.`);
  }

  let total = 0;
  let batch = db.batch();
  let batchCount = 0;

  async function commitBatch() {
    if (batchCount === 0) return;
    if (DRY_RUN) {
      console.log(`[DRY_RUN] batch ${batchCount} (não commitado)`);
    } else {
      await batch.commit();
      console.log(`[OK] batch commitado ${batchCount}`);
    }
    batch = db.batch();
    batchCount = 0;
  }

  for (let c = 1; c <= CYCLES; c++) {
    for (let d = 1; d <= DAYS; d++) {
      const base = byDay.get(d);
      const id = targetId(c, d);
      const ref = db.collection(TARGET_COLLECTION).doc(id);

      const payload = { ...base, cycle: c, day: d };

      batch.set(ref, payload, { merge: true });
      batchCount++;
      total++;

      if (batchCount >= 450) await commitBatch();
    }
  }
  await commitBatch();

  console.log(`[DONE] Total: ${total}`);
  console.log("Exemplos:", targetId(1, 1), targetId(1, 30), targetId(12, 1), targetId(12, 30));
}

main().catch((e) => {
  console.error("[seed-cycles-admin] erro:", e);
  process.exit(1);
});
