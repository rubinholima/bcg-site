import { buildBackendUrl } from "@/lib/apiProxy";

/** Extrai mensagem legível da resposta de erro (JSON { error, message } ou texto) */
async function getErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => res.statusText);
  try {
    const json = JSON.parse(text) as { error?: string; message?: string | string[] };
    const msg = json?.error ?? json?.message;
    if (Array.isArray(msg)) return msg.join("; ");
    return (typeof msg === "string" ? msg : null) ?? (text || res.statusText);
  } catch {
    if (text && text.length < 200 && !text.startsWith("<")) return text;
    const code = res.status;
    if (code === 405) return "Método não permitido (405). Faça o deploy no servidor e verifique CloudFront.";
    if (code === 403) return "Acesso negado (403). Verifique CloudFront: Allowed HTTP Methods deve incluir POST.";
    if (code === 401) return "Não autenticado. Faça login novamente.";
    return res.statusText || `Erro ${code}`;
  }
}

function getFetchUrl(path: string): string {
  const fullPath = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return `/api${fullPath}`;
  }
  return buildBackendUrl(fullPath);
}

async function getServerHeaders(init?: RequestInit): Promise<Record<string, string>> {
  const base: Record<string, string> = { "Content-Type": "application/json", ...(init?.headers as Record<string, string>) };
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value ?? cookieStore.get("id_token")?.value;
    if (token) base.Authorization = `Bearer ${token}`;
  } catch {
    // cookies() pode falhar fora de request (ex: build)
  }
  return base;
}

export const api = {
  async get<T>(path: string, init?: RequestInit): Promise<{ data: T }> {
    const url = getFetchUrl(path);
    const headers = typeof window !== "undefined" ? { "Content-Type": "application/json", ...init?.headers } : await getServerHeaders(init);
    const browserCache: RequestInit =
      typeof window !== "undefined" ? { cache: "no-store" as RequestCache } : {};
    const res = await fetch(url, { ...browserCache, ...init, headers, credentials: "include" });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    const data = (await res.json().catch(() => ({}))) as T;
    return { data };
  },
  async post<T>(path: string, body?: unknown, init?: RequestInit): Promise<{ data: T }> {
    const url = getFetchUrl(path);
    const headers = typeof window !== "undefined" ? { "Content-Type": "application/json", ...init?.headers } : await getServerHeaders(init);
    const res = await fetch(url, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
      headers,
      credentials: "include",
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    const data = (await res.json().catch(() => ({}))) as T;
    return { data };
  },
  async patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<{ data: T }> {
    const url = getFetchUrl(path);
    const headers = typeof window !== "undefined" ? { "Content-Type": "application/json", ...init?.headers } : await getServerHeaders(init);
    const res = await fetch(url, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
      headers,
      credentials: "include",
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    const data = (await res.json().catch(() => ({}))) as T;
    return { data };
  },
  async delete(path: string, init?: RequestInit): Promise<void> {
    const url = getFetchUrl(path);
    const headers = typeof window !== "undefined" ? {} : await getServerHeaders(init);
    const res = await fetch(url, { method: "DELETE", ...init, headers, credentials: "include" });
    if (!res.ok) throw new Error(await getErrorMessage(res));
  },
  /** POST com FormData (para upload de arquivos). Não define Content-Type para o browser definir o boundary. */
  async postForm<T>(path: string, formData: FormData, init?: RequestInit): Promise<{ data: T }> {
    const url = getFetchUrl(path);
    const headers: Record<string, string> =
      typeof window !== "undefined" ? {} : await getServerHeaders(init);
    delete headers["Content-Type"]; // FormData precisa que o browser defina multipart boundary
    const res = await fetch(url, {
      method: "POST",
      body: formData,
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string>) },
      credentials: "include",
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    const data = (await res.json().catch(() => ({}))) as T;
    return { data };
  },
};
