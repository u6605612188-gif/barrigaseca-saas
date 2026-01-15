"use client";

import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/navigation";

export default function AppPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email ?? null);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  if (loading) return <main style={{ padding: 32 }}>Carregando…</main>;

  return (
    <main style={{ padding: 32, maxWidth: 900, margin: "40px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
        Área do Membro VIP
      </h1>

      <p style={{ color: "#555", marginBottom: 20 }}>
        Logado como: <strong>{email ?? "usuário"}</strong>
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a
          href="/free"
          style={{
            padding: 14,
            borderRadius: 12,
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
            padding: 14,
            borderRadius: 12,
            border: "1px solid #111",
            fontWeight: 800,
            textDecoration: "none",
            color: "#fff",
            background: "#111",
          }}
        >
          Conteúdo VIP
        </a>

        <button
          onClick={handleLogout}
          style={{
            padding: 14,
            borderRadius: 12,
            border: 0,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </div>
    </main>
  );
}
