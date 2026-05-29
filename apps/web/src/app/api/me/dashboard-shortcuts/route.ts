import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function GET(request: NextRequest) {
  return forwardRequest(request, "/me/dashboard-shortcuts", { requireAuth: true });
}

export async function PATCH(request: NextRequest) {
  return forwardRequest(request, "/me/dashboard-shortcuts", { requireAuth: true });
}
