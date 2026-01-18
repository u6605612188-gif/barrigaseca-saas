import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

function cleanEnv(v: string | undefined) {
  return (v ?? "").replace(/\s+/g, "").trim();
}

const firebaseConfig = {
  apiKey: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  appId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.warn("[Firebase] Variáveis NEXT_PUBLIC_FIREBASE_* ausentes/invalidas.", {
    hasApiKey: Boolean(firebaseConfig.apiKey),
    hasAuthDomain: Boolean(firebaseConfig.authDomain),
    hasProjectId: Boolean(firebaseConfig.projectId),
  });
}

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);

/**
 * Firestore: SEM flags de long polling.
 * Motivo: seu erro atual é conflito entre experimentalForceLongPolling e
 * experimentalAutoDetectLongPolling (fatal no client).
 *
 * Se depois você realmente precisar de workaround de rede (Vercel/Proxy),
 * a estratégia correta é habilitar APENAS UM flag — e de forma centralizada.
 */
export const db: Firestore = getFirestore(app);
