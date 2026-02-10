import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/get-api-token";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const res = await fetch(`${apiUrl}/api/vault/items/${id}/copy`, {
    method: "POST",
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
