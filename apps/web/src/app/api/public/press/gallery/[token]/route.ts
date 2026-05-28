import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  return forwardRequest(_request, `/public/press/gallery/${encodeURIComponent(token)}`, { cache: "no-store" });
}
