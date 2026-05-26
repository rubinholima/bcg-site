"use client";

import { useState } from "react";
import { Copy, Loader2, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";

interface InviteResponse {
  url: string;
  emailSent?: boolean;
  emailError?: string;
  noContact?: boolean;
  contactPhone?: string | null;
  whatsappMessage?: string;
}

interface RegistrationInviteCardProps {
  subjectType: "player" | "employee";
  subjectId: string;
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export function RegistrationInviteCard({
  subjectType,
  subjectId,
  name,
  contactEmail,
  contactPhone,
}: RegistrationInviteCardProps) {
  const [loading, setLoading] = useState<"email" | "whatsapp" | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  const basePath =
    subjectType === "player"
      ? `/registration-invites/player/${encodeURIComponent(subjectId)}`
      : `/registration-invites/employee/${encodeURIComponent(subjectId)}`;

  const handleEmail = async () => {
    setLoading("email");
    setFeedback(null);
    try {
      const { data } = await api.post<InviteResponse>(basePath, { sendEmail: true });
      setLastUrl(data.url);
      if (data.emailSent) {
        setFeedback({ type: "ok", msg: `Link enviado por e-mail para ${contactEmail?.trim() || "o contato cadastrado"}.` });
      } else if (data.noContact) {
        setFeedback({
          type: "error",
          msg: "Sem e-mail de contato cadastrado. Copie o link abaixo ou use WhatsApp.",
        });
      } else {
        setFeedback({ type: "error", msg: data.emailError ?? "Erro ao enviar e-mail." });
      }
    } catch {
      setFeedback({ type: "error", msg: "Erro ao gerar convite. Tente novamente." });
    } finally {
      setLoading(null);
    }
  };

  const handleWhatsApp = async () => {
    setLoading("whatsapp");
    setFeedback(null);
    try {
      const { data } = await api.post<InviteResponse>(`${basePath}/whatsapp`, {});
      setLastUrl(data.url);
      const phone = data.contactPhone ?? contactPhone;
      const waUrl = buildWhatsAppUrl(phone, data.whatsappMessage ?? data.url);
      if (!waUrl) {
        setFeedback({
          type: "error",
          msg: "Sem telefone cadastrado. Copie o link abaixo e envie manualmente.",
        });
        return;
      }
      window.open(waUrl, "_blank", "noopener,noreferrer");
      setFeedback({ type: "ok", msg: "WhatsApp aberto com a mensagem pronta." });
    } catch {
      setFeedback({ type: "error", msg: "Erro ao gerar link. Tente novamente." });
    } finally {
      setLoading(null);
    }
  };

  const handleCopy = async () => {
    if (!lastUrl) return;
    try {
      await navigator.clipboard.writeText(lastUrl);
      setFeedback({ type: "ok", msg: "Link copiado." });
    } catch {
      setFeedback({ type: "error", msg: "Não foi possível copiar." });
    }
  };

  return (
    <Card className="border-dashed border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Convite de cadastro</CardTitle>
        <CardDescription>
          Envie um link para {name} completar dados e documentos. Após o envio, o RH aprova em ADM → RH → Aprovações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-11"
            disabled={loading !== null}
            onClick={handleEmail}
          >
            {loading === "email" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Enviar por e-mail
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 border-green-600/40 text-green-400 hover:bg-green-600/10"
            disabled={loading !== null}
            onClick={handleWhatsApp}
          >
            {loading === "whatsapp" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="mr-2 h-4 w-4" />
            )}
            Enviar por WhatsApp
          </Button>
          {lastUrl ? (
            <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar link
            </Button>
          ) : null}
        </div>
        {lastUrl ? (
          <p className="break-all text-xs text-muted-foreground">{lastUrl}</p>
        ) : null}
        {feedback ? (
          <p
            className={`text-sm ${feedback.type === "ok" ? "text-green-400" : "text-destructive"}`}
            role="status"
          >
            {feedback.msg}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
