"use client";

import { useState } from "react";
import type { BchVenueLang } from "@/lib/bch-public-venue-content";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { publicClientFetch, toPublicClientApiPath } from "@/lib/public-client-api";

export function BchPublicVenueLeadForm({ lang }: { lang: BchVenueLang }) {
  const pt = lang === "pt";
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;
    setStatus("sending");
    try {
      const res = await publicClientFetch(toPublicClientApiPath("/api/public/lead"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          venue: "boston-city-hall",
          _slug: "solicitar",
        }),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-zinc-900/80 px-4 py-3 text-foreground placeholder-zinc-500";

  if (status === "success") {
    return (
      <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-emerald-200">
        {pt
          ? "Solicitação enviada. Nossa equipe comercial entrará em contato em até 2 dias úteis."
          : "Request sent. Our commercial team will contact you within 2 business days."}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bch-name" className="mb-1 block text-sm text-zinc-400">
            {pt ? "Nome" : "Name"}
          </label>
          <input id="bch-name" name="name" required className={inputClass} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="bch-email" className="mb-1 block text-sm text-zinc-400">
            Email
          </label>
          <input
            id="bch-email"
            name="email"
            type="email"
            required
            className={inputClass}
            autoComplete="email"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bch-phone" className="mb-1 block text-sm text-zinc-400">
            {pt ? "Telefone / WhatsApp" : "Phone / WhatsApp"}
          </label>
          <input id="bch-phone" name="phone" type="tel" className={inputClass} autoComplete="tel" />
        </div>
        <div>
          <label htmlFor="bch-date" className="mb-1 block text-sm text-zinc-400">
            {pt ? "Data preferida" : "Preferred date"}
          </label>
          <input
            id="bch-date"
            name="preferredDate"
            type="date"
            className={`${inputClass} text-foreground [&::-webkit-datetime-edit]:text-foreground`}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bch-type" className="mb-1 block text-sm text-zinc-400">
            {pt ? "Tipo de evento" : "Event type"}
          </label>
          <NativeSelect id="bch-type" name="eventType" defaultValue="">
            <option value="">{pt ? "Selecione…" : "Select…"}</option>
            <option value="show">{pt ? "Show / festival" : "Show / festival"}</option>
            <option value="corporativo">{pt ? "Corporativo" : "Corporate"}</option>
            <option value="esportivo">{pt ? "Esportivo / fan fest" : "Sports / fan fest"}</option>
            <option value="social">{pt ? "Social / privado" : "Social / private"}</option>
            <option value="outro">{pt ? "Outro" : "Other"}</option>
          </NativeSelect>
        </div>
        <div>
          <label htmlFor="bch-guests" className="mb-1 block text-sm text-zinc-400">
            {pt ? "Convidados (estimativa)" : "Guests (estimate)"}
          </label>
          <input
            id="bch-guests"
            name="guestCount"
            type="number"
            min={1}
            className={inputClass}
            placeholder="500"
          />
        </div>
      </div>
      <div>
        <label htmlFor="bch-message" className="mb-1 block text-sm text-zinc-400">
          {pt ? "Conte sobre o evento" : "Tell us about your event"}
        </label>
        <textarea
          id="bch-message"
          name="message"
          rows={4}
          required
          className={inputClass}
          placeholder={
            pt
              ? "Formato, horários, necessidades de palco, gastronomia, etc."
              : "Format, schedule, stage, catering needs, etc."
          }
        />
      </div>
      {status === "error" ? (
        <p className="text-sm text-red-400">
          {pt ? "Não foi possível enviar. Tente novamente." : "Could not send. Please try again."}
        </p>
      ) : null}
      <Button type="submit" disabled={status === "sending"} className="min-h-[48px] w-full sm:w-auto">
        {status === "sending" ? (pt ? "Enviando…" : "Sending…") : pt ? "Enviar solicitação" : "Submit request"}
      </Button>
    </form>
  );
}
