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
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  defaultLanguage,
  isLanguage,
  languages,
  translations,
  type Language,
} from "@/lib/i18n";

function formatErr(e: unknown) {
  const msg =
    typeof e === "object" && e && "message" in e ? String((e as any).message) : String(e);
  const code =
    typeof e === "object" && e && "code" in e ? String((e as any).code) : "";
  return code ? `${code}: ${msg}` : msg;
}

function friendlyAuthError(raw: string, t: (typeof translations)[Language]["login"]["errors"]) {
  if (raw.includes("auth/unauthorized-domain")) return t.unauthorizedDomain;
  if (raw.includes("auth/invalid-email")) return t.invalidEmail;
  if (raw.includes("auth/user-not-found")) return t.userNotFound;
  if (raw.includes("auth/wrong-password")) return t.wrongPassword;
  if (raw.includes("auth/too-many-requests")) return t.tooManyRequests;
  if (raw.includes("auth/email-already-in-use")) return t.emailAlreadyInUse;
  if (raw.includes("auth/weak-password")) return t.weakPassword;
  if (raw.includes("auth/invalid-credential")) return t.invalidCredential;
  return raw;
}

async function ensureUserDoc(u: User) {
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);

  const email = (u.email ?? "").toLowerCase();

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: u.uid,
      email,
      vip: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(ref, {
    email,
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });
}

export default function LoginPage() {
  const router = useRouter();

  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const t = translations[language].login;

  const [loading, setLoading] = useState(true);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("barrigaseca-language");
    if (isLanguage(savedLanguage)) setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("barrigaseca-language", language);
  }, [language]);

  useEffect(() => {
    mountedRef.current = true;

    const unsub = onAuthStateChanged(auth, async (u: User | null) => {
      if (!mountedRef.current) return;

      if (u) {
        try {
          await ensureUserDoc(u);
        } catch (e) {
          setError(friendlyAuthError(formatErr(e), t.errors));
        }

        setAuthedEmail(u.email ?? null);
        const nextPath = window.sessionStorage.getItem("barrigaseca-new-user") === "1" ? "/onboarding" : "/app";
        router.replace(nextPath);
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
  }, [router, t.errors]);

  const subtitle = useMemo(() => {
    if (loading) return t.loading;
    if (authedEmail) return `${t.loggedAs} ${authedEmail}`;
    return mode === "login" ? t.loginSubtitle : t.registerSubtitle;
  }, [loading, authedEmail, mode, t]);

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);

    const em = email.trim();
    const pw = password;
    const cpw = confirmPassword;

    if (!em) return setError(t.validation.emailRequired);
    if (!pw || pw.length < 6) return setError(t.validation.passwordRequired);
    if (mode === "register" && !cpw) return setError(t.validation.repeatPassword);
    if (mode === "register" && pw !== cpw) return setError(t.validation.passwordMismatch);

    try {
      setSubmitting(true);
      const isRegister = mode === "register";
      if (isRegister) window.sessionStorage.setItem("barrigaseca-new-user", "1");

      timeoutRef.current = window.setTimeout(() => {
        if (!mountedRef.current) return;
        setSubmitting(false);
        setError(t.validation.timeout);
      }, 12000);

      let user: User | null = null;

      if (mode === "login") {
        const cred = await signInWithEmailAndPassword(auth, em, pw);
        user = cred.user;
      } else {
        const cred = await createUserWithEmailAndPassword(auth, em, pw);
        user = cred.user;
      }

      if (user) await ensureUserDoc(user);

      router.replace(isRegister ? "/onboarding" : "/app");
    } catch (e2) {
      const raw = formatErr(e2);
      setError(friendlyAuthError(raw, t.errors));
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
      setError(friendlyAuthError(formatErr(e), t.errors));
    }
  }

  if (loading) {
    return <main style={{ padding: 32 }}>{t.loading}</main>;
  }

  return (
    <main style={styles.page}>
      <div style={styles.bg} aria-hidden />
      <div style={styles.shell}>
        <section style={styles.card}>
          <div style={styles.topRow}>
            <div style={styles.badge}>{t.brand}</div>
            <div style={styles.languageGroup} aria-label="Language">
              {languages.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => changeLanguage(item.code)}
                  style={{
                    ...styles.languageButton,
                    ...(language === item.code ? styles.languageButtonActive : null),
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <h1 style={styles.h1}>{mode === "login" ? t.loginTitle : t.registerTitle}</h1>
          <p style={styles.sub}>{subtitle}</p>

          {error && (
            <div style={styles.errorBox}>
              <div style={{ fontWeight: 950, marginBottom: 6 }}>{t.errorTitle}</div>
              <div style={{ fontWeight: 800, color: "#444", lineHeight: 1.5 }}>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <label style={styles.label}>
              {t.email}
              <input
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                type="email"
                placeholder={t.emailPlaceholder}
                style={styles.input}
                autoComplete="email"
              />
            </label>

            <label style={styles.label}>
              {t.password}
              <input
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                type="password"
                placeholder={t.passwordPlaceholder}
                style={styles.input}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>

            {mode === "register" && (
              <label style={styles.label}>
                {t.repeatPassword}
                <input
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  type="password"
                  placeholder={t.passwordPlaceholder}
                  style={styles.input}
                  autoComplete="new-password"
                />
              </label>
            )}

            <button type="submit" disabled={submitting} style={styles.btnPrimary}>
              {submitting
                ? t.processing
                : mode === "login"
                  ? t.submitLogin
                  : t.submitRegister}
            </button>
          </form>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPassword("");
                setConfirmPassword("");
                setMode((m) => (m === "login" ? "register" : "login"));
              }}
              style={styles.btnGhost}
            >
              {mode === "login" ? t.noAccount : t.hasAccount}
            </button>

            <a href="/free" style={styles.btnGhostLink}>
              {t.backCalendar}
            </a>

            <a href="/vip" style={styles.btnDarkLink}>
              {t.viewVip}
            </a>

            <button type="button" onClick={handleLogout} style={styles.btnNeutral}>
              {t.logout}
            </button>
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
    color: "#111",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
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
  languageGroup: {
    display: "inline-flex",
    gap: 6,
    padding: 4,
    borderRadius: 999,
    border: "1px solid rgba(17,17,17,0.10)",
    background: "#fff",
  },
  languageButton: {
    border: "none",
    borderRadius: 999,
    background: "transparent",
    color: "#111",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 950,
    padding: "7px 10px",
  },
  languageButtonActive: {
    background: "#111",
    color: "#fff",
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
    border: "2px solid #111",
    background: "#fff",
    color: "#111",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 0 0 1px rgba(17,17,17,0.04)",
  },
  btnNeutral: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#e9e9e9",
    fontWeight: 950,
    color: "#111",
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
};

