// Checkout VIP direto no Stripe (sem passar por telas intermediarias).
// Redireciona a aba atual para a URL de checkout retornada pela API.
export async function startVipCheckout(
  uid: string | null | undefined,
  email: string | null | undefined
): Promise<{ ok: boolean; error?: string }> {
  if (!uid) return { ok: false, error: "not-logged" };

  try {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, email: email ?? null }),
    });

    let data: { url?: string; error?: string } = {};
    try {
      data = (await res.json()) as { url?: string; error?: string };
    } catch {}

    if (!res.ok || !data?.url) {
      return { ok: false, error: data?.error || "checkout-failed" };
    }

    window.location.href = data.url;
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "checkout-failed" };
  }
}
