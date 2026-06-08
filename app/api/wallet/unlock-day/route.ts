import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { spendCoinsForDayUnlock } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [type, token] = header.split(" ");
  return type?.toLowerCase() === "bearer" ? token : null;
}

export async function POST(request: Request) {
  try {
    const token = bearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Token ausente." }, { status: 401 });
    }

    const decoded = await getAdminAuth().verifyIdToken(token);
    const body = (await request.json()) as { day?: unknown };
    const day = Number(body.day);

    const result = await spendCoinsForDayUnlock(decoded.uid, day);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel desbloquear o dia.";
    const status = message.includes("insuficientes") ? 402 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
