"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth } from "../../lib/firebase";

type Mode = "login" | "register";

// ✅ Firestore client (sem depender de export no lib/firebase)
function getDb() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  };

  // fail-fast
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    throw new Error(
      "ENV do Firebase ausente. Verifique .env.local: NEXT_PUBLIC_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID"
    );
  }

  if (!getApps().length) initializeApp(firebaseConfig);
  return getFirestore();
}

async function upsertUserProfile(u: User) {
  const db = getDb();
  const ref = doc(db, "users", u.uid);

  await setDoc(
    ref,
    {
      uid: u.uid,
      email: u.email ?? null,
      vip: false,
      vipUntil: null,
      stripeCustomerId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const em = email.trim().toLowerCase();

      let user: User;

      if (mode === "register") {
        if (password.length < 6) throw new Error("Senha mínima: 6 caracteres");
        if (password !== confirm) throw new Error("As senhas não conferem");
        const cred = await createUserWithEmailAndPassword(auth, em, password);
        user = cred.user;
      } else {
        const cred = await signInWithEmailAndPassword(auth, em, password);
        user = cred.user;
      }

      // ✅ cria/atualiza perfil no Firestore
      await upsertUserProfile(user);

      // ✅ fluxo principal do produto
      router.push("/free");
    } catch (err: any) {
      setError(err?.message ?? "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 420, margin: "60px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
        Seja membro VIP
      </h1>

      <p style={{ marginBottom: 24, color: "#555" }}>
        Entre para acessar o calendário completo, treinos e receitas.
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
        <label>
          <strong>E-mail</strong>
          <input
            type="email"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </label>

        <label>
          <strong>Senha</strong>
          <input
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </label>

        {mode === "register" && (
          <label>
            <strong>Confirmar senha</strong>
            <input
              type="password"
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />
          </label>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 10,
            padding: 14,
            borderRadius: 12,
            border: 0,
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            background: "#111",
            color: "#fff",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Processando..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>

        {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
      </form>

      {/* Ação secundária */}
      <div style={{ marginTop: 18, textAlign: "center" }}>
        {mode === "login" ? (
          <button
            onClick={() => setMode("register")}
            style={{
              background: "none",
              border: 0,
              color: "#111",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Criar conta
          </button>
        ) : (
          <button
            onClick={() => setMode("login")}
            style={{
              background: "none",
              border: 0,
              color: "#111",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Já tenho conta
          </button>
        )}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center" }}>
        <a
          href="/free"
          style={{
            display: "inline-block",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
            fontWeight: 800,
            textDecoration: "none",
            color: "#111",
          }}
        >
          Área grátis
        </a>
        <a
          href="/vip"
          style={{
            display: "inline-block",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #111",
            fontWeight: 800,
            textDecoration: "none",
            color: "#fff",
            background: "#111",
          }}
        >
          Ver VIP
        </a>
      </div>
    </main>
  );
}
