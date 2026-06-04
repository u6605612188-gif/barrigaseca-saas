import { NextResponse } from "next/server";
import admin from "firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAILS = ["maicontavares503@gmail.com"];

function parseServiceAccount(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    const fixed = json.replace(
      /"private_key"\s*:\s*"([\s\S]*?)"\s*,\s*"client_email"/,
      (_match, privateKey: string) => {
        const escapedKey = privateKey
          .replace(/\r/g, "")
          .replace(/\n/g, "\\n")
          .replace(/\t/g, "\\t");
        return `"private_key":"${escapedKey}","client_email"`;
      }
    );

    return JSON.parse(fixed);
  }
}

function getAdminApp() {
  if (!admin.apps.length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (!json) {
      throw new Error("ENV ausente: FIREBASE_SERVICE_ACCOUNT_JSON");
    }

    admin.initializeApp({
      credential: admin.credential.cert(parseServiceAccount(json)),
    });
  }

  return admin.app();
}

function asMillis(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) return value.toMillis();
  if (typeof value === "object" && value && "seconds" in value && typeof (value as any).seconds === "number") {
    return (value as any).seconds * 1000;
  }
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function isVipActive(data: FirebaseFirestore.DocumentData) {
  if (data.vip === true || data.vipActive === true || data.isVip === true || data.vip_enabled === true) {
    return true;
  }

  const status =
    typeof data.subscriptionStatus === "string"
      ? data.subscriptionStatus.toLowerCase()
      : "";
  if (["active", "trialing", "paid"].includes(status)) return true;

  const until =
    data.vipUntil ?? data.vip_until ?? data.vipExpiresAt ?? data.vip_expires_at;
  const untilMs = asMillis(until);
  return typeof untilMs === "number" ? untilMs > Date.now() : false;
}

function toIso(value: unknown) {
  const ms = asMillis(value);
  return typeof ms === "number" ? new Date(ms).toISOString() : null;
}

export async function GET(req: Request) {
  try {
    getAdminApp();

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
    if (!token) {
      return NextResponse.json({ error: "Token ausente." }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const email = (decoded.email ?? "").toLowerCase();

    if (!ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const db = admin.firestore();
    const snap = await db.collection("users").orderBy("createdAt", "desc").limit(300).get();

    const users = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      const unlockedCycles = Number(data.unlockedCycles ?? 0);
      const vipActive = isVipActive(data);

      return {
        id: docSnap.id,
        uid: data.uid ?? docSnap.id,
        email: data.email ?? null,
        vipActive,
        status: vipActive ? "VIP" : "Gratis",
        unlockedCycles: Number.isFinite(unlockedCycles) ? unlockedCycles : 0,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
        lastLoginAt: toIso(data.lastLoginAt),
        vipUntil: toIso(data.vipUntil ?? data.vip_until ?? data.vipExpiresAt ?? data.vip_expires_at),
        language: data.language ?? data.preferredLanguage ?? null,
        stripeCustomerId: data.stripeCustomerId ?? null,
        stripeSubscriptionId: data.stripeSubscriptionId ?? null,
        subscriptionStatus: data.subscriptionStatus ?? null,
      };
    });

    const summary = {
      total: users.length,
      vip: users.filter((user) => user.vipActive).length,
      free: users.filter((user) => !user.vipActive).length,
      withStripe: users.filter((user) => Boolean(user.stripeCustomerId || user.stripeSubscriptionId)).length,
    };

    return NextResponse.json({ users, summary });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erro interno." }, { status: 500 });
  }
}
