import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/get-api-token";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${apiUrl}/api/vault/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: res.status === 403 ? "Acesso negado" : res.status === 401 ? "Não autorizado" : text },
      { status: res.status },
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}
