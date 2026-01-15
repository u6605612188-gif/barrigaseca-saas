// app/api/stripe/checkout/route.ts
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getBaseUrl(req: NextRequest) {
  // Prioridade: env (produção) -> header (preview) -> fallback local
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!secretKey) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY ausente nas variáveis de ambiente." },
        { status: 500 }
      );
    }
    if (!priceId) {
      return NextResponse.json(
        { error: "STRIPE_PRICE_ID ausente nas variáveis de ambiente." },
        { status: 500 }
      );
    }

    // Stripe SDK v20 tipa a apiVersion como "2025-12-15.clover"
    const stripe = new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });

    // Opcional: receber email/uid no body para amarrar a compra ao usuário
    // (não quebra se vier vazio)
    let email: string | undefined;
    let uid: string | undefined;

    try {
      const body = await req.json();
      email = typeof body?.email === "string" ? body.email : undefined;
      uid = typeof body?.uid === "string" ? body.uid : undefined;
    } catch {
      // sem body -> segue
    }

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/vip?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/vip?canceled=1`,
      allow_promotion_codes: true,
      customer_email: email,
      metadata: {
        uid: uid ?? "",
        app: "barrigaseca-saas",
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Erro ao criar checkout." },
      { status: 500 }
    );
  }
}
