"use client";

import React, { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function PwaInstaller() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  const ios = useMemo(() => isIos(), []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const timer = window.setTimeout(() => {
      if (!isStandalone()) setVisible(true);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      if (choice.outcome === "accepted") {
        setVisible(false);
        return;
      }
    }

    setShowHelp(true);
  }

  if (installed || !visible) return null;

  return (
    <div style={styles.wrap}>
      <button type="button" onClick={handleInstall} style={styles.button}>
        <img src="/app-icon-192.png" alt="" style={styles.icon} />
        Salvar app
      </button>
      <button type="button" onClick={() => setVisible(false)} style={styles.close} aria-label="Fechar">
        x
      </button>

      {showHelp && (
        <div style={styles.help}>
          <strong>Salvar na tela inicial</strong>
          <span>
            {ios
              ? "No iPhone, toque em compartilhar e escolha Adicionar a Tela de Inicio."
              : "No Chrome, toque nos tres pontos e escolha Adicionar a tela inicial."}
          </span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: "fixed",
    right: 14,
    bottom: 102,
    zIndex: 80,
    display: "flex",
    alignItems: "center",
    gap: 8,
    maxWidth: "calc(100vw - 28px)",
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    objectFit: "cover",
  },
  button: {
    minHeight: 46,
    padding: "12px 14px",
    borderRadius: 999,
    border: "1px solid rgba(17,17,17,0.16)",
    background: "#fff",
    color: "#111",
    boxShadow: "0 14px 36px rgba(0,0,0,0.24)",
    fontWeight: 950,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#111",
    color: "#fff",
    fontWeight: 950,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  help: {
    position: "absolute",
    right: 0,
    bottom: 54,
    width: 260,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "#fff",
    color: "#111",
    boxShadow: "0 18px 45px rgba(0,0,0,0.24)",
    display: "grid",
    gap: 6,
    fontSize: 13,
    lineHeight: 1.45,
  },
};
