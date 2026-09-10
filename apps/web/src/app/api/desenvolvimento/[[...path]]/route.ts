import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

type Ctx = { params: Promise<{ path?: string[] }> };

async function proxy(request: NextRequest, ctx: Ctx, method: "GET" | "POST" | "PATCH" | "DELETE") {
  const { path = [] } = await ctx.params;
  const suffix = path.length ? `/${path.join("/")}` : "";
  const q = request.nextUrl.searchParams.toString();
  return forwardRequest(request, `/desenvolvimento${suffix}${q ? `?${q}` : ""}`, {
    requireAuth: true,
    method,
  });
}

export async function GET(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx, "GET");
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx, "POST");
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx, "PATCH");
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx, "DELETE");
}
