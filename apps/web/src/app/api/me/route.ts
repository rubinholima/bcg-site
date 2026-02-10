import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Proxy para GET /me do backend.
 * Lê o token do cookie (httpOnly) e envia Authorization: Bearer ao backend.
 * O browser envia os cookies automaticamente para esta rota (mesma origem).
 */
export async function GET(request: NextRequest) {
  const idToken = request.cookies.get("id_token")?.value;
  const accessToken = request.cookies.get("access_token")?.value;
  const token = accessToken ?? idToken;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${apiUrl}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 401 ? "Unauthorized" : "Error" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const code =
      (err as NodeJS.ErrnoException)?.code ??
      (err as { cause?: { code?: string } })?.cause?.code;
    if (code === "ECONNREFUSED" || code === "ECONNRESET") {
      return NextResponse.json(
        { error: "api_unavailable" },
        { status: 503 },
      );
    }
    throw err;
  }
}
