const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const api = {
  async get<T>(path: string, init?: RequestInit): Promise<{ data: T }> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
    const data = (await res.json().catch(() => ({}))) as T;
    return { data };
  },
  async post<T>(path: string, body?: unknown, init?: RequestInit): Promise<{ data: T }> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
    const data = (await res.json().catch(() => ({}))) as T;
    return { data };
  },
  async patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<{ data: T }> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
    const data = (await res.json().catch(() => ({}))) as T;
    return { data };
  },
  async delete(path: string, init?: RequestInit): Promise<void> {
    const res = await fetch(`${baseUrl}${path}`, { method: "DELETE", ...init });
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  },
};
