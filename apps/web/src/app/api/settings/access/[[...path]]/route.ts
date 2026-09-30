import { forwardRequest } from "@/lib/apiProxy";
import type { NextRequest } from "next/server";

type Ctx = { params: Promise<{ path?: string[] }> };

async function targetPath(params: { path?: string[] }): Promise<string> {
  const segments = params.path ?? [];
  return `/settings/access/${segments.map(encodeURIComponent).join("/")}`;
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const params = await ctx.params;
  return forwardRequest(request, await targetPath(params), { requireAuth: true });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const params = await ctx.params;
  return forwardRequest(request, await targetPath(params), { requireAuth: true });
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const params = await ctx.params;
  return forwardRequest(request, await targetPath(params), { requireAuth: true });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const params = await ctx.params;
  return forwardRequest(request, await targetPath(params), { requireAuth: true });
}
