"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const ADMIN_EMAIL = "maicontavares503@gmail.com";

type AdminUser = {
  id: string;
  uid: string;
  email: string | null;
  vipActive: boolean;
  status: string;
  unlockedCycles: number;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
  vipUntil: string | null;
  language: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
};

type AdminResponse = {
  users: AdminUser[];
  summary: {
    total: number;
    vip: number;
    free: number;
    withStripe: number;
  };
  error?: string;
};

type RecoveryType = "lead" | "expired" | "inactive" | "canceled";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function daysSince(value: string | null) {
  if (!value) return null;
  const ms = Date.now() - new Date(value).getTime();
  return Math.floor(ms / 86400000);
}

function getRecoveryReasons(item: AdminUser): { type: RecoveryType; label: string; priority: number }[] {
  const reasons: { type: RecoveryType; label: string; priority: number }[] = [];
  const lastLoginDays = daysSince(item.lastLoginAt);
  const vipUntilMs = item.vipUntil ? new Date(item.vipUntil).getTime() : null;
  const status = (item.subscriptionStatus ?? "").toLowerCase();

  if (!item.vipActive && item.unlockedCycles === 0) {
    reasons.push({ type: "lead", label: "Lead gratis", priority: 3 });
  }

  if (!item.vipActive && typeof vipUntilMs === "number" && vipUntilMs < Date.now()) {
    reasons.push({ type: "expired", label: "VIP vencido", priority: 1 });
  }

  if (["canceled", "cancelled", "inactive", "unpaid", "past_due"].includes(status)) {
    reasons.push({ type: "canceled", label: "Assinatura em risco", priority: 1 });
  }

  if (typeof lastLoginDays === "number" && lastLoginDays >= 7) {
    reasons.push({ type: "inactive", label: `${lastLoginDays} dias sem login`, priority: 2 });
  }

  return reasons.sort((a, b) => a.priority - b.priority);
}

