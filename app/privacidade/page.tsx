import React from "react";

export const metadata = {
  title: "Privacidade e exclusao de conta",
  description:
    "Politica de privacidade, dados coletados e instrucoes para solicitar exclusao da conta Barriga Seca.",
};

const supportPhone = "351961780568";
const supportText = encodeURIComponent(
  "Ola, quero solicitar a exclusao da minha conta e dos meus dados no Barriga Seca. Meu e-mail de cadastro e: "
);

export default function PrivacidadePage() {
  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div style={styles.badge}>Barriga Seca</div>
        <h1 style={styles.h1}>Privacidade e exclusao de conta</h1>
        <p style={styles.sub}>
          Esta pagina explica quais dados o app usa e como solicitar a exclusao da sua conta.
        </p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Dados usados pelo app</h2>
        <p style={styles.text}>
          O Barriga Seca usa dados de conta, como e-mail e identificador de usuario, para permitir login,
          salvar progresso, idioma, medidas informadas pelo proprio usuario, status de assinatura e moedas.
        </p>
        <p style={styles.text}>
          O app tambem pode usar Firebase, Stripe, Google Play, Google AdMob e servicos semelhantes para
          autenticar usuarios, processar assinaturas, entregar anuncios premiados e manter recursos do app.
        </p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Finalidade</h2>
        <p style={styles.text}>
          Os dados sao usados para manter o acesso ao app, salvar seu acompanhamento, liberar recursos pagos
          ou gratuitos, oferecer suporte e melhorar a experiencia. O app nao promete resultado medico ou
          emagrecimento garantido.
        </p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Exclusao de conta e dados</h2>
        <p style={styles.text}>
          Voce pode solicitar a exclusao da sua conta e dados pelo WhatsApp de suporte. Informe o e-mail usado
          no cadastro para localizacao da conta.
        </p>
        <p style={styles.text}>
          Dados necessarios para obrigacoes legais, antifraude, comprovacao de pagamentos ou suporte de
          assinaturas podem ser mantidos pelo periodo exigido por lei ou pelos processadores de pagamento.
        </p>
        <a
          href={`https://wa.me/${supportPhone}?text=${supportText}`}
          style={styles.btnDark}
        >
          Solicitar exclusao pelo WhatsApp
        </a>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Contato</h2>
        <p style={styles.text}>
          Para duvidas, cancelamento, sugestoes ou problemas no app, fale com o suporte pelo WhatsApp:
          {" "}
          <a href={`https://wa.me/${supportPhone}`} style={styles.link}>
            +351 961 780 568
          </a>
          .
        </p>
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
  link: { color: "#111", fontWeight: 950 },
};
