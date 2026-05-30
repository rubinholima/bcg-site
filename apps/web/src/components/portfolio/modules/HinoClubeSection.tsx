"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { SmartImage } from "@/components/common/SmartImage";
import {
  FileMusic,
  Guitar,
  Mic2,
  Pause,
  Play,
  ScrollText,
  Volume2,
  VolumeX,
} from "lucide-react";

type HinoTab = "letra" | "cifra" | "cifraEmbed" | "partitura";

const HINO_PANEL_HEIGHT = "min(520px,65vh)";

function resolveAudioUrl(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  return getPublicImageUrl(raw.trim()) || raw.trim();
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseLyricLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function CifraContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-200 sm:text-base">
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split(/(\[[^\]]+\])/g).map((part, pi) =>
            part.startsWith("[") && part.endsWith("]") ? (
              <span key={pi} className="font-bold text-amber-400">
                {part}
              </span>
            ) : (
              <span key={pi}>{part}</span>
            ),
          )}
        </span>
      ))}
    </pre>
  );
}

/** Barra superior do embed Moises (logo + Copy Link) — recortada via overflow. */
const MOISES_EMBED_HEADER_CLIP_PX = 56;

function ChordsEmbedFrame({
  url,
  lang,
  accent,
  darkFilter,
  fillHeight,
}: {
  url: string;
  lang: "pt" | "en";
  accent: string;
  darkFilter: boolean;
  fillHeight?: boolean;
}) {
  const embedUrl = url.trim();
  if (!embedUrl) return null;

  const isMoises = /moises\.ai/i.test(embedUrl);
  const iframeFilter = darkFilter ? "invert(0.93) hue-rotate(180deg)" : undefined;
  const frameHeight = fillHeight ? "100%" : `min(${HINO_PANEL_HEIGHT})`;

  return (
    <div className={`flex flex-col gap-2 ${fillHeight ? "h-full min-h-0" : ""}`}>
      <div className={`overflow-hidden rounded-xl border border-white/10 bg-zinc-950 ${fillHeight ? "min-h-0 flex-1" : ""}`}>
        <div
          className="relative w-full overflow-hidden"
          style={{ height: fillHeight ? "100%" : frameHeight, minHeight: fillHeight ? 280 : undefined }}
        >
          <iframe
            src={embedUrl}
            title={lang === "pt" ? "Cifra interativa do hino" : "Interactive anthem chord chart"}
            className="absolute left-0 w-full border-0 bg-zinc-950"
            style={{
              height: isMoises ? `calc(100% + ${MOISES_EMBED_HEADER_CLIP_PX}px)` : "100%",
              top: isMoises ? `-${MOISES_EMBED_HEADER_CLIP_PX}px` : 0,
              filter: iframeFilter,
              backgroundColor: "#09090b",
            }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
      {isMoises ? (
        <p className="shrink-0 text-center text-xs text-zinc-500">
          {lang === "pt" ? "Cifra interativa via " : "Interactive chords via "}
          <a
            href="https://moises.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
            style={{ color: accent }}
          >
            Moises
          </a>
        </p>
      ) : null}
    </div>
  );
}

function VinylDisc({ spinning, compact }: { spinning: boolean; compact?: boolean }) {
  const size = compact ? "h-20 w-20 sm:h-24 sm:w-24" : "h-36 w-36 sm:h-40 sm:w-40";
  return (
    <div
      className={`relative mx-auto shrink-0 ${size} ${spinning ? "animate-[spin_4s_linear_infinite]" : ""}`}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-800 via-zinc-950 to-black shadow-[0_0_40px_rgba(0,0,0,0.6),inset_0_0_20px_rgba(255,255,255,0.06)] ring-2 ring-white/10" />
      <div className="absolute inset-[18%] rounded-full border border-white/5 bg-zinc-900/80" />
      <div className="absolute inset-[32%] rounded-full bg-gradient-to-br from-amber-500/30 to-red-600/40 ring-2 ring-amber-500/40" />
      <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 ring-1 ring-white/20" />
    </div>
  );
}

function KaraokeLyrics({
  lines,
  activeIndex,
  accent,
  scrollRef,
  lineRefs,
}: {
  lines: string[];
  activeIndex: number;
  accent: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  lineRefs: React.MutableRefObject<(HTMLParagraphElement | null)[]>;
}) {
  if (lines.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth px-1 py-4 scrollbar-thin"
    >
      <div className="flex min-h-full flex-col justify-center gap-3 py-6">
        {lines.map((line, idx) => {
          const isActive = idx === activeIndex;
          const isSection = /^\[.+\]$/.test(line);
          return (
            <p
              key={`${idx}-${line}`}
              ref={(el) => {
                lineRefs.current[idx] = el;
              }}
              className={`text-center transition-all duration-500 ${
                isSection
                  ? "text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                  : isActive
                    ? "text-lg font-bold sm:text-xl"
                    : idx === activeIndex - 1 || idx === activeIndex + 1
                      ? "text-sm text-zinc-400"
                      : "text-sm text-zinc-600"
              }`}
              style={isActive && !isSection ? { color: accent } : undefined}
            >
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function HinoPlayerColumn({
  src,
  clubName,
  subtitle,
  accent,
  letra,
  compositor,
  lang,
}: {
  src: string;
  clubName?: string;
  subtitle: string;
  accent: string;
  letra: string;
  compositor: string;
  lang: "pt" | "en";
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const karaokeScrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);

  const lyricLines = useMemo(() => parseLyricLines(letra), [letra]);
  const hasKaraoke = lyricLines.length > 0;

  const activeLineIndex = useMemo(() => {
    if (!hasKaraoke || duration <= 0) return 0;
    const singableLines = lyricLines.filter((l) => !/^\[.+\]$/.test(l));
    if (singableLines.length === 0) return 0;
    const progress = Math.min(1, Math.max(0, current / duration));
    const singableIdx = Math.min(singableLines.length - 1, Math.floor(progress * singableLines.length));
    let count = -1;
    for (let i = 0; i < lyricLines.length; i++) {
      if (!/^\[.+\]$/.test(lyricLines[i]!)) count++;
      if (count === singableIdx) return i;
    }
    return 0;
  }, [current, duration, hasKaraoke, lyricLines]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => {
      setDuration(el.duration || 0);
      setReady(true);
    };
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [src]);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setReady(false);
  }, [src]);

  useEffect(() => {
    if (!playing) return;
    const line = lineRefs.current[activeLineIndex];
    const container = karaokeScrollRef.current;
    if (!line || !container) return;
    const lineTop = line.offsetTop;
    const lineHeight = line.offsetHeight;
    const target = lineTop - container.clientHeight / 2 + lineHeight / 2;
    container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [activeLineIndex, playing]);

  const togglePlay = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      try {
        await el.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  }, [playing]);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
    setCurrent(el.currentTime);
  };

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-black shadow-2xl"
      style={{ boxShadow: `0 24px 60px -20px ${accent}33`, minHeight: `min(${HINO_PANEL_HEIGHT})` }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-40"
        style={{ backgroundColor: accent }}
      />
      <audio ref={audioRef} src={src} preload="metadata" muted={muted} />

      <div className={`relative shrink-0 ${hasKaraoke ? "border-b border-white/10 p-4 sm:p-5" : "p-5 sm:p-6"}`}>
        <div className={`flex ${hasKaraoke ? "flex-row items-center gap-4" : "flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6"}`}>
          <VinylDisc spinning={playing} compact={hasKaraoke} />
          <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/90 sm:text-xs">{subtitle}</p>
              {clubName ? (
                <p className={`mt-0.5 font-bold text-white ${hasKaraoke ? "truncate text-base sm:text-lg" : "truncate text-lg sm:text-xl"}`}>
                  {clubName}
                </p>
              ) : null}
              {compositor?.trim() && hasKaraoke ? (
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {lang === "pt" ? "Compositor:" : "Composer:"}{" "}
                  <span className="text-zinc-300">{compositor.trim()}</span>
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <div
                role="slider"
                tabIndex={0}
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={current}
                className="group relative h-2 cursor-pointer rounded-full bg-white/10"
                onClick={seek}
                onKeyDown={(e) => {
                  const el = audioRef.current;
                  if (!el) return;
                  if (e.key === "ArrowRight") el.currentTime = Math.min(duration, el.currentTime + 5);
                  if (e.key === "ArrowLeft") el.currentTime = Math.max(0, el.currentTime - 5);
                }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accent}, #ffffff)` }}
                />
              </div>
              <div className="flex justify-between text-[11px] tabular-nums text-zinc-500">
                <span>{formatTime(current)}</span>
                <span>{ready ? formatTime(duration) : "—"}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 sm:justify-start">
              <button
                type="button"
                onClick={() => void togglePlay()}
                className={`flex items-center justify-center rounded-full text-black shadow-lg transition-transform hover:scale-105 active:scale-95 ${hasKaraoke ? "h-12 w-12" : "h-14 w-14"}`}
                style={{ background: `linear-gradient(135deg, ${accent}, #fcd34d)` }}
                aria-label={playing ? "Pausar" : "Tocar hino"}
              >
                {playing ? (
                  <Pause className={`fill-current ${hasKaraoke ? "h-6 w-6" : "h-7 w-7"}`} />
                ) : (
                  <Play className={`fill-current pl-0.5 ${hasKaraoke ? "h-6 w-6" : "h-7 w-7"}`} />
                )}
              </button>
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10"
                aria-label={muted ? "Ativar som" : "Silenciar"}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {hasKaraoke ? (
        <KaraokeLyrics
          lines={lyricLines}
          activeIndex={activeLineIndex}
          accent={accent}
          scrollRef={karaokeScrollRef}
          lineRefs={lineRefs}
        />
      ) : null}
    </div>
  );
}

export function HinoClubeSection({
  block,
  lang,
  page,
  fullWidth,
  titleAlign = "left",
  inSection,
  showTitle = true,
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
  page: Page;
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  showTitle?: boolean;
}) {
  const defaultTab = ((block.config?.hinoDefaultTab as HinoTab) ?? "letra") as HinoTab;
  const [tab, setTab] = useState<HinoTab>(defaultTab);

  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const compositor = (lang === "pt" ? block.config?.hinoCompositorPt : block.config?.hinoCompositorEn) as string;
  const letra = (lang === "pt" ? block.config?.hinoLetraPt : block.config?.hinoLetraEn) as string;
  const cifra = (lang === "pt" ? block.config?.hinoCifraPt : block.config?.hinoCifraEn) as string;
  const chordsEmbedUrl = (block.config?.hinoChordsEmbedUrl as string)?.trim();
  const embedDarkFilter =
    block.config?.hinoEmbedDarkFilter !== false && block.config?.hinoEmbedDarkFilter !== "false";
  const partituraUrl = (block.config?.hinoPartituraUrl as string)?.trim();
  const audioUrl = resolveAudioUrl(block.config?.hinoAudioUrl as string | undefined);
  const clubName = page.tenant?.name;
  const accent =
    (block.config?.hinoAccentColor as string)?.trim() ||
    (page.content?.theme?.accentColor as string)?.trim() ||
    "#fbbf24";

  const tabs = useMemo(() => {
    const list: { id: HinoTab; label: string; icon: typeof ScrollText; show: boolean }[] = [
      {
        id: "letra",
        label: lang === "pt" ? "Letra" : "Lyrics",
        icon: ScrollText,
        show: Boolean(letra?.trim() || compositor?.trim()),
      },
      { id: "cifra", label: lang === "pt" ? "Cifra" : "Chords", icon: Guitar, show: Boolean(cifra?.trim()) },
      {
        id: "cifraEmbed",
        label: lang === "pt" ? "Cifra interativa" : "Interactive",
        icon: Guitar,
        show: Boolean(chordsEmbedUrl),
      },
      {
        id: "partitura",
        label: lang === "pt" ? "Partitura" : "Sheet music",
        icon: FileMusic,
        show: Boolean(partituraUrl),
      },
    ];
    return list.filter((t) => t.show);
  }, [letra, compositor, cifra, chordsEmbedUrl, partituraUrl, lang]);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.id === tab)) {
      setTab(tabs[0]!.id);
    }
  }, [tabs, tab]);

  const padTop =
    block.config?.hinoPaddingTop === "minimal"
      ? "pt-8 sm:pt-10"
      : block.config?.hinoPaddingTop === "large"
        ? "pt-20 sm:pt-28"
        : "pt-14 sm:pt-20";
  const padBottom =
    block.config?.hinoPaddingBottom === "minimal"
      ? "pb-8 sm:pb-10"
      : block.config?.hinoPaddingBottom === "large"
        ? "pb-20 sm:pb-28"
        : "pb-14 sm:pb-20";

  const containerClass = moduleSectionContainerClass({ inSection });

  const bgColor = (block.config?.backgroundColor as string)?.trim();
  const bgImage = (block.config?.backgroundImage as string)?.trim();
  const overlayOpacity = (() => {
    const v = block.config?.backgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  })();

  const hasContent = audioUrl || tabs.length > 0;
  if (!hasContent && !title?.trim()) return null;

  const playerSubtitle =
    lang === "pt"
      ? ((block.config?.hinoPlayerLabelPt as string)?.trim() || "Ouça o hino oficial")
      : ((block.config?.hinoPlayerLabelEn as string)?.trim() || "Listen to the official anthem");

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} ${padTop} ${padBottom}`}
        style={bgColor && !bgImage ? { backgroundColor: bgColor } : undefined}
      >
        {bgImage ? (
          <>
            <div className="absolute inset-0">
              <SmartImage src={getPublicImageUrl(bgImage)} alt="" fill className="object-cover" sizes="100vw" />
            </div>
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
          </>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 30%, ${accent} 0%, transparent 45%), radial-gradient(circle at 80% 70%, #ffffff 0%, transparent 35%)`,
            }}
          />
        )}

        <div className={`relative ${containerClass}`}>
          {showTitle && title?.trim() ? (
            <SectionTitle
              title={title}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={titleAlign}
            />
          ) : (
            <div className="mb-8 flex items-center justify-center gap-2 text-amber-400/80 sm:justify-start">
              <Mic2 className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em]">
                {lang === "pt" ? "Hino do clube" : "Club anthem"}
              </span>
            </div>
          )}

          <div
            className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8"
            style={{ minHeight: `min(${HINO_PANEL_HEIGHT})` }}
          >
            {audioUrl ? (
              <HinoPlayerColumn
                src={audioUrl}
                clubName={clubName}
                subtitle={playerSubtitle}
                accent={accent}
                letra={letra?.trim() ?? ""}
                compositor={compositor?.trim() ?? ""}
                lang={lang}
              />
            ) : (
              <div
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-zinc-900/40 px-6 py-12 text-center text-sm text-zinc-500"
                style={{ minHeight: `min(${HINO_PANEL_HEIGHT})` }}
              >
                <Mic2 className="h-12 w-12 opacity-40" />
                <p className="mt-3">{lang === "pt" ? "Envie o MP3 do hino no editor." : "Upload the anthem MP3 in the editor."}</p>
              </div>
            )}

            <div
              className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm"
              style={{ minHeight: `min(${HINO_PANEL_HEIGHT})` }}
            >
              {tabs.length > 0 ? (
                <>
                  <div className="flex shrink-0 flex-wrap gap-1 border-b border-white/10 p-2 sm:p-3">
                    {tabs.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-4 ${
                          tab === id
                            ? "bg-white/10 text-white shadow-inner"
                            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                        }`}
                        style={tab === id ? { boxShadow: `inset 0 -2px 0 ${accent}` } : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                    {tab === "letra" ? (
                      <div className="space-y-4">
                        {compositor?.trim() ? (
                          <p className="text-sm text-zinc-400">
                            <span className="font-semibold uppercase tracking-wider text-zinc-500">
                              {lang === "pt" ? "Compositor" : "Composer"}
                            </span>
                            <span className="mt-1 block text-base text-zinc-100">{compositor.trim()}</span>
                          </p>
                        ) : null}
                        {letra?.trim() ? (
                          <div>
                            {audioUrl ? (
                              <p className="mb-3 text-xs text-zinc-500">
                                {lang === "pt"
                                  ? "Durante a reprodução, a letra acompanha o áudio no painel ao lado (modo karaoke)."
                                  : "While playing, lyrics scroll with the audio in the player panel (karaoke mode)."}
                              </p>
                            ) : null}
                            {compositor?.trim() ? (
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                {lang === "pt" ? "Letra" : "Lyrics"}
                              </p>
                            ) : null}
                            <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-100 sm:text-lg">
                              {letra.trim()}
                            </p>
                          </div>
                        ) : !compositor?.trim() ? (
                          <p className="text-sm text-zinc-500">
                            {lang === "pt" ? "Adicione compositor e letra no editor." : "Add composer and lyrics in the editor."}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {tab === "cifra" && cifra?.trim() ? <CifraContent text={cifra.trim()} /> : null}
                    {tab === "cifraEmbed" && chordsEmbedUrl ? (
                      <ChordsEmbedFrame
                        url={chordsEmbedUrl}
                        lang={lang}
                        accent={accent}
                        darkFilter={embedDarkFilter}
                        fillHeight
                      />
                    ) : null}
                    {tab === "partitura" && partituraUrl ? (
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                        <SmartImage
                          src={getPublicImageUrl(partituraUrl)}
                          alt={lang === "pt" ? "Partitura do hino" : "Anthem sheet music"}
                          fill
                          className="object-contain p-2"
                          sizes="(max-width: 768px) 100vw, 560px"
                        />
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-zinc-500">
                  {lang === "pt"
                    ? "Adicione letra, cifra ou partitura no editor."
                    : "Add lyrics, chords or sheet music in the editor."}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </AnimateInView>
  );
}
