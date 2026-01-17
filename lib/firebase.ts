import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.warn("[Firebase] Variáveis NEXT_PUBLIC_FIREBASE_* ausentes/invalidas.");
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

/**
 * Firestore singleton (evita recriar instância no client e dar "offline" / handshake).
 */
let _db: Firestore | null = null;

export const db: Firestore = (() => {
  // Server: usar getFirestore normal
  if (typeof window === "undefined") {
    return getFirestore(app);
  }

  // Client: reutilizar instância
  if (_db) return _db;

  _db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });

  return _db;
})();
