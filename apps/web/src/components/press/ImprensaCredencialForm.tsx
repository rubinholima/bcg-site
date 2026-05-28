"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ImprensaCredencialForm({
  slug,
  lang,
  accent,
  compact = false,
}: {
  slug: string;
  lang: "pt" | "en";
  accent: string;
  compact?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [outlet, setOutlet] = useState("");
  const [document, setDocument] = useState("");
  const [eventLabel, setEventLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError(lang === "pt" ? "Preencha nome e e-mail." : "Fill in name and email.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/tenants/${encodeURIComponent(slug)}/press/credential-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          outlet: outlet.trim() || undefined,
          document: document.trim() || undefined,
          eventLabel: eventLabel.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = res.ok ? await res.json() : null;
      if (!res.ok || !data?.ok) {
        setError(lang === "pt" ? "Não foi possível enviar. Tente novamente." : "Could not submit. Try again.");
        return;
      }
      setDone(true);
    } catch {
      setError(lang === "pt" ? "Erro de conexão." : "Connection error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <p className="text-sm font-medium text-zinc-100">
          {lang === "pt"
            ? "Solicitação enviada! A assessoria entrará em contato."
            : "Request sent! The press office will contact you."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${compact ? "" : "mt-4"}`}>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
        <div className="space-y-2">
          <Label>{lang === "pt" ? "Nome completo *" : "Full name *"}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 text-foreground" required />
        </div>
        <div className="space-y-2">
          <Label>E-mail *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-11 text-foreground" required />
        </div>
        <div className="space-y-2">
          <Label>{lang === "pt" ? "Telefone / WhatsApp" : "Phone / WhatsApp"}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-11 text-foreground" />
        </div>
        <div className="space-y-2">
          <Label>{lang === "pt" ? "Veículo / outlet" : "Outlet / media"}</Label>
          <Input
            placeholder={lang === "pt" ? "Ex: Rádio, portal, jornal…" : "e.g. Radio, website…"}
            value={outlet}
            onChange={(e) => setOutlet(e.target.value)}
            className="min-h-11 text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label>{lang === "pt" ? "CPF / documento" : "ID document"}</Label>
          <Input value={document} onChange={(e) => setDocument(e.target.value)} className="min-h-11 text-foreground" />
        </div>
        <div className="space-y-2">
          <Label>{lang === "pt" ? "Jogo / evento" : "Match / event"}</Label>
          <Input
            placeholder={lang === "pt" ? "Ex: Villa Nova x América" : "e.g. Villa Nova vs América"}
            value={eventLabel}
            onChange={(e) => setEventLabel(e.target.value)}
            className="min-h-11 text-foreground"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{lang === "pt" ? "Observações" : "Notes"}</Label>
        <textarea
          rows={compact ? 3 : 4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <Button
        type="submit"
        disabled={submitting}
        className="min-h-11 w-full gap-2 sm:w-auto"
        style={{ background: `linear-gradient(135deg, ${accent}, #fcd34d)`, color: "#18181b" }}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {lang === "pt" ? "Enviar solicitação de credencial" : "Submit credential request"}
      </Button>
    </form>
  );
}
