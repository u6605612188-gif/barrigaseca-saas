"use client";

import { db, auth } from "@/lib/firebase";
import { useEffect, useState } from "react";

export default function FirebaseTestPage() {
  const [status, setStatus] = useState("Testando...");

  useEffect(() => {
    if (db && auth) {
      setStatus(
        `OK ✅ Firebase pronto | projectId=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`
      );
    }
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Teste do Firebase</h1>
      <p>{status}</p>
    </div>
  );
}
