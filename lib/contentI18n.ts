import type { Language } from "@/lib/i18n";

type Meals = {
  cafe: string[];
  almoco: string[];
  lanche: string[];
  besteirinhas: string[];
  janta: string[];
};

export type LocalizableDayDoc = {
  cycle?: number;
  day: number;
  isVip?: boolean;
  title: string;
  workout?: string[];
  meals: Meals;
  tips?: string[];
  i18n?: Partial<Record<Exclude<Language, "pt">, Partial<{
    title: string;
    workout: string[];
    meals: Partial<Meals>;
    tips: string[];
  }>>>;
};

type ContentLanguage = Exclude<Language, "pt">;

const themes: Record<string, Record<ContentLanguage, string>> = {
  "tradicional fit": { en: "Traditional Fit", es: "Tradicional Fit" },
  "low carb inteligente": { en: "Smart Low Carb", es: "Low Carb Inteligente" },
  "airfryer & praticidade": { en: "Airfryer & Practical", es: "Airfryer y Practico" },
  "rapidas 10-15 min": { en: "Quick 10-15 min", es: "Rapidas 10-15 min" },
  "reeducacao economica": { en: "Budget Food Reeducation", es: "Reeducacion Economica" },
  "alta proteina": { en: "High Protein", es: "Alta Proteina" },
  "sem lactose": { en: "Lactose Free", es: "Sin Lactosa" },
  "leve & digestivo": { en: "Light & Digestive", es: "Leve y Digestivo" },
  "sem gluten (adaptavel)": { en: "Gluten Free (adaptable)", es: "Sin Gluten (adaptable)" },
  "mediterranea fit": { en: "Mediterranean Fit", es: "Mediterranea Fit" },
  "pratos unicos": { en: "One-Dish Meals", es: "Platos Unicos" },
  "definicao (controle de porcao)": { en: "Definition (portion control)", es: "Definicion (control de porcion)" },
  "barriga seca": { en: "Barriga Seca", es: "Barriga Seca" },
};

