"use client";

import { useState } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { Button } from "@/components/ui/button";

export function FormularioCapturaSection({
  block,
  lang,
  fullWidth,
  titleAlign = "left",
  inSection,
  showTitle = true,
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  showTitle?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const title = (lang === "pt"
    ? (block.config?.formularioCapturaTitlePt as string)
    : (block.config?.formularioCapturaTitleEn as string)) || (lang === "pt" ? "Entre em contato" : "Get in touch");
  const endpoint = (block.config?.formularioCapturaEndpoint as string)?.trim() || "/api/public/lead";
  const containerClass = fullWidth ? "w-full px-4 sm:px-6 lg:px-8" : "container mx-auto max-w-xl px-4 sm:px-6 lg:px-8";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;
    setStatus("sending");
    try {
      const res = await fetch(endpoint.startsWith("http") ? endpoint : `${typeof window !== "undefined" ? window.location.origin : ""}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, _slug: block.id }),
      });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <AnimateInView>
      <section
        id={block.id}
        className="relative overflow-hidden border-b border-white/5 py-14 sm:py-20"
        style={
          (block.config?.backgroundColor as string)?.trim()
            ? { backgroundColor: (block.config?.backgroundColor as string).trim() }
            : undefined
        }
      >
        <div className={containerClass}>
          {showTitle && title && (
            <SectionTitle
              title={title}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={titleAlign}
            />
          )}
          {status === "success" ? (
            <p className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">
              {lang === "pt" ? "Mensagem enviada com sucesso! Entraremos em contato em breve." : "Message sent successfully! We'll get back to you soon."}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="fc-name" className="mb-1 block text-sm text-zinc-400">
                  {lang === "pt" ? "Nome" : "Name"}
                </label>
                <input
                  id="fc-name"
                  name="name"
                  required
                  className="w-full rounded-lg border border-white/10 bg-zinc-900/80 px-4 py-3 text-white placeholder-zinc-500"
                  placeholder={lang === "pt" ? "Seu nome" : "Your name"}
                />
              </div>
              <div>
                <label htmlFor="fc-email" className="mb-1 block text-sm text-zinc-400">
                  Email
                </label>
                <input
                  id="fc-email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-lg border border-white/10 bg-zinc-900/80 px-4 py-3 text-white placeholder-zinc-500"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label htmlFor="fc-phone" className="mb-1 block text-sm text-zinc-400">
                  {lang === "pt" ? "Telefone" : "Phone"}
                </label>
                <input
                  id="fc-phone"
                  name="phone"
                  type="tel"
                  className="w-full rounded-lg border border-white/10 bg-zinc-900/80 px-4 py-3 text-white placeholder-zinc-500"
                  placeholder="+55 11 99999-9999"
                />
              </div>
              <div>
                <label htmlFor="fc-message" className="mb-1 block text-sm text-zinc-400">
                  {lang === "pt" ? "Mensagem" : "Message"}
                </label>
                <textarea
                  id="fc-message"
                  name="message"
                  rows={4}
                  required
                  className="w-full rounded-lg border border-white/10 bg-zinc-900/80 px-4 py-3 text-white placeholder-zinc-500"
                  placeholder={lang === "pt" ? "Como podemos ajudar?" : "How can we help?"}
                />
              </div>
              {status === "error" && (
                <p className="text-sm text-red-400">
                  {lang === "pt" ? "Erro ao enviar. Tente novamente." : "Error sending. Please try again."}
                </p>
              )}
              <Button type="submit" disabled={status === "sending"} className="w-full">
                {status === "sending"
                  ? lang === "pt"
                    ? "Enviando…"
                    : "Sending…"
                  : lang === "pt"
                    ? "Enviar"
                    : "Send"}
              </Button>
            </form>
          )}
        </div>
      </section>
    </AnimateInView>
  );
}
