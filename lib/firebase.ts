import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 🔐 AUTH COM PERSISTÊNCIA EXPLÍCITA (CRÍTICO NA VERCEL)
export const auth =
  typeof window !== "undefined"
    ? initializeAuth(app, {
        persistence: browserLocalPersistence,
      })
    : getAuth(app);

// 🔥 FIRESTORE COM LONG POLLING
export const db =
  typeof window !== "undefined"
    ? initializeFirestore(app, {
        experimentalForceLongPolling: true,
      })
    : getFirestore(app);
