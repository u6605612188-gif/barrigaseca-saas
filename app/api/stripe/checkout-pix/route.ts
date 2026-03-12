import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";

  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

type Body = {
  uid: string;
  email?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const uid = String(body?.uid ?? "").trim();
    const emailRaw = body?.email ?? null;
    const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : null;

    if (!uid) {
      return NextResponse.json(
        { error: "UID do usuário ausente no checkout." },
        { status: 400 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    const priceId = process.env.STRIPE_PIX_PRICE_ID?.trim();

    if (!secretKey || !priceId) {
      return NextResponse.json(
        { error: "ENV Stripe ausente. Configure STRIPE_SECRET_KEY e STRIPE_PIX_PRICE_ID." },
        { status: 400 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover" as any,
    });

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      payment_method_types: ["pix"],
      success_url: `${baseUrl}/vip?success=1`,
      cancel_url: `${baseUrl}/vip?canceled=1`,
      client_reference_id: uid,
      metadata: {
        uid,
        email: email ?? "",
        source: "pix",
      },
      customer_email: email ?? undefined,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Erro ao criar checkout Pix." },
      { status: 500 }
    );
  }
}