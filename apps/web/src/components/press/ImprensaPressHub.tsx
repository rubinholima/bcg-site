"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  Download,
  FileText,
  History,
  IdCard,
  Mail,
  MessageCircle,
  Music,
  Newspaper,
  Phone,
  Shield,
  Sparkles,
  Upload,
  ImageIcon,
  Images,
  Headphones,
} from "lucide-react";
import type { HomeContentBlock } from "@/types/home-content";
import type { ImprensaCondutaSection } from "@/lib/imprensa-clube-default";
import {
  formatPressReleaseDate,
  parsePressReleasesFromConfig,
} from "@/lib/imprensa-press-releases";
import { getPublicImageUrl, resolveMediaUrlWithProxyFallback, isSvgUrl } from "@/lib/media-url";
import { SmartImage } from "@/components/common/SmartImage";
import { Button } from "@/components/ui/button";
import { safeFetchJson } from "@/lib/safe-fetch-json";
import { ImprensaCredencialForm } from "@/components/press/ImprensaCredencialForm";

type PressPhoto = { id: string; url: string; caption: string | null; matchLabel: string | null };

function logoExt(url: string): string {
  const m = url.split("?")[0]?.match(/\.(png|jpe?g|webp|svg)$/i);
  return m ? `.${m[1]!.toLowerCase().replace("jpeg", "jpg")}` : ".png";
}

