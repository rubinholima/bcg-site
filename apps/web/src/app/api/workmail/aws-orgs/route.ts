import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/get-api-token";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * GET /api/workmail/aws-orgs - lista organizações WorkMail da AWS (proxy com Bearer do cookie).
 */
export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${apiUrl}/api/workmail/aws-orgs`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const msg = json.message ?? json.error ?? text;
      return NextResponse.json({ error: msg }, { status: res.status });
    } catch {
      return NextResponse.json(
        { error: text || "Erro ao carregar organizações" },
        { status: res.status },
      );
    }
  }
  const data = await res.json();
  return NextResponse.json(data);
}
