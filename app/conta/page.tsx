"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import MobileNav from "@/components/MobileNav";
import { auth, db } from "@/lib/firebase";
import { defaultLanguage, isLanguage, languages, type Language } from "@/lib/i18n";

type UserProfile = {
  email?: string;
  vip?: boolean;
  vipActive?: boolean;
  isVip?: boolean;
  subscriptionStatus?: string;
  unlockedCycles?: number;
  vipUntil?: any;
  vip_until?: any;
  vipExpiresAt?: any;
  vip_expires_at?: any;
  language?: Language;
};

function asMillis(v: any): number | null {
  if (!v) return null;
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const parsed = Date.parse(v);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function isVipFromProfile(data: UserProfile) {
  const flag = data.vip === true || data.vipActive === true || data.isVip === true;
  const statusOk = ["active", "trialing", "paid"].includes(
    String(data.subscriptionStatus ?? "").toLowerCase()
  );
  const until = data.vipUntil ?? data.vip_until ?? data.vipExpiresAt ?? data.vip_expires_at;
  const untilMs = asMillis(until);

  return flag || statusOk || (typeof untilMs === "number" && untilMs > Date.now());
}

function formatDate(v: any) {
  const ms = asMillis(v);
  if (!ms) return "Nao informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(ms));
}

export default function ContaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("barrigaseca-language");
    if (isLanguage(saved)) setLanguage(saved);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }

      setUser(u);
      setLoading(true);
      setError(null);

      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? (snap.data() as UserProfile) : {};
        setProfile(data);

        const savedLanguage = data.language ?? null;
        if (isLanguage(savedLanguage)) {
          setLanguage(savedLanguage);
          window.localStorage.setItem("barrigaseca-language", savedLanguage);
        }
      } catch (e: any) {
        setError(e?.message ?? "Nao foi possivel carregar sua conta.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const status = useMemo(() => {
    if (!profile) return "Carregando";
    return isVipFromProfile(profile) ? "VIP ativo" : "Gratis";
  }, [profile]);

  const cycles = Number(profile?.unlockedCycles ?? (status === "VIP ativo" ? 1 : 0));
  const vipUntil = profile?.vipUntil ?? profile?.vip_until ?? profile?.vipExpiresAt ?? profile?.vip_expires_at;

  async function changeLanguage(next: Language) {
    setLanguage(next);
    window.localStorage.setItem("barrigaseca-language", next);
    setMessage(null);
    setError(null);

    if (!user?.uid) return;

    try {
      setSaving(true);
      await setDoc(
        doc(db, "users", user.uid),
        { language: next, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setMessage("Idioma salvo na sua conta.");
    } catch (e: any) {
      setError(e?.message ?? "Nao foi possivel salvar o idioma.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  if (loading) return <main style={styles.loading}>Carregando sua conta...</main>;

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div style={styles.badge}>Barriga Seca - Conta</div>
        <h1 style={styles.h1}>Minha conta</h1>
        <p style={styles.sub}>Veja seu acesso, idioma e atalhos principais em um so lugar.</p>
      </section>

      {error && <div style={styles.error}>{error}</div>}
      {message && <div style={styles.success}>{message}</div>}

      <section style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.label}>E-mail</div>
          <div style={styles.value}>{user?.email ?? profile?.email ?? "Nao informado"}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Status</div>
          <div style={styles.value}>{status}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Ciclos liberados</div>
          <div style={styles.value}>{Number.isFinite(cycles) ? cycles : 0}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Validade VIP</div>
          <div style={styles.value}>{formatDate(vipUntil)}</div>
        </div>
      </section>

      <section style={styles.cardLarge}>
        <div style={styles.sectionTitle}>Idioma do app</div>
        <div style={styles.languageGroup} aria-label="Idioma">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => changeLanguage(item.code)}
              disabled={saving}
              style={{
                ...styles.languageButton,
                ...(language === item.code ? styles.languageButtonActive : null),
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section style={styles.cardLarge}>
        <div style={styles.sectionTitle}>Atalhos</div>
        <div style={styles.actions}>
          <a href="/free" style={styles.btnDark}>Calendario</a>
          <a href="/vip/checklist" style={styles.btnGhost}>Checklist</a>
          <a href="/vip/metas" style={styles.btnGhost}>Metas</a>
          <a href="/vip/progresso" style={styles.btnGhost}>Progresso</a>
          <a href="/vip" style={styles.btnGhost}>Assinatura</a>
          <button type="button" onClick={handleLogout} style={styles.btnGhostBtn}>Sair</button>
        </div>
      </section>

      <MobileNav active="account" />
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { padding: 28, color: "#fff" },
  page: {
    minHeight: "100vh",
    padding: 18,
    maxWidth: 1100,
    margin: "0 auto",
    color: "#111",
  },
  header: {
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.94)",
  },
  badge: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(17,17,17,0.10)",
    background: "#fff",
    fontWeight: 950,
    fontSize: 12,
  },
  h1: { margin: "10px 0 6px", fontSize: 34, fontWeight: 950, color: "#111" },
  sub: { margin: 0, color: "#444", fontWeight: 800, lineHeight: 1.5 },
  grid: {
    marginTop: 12,
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  card: {
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.94)",
    color: "#111",
  },
  cardLarge: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.94)",
    color: "#111",
  },
  label: { color: "#555", fontSize: 12, fontWeight: 950 },
  value: { marginTop: 8, color: "#111", fontSize: 22, fontWeight: 950, wordBreak: "break-word" },
  sectionTitle: { color: "#111", fontSize: 16, fontWeight: 950, marginBottom: 10 },
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
    padding: "9px 12px",
  },
  languageButtonActive: { background: "#111", color: "#fff" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  btnDark: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 950,
  },
  btnGhost: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.14)",
    background: "#fff",
    color: "#111",
    textDecoration: "none",
    fontWeight: 950,
  },
  btnGhostBtn: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.14)",
    background: "#fff",
    color: "#111",
    fontWeight: 950,
    cursor: "pointer",
  },
  error: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: "rgba(239,68,68,0.10)",
    border: "1px solid rgba(239,68,68,0.25)",
    color: "#991b1b",
    fontWeight: 900,
  },
  success: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: "rgba(34,197,94,0.10)",
    border: "1px solid rgba(34,197,94,0.25)",
    color: "#166534",
    fontWeight: 900,
  },
};


