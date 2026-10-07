import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return forwardRequest(request, "/public/boston-city-hall/my-tickets/request-access");
}
