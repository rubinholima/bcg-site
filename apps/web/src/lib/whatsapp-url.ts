/**
 * Monta URL wa.me com mensagem pré-preenchida (WhatsApp manual, sem API).
 */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;

  let normalized = digits;
  if (normalized.length <= 11 && !normalized.startsWith("55")) {
    normalized = `55${normalized}`;
  }

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
