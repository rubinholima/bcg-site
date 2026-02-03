import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/get-api-token";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function parseError(res: Response, text: string): { message: string } {
  try {
    const json = JSON.parse(text);
    const msg = Array.isArray(json.message) ? json.message.join(", ") : json.message ?? text;
    return { message: msg };
  } catch {
    return { message: text || "Erro na requisição" };
  }
}

/**
 * POST /api/workmail/accounts/reset-password - redefine senha.
 */
export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const res = await fetch(`${apiUrl}/api/workmail/accounts/reset-password`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(parseError(res, text), { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data);
}
