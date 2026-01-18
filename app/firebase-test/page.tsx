"use client";

import { db, auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

function formatErr(e: unknown) {
  const msg =
    typeof e === "object" && e && "message" in e ? String((e as any).message) : String(e);
  const code = typeof e === "object" && e && "code" in e ? String((e as any).code) : "";
  return code ? `${code}: ${msg}` : msg;
}

export default function FirebaseTestPage() {
  const [status, setStatus] = useState("Testando Firestore...");
  const [details, setDetails] = useState<string>("");

  useEffect(() => {
    let unsub = () => {};

    try {
      unsub = onAuthStateChanged(auth, async (u) => {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "(vazio)";
        const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "(vazio)";

        if (!u) {
          setStatus("OK ✅ SDK carregado (sem login)");
          setDetails(`projectId=${projectId} | appId=${appId} | uid=(não logado)`);
          return;
        }

        setStatus("Logado. Testando leitura do Firestore...");

        try {
          // leitura determinística do perfil do próprio usuário
          const ref = doc(db, "users", u.uid);
          const snap = await getDoc(ref);

          setStatus("OK ✅ Firestore respondeu");
          setDetails(
            `projectId=${projectId} | appId=${appId} | uid=${u.uid} | users/${u.uid} exists=${snap.exists()}`
          );
        } catch (e) {
          setStatus("ERRO ❌ Firestore não respondeu");
          setDetails(
            `projectId=${projectId} | appId=${appId} | uid=${u.uid} | ${formatErr(e)}`
          );
        }
      });
    } catch (e) {
      setStatus("ERRO ❌ Firebase init");
      setDetails(formatErr(e));
    }

    return () => unsub();
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <h1>Teste do Firebase</h1>
      <p style={{ fontWeight: 900 }}>{status}</p>
      <pre
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 12,
          border: "1px solid #eee",
          background: "#fafafa",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontWeight: 700,
          color: "#333",
        }}
      >
        {details}
      </pre>
    </div>
  );
}
