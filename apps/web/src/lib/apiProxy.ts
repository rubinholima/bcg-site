import { NextRequest, NextResponse } from "next/server";

/**
 * Obtém a URL base da API backend (NestJS).
 * 
 * Usa API_BASE_URL (server-side only) com fallback para localhost:3001 em dev.
 * 
 * - DEV: http://localhost:3001
 * - PROD: https://api.bostoncitygroup.biz
 */
export function getApiBaseUrl(): string {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
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

  // Adiciona Content-Type se não for pulado e se não estiver definido
  if (!skipContentType && !headers["Content-Type"]) {
    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    } else {
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
    const contentType = res.headers.get("content-type");
    let responseData: any;
    
    if (contentType?.includes("application/json")) {
      try {
        responseData = await res.json();
      } catch {
        responseData = await res.text();
      }
    } else {
      responseData = await res.text();
    }

    // Prepara headers da resposta
    const nextResponseHeaders: Record<string, string> = { ...responseHeaders };
    
    // Copia headers relevantes do backend (exceto alguns que o Next.js gerencia)
    const headersToCopy = ["content-type", "cache-control", "content-disposition"];
    headersToCopy.forEach((headerName) => {
      const value = res.headers.get(headerName);
      if (value) {
        nextResponseHeaders[headerName] = value;
      }
    });

    // Retorna resposta com mesmo status
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
