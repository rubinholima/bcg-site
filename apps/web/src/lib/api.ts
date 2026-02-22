import { buildBackendUrl } from "@/lib/apiProxy";

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
    const res = await fetch(url, { ...init, headers });
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
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
    });
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
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
    });
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
    const data = (await res.json().catch(() => ({}))) as T;
    return { data };
  },
  async delete(path: string, init?: RequestInit): Promise<void> {
    const url = getFetchUrl(path);
    const headers = typeof window !== "undefined" ? {} : await getServerHeaders(init);
    const res = await fetch(url, { method: "DELETE", ...init, headers });
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  },
};
