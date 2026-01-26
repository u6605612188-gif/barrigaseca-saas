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

  return new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });
}

// ---------- Type helpers ----------
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
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

async function resolveUserRef(params: {
  uid?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
}) {
  const db = getAdminDb();

  // prioridade: uid
  if (params.uid) return db.collection("users").doc(params.uid);

  // fallback: customerId -> email
  if (params.stripeCustomerId) {
    const snap = await findUserDocByStripeCustomerId(params.stripeCustomerId);
    if (snap) return snap.ref;
  }

  if (params.email) {
    const snap = await findUserDocByEmail(params.email);
    if (snap) return snap.ref;
  }

  return null;
}

function toTs(d: Date | null | undefined) {
  return d ? admin.firestore.Timestamp.fromDate(d) : null;
}

const USERS = "users";
const EVENTS = "stripeEvents";

/**
 * Modelo novo (ciclos):
 * - unlockedCycles: soma +1 a cada invoice.payment_succeeded (renovação / cobrança confirmada)
 * - checkout.session.completed: só garante vínculo e marca vip true (sem somar ciclo, pra não duplicar)
 * - subscription.deleted: desativa vip/vipUntil, mas NÃO reduz unlockedCycles (ciclos já desbloqueados continuam)
 *
 * Hardening:
 * - createdAt nunca mais é sobrescrito (só setado se doc não existir)
 * - idempotência por event.id (não soma 2x)
 */
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

    const db = getAdminDb();

    // ---- Idempotência por event.id (evita somar ciclos 2x) ----
    const eventRef = db.collection(EVENTS).doc(event.id);

    try {
      await db.runTransaction(async (tx) => {
        const evSnap = await tx.get(eventRef);
        if (evSnap.exists) {
          // já processado
          throw new Error("__EVENT_ALREADY_PROCESSED__");
        }

        // marca como visto (antes de escrever efeitos) para travar duplicidade
        tx.create(eventRef, {
          type: event.type,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (e: any) {
      if (String(e?.message) === "__EVENT_ALREADY_PROCESSED__") {
        return NextResponse.json({ received: true, dedup: true }, { status: 200 });
      }
      throw e;
    }

    // ---- Processamento por tipo ----
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

        const userRef = await resolveUserRef({
          uid,
          email,
          stripeCustomerId: customerId,
        });

        // usuário não encontrado (não quebra webhook)
        if (!userRef) break;

        await db.runTransaction(async (tx) => {
          const snap = await tx.get(userRef);

          // createdAt: só se o doc não existir
          if (!snap.exists) {
            tx.set(
              userRef,
              {
                uid: uid ?? userRef.id,
                email: email ?? null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          }

          tx.set(
            userRef,
            {
              // vínculo e flags legado
              uid: uid ?? userRef.id,
              email: email ?? null,
              vip: true,
              stripeCustomerId: customerId ?? null,
              stripeSubscriptionId: subscriptionId ?? null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
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
        const vipUntil = periodEndUnix ? new Date(periodEndUnix * 1000) : null;

        const userRef = await resolveUserRef({
          uid: null,
          email,
          stripeCustomerId: customerId,
        });

        if (!userRef) break;

        await db.runTransaction(async (tx) => {
          const snap = await tx.get(userRef);

          // createdAt: só se faltando
          if (!snap.exists) {
            tx.set(
              userRef,
              {
                uid: userRef.id,
                email: email ?? null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          }

          // ✅ Core: a cada cobrança confirmada soma +1 ciclo liberado
          tx.set(
            userRef,
            {
              email: email ?? null,
              vip: true,
              vipUntil: toTs(vipUntil),
              stripeCustomerId: customerId ?? null,
              stripeSubscriptionId: subscriptionId ?? null,
              unlockedCycles: admin.firestore.FieldValue.increment(1),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
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

        const userRef = await resolveUserRef({
          uid: null,
          email: null,
          stripeCustomerId: customerId,
        });

        if (!userRef) break;

        await db.runTransaction(async (tx) => {
          const snap = await tx.get(userRef);
          if (!snap.exists) return;

          // ✅ não reduz unlockedCycles (ciclos já desbloqueados permanecem)
          tx.set(
            userRef,
            {
              vip: false,
              vipUntil: null,
              stripeCustomerId: customerId ?? null,
              stripeSubscriptionId: subscriptionId ?? null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
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
