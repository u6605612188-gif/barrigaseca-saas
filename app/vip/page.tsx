"use client";

import React, { useState } from "react";

type CheckoutResponse = {
  url?: string;
  error?: string;
};

export default function VipPage() {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    if (loading) return;

    try {
      setLoading(true);

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      let data: CheckoutResponse = {};
      try {
        data = (await res.json()) as CheckoutResponse;
      } catch {
        // se não vier JSON, cai no erro genérico abaixo
      }

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao iniciar checkout.");
      }

      if (!data?.url) {
        throw new Error("Checkout sem URL de redirecionamento.");
      }

      window.location.href = data.url;
    } catch (e: any) {
      alert(e?.message ?? "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 28, maxWidth: 980, margin: "28px auto" }}>
      <section
        style={{
          padding: 24,
          borderRadius: 18,
          border: "1px solid #eee",
          background: "#fff",
        }}
      >
        <h1 style={{ fontSize: 34, fontWeight: 900, margin: 0 }}>
          Seja membro VIP
        </h1>

        <p style={{ color: "#555", marginTop: 10, lineHeight: 1.6 }}>
          Libere o <strong>Calendário completo de 30 dias</strong> com treinos e receitas.
          Entre no modo disciplina: conteúdo diário + evolução contínua.
        </p>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginTop: 14,
          }}
        >
          <Card
            title="O que você desbloqueia"
            items={[
              "Dias 8–30 liberados",
              "Receitas completas e variações",
              "Treinos guiados do dia",
              "Checklist de hábitos (em breve)",
              "Progresso e metas (em breve)",
            ]}
          />
          <Card
            title="Pra quem é"
            items={[
              "Quer barriga mais seca e rotina simples",
              "Não tem tempo pra treinos longos",
              "Precisa de direção diária",
              "Quer praticidade nas refeições",
            ]}
          />
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 18,
            borderRadius: 16,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900 }}>Plano VIP</div>
          <div style={{ marginTop: 8, opacity: 0.9 }}>
            Assinatura recorrente • Cancele quando quiser
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 12,
              border: "1px solid #fff",
              background: "#fff",
              color: "#111",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              width: "100%",
              maxWidth: 420,
            }}
          >
            {loading ? "Abrindo pagamento…" : "Assinar VIP agora"}
          </button>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
            Após pagar, você volta automaticamente e o acesso VIP é liberado.
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <a
            href="/free"
            style={{
              display: "inline-block",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              fontWeight: 900,
              textDecoration: "none",
              color: "#111",
              background: "#fff",
            }}
          >
            Voltar para o Grátis
          </a>
        </div>
      </section>
    </main>
  );
}

function Card({ title, items }: { title: string; items: string[] }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        border: "1px solid #eee",
        background: "#fff",
      }}
    >
      <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 900 }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
        {items.map((x) => (
          <li key={x} style={{ fontWeight: 700, color: "#222" }}>
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}
