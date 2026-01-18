import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

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

// Firestore: força transporte compatível (resolve “client is offline” em redes/proxies/extensões)
export const db =
  typeof window !== "undefined"
    ? initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        experimentalForceLongPolling: true,
      })
    : getFirestore(app);
