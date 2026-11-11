"use client";

import { useState } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { Button } from "@/components/ui/button";
import { publicClientFetch, toPublicClientApiPath } from "@/lib/public-client-api";

export function FormularioCapturaSection({
  block,
  slug,
  lang,
  fullWidth,
  titleAlign = "left",
  inSection,
  showTitle = true,
}: {
  block: HomeContentBlock;
  slug: string;
  lang: "pt" | "en";
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  showTitle?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error" | "validation">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const title = (lang === "pt"
    ? (block.config?.formularioCapturaTitlePt as string)
    : (block.config?.formularioCapturaTitleEn as string)) || (lang === "pt" ? "Entre em contato" : "Get in touch");
  const configuredEndpoint = (block.config?.formularioCapturaEndpoint as string)?.trim();
  const defaultEndpoint = toPublicClientApiPath(`/api/public/tenants/${encodeURIComponent(slug)}/site-lead`);
  const endpoint = configuredEndpoint || defaultEndpoint;
  const containerClass = moduleSectionContainerClass({ fullWidth });
  const formId = `fc-form-${block.id}`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;
    const name = data.name?.trim();
    const email = data.email?.trim();
    const message = data.message?.trim();
    if (!name || !email || !message) {
      setStatus("validation");
      setErrorMessage(lang === "pt" ? "Preencha nome, e-mail e mensagem." : "Fill in name, email and message.");
      return;
    }
    setStatus("sending");
    setErrorMessage(null);
    try {
      const url = endpoint.startsWith("http") ? endpoint : toPublicClientApiPath(endpoint.startsWith("/") ? endpoint : `/api/public/lead`);
      const res = await publicClientFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, tenantSlug: slug, blockId: block.id }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };
      if (res.ok && (json.ok === true || typeof json.id === "string")) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(json.error || (lang === "pt" ? "Não foi possível enviar. Tente novamente." : "Could not send. Try again."));
      }
    } catch {
      setStatus("error");
      setErrorMessage(lang === "pt" ? "Erro de rede. Tente novamente." : "Network error. Try again.");
    }
  };

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} py-14 sm:py-20`}
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
            <form id={formId} onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
              {status === "validation" || status === "error" ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              <div>
                <label htmlFor={`${formId}-name`} className="mb-1 block text-sm text-zinc-400">
                  {lang === "pt" ? "Nome" : "Name"}
                </label>
                <input
                  id={`${formId}-name`}
                  name="name"
                  required
                  className="w-full rounded-lg border border-white/10 bg-zinc-900/80 px-4 py-3 text-white placeholder-zinc-500"
                  placeholder={lang === "pt" ? "Seu nome" : "Your name"}
                />
              </div>
              <div>
                <label htmlFor={`${formId}-email`} className="mb-1 block text-sm text-zinc-400">
                  Email
                </label>
                <input
                  id={`${formId}-email`}
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-lg border border-white/10 bg-zinc-900/80 px-4 py-3 text-white placeholder-zinc-500"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label htmlFor={`${formId}-phone`} className="mb-1 block text-sm text-zinc-400">
                  {lang === "pt" ? "Telefone" : "Phone"}
                </label>
                <input
                  id={`${formId}-phone`}
                  name="phone"
                  type="tel"
                  className="w-full rounded-lg border border-white/10 bg-zinc-900/80 px-4 py-3 text-white placeholder-zinc-500"
                  placeholder="+55 11 99999-9999"
                />
              </div>
              <div>
                <label htmlFor={`${formId}-message`} className="mb-1 block text-sm text-zinc-400">
                  {lang === "pt" ? "Mensagem" : "Message"}
                </label>
                <textarea
                  id={`${formId}-message`}
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
