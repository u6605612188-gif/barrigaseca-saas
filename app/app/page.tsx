"use client";

import MobileNav from "@/components/MobileNav";
import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import {
  defaultLanguage,
  isLanguage,
  languages,
  translations,
  type Language,
} from "@/lib/i18n";

type UserProfile = {
  vip?: boolean;
  vipUntil?: any;
};

function isVipFromProfile(data: UserProfile) {
  if (data?.vip === true) return true;

  const until = (data as any)?.vipUntil;
  if (until && typeof until?.seconds === "number") {
    return until.seconds * 1000 > Date.now();
  }

  return false;
}

export default function AppPage() {
  const router = useRouter();

  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const t = translations[language].member;

  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [vipLoading, setVipLoading] = useState(true);
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("barrigaseca-language");
    if (isLanguage(savedLanguage)) setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("barrigaseca-language", language);
  }, [language]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setAuthUser(user);
      setEmail(user.email ?? null);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadVip() {
      if (!authUser?.uid) return;

      setVipLoading(true);

      try {
        const ref = doc(db, "users", authUser.uid);
        const snap = await getDoc(ref);

        if (cancelled) return;

        const data = (snap.exists() ? (snap.data() as UserProfile) : {}) ?? {};
        setIsVip(isVipFromProfile(data));
      } catch {
        if (cancelled) return;
        setIsVip(false);
      } finally {
        if (cancelled) return;
        setVipLoading(false);
      }
    }

    loadVip();
    return () => {
      cancelled = true;
    };
  }, [authUser?.uid]);

  const vipLabel = useMemo(() => {
    if (vipLoading) return t.validating;
    return isVip ? t.vipActive : t.free;
  }, [vipLoading, isVip, t]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  if (loading) return <main style={{ padding: 32, color: "#fff" }}>{t.loading}</main>;

  return (
    <main style={styles.page}>
      <div style={styles.bg} aria-hidden />

      <section style={styles.card}>
        <header style={styles.header}>
          <div>
            <div style={styles.kicker}>{t.brand}</div>
            <h1 style={styles.h1}>{t.title}</h1>
            <p style={styles.sub}>
              {t.loggedAs}: <strong style={{ color: "#fff" }}>{email ?? t.userFallback}</strong>
            </p>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: isVip ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.06)",
                  fontWeight: 950,
                  fontSize: 12,
                  color: "#fff",
                }}
              >
                {t.status}: {vipLabel}
              </span>
            </div>
          </div>

          <div style={styles.languageGroup} aria-label="Language">
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                style={{
                  ...styles.languageButton,
                  ...(language === item.code ? styles.languageButtonActive : null),
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div style={styles.actions}>
          <a href="/free" style={isVip ? styles.btnPrimary : styles.btnGhost}>
            {isVip ? t.calendarVip : t.freeArea}
          </a>

          {!isVip && (
            <a href="/vip" style={styles.btnPrimary}>
              {t.vipContent}
            </a>
          )}

          {isVip && (
            <a href="/vip" style={styles.btnGhost}>
              {t.manageVip}
            </a>
          )}

          <a href="/vip/progresso" style={styles.btnGhost}>
            {t.progress}
          </a>

          <a href="/vip/checklist" style={styles.btnGhost}>
            {t.checklist}
          </a>

          <a href="/vip/metas" style={styles.btnGhost}>
            {t.goals}
          </a>

          <button onClick={handleLogout} style={styles.btnNeutral}>
            {t.logout}
          </button>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.70)" }}>
          {vipLoading ? t.syncingAccess : isVip ? t.vipHint : t.freeHint}
        </div>
        <MobileNav />
      </section>
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
      "radial-gradient(900px 500px at 20% 25%, rgba(255,255,255,0.10), transparent 60%), radial-gradient(900px 500px at 80% 70%, rgba(255,255,255,0.08), transparent 60%)",
    pointerEvents: "none",
  },
  card: {
    width: "min(980px, 100%)",
    margin: "40px auto",
    position: "relative",
    zIndex: 1,
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(17,17,17,0.55)",
    backdropFilter: "blur(8px)",
    color: "#fff",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
  },
  kicker: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 950,
    fontSize: 12,
    color: "rgba(255,255,255,0.90)",
  },
  languageGroup: {
    display: "inline-flex",
    gap: 6,
    padding: 4,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
  },
  languageButton: {
    border: "none",
    borderRadius: 999,
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 950,
    padding: "7px 10px",
  },
  languageButtonActive: {
    background: "#fff",
    color: "#111",
  },
  h1: {
    margin: "10px 0 6px",
    fontSize: 30,
    fontWeight: 950,
    color: "#fff",
  },
  sub: {
    margin: 0,
    color: "rgba(255,255,255,0.78)",
    fontWeight: 700,
    lineHeight: 1.5,
  },
  actions: {
    marginTop: 16,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  btnGhost: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    textDecoration: "none",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "#fff",
    fontWeight: 950,
    textDecoration: "none",
    color: "#111",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnNeutral: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    fontWeight: 950,
    color: "#fff",
    cursor: "pointer",
  },
};



