import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.warn("[Firebase] Variáveis NEXT_PUBLIC_FIREBASE_* ausentes/invalidas.");
}

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Evita inicialização duplicada do Firestore no client (hot reload / múltiplos imports)
let _db: Firestore | null = null;

export const db: Firestore = (() => {
  if (_db) return _db;

  // ✅ IMPORTANTe: use APENAS UM dos flags. Aqui vamos manter ForceLongPolling.
  // Se existir algum lugar no projeto usando experimentalAutoDetectLongPolling,
  // ele precisa ser removido (senão dá conflito).
  if (typeof window !== "undefined") {
    _db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } else {
    _db = getFirestore(app);
  }

  return _db;
})();
