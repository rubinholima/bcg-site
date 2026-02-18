import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

export async function GET(request: NextRequest) {
  return forwardRequest(request, "/pages", { requireAuth: true });
}

export async function POST(request: NextRequest) {
  return forwardRequest(request, "/pages", { requireAuth: true });
}
