import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/lead
 * Recebe leads do formulário de captura (imobiliária, etc).
 * Por ora retorna sucesso; integrar depois com email/CRM.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body ?? {};
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Nome, email e mensagem são obrigatórios" },
        { status: 400 }
      );
    }
    // TODO: enviar email, salvar em CRM, etc.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }
}
