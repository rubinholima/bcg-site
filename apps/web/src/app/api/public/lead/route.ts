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
    const { name, email, phone, message, eventType, guestCount, preferredDate, _slug, venue, tenantSlug, blockId } = body ?? {};
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

    const tenant = typeof tenantSlug === "string" ? tenantSlug.trim() : "";
    if (tenant && !isBch) {
      const res = await fetch(buildBackendUrl(`/public/tenants/${encodeURIComponent(tenant)}/site-lead`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message, blockId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          { error: (data as { message?: string }).message ?? "Erro ao registrar lead" },
          { status: res.status },
        );
      }
      return NextResponse.json(data);
    }

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

    return NextResponse.json(
      { error: "Lead não aceito — informe o tenant ou use o fluxo BCH." },
      { status: 400 },
    );
  } catch {
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }
}
