import { NextRequest, NextResponse } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

async function proxyChangePassword(request: NextRequest) {
  return forwardRequest(request, "/me/change-password", { requireAuth: true });
}

/** PATCH /api/me/change-password — troca obrigatória no primeiro login. */
export async function PATCH(request: NextRequest) {
  return proxyChangePassword(request);
}

/** POST — alias para compatibilidade. */
export async function POST(request: NextRequest) {
  return proxyChangePassword(request);
}
