import { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/apiProxy";

/**
 * Catch-all para /api/* sem rota específica no Next.
 * Encaminha para o backend (3001) com path correto:
 * - /api/workmail/* e /api/vault/* → backend /api/workmail/* e /api/vault/* (Nest usa @Controller('api/...'))
 * - Demais → backend sem prefixo /api (ex.: /api/group → /group, /api/tenants → /tenants)
 * Cookie é convertido em Authorization: Bearer quando presente (forwardRequest).
 */
function getBackendPath(pathname: string): string {
  if (pathname.startsWith("/api/workmail") || pathname.startsWith("/api/vault") || pathname.startsWith("/api/fmf-scraper")) {
    return pathname;
  }
  const withoutApi = pathname.replace(/^\/api/, "") || "/";
  return withoutApi;
}

async function handle(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const backendPath = getBackendPath(pathname);
  return forwardRequest(request, backendPath, { requireAuth: false });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function PATCH(request: NextRequest) {
  return handle(request);
}

export async function PUT(request: NextRequest) {
  return handle(request);
}

export async function DELETE(request: NextRequest) {
  return handle(request);
}

export async function HEAD(request: NextRequest) {
  return handle(request);
}

export async function OPTIONS(request: NextRequest) {
  return handle(request);
}
