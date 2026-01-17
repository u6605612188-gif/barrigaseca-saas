import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.warn("[Firebase] NEXT_PUBLIC_FIREBASE_* ausentes/invalidas.", {
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain,
    hasProjectId: !!firebaseConfig.projectId,
    hasAppId: !!firebaseConfig.appId,
  });
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// ✅ Persistência estável (evita initializeAuth em ambiente Next/Vercel)
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((e) => {
    console.warn("[Firebase] setPersistence falhou:", e?.code || e?.message || e);
  });
}

// ✅ Firestore mais resiliente no browser
export const db =
  typeof window !== "undefined"
    ? initializeFirestore(app, { experimentalForceLongPolling: true })
    : getFirestore(app);
