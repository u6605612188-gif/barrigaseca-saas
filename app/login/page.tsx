"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "../../lib/firebase";

function formatErr(e: unknown) {
  const msg =
    typeof e === "object" && e && "message" in e ? String((e as any).message) : String(e);
  const code =
    typeof e === "object" && e && "code" in e ? String((e as any).code) : "";
  return code ? `${code}: ${msg}` : msg;
}

function friendlyAuthError(raw: string) {
  // mapeamento curto e objetivo (padrão corp)
  if (raw.includes("auth/unauthorized-domain"))
    return "Domínio não autorizado no Firebase (Authorized domains).";
  if (raw.includes("auth/invalid-email")) return "E-mail inválido.";
  if (raw.includes("auth/user-not-found")) return "Usuário não encontrado.";
  if (raw.includes("auth/wrong-password")) return "Senha incorreta.";
  if (raw.includes("auth/too-many-requests"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (raw.includes("auth/email-already-in-use"))
    return "Este e-mail já está cadastrado. Use “Entrar”.";
  if (raw.includes("auth/weak-password"))
    return "Senha fraca. Use no mínimo 6 caracteres.";
  return raw;
}

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const unsub = onAuthStateChanged(auth, (u: User | null) => {
      if (!mountedRef.current) return;

      if (u) {
        setAuthedEmail(u.email ?? null);
        // garante que não fica preso no login
        router.replace("/app");
        return;
      }

      setAuthedEmail(null);
      setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      unsub();
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [router]);

  const subtitle = useMemo(() => {
    if (loading) return "Carregando…";
    if (authedEmail) return `Logado como ${authedEmail}`;
    return mode === "login"
      ? "Entre para acessar a área do app e conteúdo VIP."
      : "Crie sua conta para começar.";
  }, [loading, authedEmail, mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);

    const em = email.trim();
    const pw = password;

    if (!em) return setError("Informe seu e-mail.");
    if (!pw || pw.length < 6) return setError("Informe uma senha com pelo menos 6 caracteres.");

    try {
      setSubmitting(true);

      // fail-safe: se travar por qualquer motivo, libera e informa
      timeoutRef.current = window.setTimeout(() => {
        if (!mountedRef.current) return;
        setSubmitting(false);
        setError(
          "Tempo excedido ao autenticar. Recarregue a página e tente novamente (verifique conexão)."
        );
      }, 12000);

      if (mode === "login") {
        await signInWithEmailAndPassword(auth, em, pw);
      } else {
        await createUserWithEmailAndPassword(auth, em, pw);
      }

      // Redireciona imediatamente (não depende do listener)
      router.replace("/app");
    } catch (e2) {
      const raw = formatErr(e2);
      setError(friendlyAuthError(raw));
    } finally {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      setAuthedEmail(null);
      setError(null);
      setLoading(false);
    } catch (e) {
      setError(friendlyAuthError(formatErr(e)));
    }
  }

  if (loading) {
    return <main style={{ padding: 32 }}>Carregando…</main>;
  }

  return (
    <main style={styles.page}>
      <div style={styles.bg} aria-hidden />
      <div style={styles.shell}>
        <section style={styles.card}>
          <div style={styles.badge}>Barriga Seca • Acesso</div>
          <h1 style={styles.h1}>{mode === "login" ? "Entrar" : "Criar conta"}</h1>
          <p style={styles.sub}>{subtitle}</p>

          {error && (
            <div style={styles.errorBox}>
              <div style={{ fontWeight: 950, marginBottom: 6 }}>Não foi possível continuar</div>
              <div style={{ fontWeight: 800, color: "#444", lineHeight: 1.5 }}>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <label style={styles.label}>
              E-mail
              <input
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                type="email"
                placeholder="seuemail@gmail.com"
                style={styles.input}
                autoComplete="email"
              />
            </label>

            <label style={styles.label}>
              Senha
              <input
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                type="password"
                placeholder="••••••"
                style={styles.input}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>

            <button type="submit" disabled={submitting} style={styles.btnPrimary}>
              {submitting ? "Processando…" : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode((m) => (m === "login" ? "register" : "login"));
              }}
              style={styles.btnGhost}
            >
              {mode === "login" ? "Criar conta" : "Já tenho conta"}
            </button>

            <a href="/free" style={styles.btnGhostLink}>
              Voltar pro calendário
            </a>

            <a href="/vip" style={styles.btnDarkLink}>
              Ver VIP
            </a>

            <button type="button" onClick={handleLogout} style={styles.btnNeutral}>
              Sair (se logado)
            </button>
          </div>

          <div style={styles.footerNote}>
            Auth: Email/Senha habilitado • Domínios autorizados atualizados • Se persistir, valide
            console do navegador.
          </div>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 18,
    background: "#0b0b0f",
    position: "relative",
    overflow: "hidden",
  },
  bg: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(900px 500px at 20% 25%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(900px 500px at 80% 70%, rgba(255,255,255,0.06), transparent 60%)",
    pointerEvents: "none",
  },
  shell: {
    width: "min(680px, 100%)",
    margin: "40px auto",
    position: "relative",
    zIndex: 1,
  },
  card: {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.92)",
  },
  badge: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(17,17,17,0.10)",
    background: "#fff",
    fontWeight: 950,
    fontSize: 12,
    color: "#111",
  },
  h1: {
    margin: "10px 0 6px",
    fontSize: 28,
    fontWeight: 950,
    color: "#111",
  },
  sub: {
    margin: 0,
    color: "#444",
    fontWeight: 700,
    lineHeight: 1.5,
  },
  label: {
    display: "grid",
    gap: 6,
    fontWeight: 900,
    color: "#111",
    fontSize: 13,
  },
  input: {
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(17,17,17,0.14)",
    outline: "none",
    fontWeight: 800,
  },
  btnPrimary: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#111",
    fontWeight: 950,
    color: "#fff",
    cursor: "pointer",
  },
  btnGhost: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#fff",
    fontWeight: 950,
    cursor: "pointer",
  },
  btnNeutral: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#e9e9e9",
    fontWeight: 950,
    cursor: "pointer",
  },
  btnGhostLink: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#fff",
    fontWeight: 950,
    textDecoration: "none",
    color: "#111",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDarkLink: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#111",
    fontWeight: 950,
    textDecoration: "none",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(239,68,68,0.30)",
    background: "rgba(239,68,68,0.08)",
  },
  footerNote: {
    marginTop: 12,
    fontSize: 12,
    color: "#666",
    fontWeight: 700,
    lineHeight: 1.5,
  },
};
