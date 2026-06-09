import React from "react";

export const metadata = {
  title: "Termos de uso e aviso de saude",
  description:
    "Termos de uso, aviso de saude e regras gerais de uso do app Barriga Seca.",
};

export default function TermosPage() {
  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div style={styles.badge}>Barriga Seca</div>
        <h1 style={styles.h1}>Termos de uso e aviso de saude</h1>
        <p style={styles.sub}>
          Leia estas informacoes antes de usar treinos, receitas, metas, lembretes e ferramentas do app.
        </p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Uso educativo</h2>
        <p style={styles.text}>
          O Barriga Seca oferece conteudo educativo de organizacao de rotina, treinos, receitas, metas,
          lembretes e acompanhamento. O app nao substitui consulta medica, nutricional, psicologica,
          fisioterapeutica ou de qualquer outro profissional de saude.
        </p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Sem promessa de resultado</h2>
        <p style={styles.text}>
          Resultados de peso, condicionamento, medidas, saude ou estetica variam de pessoa para pessoa.
          O app nao garante emagrecimento, ganho de massa, melhora clinica ou qualquer resultado especifico.
        </p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Seguranca do usuario</h2>
        <p style={styles.text}>
          Antes de iniciar treinos, mudancas alimentares ou metas intensas, procure orientacao profissional,
          principalmente se voce tem doencas, lesoes, usa medicamentos, esta gravida, amamentando ou sente dor,
          tontura, falta de ar ou mal-estar.
        </p>
        <p style={styles.text}>
          Se sentir qualquer desconforto durante uma atividade, pare imediatamente e procure ajuda adequada.
        </p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Assinatura, moedas e anuncios</h2>
        <p style={styles.text}>
          Recursos pagos, moedas, anuncios premiados e desbloqueios podem variar conforme disponibilidade,
          regras da plataforma, conta do usuario e politicas aplicaveis. Quando o app estiver publicado na
          Google Play, compras digitais dentro do app devem seguir as regras de pagamento da Google Play.
        </p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Conta e suporte</h2>
        <p style={styles.text}>
          O usuario e responsavel por informar dados corretos e manter acesso ao e-mail usado no cadastro.
          Para suporte, cancelamento, sugestoes ou exclusao de conta, use os canais informados no app ou na
          pagina de privacidade.
        </p>
        <a href="/privacidade" style={styles.btnDark}>Ver privacidade e exclusao de conta</a>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    maxWidth: 920,
    margin: "0 auto",
    padding: 18,
    color: "#111",
  },
  header: {
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(255,255,255,0.10)",
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
  card: {
    marginTop: 12,
    padding: 18,
    borderRadius: 18,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  h2: { margin: "0 0 10px", fontSize: 20, fontWeight: 950, color: "#111" },
  text: { color: "#444", fontWeight: 750, lineHeight: 1.65, margin: "0 0 10px" },
  btnDark: {
    display: "inline-flex",
    marginTop: 8,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 950,
  },
};