function groupPhotosByMatch(photos: PressPhoto[], lang: "pt" | "en"): Array<[string, PressPhoto[]]> {
  const fallback = lang === "pt" ? "Outras fotos" : "Other photos";
  const map = new Map<string, PressPhoto[]>();
  for (const p of photos) {
    const key = p.matchLabel?.trim() || fallback;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return Array.from(map.entries());
}

function AccordionPanel({
  id,
  title,
  subtitle,
  icon,
  accent,
  open,
  onToggle,
  children,
  featured,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border ${featured ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-zinc-950/80" : "border-white/10 bg-zinc-950/50"}`}
    >
      <button
        type="button"
        id={`acc-${id}`}
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
        onClick={onToggle}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}22`, color: accent }}>
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white sm:text-base">{title}</span>
            {subtitle ? <span className="block truncate text-xs text-zinc-500">{subtitle}</span> : null}
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="border-t border-white/10 px-4 py-4 sm:px-5 sm:py-5">{children}</div> : null}
    </div>
  );
}

export function ImprensaPressHub({
  slug,
  entityName,
  logoUrl,
  lang,
  block,
  showTitle = true,
  variant = "inline",
}: {
  slug: string;
  entityName: string;
  logoUrl?: string | null;
  lang: "pt" | "en";
  block: HomeContentBlock;
  showTitle?: boolean;
  variant?: "inline" | "standalone";
}) {
  const [photos, setPhotos] = useState<PressPhoto[]>([]);
  const [uploadPath, setUploadPath] = useState<string | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [openManualSection, setOpenManualSection] = useState<string | null>(null);

  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const release = (lang === "pt" ? block.config?.imprensaReleasePt : block.config?.imprensaReleaseEn) as string;
  const pressReleases = useMemo(
    () => parsePressReleasesFromConfig(block.config as Record<string, unknown>),
    [block.config],
  );
  const featuredRelease = pressReleases[0];
  const archiveReleases = pressReleases.slice(1);
  const historiaTitulo = (lang === "pt" ? block.config?.imprensaHistoriaTituloPt : block.config?.imprensaHistoriaTituloEn) as string;
  const historia = (lang === "pt" ? block.config?.imprensaHistoriaPt : block.config?.imprensaHistoriaEn) as string;
  const email = (block.config?.imprensaContatoEmail as string)?.trim();
  const phone = (block.config?.imprensaContatoTelefone as string)?.trim();
  const whatsapp = (block.config?.imprensaContatoWhatsapp as string)?.trim();
  const contatoExtra = (lang === "pt" ? block.config?.imprensaContatoTextoPt : block.config?.imprensaContatoTextoEn) as string;
  const manualMarca = (block.config?.imprensaManualMarcaUrl as string)?.trim();
  const hinoAudio = (block.config?.imprensaHinoAudioUrl as string)?.trim();
  const customLogo = (block.config?.imprensaLogoUrl as string)?.trim();
  const accent = (block.config?.imprensaAccentColor as string)?.trim() || "#fbbf24";
  const sections = (block.config?.imprensaCondutaSections as ImprensaCondutaSection[] | undefined) ?? [];

  const rawLogo = customLogo || logoUrl || "";
  const pressLogo =
    resolveMediaUrlWithProxyFallback(rawLogo) || getPublicImageUrl(rawLogo) || (rawLogo.startsWith("http") ? rawLogo : "");
  const hinoUrl = hinoAudio ? getPublicImageUrl(hinoAudio) || hinoAudio : "";
  const manualUrl = manualMarca ? getPublicImageUrl(manualMarca) || manualMarca : "";

  const photoGroups = useMemo(() => groupPhotosByMatch(photos, lang), [photos, lang]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const photosData = await safeFetchJson<PressPhoto[]>(
        `/api/public/tenants/${encodeURIComponent(slug)}/press/photos`,
        [],
      );
      if (cancelled) return;
      if (Array.isArray(photosData)) setPhotos(photosData);

      const availability = await safeFetchJson<{ available?: boolean } | null>(
        `/api/public/tenants/${encodeURIComponent(slug)}/press/upload-url`,
        null,
      );
      if (cancelled) return;
      if (availability?.available) {
        try {
          const res = await fetch(
            `/api/public/tenants/${encodeURIComponent(slug)}/press/upload-url`,
            { method: "POST", credentials: "include", cache: "no-store" },
          );
          if (res.ok) {
            const data = (await res.json()) as { token?: string } | null;
            if (data?.token) setUploadPath(`/clube/upload/${data.token}`);
          }
        } catch {
          /* ignore */
        }
      }
      setLoadingPhotos(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const toggle = (key: string) => setOpenPanel((p) => (p === key ? null : key));

  const btnPrimary =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-zinc-950 shadow-lg transition hover:scale-[1.02]";
  const btnSecondary =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-zinc-900/80 px-5 text-sm font-medium text-zinc-100 hover:bg-zinc-800";

  const sectionClass =
    variant === "standalone"
      ? "mb-8 rounded-3xl border border-white/10 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-sm sm:p-8"
      : "mb-8 rounded-2xl border border-white/10 bg-zinc-900/50 p-5 sm:p-8";

  const hasPressReleases = pressReleases.length > 0;
  const hasHistoria = !!historia?.trim();
  const historiaLabel = historiaTitulo?.trim() || (lang === "pt" ? "História do clube" : "Club history");

  return (
    <div className="relative space-y-8">
      <div
        className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: accent }}
      />

      {showTitle && title?.trim() ? (
        <div className="mb-4 text-center">
          <p className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
            <Newspaper className="h-4 w-4" />
            {lang === "pt" ? "Imprensa / kit de marca" : "Press / brand kit"}
          </p>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
        </div>
      ) : null}

      {release?.trim() ? (
        <p className="text-center whitespace-pre-wrap text-base leading-relaxed text-zinc-300 sm:text-lg">{release.trim()}</p>
      ) : null}

      {hasHistoria ? (
        <section className={sectionClass}>
          <AccordionPanel
            id="historia"
            title={historiaLabel}
            subtitle={lang === "pt" ? "Release institucional — história completa" : "Institutional release — full history"}
            icon={<History className="h-4 w-4" />}
            accent={accent}
            open={openPanel === "historia"}
            onToggle={() => toggle("historia")}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 sm:text-base">{historia.trim()}</p>
          </AccordionPanel>
        </section>
      ) : null}

      {/* Releases por data */}
      {hasPressReleases ? (
        <section className={sectionClass}>
          <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-white sm:justify-start">
            <Newspaper className="h-5 w-5" style={{ color: accent }} />
            {lang === "pt" ? "Press releases" : "Press releases"}
          </h3>

          {featuredRelease ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-zinc-950/90 to-zinc-950 p-5 sm:p-7">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                  style={{ backgroundColor: `${accent}33`, color: accent }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {lang === "pt" ? "Último jogo" : "Latest match"}
                </span>
                {featuredRelease.date ? (
                  <span className="text-xs text-zinc-500">
                    {formatPressReleaseDate(featuredRelease.date, lang)}
                  </span>
                ) : null}
              </div>
              {(lang === "pt" ? featuredRelease.titlePt : featuredRelease.titleEn)?.trim() ? (
                <h4 className="text-xl font-bold text-white sm:text-2xl">
                  {(lang === "pt" ? featuredRelease.titlePt : featuredRelease.titleEn).trim()}
                </h4>
              ) : null}
              {(lang === "pt" ? featuredRelease.bodyPt : featuredRelease.bodyEn)?.trim() ? (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 sm:text-base">
                  {(lang === "pt" ? featuredRelease.bodyPt : featuredRelease.bodyEn).trim()}
                </p>
              ) : null}
            </div>
          ) : null}

          {archiveReleases.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {lang === "pt" ? "Releases anteriores" : "Previous releases"}
              </p>
              {archiveReleases.map((rel) => {
                const relTitle = (lang === "pt" ? rel.titlePt : rel.titleEn)?.trim() || (lang === "pt" ? "Release" : "Release");
                const relBody = (lang === "pt" ? rel.bodyPt : rel.bodyEn)?.trim();
                const panelId = `release-${rel.id}`;
                return (
                  <AccordionPanel
                    key={rel.id}
                    id={panelId}
                    title={relTitle}
                    subtitle={formatPressReleaseDate(rel.date, lang)}
                    icon={<Newspaper className="h-4 w-4" />}
                    accent={accent}
                    open={openPanel === panelId}
                    onToggle={() => toggle(panelId)}
                  >
                    {relBody ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 sm:text-base">{relBody}</p>
                    ) : (
                      <p className="text-sm text-zinc-500">{lang === "pt" ? "Sem texto." : "No content."}</p>
                    )}
                  </AccordionPanel>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Credencial + contato — formulário só no modo inline (página separada usa o gate) */}
      <section className={sectionClass}>
        <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-white sm:justify-start">
          <IdCard className="h-5 w-5" style={{ color: accent }} />
          {lang === "pt" ? "Credenciamento e contato" : "Accreditation & contact"}
        </h3>
        <p className="mt-2 text-center text-sm text-zinc-400 sm:text-left">
          {variant === "standalone"
            ? lang === "pt"
              ? "Entre em contato com a assessoria para credenciamento e dúvidas."
              : "Contact the press office for accreditation and questions."
            : lang === "pt"
              ? "Solicite credencial para cobertura ou fale diretamente com a assessoria."
              : "Request credentials for coverage or contact the press office directly."}
        </p>

        <div className={`mt-6 grid gap-8 ${variant === "standalone" ? "" : "lg:grid-cols-2"}`}>
          {variant !== "standalone" ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
              <h4 className="mb-1 text-sm font-semibold text-white">
                {lang === "pt" ? "Solicitar credencial" : "Request credential"}
              </h4>
              <p className="mb-4 text-xs text-zinc-500">
                {lang === "pt" ? "Preencha o formulário — a assessoria analisa e retorna." : "Fill the form — press office will review and reply."}
              </p>
              <ImprensaCredencialForm slug={slug} lang={lang} accent={accent} compact />
            </div>
          ) : null}

          <div className={`space-y-4 ${variant === "standalone" ? "max-w-xl" : ""}`}>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Headphones className="h-4 w-4" style={{ color: accent }} />
              {lang === "pt" ? "Fale com a assessoria" : "Contact press office"}
            </h4>
            {contatoExtra?.trim() ? (
              <p className="whitespace-pre-wrap text-sm text-zinc-400">{contatoExtra.trim()}</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-1">
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="flex min-h-[72px] items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/60 p-4 transition hover:border-white/25"
                >
                  <Mail className="h-5 w-5 shrink-0" style={{ color: accent }} />
                  <div className="min-w-0">
                    <span className="block text-xs uppercase text-zinc-500">E-mail</span>
                    <span className="block truncate text-sm font-medium text-white">{email}</span>
                  </div>
                </a>
              ) : null}
              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="flex min-h-[72px] items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/60 p-4"
                >
                  <Phone className="h-5 w-5 shrink-0" style={{ color: accent }} />
                  <div>
                    <span className="block text-xs uppercase text-zinc-500">{lang === "pt" ? "Telefone" : "Phone"}</span>
                    <span className="text-sm font-medium text-white">{phone}</span>
                  </div>
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[72px] items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/60 p-4"
                >
                  <MessageCircle className="h-5 w-5 shrink-0" style={{ color: accent }} />
                  <div>
                    <span className="block text-xs uppercase text-zinc-500">WhatsApp</span>
                    <span className="text-sm font-medium text-white">{whatsapp}</span>
                  </div>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Galeria por jogo — expansível */}
      <section className={sectionClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-white sm:justify-start">
              <Images className="h-5 w-5" style={{ color: accent }} />
              {lang === "pt" ? "Galeria de jogos" : "Match gallery"}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              {lang === "pt" ? "Fotos oficiais organizadas por partida." : "Official photos organized by match."}
            </p>
          </div>
          {uploadPath ? (
            <Button asChild size="lg" className="min-h-11 gap-2">
              <Link href={uploadPath}>
                <Upload className="h-4 w-4" />
                {lang === "pt" ? "Enviar fotos" : "Upload"}
              </Link>
            </Button>
          ) : null}
        </div>

        {loadingPhotos ? (
          <p className="mt-6 text-center text-sm text-zinc-500">{lang === "pt" ? "Carregando fotos…" : "Loading…"}</p>
        ) : photoGroups.length > 0 ? (
          <div className="mt-6 space-y-2">
            {photoGroups.map(([matchLabel, matchPhotos]) => (
              <AccordionPanel
                key={matchLabel}
                id={`match-${matchLabel}`}
                title={matchLabel}
                subtitle={`${matchPhotos.length} ${lang === "pt" ? "foto(s)" : "photo(s)"}`}
                icon={<ImageIcon className="h-4 w-4" />}
                accent={accent}
                open={openPanel === matchLabel}
                onToggle={() => toggle(matchLabel)}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {matchPhotos.map((photo) => (
                    <a
                      key={photo.id}
                      href={getPublicImageUrl(photo.url) || photo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-900"
                    >
                      <SmartImage
                        src={getPublicImageUrl(photo.url) || photo.url}
                        alt={photo.caption ?? matchLabel}
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="200px"
                      />
                      {photo.caption ? (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                          <p className="text-[10px] text-white line-clamp-2">{photo.caption}</p>
                        </div>
                      ) : null}
                    </a>
                  ))}
                </div>
              </AccordionPanel>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-zinc-500">
            {lang === "pt" ? "Nenhuma foto publicada ainda." : "No photos yet."}
          </p>
        )}
      </section>

      {/* Manual de operação — expansível (fechado por padrão) */}
      {sections.length > 0 ? (
        <section className={sectionClass}>
          <AccordionPanel
            id="manual"
            title={lang === "pt" ? "Manual de operação e conduta" : "Operations & conduct manual"}
            subtitle={
              lang === "pt"
                ? `${entityName} — ${sections.length} seções · clique para expandir`
                : `${entityName} — ${sections.length} sections · click to expand`
            }
            icon={<Shield className="h-4 w-4" />}
            accent={accent}
            open={openPanel === "manual"}
            onToggle={() => toggle("manual")}
          >
            <p className="mb-3 text-xs text-zinc-500">
              {lang === "pt"
                ? "Abra cada seção abaixo para ler o conteúdo completo."
                : "Expand each section below to read the full content."}
            </p>
            <div className="max-h-[min(70vh,28rem)] space-y-2 overflow-y-auto pr-1">
              {sections.map((sec) => {
                const secTitle = lang === "pt" ? sec.titlePt : sec.titleEn;
                const body = lang === "pt" ? sec.bodyPt : sec.bodyEn;
                const isOpen = openManualSection === sec.id;
                return (
                  <div key={sec.id} className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
                    <button
                      type="button"
                      className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-medium text-white hover:bg-white/5"
                      aria-expanded={isOpen}
                      onClick={() => setOpenManualSection(isOpen ? null : sec.id)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <BookOpen className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="truncate">{secTitle}</span>
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen ? (
                      <div className="border-t border-white/10 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-zinc-300">
                        {body}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </AccordionPanel>
        </section>
      ) : null}

      {/* Kit downloads */}
      <section className={sectionClass}>
        <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-white sm:justify-start">
          <Download className="h-5 w-5" style={{ color: accent }} />
          {lang === "pt" ? "Kit de imprensa — downloads" : "Press kit — downloads"}
        </h3>
        <div className="mt-6 flex flex-col items-center gap-6 lg:flex-row lg:items-start">
          <div className="flex min-h-[10rem] w-full max-w-[280px] items-center justify-center rounded-xl border border-white/10 bg-zinc-950/80 p-6">
            {pressLogo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={pressLogo} alt={entityName} className="max-h-36 w-auto max-w-full object-contain" />
            ) : (
              <ImageIcon className="h-12 w-12 text-zinc-600" />
            )}
          </div>
          <div className="flex w-full flex-col items-center gap-3 sm:items-start">
            {pressLogo ? (
              <a
                href={pressLogo}
                download={`${slug}-logo${isSvgUrl(rawLogo) ? ".svg" : logoExt(pressLogo)}`}
                className={btnPrimary}
                style={{ background: `linear-gradient(135deg, ${accent}, #fcd34d)` }}
              >
                <Download className="h-4 w-4" />
                {lang === "pt" ? "Logo oficial" : "Official logo"}
              </a>
            ) : null}
            {hinoUrl ? (
              <a href={hinoUrl} download={`${slug}-hino.mp3`} className={btnSecondary}>
                <Music className="h-4 w-4" />
                {lang === "pt" ? "Hino (MP3)" : "Anthem (MP3)"}
              </a>
            ) : null}
            {manualUrl ? (
              <a href={manualUrl} download target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                <FileText className="h-4 w-4" />
                {lang === "pt" ? "Manual de marca (PDF)" : "Brand guidelines (PDF)"}
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