const content: Record<string, Record<ContentLanguage, string>> = {
  "aquecimento 3 min (polichinelo leve)": { en: "3 min warm-up (light jumping jacks)", es: "Calentamiento 3 min (jumping jacks leves)" },
  "aquecimento 3 min (caminhada no lugar)": { en: "3 min warm-up (marching in place)", es: "Calentamiento 3 min (caminar en el lugar)" },
  "agachamento 3x12": { en: "Squat 3x12", es: "Sentadilla 3x12" },
  "agachamento 4x10": { en: "Squat 4x10", es: "Sentadilla 4x10" },
  "polichinelo 3x30s": { en: "Jumping jacks 3x30s", es: "Jumping jacks 3x30s" },
  "prancha 3x30s": { en: "Plank 3x30s", es: "Plancha 3x30s" },
  "prancha 3x40s": { en: "Plank 3x40s", es: "Plancha 3x40s" },
  "prancha lateral 3x20s": { en: "Side plank 3x20s", es: "Plancha lateral 3x20s" },
  "alongamento 2 min": { en: "Stretching 2 min", es: "Estiramiento 2 min" },
  "caminhada 15 min": { en: "15 min walk", es: "Caminata 15 min" },
  "abdominal 3x15": { en: "Abs 3x15", es: "Abdominales 3x15" },
  "abdominal curto 3x12": { en: "Short crunch 3x12", es: "Abdominal corto 3x12" },
  "afundo 3x10 (cada perna)": { en: "Lunges 3x10 (each leg)", es: "Zancadas 3x10 (cada pierna)" },
  "elevacao pelvica 3x12": { en: "Glute bridge 3x12", es: "Elevacion pelvica 3x12" },
  "hiit leve 10 min": { en: "Light HIIT 10 min", es: "HIIT leve 10 min" },

  "omelete de queijo + tomate (10min)": { en: "Cheese and tomato omelet (10min)", es: "Omelet de queso + tomate (10min)" },
  "crepioca de frango (10min)": { en: "Chicken crepioca (10min)", es: "Crepioca de pollo (10min)" },
  "iogurte natural + granola caseira + morango": { en: "Natural yogurt + homemade granola + strawberry", es: "Yogur natural + granola casera + fresa" },
  "iogurte natural + granola + fruta": { en: "Natural yogurt + granola + fruit", es: "Yogur natural + granola + fruta" },
  "panqueca de banana (sem acucar) (12min)": { en: "Banana pancake (no sugar) (12min)", es: "Panqueque de banana (sin azucar) (12min)" },
  "panqueca de banana (12min)": { en: "Banana pancake (12min)", es: "Panqueque de banana (12min)" },
  "pao integral + pasta de atum": { en: "Whole-grain bread + tuna spread", es: "Pan integral + pasta de atun" },
  "cuscuz com ovos mexidos (12min)": { en: "Couscous with scrambled eggs (12min)", es: "Cuscus con huevos revueltos (12min)" },
  "overnight oats (aveia + iogurte + fruta)": { en: "Overnight oats (oats + yogurt + fruit)", es: "Overnight oats (avena + yogur + fruta)" },
  "tapioca com queijo + oregano (8min)": { en: "Tapioca with cheese + oregano (8min)", es: "Tapioca con queso + oregano (8min)" },
  "smoothie proteico (banana + iogurte + cacau)": { en: "Protein smoothie (banana + yogurt + cocoa)", es: "Smoothie proteico (banana + yogur + cacao)" },
  "ovos cozidos + fruta + cafe sem acucar": { en: "Boiled eggs + fruit + unsweetened coffee", es: "Huevos cocidos + fruta + cafe sin azucar" },
  "cafe com leite + sanduiche de queijo branco": { en: "Coffee with milk + white cheese sandwich", es: "Cafe con leche + sandwich de queso blanco" },
  "bowl de frutas + chia + iogurte": { en: "Fruit bowl + chia + yogurt", es: "Bowl de frutas + chia + yogur" },
  "mingau de aveia com canela (10min)": { en: "Oatmeal porridge with cinnamon (10min)", es: "Avena cocida con canela (10min)" },
  "pao de queijo fit de frigideira (12min)": { en: "Skillet fit cheese bread (12min)", es: "Pan de queso fit en sarten (12min)" },
  "cafe da manha salgado: queijo + peito de peru + fruta": { en: "Savory breakfast: cheese + turkey breast + fruit", es: "Desayuno salado: queso + pechuga de pavo + fruta" },

  "frango ao molho mostarda + legumes (20min)": { en: "Chicken with mustard sauce + vegetables (20min)", es: "Pollo con salsa de mostaza + verduras (20min)" },
  "frango ao molho + legumes (20min)": { en: "Chicken with sauce + vegetables (20min)", es: "Pollo con salsa + verduras (20min)" },
  "strogonoff fit de frango (20min)": { en: "Fit chicken stroganoff (20min)", es: "Strogonoff fit de pollo (20min)" },
  "carne moida com abobrinha + arroz (25min)": { en: "Ground beef with zucchini + rice (25min)", es: "Carne molida con calabacin + arroz (25min)" },
  "tilapia assada + pure de mandioquinha (25min)": { en: "Baked tilapia + parsnip puree (25min)", es: "Tilapia al horno + pure de mandioquinha (25min)" },
  "tilapia assada + pure (25min)": { en: "Baked tilapia + puree (25min)", es: "Tilapia al horno + pure (25min)" },
  "bowl mexicano: frango + feijao + salada (15min)": { en: "Mexican bowl: chicken + beans + salad (15min)", es: "Bowl mexicano: pollo + frijoles + ensalada (15min)" },
  "omelete completa + salada + batata doce (20min)": { en: "Complete omelet + salad + sweet potato (20min)", es: "Omelet completo + ensalada + batata dulce (20min)" },
  "frango desfiado cremoso + arroz + salada": { en: "Creamy shredded chicken + rice + salad", es: "Pollo desmenuzado cremoso + arroz + ensalada" },
  "picadinho magro + legumes + arroz (25min)": { en: "Lean beef stew + vegetables + rice (25min)", es: "Picadillo magro + verduras + arroz (25min)" },
  "macarrao integral ao molho de tomate + frango": { en: "Whole-wheat pasta with tomato sauce + chicken", es: "Pasta integral con salsa de tomate + pollo" },
  "escondidinho fit de frango (30min)": { en: "Fit chicken escondidinho (30min)", es: "Escondidinho fit de pollo (30min)" },
  "hamburguer caseiro + salada + arroz (25min)": { en: "Homemade burger + salad + rice (25min)", es: "Hamburguesa casera + ensalada + arroz (25min)" },
  "frango grelhado + farofa de cenoura + salada": { en: "Grilled chicken + carrot farofa + salad", es: "Pollo a la parrilla + farofa de zanahoria + ensalada" },
  "panela unica: arroz + frango + legumes (30min)": { en: "One-pot meal: rice + chicken + vegetables (30min)", es: "Olla unica: arroz + pollo + verduras (30min)" },
  "salada completa (frango/atum + graos) (15min)": { en: "Complete salad (chicken/tuna + grains) (15min)", es: "Ensalada completa (pollo/atun + granos) (15min)" },
  "salada completa + proteina (15min)": { en: "Complete salad + protein (15min)", es: "Ensalada completa + proteina (15min)" },
  "almondegas assadas + arroz + salada (30min)": { en: "Baked meatballs + rice + salad (30min)", es: "Albondigas al horno + arroz + ensalada (30min)" },
  "frango na airfryer + legumes (18min)": { en: "Airfryer chicken + vegetables (18min)", es: "Pollo en airfryer + verduras (18min)" },
  "carne de panela magra + legumes (35min)": { en: "Lean pot beef + vegetables (35min)", es: "Carne de olla magra + verduras (35min)" },
  "peixe na manteiga de alho + salada (20min)": { en: "Fish in garlic butter + salad (20min)", es: "Pescado en mantequilla de ajo + ensalada (20min)" },

  "iogurte + fruta + castanhas (porcao)": { en: "Yogurt + fruit + nuts (portion)", es: "Yogur + fruta + castanas (porcion)" },
  "sanduiche integral pequeno (queijo + tomate)": { en: "Small whole-grain sandwich (cheese + tomato)", es: "Sandwich integral pequeno (queso + tomate)" },
  "pao integral + pasta de amendoim (1 colher)": { en: "Whole-grain bread + peanut butter (1 spoon)", es: "Pan integral + pasta de mani (1 cuchara)" },
  "queijo + fruta (combo rapido)": { en: "Cheese + fruit (quick combo)", es: "Queso + fruta (combo rapido)" },
  "tapioca pequena de queijo (8min)": { en: "Small cheese tapioca (8min)", es: "Tapioca pequena de queso (8min)" },
  "vitamina de banana (sem acucar)": { en: "Banana smoothie (no sugar)", es: "Batido de banana (sin azucar)" },
  "mix de castanhas (30g)": { en: "Mixed nuts (30g)", es: "Mix de castanas (30g)" },
  "ovo cozido + fruta": { en: "Boiled egg + fruit", es: "Huevo cocido + fruta" },
  "pipoca sem oleo (porcao) + cha": { en: "Oil-free popcorn (portion) + tea", es: "Palomitas sin aceite (porcion) + te" },
  "biscoito de arroz + requeijao light": { en: "Rice cracker + light cream cheese", es: "Galleta de arroz + queso crema light" },
  "panqueca rapida de banana (12min)": { en: "Quick banana pancake (12min)", es: "Panqueque rapido de banana (12min)" },
  "cottage + mel (1 colher) + fruta": { en: "Cottage cheese + honey (1 spoon) + fruit", es: "Cottage + miel (1 cuchara) + fruta" },

  "gelatina zero + cha": { en: "Zero-sugar gelatin + tea", es: "Gelatina zero + te" },
  "chocolate 70% (1-2 quadradinhos)": { en: "70% chocolate (1-2 small squares)", es: "Chocolate 70% (1-2 cuadritos)" },
  "picole caseiro de fruta (sem acucar)": { en: "Homemade fruit popsicle (no sugar)", es: "Paleta casera de fruta (sin azucar)" },
  "pipoca na panela sem oleo (porcao pequena)": { en: "Oil-free stovetop popcorn (small portion)", es: "Palomitas en olla sin aceite (porcion pequena)" },
  "pipoca sem oleo (porcao pequena)": { en: "Oil-free popcorn (small portion)", es: "Palomitas sin aceite (porcion pequena)" },
  "iogurte com cacau (sem acucar)": { en: "Yogurt with cocoa (no sugar)", es: "Yogur con cacao (sin azucar)" },
  "doce fit: banana com canela (airfryer 8min)": { en: "Fit sweet: banana with cinnamon (airfryer 8min)", es: "Dulce fit: banana con canela (airfryer 8min)" },
  "banana com canela (airfryer 8min)": { en: "Banana with cinnamon (airfryer 8min)", es: "Banana con canela (airfryer 8min)" },
  "bolo de caneca fit (porcao controlada)": { en: "Fit mug cake (controlled portion)", es: "Mug cake fit (porcion controlada)" },
  "cookies de aveia (2 unidades pequenas)": { en: "Oat cookies (2 small units)", es: "Cookies de avena (2 unidades pequenas)" },

  "sopa de legumes + frango desfiado (25min)": { en: "Vegetable soup + shredded chicken (25min)", es: "Sopa de verduras + pollo desmenuzado (25min)" },
  "sopa de legumes + frango (25min)": { en: "Vegetable soup + chicken (25min)", es: "Sopa de verduras + pollo (25min)" },
  "omelete + salada (15min)": { en: "Omelet + salad (15min)", es: "Omelet + ensalada (15min)" },
  "salada completa + atum (10min)": { en: "Complete salad + tuna (10min)", es: "Ensalada completa + atun (10min)" },
  "salada + atum (10min)": { en: "Salad + tuna (10min)", es: "Ensalada + atun (10min)" },
  "panqueca de frango (20min)": { en: "Chicken pancake (20min)", es: "Panqueque de pollo (20min)" },
  "caldo verde fit (com couve e frango) (30min)": { en: "Fit caldo verde (kale and chicken) (30min)", es: "Caldo verde fit (con col y pollo) (30min)" },
  "wrap integral de frango + salada": { en: "Whole-grain chicken wrap + salad", es: "Wrap integral de pollo + ensalada" },
  "frango desfiado + legumes salteados (15min)": { en: "Shredded chicken + sauteed vegetables (15min)", es: "Pollo desmenuzado + verduras salteadas (15min)" },
  "peixe grelhado + salada (20min)": { en: "Grilled fish + salad (20min)", es: "Pescado a la parrilla + ensalada (20min)" },
  "crepioca recheada + salada (12min)": { en: "Stuffed crepioca + salad (12min)", es: "Crepioca rellena + ensalada (12min)" },
  "legumes ao forno + proteina (30min)": { en: "Baked vegetables + protein (30min)", es: "Verduras al horno + proteina (30min)" },
  "sopa cremosa de abobora + frango (25min)": { en: "Creamy pumpkin soup + chicken (25min)", es: "Sopa cremosa de calabaza + pollo (25min)" },
  "jantar rapido: sanduiche integral + salada": { en: "Quick dinner: whole-grain sandwich + salad", es: "Cena rapida: sandwich integral + ensalada" },

  "meta do dia: 2l de agua (ajuste conforme sua rotina).": { en: "Daily goal: 2L of water (adjust to your routine).", es: "Meta del dia: 2L de agua (ajusta segun tu rutina)." },
  "meta do dia: agua + consistencia.": { en: "Daily goal: water + consistency.", es: "Meta del dia: agua + consistencia." },
  "caminhada 10-15 min apos uma refeicao melhora consistencia.": { en: "A 10-15 min walk after a meal improves consistency.", es: "Una caminata de 10-15 min despues de una comida mejora la consistencia." },
  "caminhada leve pos-refeicao se possivel.": { en: "Light walk after a meal if possible.", es: "Caminata leve despues de comer si es posible." },
  "priorize proteina em todas as refeicoes (saciedade).": { en: "Prioritize protein in every meal (satiety).", es: "Prioriza proteina en todas las comidas (saciedad)." },
  "evite bebidas acucaradas (refrigerante/suco).": { en: "Avoid sugary drinks (soda/juice).", es: "Evita bebidas azucaradas (refresco/jugo)." },
  "sono e parte do resultado: tente dormir no mesmo horario.": { en: "Sleep is part of the result: try to sleep at the same time.", es: "El sueno es parte del resultado: intenta dormir al mismo horario." },
  "beba agua ao longo do dia.": { en: "Drink water throughout the day.", es: "Bebe agua durante el dia." },
  "evite acucar liquido (refrigerante/suco).": { en: "Avoid liquid sugar (soda/juice).", es: "Evita azucar liquida (refresco/jugo)." },
  "caminhe 10-15 min se puder.": { en: "Walk 10-15 min if you can.", es: "Camina 10-15 min si puedes." },

  "ovos mexidos": { en: "Scrambled eggs", es: "Huevos revueltos" },
  "cafe sem acucar": { en: "Unsweetened coffee", es: "Cafe sin azucar" },
  "1 fruta": { en: "1 fruit", es: "1 fruta" },
  "arroz": { en: "Rice", es: "Arroz" },
  "feijao": { en: "Beans", es: "Frijoles" },
  "frango grelhado": { en: "Grilled chicken", es: "Pollo a la parrilla" },
  "salada a vontade": { en: "Salad as desired", es: "Ensalada libre" },
  "fruta": { en: "Fruit", es: "Fruta" },
  "iogurte natural": { en: "Natural yogurt", es: "Yogur natural" },
  "gelatina zero": { en: "Zero-sugar gelatin", es: "Gelatina zero" },
  "cha sem acucar": { en: "Unsweetened tea", es: "Te sin azucar" },
  "sopa leve + proteina": { en: "Light soup + protein", es: "Sopa leve + proteina" },
  "agua": { en: "Water", es: "Agua" },
};

