import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

type Ctx = { params: Promise<{ path?: string[] }> };

async function proxy(request: NextRequest, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  const suffix = path.length ? `/${path.join("/")}` : "";
  const q = request.nextUrl.searchParams.toString();
  return forwardRequest(request, `/desenvolvimento${suffix}${q ? `?${q}` : ""}`, {
    requireAuth: true,
  });
}

export async function GET(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx);
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return proxy(request, ctx);
}
