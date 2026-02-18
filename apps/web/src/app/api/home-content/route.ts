import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function GET(request: NextRequest) {
  return forwardRequest(request, "/home-content", { requireAuth: true });
}

export async function PATCH(request: NextRequest) {
  return forwardRequest(request, "/home-content", { requireAuth: true });
}
