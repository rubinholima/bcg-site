"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Building2, ExternalLink, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PageBuilderLogo {
  src: string;
  alt: string;
}

interface PageBuilderChromeProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  previewHref?: string;
  previewLabel?: string;
  saving?: boolean;
  success?: boolean;
  error?: string | null;
  formId: string;
  /** Logo do clube, empresa ou evento sendo editado. */
  subjectLogo?: PageBuilderLogo | null;
}

function ChromeLogo({ logo }: { logo: PageBuilderLogo }) {
  const [failed, setFailed] = useState(false);
  if (!logo.src || failed) {
    return (
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted/50"
        title={logo.alt}
      >
        <Building2 className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div
      className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-background"
      title={logo.alt}
    >
      <Image
        src={logo.src}
        alt={logo.alt}
        fill
        className="object-contain p-1"
        sizes="44px"
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function PageBuilderChrome({
  title,
  subtitle = "Construção Web — arraste módulos, ajuste aparência e salve.",
  backHref = "/dashboard/paginas",
  previewHref,
  previewLabel = "Ver página",
  saving = false,
  success = false,
  error = null,
  formId,
  subjectLogo = null,
}: PageBuilderChromeProps) {
  const showSubjectLogo = !!subjectLogo?.src;

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
      <div className="flex w-full items-center gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link href={backHref} className="shrink-0">
            <Button variant="ghost" size="icon" type="button" className="h-10 w-10 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          {showSubjectLogo ? <ChromeLogo logo={subjectLogo!} /> : null}

          <div className="min-w-0 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">Construção Web</p>
            <h1 className="truncate text-base font-semibold sm:text-lg md:text-xl">{title}</h1>
            {subtitle ? (
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          {error ? (
            <span className="hidden max-w-[200px] truncate text-sm text-destructive lg:inline" title={error}>
              {error}
            </span>
          ) : null}
          {success ? (
            <span className="hidden text-sm text-green-600 dark:text-green-400 sm:inline">Salvo.</span>
          ) : null}
          {previewHref ? (
            <Link href={previewHref} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" size="sm" className="min-h-[44px] gap-1.5 px-2 sm:px-3">
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{previewLabel}</span>
              </Button>
            </Link>
          ) : null}
          <Link href={backHref} className="hidden sm:inline-flex">
            <Button type="button" variant="outline" disabled={saving} className="min-h-[44px]">
              Voltar
            </Button>
          </Link>
          <Button type="submit" form={formId} disabled={saving} className="min-h-[44px] px-3 sm:px-4">
            {saving ? <Loader2 className="h-4 w-4 animate-spin sm:mr-2" /> : <Save className="h-4 w-4 sm:mr-2" />}
            <span className="hidden sm:inline">{saving ? "Salvando…" : "Salvar"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
