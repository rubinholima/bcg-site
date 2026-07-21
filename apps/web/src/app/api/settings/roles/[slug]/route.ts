import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

type Ctx = { params: Promise<{ slug: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  return forwardRequest(request, `/settings/roles/${encodeURIComponent(slug)}`, {
    requireAuth: true,
  });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  return forwardRequest(request, `/settings/roles/${encodeURIComponent(slug)}`, {
    requireAuth: true,
  });
}
