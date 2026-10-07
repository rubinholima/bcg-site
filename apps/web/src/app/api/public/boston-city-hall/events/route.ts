import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return forwardRequest(request, "/public/boston-city-hall/events", {
    cache: "no-store",
    responseHeaders: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
