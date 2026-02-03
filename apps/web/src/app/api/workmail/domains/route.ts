import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/get-api-token";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * GET /api/workmail/domains?workmailOrganizationId= - domínios custom extraídos dos emails existentes (ListUsers).
 */
export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const workmailOrganizationId = searchParams.get("workmailOrganizationId") ?? "";
  const res = await fetch(
    `${apiUrl}/api/workmail/domains?workmailOrganizationId=${encodeURIComponent(workmailOrganizationId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const msg = json.message ?? json.error ?? text;
      return NextResponse.json({ error: msg }, { status: res.status });
    } catch {
      return NextResponse.json(
        { error: text || "Erro ao carregar domínios" },
        { status: res.status },
      );
    }
  }
  const data = await res.json();
  return NextResponse.json(data);
}
