import { NextRequest } from "next/server";

/**
 * Lê o token JWT dos cookies para uso em proxies que repassam ao backend Nest.
 * Mesma regra dos proxies /api/me e /api/users: preferir access_token, fallback id_token.
 */
export function getToken(request: NextRequest): string | null {
  const idToken = request.cookies.get("id_token")?.value;
  const accessToken = request.cookies.get("access_token")?.value;
  return accessToken ?? idToken ?? null;
}
