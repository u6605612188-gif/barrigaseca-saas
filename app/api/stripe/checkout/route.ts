import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host");

  const proto =
    req.headers.get("x-forwarded-proto") ?? "https";

  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

type Body = {
  uid: string;
  email?: string | null;
};

export async function POST(req: Request) {
  try {
    const { uid, email } = (await req.json()) as Body;

    if (!uid) {
      return NextResponse.json(
        { error: "UID do usuário ausente no checkout." },
        { status: 400 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    const priceId = process.env.STRIPE_PRICE_ID?.trim();

    if (!secretKey || !priceId) {
      return NextResponse.json(
        { error: "ENV Stripe ausente. Configure STRIPE_SECRET_KEY e STRIPE_PRICE_ID." },
        { status: 400 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover" as any,
    });

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/vip?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/vip?canceled=1`,
      allow_promotion_codes: true,

      // 🔒 CHAVE DO SUCESSO DO PROJETO
      metadata: {
        uid,
        email: email ?? "",
      },

      customer_email: email ?? undefined,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Erro ao criar checkout." },
      { status: 500 }
    );
  }
}
