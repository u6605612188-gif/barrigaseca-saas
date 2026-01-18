import Stripe from "stripe";
import { NextResponse } from "next/server";
import admin from "firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------- Firebase Admin ----------
function getAdminDb() {
  if (!admin.apps.length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (!json) {
      throw new Error(
        "ENV ausente: FIREBASE_SERVICE_ACCOUNT_JSON (service account do Firebase para o webhook gravar no Firestore)."
      );
    }

    const serviceAccount = JSON.parse(json);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return admin.firestore();
}

// ---------- Stripe ----------
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("ENV ausente: STRIPE_SECRET_KEY");

  // Mantive como está no seu projeto para não quebrar ambiente.
  return new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });
}

// ---------- Type helpers ----------
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // Em algumas versões do SDK/types, `subscription` não existe no tipo `Invoice`,
  // mas o campo pode vir no payload real do Stripe. Então fazemos um fallback seguro.
  const sub = (invoice as unknown as { subscription?: unknown }).subscription;

  if (!sub) return null;
  if (typeof sub === "string") return sub;

  if (typeof sub === "object" && sub && "id" in (sub as any)) {
    const id = (sub as any).id;
    return typeof id === "string" ? id : null;
  }

  return null;
}

// ---------- Firestore lookups ----------
async function findUserDocByEmail(email: string) {
  const db = getAdminDb();
  const snap = await db
    .collection("users")
    .where("email", "==", email.toLowerCase())
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0];
}

async function findUserDocByStripeCustomerId(stripeCustomerId: string) {
  const db = getAdminDb();
  const snap = await db
    .collection("users")
    .where("stripeCustomerId", "==", stripeCustomerId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0];
}

async function upsertVip(params: {
  uid?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  vip: boolean;
  vipUntil?: Date | null;
}) {
  const { uid, email, stripeCustomerId, stripeSubscriptionId, vip, vipUntil } =
    params;

  const db = getAdminDb();

  // ✅ PRIORIDADE MÁXIMA: se veio uid, grava direto em users/{uid} (cria o doc se não existir)
  if (uid) {
    const ref = db.collection("users").doc(uid);

    await ref.set(
      {
        uid,
        email: email ?? null,
        vip,
        stripeCustomerId: stripeCustomerId ?? null,
        stripeSubscriptionId: stripeSubscriptionId ?? null,
        vipUntil: vipUntil
          ? admin.firestore.Timestamp.fromDate(vipUntil)
          : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return;
  }

  // Fallback: sem uid => tenta localizar por customerId/email
  let docRef:
    | FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
    | null = null;

  if (!docRef && stripeCustomerId) {
    const snap = await findUserDocByStripeCustomerId(stripeCustomerId);
    if (snap) docRef = snap.ref;
  }

  if (!docRef && email) {
    const snap = await findUserDocByEmail(email);
    if (snap) docRef = snap.ref;
  }

  if (!docRef) return; // usuário não encontrado, não quebra o webhook

  await docRef.set(
    {
      email: email ?? null,
      vip,
      stripeCustomerId: stripeCustomerId ?? null,
      stripeSubscriptionId: stripeSubscriptionId ?? null,
      vipUntil: vipUntil ? admin.firestore.Timestamp.fromDate(vipUntil) : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "ENV ausente: STRIPE_WEBHOOK_SECRET" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Header stripe-signature ausente" },
        { status: 400 }
      );
    }

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Assinatura inválida no webhook: ${err?.message ?? "erro"}` },
        { status: 400 }
      );
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const uid = (session.metadata?.uid ?? "").trim() || null;

        const email =
          (session.customer_details?.email ??
            session.customer_email ??
            null)?.toLowerCase() ?? null;

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

        // Marca VIP como true. vipUntil normalmente vem com invoice.payment_succeeded.
        await upsertVip({
          uid,
          email,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          vip: true,
          vipUntil: null,
        });

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        const email = (invoice.customer_email ?? null)?.toLowerCase() ?? null;

        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? null;

        const subscriptionId = getInvoiceSubscriptionId(invoice);

        const line = invoice.lines?.data?.[0];
        const periodEndUnix = line?.period?.end;

        await upsertVip({
          uid: null,
          email,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          vip: true,
          vipUntil: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
        });

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const customerId =
          typeof sub.customer === "string"
            ? sub.customer
            : sub.customer?.id ?? null;

        const subscriptionId = sub.id ?? null;

        // Cancelou => remove VIP
        await upsertVip({
          uid: null,
          email: null,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          vip: false,
          vipUntil: null,
        });

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Erro interno no webhook" },
      { status: 500 }
    );
  }
}