export default function AdminPage() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminResponse | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "vip" | "free" | "recovery">("all");
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const isAdmin = (user?.email ?? "").toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoginLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch (err: any) {
      setError(err?.message ?? "Falha ao entrar.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function loadUsers() {
    if (!user) return;

    setError(null);
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = (await res.json()) as AdminResponse;
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar admin.");
      setData(json);
    } catch (err: any) {
      setError(err?.message ?? "Falha ao carregar admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && isAdmin) void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const users = useMemo(() => {
    const base = data?.users ?? [];
    const q = query.trim().toLowerCase();

    return base.filter((item) => {
      if (filter === "vip" && !item.vipActive) return false;
      if (filter === "free" && item.vipActive) return false;
      if (filter === "recovery" && getRecoveryReasons(item).length === 0) return false;
      if (!q) return true;
      return (
        item.email?.toLowerCase().includes(q) ||
        item.uid.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
      );
    });
  }, [data?.users, filter, query]);

  const recoveryUsers = useMemo(() => {
    return (data?.users ?? [])
      .map((item) => ({ user: item, reasons: getRecoveryReasons(item) }))
      .filter((item) => item.reasons.length > 0)
      .sort((a, b) => a.reasons[0].priority - b.reasons[0].priority);
  }, [data?.users]);

  const recoverySummary = useMemo(() => {
    const items = recoveryUsers;
    return {
      total: items.length,
      leads: items.filter((item) => item.reasons.some((reason) => reason.type === "lead")).length,
      expired: items.filter((item) => item.reasons.some((reason) => reason.type === "expired" || reason.type === "canceled")).length,
      inactive: items.filter((item) => item.reasons.some((reason) => reason.type === "inactive")).length,
    };
  }, [recoveryUsers]);

  async function copyText(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg(message);
      window.setTimeout(() => setCopyMsg(null), 2200);
    } catch {
      setCopyMsg("Nao foi possivel copiar.");
    }
  }

  async function copyRecoveryEmails() {
    const emails = recoveryUsers
      .map((item) => item.user.email)
      .filter((value): value is string => Boolean(value));
    await copyText([...new Set(emails)].join(", "), `${emails.length} e-mails copiados.`);
  }

  if (!authReady) {
    return <main style={styles.page}>Carregando...</main>;
  }

  if (!user) {
    return (
      <main style={styles.page}>
        <section style={styles.loginCard}>
          <div style={styles.badge}>Barriga Seca - Admin</div>
          <h1 style={styles.h1}>Entrar no painel</h1>
          <p style={styles.sub}>Acesso restrito ao administrador.</p>

          <form onSubmit={handleLogin} style={styles.form}>
            <label style={styles.label}>
              E-mail
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Senha
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                style={styles.input}
              />
            </label>

            <button type="submit" disabled={loginLoading} style={styles.primaryButton}>
              {loginLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {error && <div style={styles.errorBox}>{error}</div>}
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={styles.page}>
        <section style={styles.loginCard}>
          <div style={styles.badge}>Barriga Seca - Admin</div>
          <h1 style={styles.h1}>Acesso negado</h1>
          <p style={styles.sub}>O e-mail logado nao tem permissao para acessar este painel.</p>
          <button onClick={() => signOut(auth)} style={styles.primaryButton}>
            Sair
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <header style={styles.header}>
          <div>
            <div style={styles.badge}>Barriga Seca - Admin</div>
            <h1 style={styles.h1}>Painel de usuarios</h1>
            <p style={styles.sub}>Monitoramento rapido de cadastro, VIP, ciclos e renovacao.</p>
          </div>

          <div style={styles.headerActions}>
            <button onClick={loadUsers} disabled={loading} style={styles.ghostButton}>
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
            <button onClick={() => signOut(auth)} style={styles.darkButton}>
              Sair
            </button>
          </div>
        </header>

        {error && <div style={styles.errorBox}>{error}</div>}

        <section style={styles.statsGrid}>
          <Stat title="Usuarios" value={data?.summary.total ?? 0} />
          <Stat title="VIP" value={data?.summary.vip ?? 0} />
          <Stat title="Gratis" value={data?.summary.free ?? 0} />
          <Stat title="Stripe" value={data?.summary.withStripe ?? 0} />
          <Stat title="Recuperar" value={recoverySummary.total} />
        </section>

        <section style={styles.recoveryPanel}>
          <div style={styles.recoveryHeader}>
            <div>
              <div style={styles.sectionTitle}>Recuperacao e remarketing</div>
              <div style={styles.sectionSub}>
                Usuarios com chance de recuperacao: gratis, VIP vencido/cancelado ou sem login recente.
              </div>
            </div>
            <button onClick={copyRecoveryEmails} style={styles.darkButton} type="button">
              Copiar e-mails
            </button>
          </div>

          <div style={styles.recoveryStats}>
            <MiniStat title="Leads gratis" value={recoverySummary.leads} />
            <MiniStat title="Vencidos/risco" value={recoverySummary.expired} />
            <MiniStat title="Sem login" value={recoverySummary.inactive} />
          </div>

          {copyMsg && <div style={styles.copyMsg}>{copyMsg}</div>}

          <div style={styles.recoveryList}>
            {recoveryUsers.slice(0, 8).map(({ user: item, reasons }) => (
              <div key={item.id} style={styles.recoveryItem}>
                <div>
                  <div style={styles.email}>{item.email ?? "Sem e-mail"}</div>
                  <div style={styles.reasons}>
                    {reasons.map((reason) => (
                      <span key={`${item.id}-${reason.type}`} style={styles.reasonPill}>
                        {reason.label}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => copyText(item.email ?? "", "E-mail copiado.")}
                  disabled={!item.email}
                  style={styles.ghostButton}
                  type="button"
                >
                  Copiar
                </button>
              </div>
            ))}

            {recoveryUsers.length === 0 && (
              <div style={styles.emptyLight}>Nenhuma oportunidade de recuperacao no momento.</div>
            )}
          </div>
        </section>

        <section style={styles.toolbar}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por e-mail, uid ou status"
            style={styles.searchInput}
          />

          <div style={styles.segment}>
            {(["all", "vip", "free", "recovery"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                style={{
                  ...styles.segmentButton,
                  ...(filter === item ? styles.segmentButtonActive : null),
                }}
                type="button"
              >
                {item === "all" ? "Todos" : item === "vip" ? "VIP" : item === "free" ? "Gratis" : "Recuperar"}
              </button>
            ))}
          </div>
        </section>

        <section style={styles.userList}>
          {users.map((item) => (
            <article key={item.id} style={styles.userCard}>
              <div style={styles.userTop}>
                <div>
                  <div style={styles.email}>{item.email ?? "Sem e-mail"}</div>
                  <div style={styles.uid}>{item.uid}</div>
                </div>
                <span style={item.vipActive ? styles.vipPill : styles.freePill}>{item.status}</span>
              </div>

              <div style={styles.infoGrid}>
                <Info label="Ciclos" value={String(item.unlockedCycles)} />
                <Info label="Cadastro" value={formatDate(item.createdAt)} />
                <Info label="Ultimo login" value={formatDate(item.lastLoginAt)} />
                <Info label="VIP ate" value={formatDate(item.vipUntil)} />
                <Info label="Idioma" value={item.language ?? "-"} />
                <Info label="Status assinatura" value={item.subscriptionStatus ?? "-"} />
              </div>

              {(item.stripeCustomerId || item.stripeSubscriptionId) && (
                <div style={styles.stripeBox}>
                  <div>Stripe customer: {item.stripeCustomerId ?? "-"}</div>
                  <div>Stripe subscription: {item.stripeSubscriptionId ?? "-"}</div>
                </div>
              )}

              {getRecoveryReasons(item).length > 0 && (
                <div style={styles.reasons}>
                  {getRecoveryReasons(item).map((reason) => (
                    <span key={`${item.id}-${reason.type}`} style={styles.reasonPill}>
                      {reason.label}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}

          {!loading && users.length === 0 && (
            <div style={styles.empty}>Nenhum usuario encontrado.</div>
          )}
        </section>
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{title}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: number }) {
  return (
    <div style={styles.miniStat}>
      <div style={styles.infoLabel}>{title}</div>
      <div style={styles.miniStatValue}>{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 18,
    background: "#0b0b0f",
    color: "#111",
  },
  shell: {
    width: "min(1180px, 100%)",
    margin: "18px auto",
    display: "grid",
    gap: 12,
  },
  loginCard: {
    width: "min(520px, 100%)",
    margin: "40px auto",
    padding: 18,
    borderRadius: 18,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  header: {
    padding: 18,
    borderRadius: 18,
    background: "rgba(255,255,255,0.94)",
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  headerActions: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#fff",
    border: "1px solid rgba(17,17,17,0.10)",
    fontSize: 12,
    fontWeight: 950,
  },
  h1: {
    margin: "10px 0 6px",
    fontSize: 30,
    fontWeight: 950,
  },
  sub: {
    margin: 0,
    color: "#555",
    fontWeight: 700,
    lineHeight: 1.5,
  },
  form: {
    display: "grid",
    gap: 10,
    marginTop: 14,
  },
  label: {
    display: "grid",
    gap: 6,
    fontWeight: 900,
    fontSize: 13,
  },
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(17,17,17,0.14)",
    outline: "none",
    fontWeight: 800,
  },
  primaryButton: {
    padding: 13,
    borderRadius: 14,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 950,
    cursor: "pointer",
  },
  darkButton: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    fontWeight: 950,
    cursor: "pointer",
  },
  ghostButton: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.14)",
    background: "#fff",
    color: "#111",
    fontWeight: 950,
    cursor: "pointer",
  },
  errorBox: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(239,68,68,0.10)",
    border: "1px solid rgba(239,68,68,0.25)",
    color: "#7f1d1d",
    fontWeight: 800,
  },
  statsGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  },
  recoveryPanel: {
    padding: 16,
    borderRadius: 18,
    background: "rgba(255,255,255,0.94)",
    display: "grid",
    gap: 12,
  },
  recoveryHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 950,
  },
  sectionSub: {
    marginTop: 6,
    color: "#555",
    fontWeight: 700,
    lineHeight: 1.5,
  },
  recoveryStats: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  },
  miniStat: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid #eee",
    background: "#fff",
  },
  miniStatValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: 950,
  },
  recoveryList: {
    display: "grid",
    gap: 10,
  },
  recoveryItem: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid #eee",
    background: "#fff",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  reasons: {
    marginTop: 10,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  reasonPill: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(245,158,11,0.12)",
    border: "1px solid rgba(245,158,11,0.25)",
    color: "#92400e",
    fontSize: 12,
    fontWeight: 950,
  },
  copyMsg: {
    padding: 10,
    borderRadius: 14,
    background: "rgba(34,197,94,0.10)",
    border: "1px solid rgba(34,197,94,0.22)",
    color: "#166534",
    fontWeight: 900,
  },
  emptyLight: {
    padding: 12,
    borderRadius: 14,
    background: "#fff",
    border: "1px solid #eee",
    fontWeight: 900,
  },
  statCard: {
    padding: 16,
    borderRadius: 18,
    background: "rgba(255,255,255,0.94)",
  },
  statTitle: {
    fontSize: 12,
    color: "#555",
    fontWeight: 950,
  },
  statValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: 950,
  },
  toolbar: {
    padding: 12,
    borderRadius: 18,
    background: "rgba(255,255,255,0.94)",
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  searchInput: {
    flex: "1 1 260px",
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.14)",
    fontWeight: 800,
    outline: "none",
  },
  segment: {
    display: "inline-flex",
    gap: 6,
    padding: 4,
    borderRadius: 999,
    border: "1px solid rgba(17,17,17,0.10)",
    background: "#fff",
  },
  segmentButton: {
    border: "none",
    borderRadius: 999,
    background: "transparent",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 950,
  },
  segmentButtonActive: {
    background: "#111",
    color: "#fff",
  },
  userList: {
    display: "grid",
    gap: 12,
  },
  userCard: {
    padding: 16,
    borderRadius: 18,
    background: "rgba(255,255,255,0.94)",
  },
  userTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  email: {
    fontSize: 16,
    fontWeight: 950,
  },
  uid: {
    marginTop: 4,
    color: "#666",
    fontSize: 12,
    fontWeight: 800,
    overflowWrap: "anywhere",
  },
  vipPill: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.15)",
    color: "#166534",
    fontSize: 12,
    fontWeight: 950,
  },
  freePill: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#f3f4f6",
    color: "#374151",
    fontSize: 12,
    fontWeight: 950,
  },
  infoGrid: {
    marginTop: 14,
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  },
  infoLabel: {
    color: "#666",
    fontSize: 12,
    fontWeight: 950,
  },
  infoValue: {
    marginTop: 4,
    fontWeight: 900,
    overflowWrap: "anywhere",
  },
  stripeBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: "#fafafa",
    border: "1px solid #eee",
    color: "#555",
    fontSize: 12,
    fontWeight: 800,
    overflowWrap: "anywhere",
  },
  empty: {
    padding: 18,
    borderRadius: 18,
    background: "rgba(255,255,255,0.94)",
    fontWeight: 900,
  },
};