function keyFor(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[×–—]/g, (char) => (char === "×" ? "x" : "-"))
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function translateContentText(value: string, language: Language) {
  if (language === "pt") return value;

  const normalized = keyFor(value);
  const dayMatch = normalized.match(/^dia\s+(\d+)\s+-\s+(.+)$/);
  if (dayMatch) {
    const translatedTheme = themes[dayMatch[2]]?.[language] ?? value.replace(/^Dia\s+\d+\s+[-—]\s+/i, "");
    return `${language === "en" ? "Day" : "Dia"} ${dayMatch[1]} - ${translatedTheme}`;
  }

  return content[normalized]?.[language] ?? value;
}

function translateList(items: string[] | undefined, language: Language) {
  return (items ?? []).map((item) => translateContentText(item, language));
}

export function localizeDayPlan(dayPlan: LocalizableDayDoc, language: Language): LocalizableDayDoc {
  if (language === "pt") return dayPlan;

  const remote = dayPlan.i18n?.[language];

  return {
    ...dayPlan,
    title: remote?.title ?? translateContentText(dayPlan.title, language),
    workout: remote?.workout ?? translateList(dayPlan.workout, language),
    meals: {
      cafe: remote?.meals?.cafe ?? translateList(dayPlan.meals?.cafe, language),
      almoco: remote?.meals?.almoco ?? translateList(dayPlan.meals?.almoco, language),
      lanche: remote?.meals?.lanche ?? translateList(dayPlan.meals?.lanche, language),
      besteirinhas: remote?.meals?.besteirinhas ?? translateList(dayPlan.meals?.besteirinhas, language),
      janta: remote?.meals?.janta ?? translateList(dayPlan.meals?.janta, language),
    },
    tips: remote?.tips ?? translateList(dayPlan.tips, language),
  };
}
