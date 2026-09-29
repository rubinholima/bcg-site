import { buildWhatsAppUrl } from "@/lib/whatsapp-url";

/** Telefone operacional de agendamento (captação) — não usar telefone do agente. */
export const CAPTACAO_SCHEDULER_PHONE = "33984133636";

export function buildCaptacaoSchedulerWhatsAppUrl(message: string): string | null {
  return buildWhatsAppUrl(CAPTACAO_SCHEDULER_PHONE, message);
}
