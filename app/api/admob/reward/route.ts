import { createPublicKey, verify } from "node:crypto";
import { NextResponse } from "next/server";
import { creditRewardedAd } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_KEYS_URL =
  "https://www.gstatic.com/admob/reward/verifier-keys.json";
const KEY_CACHE_MS = 24 * 60 * 60 * 1000;

type VerifierKey = {
  keyId: number;
  pem: string;
};

let cachedKeys: { expiresAt: number; keys: VerifierKey[] } | null = null;

async function getVerifierKeys() {
  if (cachedKeys && cachedKeys.expiresAt > Date.now()) {
    return cachedKeys.keys;
  }

  const response = await fetch(PUBLIC_KEYS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Nao foi possivel obter as chaves do AdMob.");
  }

  const body = (await response.json()) as {
    keys?: Array<{ keyId?: number; pem?: string }>;
  };
  const keys = (body.keys ?? [])
    .filter(
      (key): key is VerifierKey =>
        typeof key.keyId === "number" && typeof key.pem === "string"
    )
    .map((key) => ({ keyId: key.keyId, pem: key.pem }));

  if (!keys.length) {
    throw new Error("O AdMob nao retornou chaves validas.");
  }

  cachedKeys = {
    keys,
    expiresAt: Date.now() + KEY_CACHE_MS,
  };
  return keys;
}

function decodeUrlSafeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64");
}

async function verifyAdMobSignature(url: URL) {
  const signature = url.searchParams.get("signature");
  const keyId = Number(url.searchParams.get("key_id"));
  if (!signature || !Number.isInteger(keyId)) return false;

  const signatureMarker = "&signature=";
  const markerIndex = url.search.indexOf(signatureMarker);
  if (markerIndex < 0) return false;

  const signedData = url.search.slice(1, markerIndex);
  const key = (await getVerifierKeys()).find((item) => item.keyId === keyId);
  if (!key) return false;

  return verify(
    "sha256",
    Buffer.from(signedData, "utf8"),
    createPublicKey(key.pem),
    decodeUrlSafeBase64(signature)
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const hasSignatureParams =
      url.searchParams.has("signature") || url.searchParams.has("key_id");
    const hasRewardParams =
      url.searchParams.has("transaction_id") || url.searchParams.has("ad_unit");

    if (!hasSignatureParams && !hasRewardParams) {
      return NextResponse.json({ ok: true, mode: "validation" });
    }

    if (!(await verifyAdMobSignature(url))) {
      return NextResponse.json({
        ok: true,
        credited: false,
        mode: "validation",
        error: "Assinatura invalida.",
      });
    }

    const uid = url.searchParams.get("user_id")?.trim();
    const transactionId = url.searchParams.get("transaction_id")?.trim();
    const adUnit = url.searchParams.get("ad_unit")?.trim();
    const rewardItem = url.searchParams.get("reward_item")?.trim() ?? "coins";
    const rewardAmount = Number(url.searchParams.get("reward_amount") ?? 0);
    const timestampMs = Number(url.searchParams.get("timestamp") ?? Date.now());

    if (!uid || !transactionId || !adUnit || !Number.isFinite(timestampMs)) {
      return NextResponse.json({
        ok: true,
        credited: false,
        mode: "validation",
        error: "Parametros obrigatorios ausentes.",
      });
    }

    const expectedAdUnit = process.env.ADMOB_REWARDED_AD_UNIT_ID?.trim();
    if (!expectedAdUnit) {
      throw new Error("ENV ausente: ADMOB_REWARDED_AD_UNIT_ID");
    }
    if (adUnit !== expectedAdUnit) {
      return NextResponse.json({
        ok: true,
        credited: false,
        error: "Bloco de anuncio invalido.",
      });
    }

    const result = await creditRewardedAd({
      uid,
      transactionId,
      adUnit,
      rewardItem,
      rewardAmount,
      occurredAt: new Date(timestampMs),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao processar recompensa.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
