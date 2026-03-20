import { NextRequest, NextResponse } from "next/server";

/**
 * Obtém a URL base da API backend (NestJS).
 * Nunca use getApiBaseUrl/buildBackendUrl para assets (imagens, logos); use buildAssetUrl (lib/assetUrl.ts).
 *
 * - No browser: retorna "/api" para que fetches usem as rotas Next.js (Nginx proxy para o backend).
 * - No server: retorna API_BASE_URL ou fallback para dev (127.0.0.1:3001).
 */
export function getApiBaseUrl(): string {
  const isBrowser = typeof window !== "undefined";

  if (isBrowser) {
    return "/api";
  }

  return process.env.API_BASE_URL || "http://127.0.0.1:3001";
}

/**
 * URL do backend para fetches no SERVIDOR que devem ir direto ao Nest (ex: home page).
 * NUNCA passa por Nginx/proxy — evita dados errados e corrupção de UTF-8.
 * Use em fetchGroupHomeFromBackend, fetchGroup (server), fetchPublicPortfolio (server).
 *
 * Local e produção (mesmo host): não definir API_INTERNAL_URL → usa http://127.0.0.1:3001.
 * Produção (API em outro host/rede): definir API_INTERNAL_URL com a URL interna do Nest (ex: http://bcg-api:3001).
 */
export function getServerBackendBaseUrl(): string {
  if (typeof window !== "undefined") return "/api";
  return process.env.API_INTERNAL_URL || "http://127.0.0.1:3001";
}

/**
 * Origem do Nest para fetch no servidor (SSR), alinhada a `forwardRequest` / `getApiBaseUrl` no Node.
 * Prioriza `API_BASE_URL` quando definida (comum em deploy).
 */
export function getBackendOriginForServerFetch(): string {
  return (process.env.API_BASE_URL || process.env.API_INTERNAL_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
}

/** URL base do app (Next.js) para fetches server-side às rotas /api. */
export function getAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (url && !url.includes("localhost") && !url.includes("127.0.0.1")) return url;
  return "http://localhost:3000";
}

/**
 * Constrói a URL completa do backend a partir de um path.
 * 
 * @param path - Path do endpoint (ex: "/tenants", "/public/tenants/:slug")
 * @param search - Query string opcional (ex: "?type=club&limit=10")
 */
export function buildBackendUrl(path: string, search?: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;
  /** Evita ?key=a?key=b quando o path já traz query (ex.: proxy mal montado). */
  if (cleanPath.includes("?")) {
    return url;
  }
  return search ? `${url}${search.startsWith("?") ? search : `?${search}`}` : url;
}

/**
 * Extrai o token de autenticação dos cookies da requisição.
 * 
 * Prioridade: access_token > id_token
 */
export function getToken(request: NextRequest): string | null {
  const idToken = request.cookies.get("id_token")?.value;
  const accessToken = request.cookies.get("access_token")?.value;
  return accessToken ?? idToken ?? null;
}

/**
 * Opções para o forwardRequest
 */
export interface ForwardRequestOptions {
  /** Se true, requer autenticação (retorna 401 se não houver token) */
  requireAuth?: boolean;
  /** Headers adicionais para enviar ao backend */
  headers?: Record<string, string>;
  /** Se true, não envia Content-Type automaticamente (útil para multipart/form-data) */
  skipContentType?: boolean;
  /** Cache options para a resposta */
  cache?: RequestCache;
  /** Headers customizados para a resposta Next.js */
  responseHeaders?: Record<string, string>;
}

/**
 * Faz proxy de uma requisição Next.js para o backend NestJS.
 * 
 * Encaminha método, headers relevantes (Authorization, Cookie, Content-Type),
 * body e querystring. Retorna status e body do backend sem alterar.
 * 
 * @param request - Requisição Next.js
 * @param backendPath - Path do endpoint no NestJS (ex: "/tenants", "/public/tenants/:slug")
 * @param options - Opções de configuração
 */
export async function forwardRequest(
  request: NextRequest,
  backendPath: string,
  options: ForwardRequestOptions = {}
): Promise<NextResponse> {
  const {
    requireAuth = false,
    headers: extraHeaders = {},
    skipContentType = false,
    cache = "no-store",
    responseHeaders = {},
  } = options;

  // Verifica autenticação se necessário
  if (requireAuth) {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Monta URL do backend
  const searchParams = request.nextUrl.searchParams.toString();
  const search = searchParams ? `?${searchParams}` : undefined;
  const backendUrl = buildBackendUrl(backendPath, search);

  // Prepara headers
  const headers: Record<string, string> = { ...extraHeaders };

  // Adiciona Authorization se houver token
  const token = getToken(request);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Content-Type: preserva o original (multipart/form-data com boundary) ou usa JSON
  const contentType = request.headers.get("content-type");
  if (!headers["Content-Type"]) {
    if (contentType) {
      headers["Content-Type"] = contentType;
    } else if (!skipContentType) {
      headers["Content-Type"] = "application/json";
    }
  }

  // Copia cookies relevantes (se necessário)
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  // Prepara body
  let body: BodyInit | undefined;
  const method = request.method;
  if (method !== "GET" && method !== "HEAD") {
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("multipart/form-data") || contentType?.includes("application/octet-stream")) {
      // Para multipart/form-data ou binário, usa arrayBuffer
      body = await request.arrayBuffer();
    } else {
      // Para JSON ou texto, tenta ler como texto
      try {
        const text = await request.text();
        body = text || undefined;
      } catch {
        // Se falhar, tenta arrayBuffer
        body = await request.arrayBuffer();
      }
    }
  }

  // Faz a requisição ao backend
  try {
    const res = await fetch(backendUrl, {
      method,
      headers,
      body,
      cache,
    });

    // Lê a resposta
    const contentType = res.headers.get("content-type") ?? "";
    const isBinary =
      contentType.includes("application/pdf") ||
      contentType.includes("application/octet-stream");

    // Prepara headers da resposta
    const nextResponseHeaders: Record<string, string> = { ...responseHeaders };
    const headersToCopy = ["content-type", "cache-control", "content-disposition"];
    headersToCopy.forEach((headerName) => {
      const value = res.headers.get(headerName);
      if (value) {
        nextResponseHeaders[headerName] = value;
      }
    });

    // Respostas binárias (PDF, etc): repassa o buffer
    if (isBinary) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        status: res.status,
        headers: nextResponseHeaders,
      });
    }

    // JSON ou texto
    let responseData: unknown;
    if (contentType.includes("application/json")) {
      try {
        responseData = await res.json();
      } catch {
        responseData = await res.text();
      }
    } else {
      responseData = await res.text();
    }

    if (contentType.includes("application/json") && !nextResponseHeaders["content-type"]?.includes("charset")) {
      nextResponseHeaders["content-type"] = "application/json; charset=utf-8";
    }

    if (typeof responseData === "string") {
      return new NextResponse(responseData, {
        status: res.status,
        headers: nextResponseHeaders,
      });
    }

    return NextResponse.json(responseData, {
      status: res.status,
      headers: nextResponseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao comunicar com o backend";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
