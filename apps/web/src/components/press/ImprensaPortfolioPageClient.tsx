"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, Lock, Newspaper, ShieldCheck } from "lucide-react";
import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import { getPublicImageUrl, resolveMediaUrlWithProxyFallback } from "@/lib/media-url";
import { getImprensaMenuLabel } from "@/lib/imprensa-display";
import { ImprensaPressHub } from "@/components/press/ImprensaPressHub";
import { ImprensaCredencialForm } from "@/components/press/ImprensaCredencialForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ImprensaPortfolioPageClient({
  slug,
  lang,
  page,
  imprensaBlock,
  accentColor,
}: {
  slug: string;
  lang: "pt" | "en";
  page: Page;
  imprensaBlock: HomeContentBlock;
  accentColor: string;
}) {
  const [accessState, setAccessState] = useState<"loading" | "gate" | "granted">("loading");
  const [requiresCode, setRequiresCode] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const entityName = page.tenant?.name ?? slug;
  const pageTitle = getImprensaMenuLabel(imprensaBlock, lang);
  const accent = (imprensaBlock.config?.imprensaAccentColor as string)?.trim() || accentColor || "#fbbf24";
  const rawLogo =
    (imprensaBlock.config?.imprensaLogoUrl as string)?.trim() || page.tenant?.logoUrl || "";
  const logoSrc =
    resolveMediaUrlWithProxyFallback(rawLogo) ||
    getPublicImageUrl(rawLogo) ||
    (rawLogo.startsWith("http") ? rawLogo : "");

  const checkAccess = useCallback(async () => {
    setAccessState("loading");
    try {
      const res = await fetch(`/api/public/tenants/${encodeURIComponent(slug)}/press/access-status`, {
        cache: "no-store",
      });
      const data = res.ok ? await res.json() : { ok: false, requiresCode: true };
      setRequiresCode(data.requiresCode !== false);
      if (data.requiresCode === false || data.ok === true) {
        setAccessState("granted");
      } else {
        setAccessState("gate");
      }
    } catch {
      setAccessState("gate");
    }
  }, [slug]);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError(lang === "pt" ? "Digite o código fornecido pela assessoria." : "Enter the code from press office.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/tenants/${encodeURIComponent(slug)}/press/verify-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = res.ok ? await res.json() : null;
      if (!res.ok || !data?.ok) {
        setError(
          (data as { message?: string } | null)?.message ||
            (lang === "pt" ? "Código inválido ou expirado." : "Invalid or expired code."),
        );
        return;
      }
      setAccessState("granted");
    } catch {
      setError(lang === "pt" ? "Erro ao validar. Tente novamente." : "Validation error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (accessState === "loading") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} />
        <p className="text-sm">{lang === "pt" ? "Carregando…" : "Loading…"}</p>
      </div>
    );
  }

  if (accessState === "gate") {
    return (
      <div className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-20">
        <div
          className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full blur-3xl opacity-40"
          style={{ backgroundColor: accent }}
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: accent }}
        />

        <div className="relative mx-auto w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 shadow-2xl backdrop-blur-xl">
            <div
              className="border-b border-white/10 px-6 py-8 text-center"
              style={{ background: `linear-gradient(135deg, ${accent}22, transparent)` }}
            >
              {logoSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoSrc} alt="" className="mx-auto mb-4 h-16 w-auto max-w-[200px] object-contain" />
              ) : (
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${accent}33` }}
                >
                  <Newspaper className="h-8 w-8" style={{ color: accent }} />
                </div>
              )}
              <h1 className="text-xl font-bold text-white sm:text-2xl">{pageTitle}</h1>
              <p className="mt-1 text-sm text-zinc-400">{entityName}</p>
            </div>

            <div className="space-y-5 px-6 py-8">
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <p className="text-sm leading-relaxed text-zinc-300">
                  {lang === "pt"
                    ? "Área restrita à imprensa credenciada. Solicite o código temporário à assessoria de imprensa."
                    : "Restricted area for accredited press. Request a temporary access code from the press office."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="press-code" className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                    <KeyRound className="h-4 w-4" style={{ color: accent }} />
                    {lang === "pt" ? "Código de acesso" : "Access code"}
                  </label>
                  <Input
                    id="press-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                    placeholder="Ex: K7M2P9"
                    className="min-h-12 text-center text-lg font-semibold tracking-[0.35em] text-foreground uppercase"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={8}
                  />
                </div>
                {error ? <p className="text-sm text-red-400">{error}</p> : null}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="min-h-12 w-full text-base font-semibold"
                  style={{ background: `linear-gradient(135deg, ${accent}, #fcd34d)`, color: "#18181b" }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {lang === "pt" ? "Validando…" : "Validating…"}
                    </>
                  ) : lang === "pt" ? (
                    "Entrar"
                  ) : (
                    "Enter"
                  )}
                </Button>
              </form>

              <div className="border-t border-white/10 pt-5">
                <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {lang === "pt" ? "Ainda não tem credencial?" : "No credential yet?"}
                </p>
                <ImprensaCredencialForm slug={slug} lang={lang} accent={accent} compact />
              </div>

              <Link
                href={`/portfolio/${slug}${lang === "en" ? "?lang=en" : ""}`}
                className="flex min-h-11 items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300"
              >
                <ArrowLeft className="h-4 w-4" />
                {lang === "pt" ? "Voltar ao site" : "Back to site"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% -20%, ${accent}, transparent)`,
          }}
        />
        <div className="container relative mx-auto px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/80 p-4 sm:h-28 sm:w-28">
              {logoSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoSrc} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                <Newspaper className="h-10 w-10" style={{ color: accent }} />
              )}
            </div>
            <div>
              <p
                className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.25em]"
                style={{ color: accent }}
              >
                <ShieldCheck className="h-4 w-4" />
                {lang === "pt" ? "Área credenciada" : "Accredited area"}
              </p>
              <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">{pageTitle}</h1>
              <p className="mt-2 text-lg text-zinc-400">{entityName}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <ImprensaPressHub
          slug={slug}
          entityName={entityName}
          logoUrl={page.tenant?.logoUrl}
          lang={lang}
          block={imprensaBlock}
          showTitle={false}
          variant="standalone"
        />
      </div>
    </div>
  );
}
