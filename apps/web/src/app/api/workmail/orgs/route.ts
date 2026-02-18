import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * GET /api/workmail/orgs - lista empresas (proxy com Bearer do cookie).
 */
export async function GET(request: NextRequest) {
  return forwardRequest(request, "/api/workmail/orgs", { requireAuth: true });
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const msg = json.message ?? text;
      return NextResponse.json({ error: msg }, { status: res.status });
    } catch {
      return NextResponse.json(
        { error: text || "Erro ao carregar empresas" },
        { status: res.status },
      );
    }
  }
  const data = await res.json();
  return NextResponse.json(data);
}
