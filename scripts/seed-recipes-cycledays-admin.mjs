import admin from "firebase-admin";

const TARGET_COLLECTION = process.env.TARGET_COLLECTION || "cycleDays";
const CYCLES = Number(process.env.CYCLES || 12);
const DAYS = Number(process.env.DAYS || 30);
const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "true";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function idFor(cycle, day) {
  return `c${pad2(cycle)}_d${pad2(day)}`;
}

// PRNG determinístico (mesma entrada = mesmo cardápio)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
function pickN(rng, arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// Pools “vendáveis” (nome + preparo curto)
const POOLS = {
  cafe: [
    "Omelete de queijo + tomate (10min)",
    "Crepioca de frango (10min)",
    "Iogurte natural + granola caseira + morango",
    "Panqueca de banana (sem açúcar) (12min)",
    "Pão integral + pasta de atum",
    "Cuscuz com ovos mexidos (12min)",
    "Overnight oats (aveia + iogurte + fruta)",
    "Tapioca com queijo + orégano (8min)",
    "Smoothie proteico (banana + iogurte + cacau)",
    "Ovos cozidos + fruta + café sem açúcar",
    "Café com leite + sanduíche de queijo branco",
    "Bowl de frutas + chia + iogurte",
    "Mingau de aveia com canela (10min)",
    "Pão de queijo fit de frigideira (12min)",
    "Café da manhã salgado: queijo + peito de peru + fruta",
  ],
  almoco: [
    "Frango ao molho mostarda + legumes (20min)",
    "Strogonoff fit de frango (20min)",
    "Carne moída com abobrinha + arroz (25min)",
    "Tilápia assada + purê de mandioquinha (25min)",
    "Bowl mexicano: frango + feijão + salada (15min)",
    "Omelete completa + salada + batata doce (20min)",
    "Frango desfiado cremoso + arroz + salada",
    "Picadinho magro + legumes + arroz (25min)",
    "Macarrão integral ao molho de tomate + frango",
    "Escondidinho fit de frango (30min)",
    "Hambúrguer caseiro + salada + arroz (25min)",
    "Frango grelhado + farofa de cenoura + salada",
    "Panela única: arroz + frango + legumes (30min)",
    "Salada completa (frango/atum + grãos) (15min)",
    "Almôndegas assadas + arroz + salada (30min)",
    "Frango na airfryer + legumes (18min)",
    "Carne de panela magra + legumes (35min)",
    "Peixe na manteiga de alho + salada (20min)",
  ],
  lanche: [
    "Iogurte + fruta + castanhas (porção)",
    "Sanduíche integral pequeno (queijo + tomate)",
    "Pão integral + pasta de amendoim (1 colher)",
    "Queijo + fruta (combo rápido)",
    "Tapioca pequena de queijo (8min)",
    "Vitamina de banana (sem açúcar)",
    "Mix de castanhas (30g)",
    "Ovo cozido + fruta",
    "Pipoca sem óleo (porção) + chá",
    "Biscoito de arroz + requeijão light",
    "Panqueca rápida de banana (12min)",
    "Cottage + mel (1 colher) + fruta",
  ],
  besteirinhas: [
    "Gelatina zero + chá",
    "Chocolate 70% (1–2 quadradinhos)",
    "Picolé caseiro de fruta (sem açúcar)",
    "Pipoca na panela sem óleo (porção pequena)",
    "Iogurte com cacau (sem açúcar)",
    "Doce fit: banana com canela (airfryer 8min)",
    "Bolo de caneca fit (porção controlada)",
    "Cookies de aveia (2 unidades pequenas)",
  ],
  janta: [
    "Sopa de legumes + frango desfiado (25min)",
    "Omelete + salada (15min)",
    "Salada completa + atum (10min)",
    "Panqueca de frango (20min)",
    "Caldo verde fit (com couve e frango) (30min)",
    "Wrap integral de frango + salada",
    "Frango desfiado + legumes salteados (15min)",
    "Peixe grelhado + salada (20min)",
    "Crepioca recheada + salada (12min)",
    "Legumes ao forno + proteína (30min)",
    "Sopa cremosa de abóbora + frango (25min)",
    "Jantar rápido: sanduíche integral + salada",
  ],
  tips: [
    "Meta do dia: 2L de água (ajuste conforme sua rotina).",
    "Caminhada 10–15 min após uma refeição melhora consistência.",
    "Priorize proteína em todas as refeições (saciedade).",
    "Evite bebidas açucaradas (refrigerante/suco).",
    "Sono é parte do resultado: tente dormir no mesmo horário.",
  ],
};

// Temas por ciclo (só pra dar cara premium)
const THEMES = {
  1: "Tradicional Fit",
  2: "Low Carb Inteligente",
  3: "Airfryer & Praticidade",
  4: "Rápidas 10–15 min",
  5: "Reeducação Econômica",
  6: "Alta Proteína",
  7: "Sem Lactose",
  8: "Leve & Digestivo",
  9: "Sem Glúten (adaptável)",
  10: "Mediterrânea Fit",
  11: "Pratos Únicos",
  12: "Definição (controle de porção)",
};

function buildMeals(cycle, day) {
  // seed baseado em ciclo/dia para ser determinístico
  const seed = cycle * 1000 + day * 17;
  const rng = mulberry32(seed);

  // 1 receita por refeição, com variedade controlada
  const cafe = [pick(rng, POOLS.cafe)];
  const almoco = [pick(rng, POOLS.almoco)];
  const lanche = [pick(rng, POOLS.lanche)];
  const besteirinhas = [pick(rng, POOLS.besteirinhas)];
  const janta = [pick(rng, POOLS.janta)];

  // dicas: 2 por dia
  const tips = pickN(rng, POOLS.tips, 2);

  return { cafe, almoco, lanche, besteirinhas, janta, tips };
}

async function main() {
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();

  console.log("[seed-recipes] Target:", TARGET_COLLECTION);
  console.log("[seed-recipes] Cycles:", CYCLES, "Days:", DAYS, "DryRun:", DRY_RUN);

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
      const docId = idFor(c, d);
      const ref = db.collection(TARGET_COLLECTION).doc(docId);

      const theme = THEMES[c] || "Plano Fit";
      const meals = buildMeals(c, d);

      const payload = {
        title: `Dia ${d} — ${theme}`,
        meals: {
          cafe: meals.cafe,
          almoco: meals.almoco,
          lanche: meals.lanche,
          besteirinhas: meals.besteirinhas,
          janta: meals.janta,
        },
        tips: meals.tips,
      };

      batch.set(ref, payload, { merge: true });
      batchCount++;
      total++;

      if (batchCount >= 450) await commitBatch();
    }
  }

  await commitBatch();
  console.log(`[DONE] Total: ${total}`);
  console.log("Exemplo:", idFor(5, 25), idFor(6, 1));
}

main().catch((e) => {
  console.error("[seed-recipes] erro:", e);
  process.exit(1);
});
