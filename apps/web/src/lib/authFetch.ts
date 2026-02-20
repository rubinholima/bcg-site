"use client";

/**
 * Fetch para rotas da nossa API (Next.js) que usam cookies de auth.
 * Em 401: tenta renovar o token via /api/auth/refresh e repete a requisição uma vez.
 * Assim o token expirado não derruba o usuário — a sessão é renovada em background.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const opts: RequestInit = { credentials: "include", ...init };
  let res = await fetch(input, opts);

  if (res.status === 401) {
    const refreshRes = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (refreshRes.ok) {
      res = await fetch(input, opts);
    } else if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
      // Só redireciona para login em rotas protegidas; páginas públicas (/, /portfolio, etc.) não exigem sessão
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?reason=session_expired&next=${next}`;
      return res;
    }
  }

  return res;
}
