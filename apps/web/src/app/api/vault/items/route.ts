import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/get-api-token";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  const tenantId = searchParams.get("tenantId");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  if (tenantId) params.set("tenantId", tenantId);
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  const qs = params.toString();
  const res = await fetch(`${apiUrl}/api/vault/items${qs ? `?${qs}` : ""}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
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

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const res = await fetch(`${apiUrl}/api/vault/items`, {
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
