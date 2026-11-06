/**
 * Normalização compatível com Edge Runtime e com o backend (`normalizePublicHostname`).
 * Usa `URL` para conversão IDN → punycode (hostname ASCII).
 */
const MAX_HOSTNAME_LEN = 253;
const HOSTNAME_ASCII_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function normalizePublicHostnameForEdge(input: string): string {
  let s = input.trim();
  if (!s) throw new Error("Hostname vazio.");
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const cut = s.search(/[/?#]/);
  if (cut !== -1) s = s.slice(0, cut);
  s = s.replace(/:\d+$/, "").trim();
  s = s.replace(/\.$/, "").trim().toLowerCase();
  if (s.length > MAX_HOSTNAME_LEN) throw new Error("Hostname muito longo.");
  if (s.includes("*") || s.includes("..") || s.startsWith(".")) throw new Error("Hostname inválido.");

  let ascii: string;
  try {
    ascii = new URL(`https://${s}`).hostname.toLowerCase();
  } catch {
    throw new Error("Hostname inválido.");
  }

  if (!HOSTNAME_ASCII_RE.test(ascii)) {
    throw new Error("Formato de hostname inválido.");
  }
  return ascii;
}

export async function signCup360EdgeHost(
  secret: string,
  hostnameRaw: string,
): Promise<{ ts: string; sig: string; hostNormalized: string }> {
  const hostNormalized = normalizePublicHostnameForEdge(hostnameRaw);
  const ts = Math.floor(Date.now() / 1000).toString();
  const payload = `${ts}.${hostNormalized}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const sig = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { ts, sig, hostNormalized };
}
