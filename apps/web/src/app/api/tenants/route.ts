import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

const opts = { requireAuth: true };

export async function GET(request: NextRequest) {
  return forwardRequest(request, "/tenants", opts);
}

export async function POST(request: NextRequest) {
  return forwardRequest(request, "/tenants", opts);
}
