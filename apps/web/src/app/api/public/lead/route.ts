import { NextRequest, NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/lead
 * Leads de formulários públicos (imobiliária, Boston City Hall, etc.).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message, eventType, guestCount, preferredDate, _slug, venue } = body ?? {};
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Nome, email e mensagem são obrigatórios" },
        { status: 400 },
      );
    }

    const isBch =
      venue === "boston-city-hall" ||
      _slug === "solicitar" ||
      String(message).toLowerCase().includes("boston city hall");

    if (isBch) {
      const res = await fetch(buildBackendUrl("/public/venue-lead"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          message,
          eventType,
          guestCount,
          preferredDate,
          venue: "boston-city-hall",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: (err as { message?: string }).message ?? "Erro ao registrar solicitação" },
          { status: res.status },
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }
}
