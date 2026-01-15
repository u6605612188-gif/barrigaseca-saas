import Stripe from "stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY!;
    const priceId = process.env.STRIPE_PRICE_ID!;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

    if (!secretKey || !priceId || !appUrl) {
      return NextResponse.json(
        { error: "Variáveis de ambiente ausentes" },
        { status: 400 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover",
    });

    const body = await req.json().catch(() => ({}));
    const email = body?.email;
    const uid = body?.uid;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/vip?success=1`,
      cancel_url: `${appUrl}/vip?canceled=1`,
      customer_email: email,
      metadata: uid ? { uid } : undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Erro Stripe" },
      { status: 500 }
    );
  }
}
