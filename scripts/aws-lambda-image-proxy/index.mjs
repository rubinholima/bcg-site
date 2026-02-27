/**
 * AWS Lambda — proxy de imagens para feeds (Instagram, etc.)
 * IPs da AWS podem evitar bloqueio do Instagram no servidor de origem.
 *
 * Deploy: zip index.mjs e criar Lambda com Function URL
 * Uso: https://xxx.lambda-url.region.on.aws/?url=ENCODED_IMAGE_URL
 */
export const handler = async (event) => {
  const target =
    event.queryStringParameters?.url ??
    (event.rawQueryString ? new URLSearchParams(event.rawQueryString).get("url") : null);
  if (!target) {
    return { statusCode: 400, body: "?url= obrigatório", headers: { "Content-Type": "text/plain" } };
  }
  try {
    const decoded = decodeURIComponent(target);
    if (!decoded.startsWith("http://") && !decoded.startsWith("https://")) {
      return { statusCode: 400, body: "URL inválida", headers: { "Content-Type": "text/plain" } };
    }
    const res = await fetch(decoded, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) return { statusCode: res.status, body: "" };
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const body = await res.arrayBuffer();
    const base64 = Buffer.from(body).toString("base64");
    return {
      statusCode: 200,
      body: base64,
      isBase64Encoded: true,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    };
  } catch {
    return { statusCode: 502, body: "" };
  }
};
