import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

function getBaseUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && env.startsWith("http")) return env.replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (origin && origin.startsWith("http")) return origin.replace(/\/$/, "");
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!secretKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY ausente" }, { status: 500 });
    }
    if (!priceId) {
      return NextResponse.json({ error: "STRIPE_PRICE_ID ausente" }, { status: 500 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

    let email: string | undefined;
    let uid: string | undefined;

    try {
      const body = await req.json();
      email = typeof body?.email === "string" ? body.email : undefined;
      uid = typeof body?.uid === "string" ? body.uid : undefined;
    } catch {}

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/vip/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/vip?canceled=1`,
      allow_promotion_codes: true,
      customer_email: email,
      metadata: {
        app: "barrigaseca-saas",
        uid: uid ?? "",
        email: email ?? "",
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("checkout error:", e);
    return NextResponse.json({ error: e?.message ?? "checkout error" }, { status: 500 });
  }
}
