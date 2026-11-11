"use client";

import { useEffect, useMemo, useState } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { SmartImage } from "@/components/common/SmartImage";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { fetchFixtures, type FixtureItem } from "@/lib/fixtures-shared";
import { resolveBlockAlignments, alignmentClass, resolveSiteTheme } from "@/lib/page-builder/theme-resolve";
import { Button } from "@/components/ui/button";

type SectionProps = {
  block: HomeContentBlock;
  slug: string;
  lang: "pt" | "en";
  page: Page;
  fullWidth?: boolean;
  showTitle?: boolean;
};

function blockBg(block: HomeContentBlock, page: Page) {
  const theme = resolveSiteTheme(page.content?.theme);
  const bg = (block.config?.backgroundColor as string)?.trim();
  return { backgroundColor: bg || theme.background, color: theme.text };
}

export function CountdownSection({ block, lang }: SectionProps) {
  const label = lang === "pt" ? (block.config?.countdownLabelPt as string) : (block.config?.countdownLabelEn as string);
  const target = String(block.config?.countdownTargetISO ?? "").trim();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = target ? new Date(target).getTime() - now : 0;
  const done = diff <= 0;
  const days = Math.max(0, Math.floor(diff / 86400000));
  const hours = Math.max(0, Math.floor((diff % 86400000) / 3600000));
  const mins = Math.max(0, Math.floor((diff % 3600000) / 60000));
  const secs = Math.max(0, Math.floor((diff % 60000) / 1000));
  return (
    <div className="flex flex-wrap justify-center gap-3 py-6 text-center">
      {label ? <p className="mb-2 w-full text-sm font-medium opacity-90">{label}</p> : null}
      {done ? (
        <p className="text-lg font-semibold">{lang === "pt" ? "Chegou a hora!" : "It's time!"}</p>
      ) : (
        <CountdownDigits days={days} hours={hours} mins={mins} secs={secs} lang={lang} />
      )}
    </div>
  );
}

function CountdownDigits({
  days,
  hours,
  mins,
  secs,
  lang,
}: {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  lang: "pt" | "en";
}) {
  const items = [
    { v: days, l: lang === "pt" ? "dias" : "days" },
    { v: hours, l: lang === "pt" ? "horas" : "hours" },
    { v: mins, l: lang === "pt" ? "min" : "min" },
    { v: secs, l: lang === "pt" ? "seg" : "sec" },
  ];
  return (
    <>
      {items.map((item) => (
        <div key={item.l} className="min-w-[4.5rem] rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-2xl font-bold tabular-nums">{String(item.v).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase tracking-wide opacity-70">{item.l}</div>
        </div>
      ))}
    </>
  );
}

export function MatchDayHeroSection({ block, slug, lang, page, fullWidth, showTitle }: SectionProps) {
  const theme = resolveSiteTheme(page.content?.theme);
  const align = resolveBlockAlignments(block, page.content?.theme);
  const [fixtures, setFixtures] = useState<FixtureItem[]>([]);
  const mode = (block.config?.matchDayMode as string) ?? "next";
  const fixtureId = String(block.config?.matchDayFixtureId ?? "").trim();
  useEffect(() => {
    let c = false;
    fetchFixtures(slug, "tenant").then((list) => {
      if (!c) setFixtures(list);
    });
    return () => {
      c = true;
    };
  }, [slug]);
  const fixture = useMemo(() => {
    const upcoming = fixtures.filter((f) => new Date(f.startISO) > new Date());
    if (mode === "specific" && fixtureId) {
      return fixtures.find((f) => f.externalId === fixtureId) ?? upcoming[0];
    }
    return upcoming[0];
  }, [fixtures, mode, fixtureId]);
  const title = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  const targetIso = fixture?.startISO ?? "";
  return (
    <section
      id={block.id}
      className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} py-14 sm:py-20`}
      style={blockBg(block, page)}
    >
      <div className={moduleSectionContainerClass({ fullWidth })}>
        <div className={alignmentClass(align.title)}>
          {showTitle !== false && title ? (
            <SectionTitle
              title={String(title)}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={align.title}
            />
          ) : null}
        </div>
        {fixture ? (
          <div className={`mt-8 grid gap-6 md:grid-cols-3 md:items-center ${alignmentClass(align.body)}`}>
            <TeamCrest name={fixture.homeTeamName} logo={fixture.homeTeamLogoUrl} />
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest opacity-70">{fixture.competitionName}</p>
              <p className="mt-2 text-lg font-semibold">
                {fixture.homeTeamName} × {fixture.awayTeamName}
              </p>
              <p className="mt-1 text-sm opacity-80">
                {new Date(fixture.startISO).toLocaleString(lang === "pt" ? "pt-BR" : "en-US")}
                {fixture.venueName ? ` · ${fixture.venueName}` : ""}
              </p>
              {targetIso ? (
                <div className="mt-4">
                  <CountdownInline targetIso={targetIso} lang={lang} />
                </div>
              ) : null}
              {block.config?.ctaUrl ? (
                <Button asChild className="mt-4" style={{ backgroundColor: theme.accent }}>
                  <a href={String(block.config.ctaUrl)} rel="noopener noreferrer">
                    {lang === "pt" ? "Ingressos" : "Tickets"}
                  </a>
                </Button>
              ) : null}
            </div>
            <TeamCrest name={fixture.awayTeamName} logo={fixture.awayTeamLogoUrl} />
          </div>
        ) : (
          <p className={`mt-6 text-sm opacity-70 ${alignmentClass(align.body)}`}>
            {lang === "pt" ? "Nenhum jogo público encontrado." : "No public fixture found."}
          </p>
        )}
      </div>
    </section>
  );
}

function CountdownInline({ targetIso, lang }: { targetIso: string; lang: "pt" | "en" }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return <p className="text-sm font-medium">{lang === "pt" ? "Jogo em andamento ou encerrado." : "Match started or finished."}</p>;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return (
    <p className="text-sm tabular-nums opacity-90">
      {days}d {hours}h {mins}m
    </p>
  );
}

function TeamCrest({ name, logo }: { name?: string; logo?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20 overflow-hidden rounded-full border border-white/15 bg-white/5">
        {logo ? (
          <SmartImage src={getPublicImageUrl(logo)} alt={name ?? ""} fill className="object-contain p-2" sizes="80px" />
        ) : null}
      </div>
      <span className="text-center text-sm font-medium">{name}</span>
    </div>
  );
}

export function MatchCenterSection({ block, slug, lang, page, fullWidth, showTitle }: SectionProps) {
  const align = resolveBlockAlignments(block, page.content?.theme);
  const title = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  const fixtureId = String(block.config?.matchCenterFixtureId ?? "").trim();
  const [fixtures, setFixtures] = useState<FixtureItem[]>([]);
  useEffect(() => {
    let c = false;
    fetchFixtures(slug, "tenant").then((list) => {
      if (!c) setFixtures(list);
    });
    return () => {
      c = true;
    };
  }, [slug]);
  const fixture =
    fixtures.find((f) => f.externalId === fixtureId) ??
    fixtures.find((f) => {
      const d = new Date(f.startISO);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    });
  return (
    <section id={block.id} className={`py-12 ${moduleBottomBorderClass(block.config)}`} style={blockBg(block, page)}>
      <div className={moduleSectionContainerClass({ fullWidth })}>
        {showTitle !== false && title ? (
          <SectionTitle title={String(title)} align={align.title} className={alignmentClass(align.title)} />
        ) : null}
        {fixture ? (
          <div className={`mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 ${alignmentClass(align.body)}`}>
            <p className="text-xs uppercase opacity-70">{fixture.competitionName}</p>
            <p className="mt-2 text-2xl font-bold">
              {fixture.homeTeamName} {fixture.homeScore != null ? fixture.homeScore : "–"}{" "}
              {fixture.awayScore != null ? fixture.awayScore : "–"} {fixture.awayTeamName}
            </p>
            <p className="mt-2 text-sm opacity-80">
              {fixture.status === "FINAL"
                ? lang === "pt"
                  ? "Encerrado"
                  : "Final"
                : fixture.status === "LIVE"
                  ? lang === "pt"
                    ? "Ao vivo"
                    : "Live"
                  : lang === "pt"
                    ? "Agendado"
                    : "Scheduled"}
              {fixture.venueName ? ` · ${fixture.venueName}` : ""}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm opacity-70">{lang === "pt" ? "Sem dados públicos do jogo." : "No public match data."}</p>
        )}
      </div>
    </section>
  );
}

export function VideoBlockSection({ block, lang, page, fullWidth, showTitle }: SectionProps) {
  const align = resolveBlockAlignments(block, page.content?.theme);
  const title = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  const url = String(block.config?.videoUrl ?? "").trim();
  const embed = toSafeEmbedUrl(url);
  return (
    <section id={block.id} className={`py-12 ${moduleBottomBorderClass(block.config)}`} style={blockBg(block, page)}>
      <div className={moduleSectionContainerClass({ fullWidth })}>
        {showTitle !== false && title ? <SectionTitle title={String(title)} align={align.title} /> : null}
        {embed ? (
          <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-xl border border-white/10">
            <iframe title={title ? String(title) : "Video"} src={embed} className="absolute inset-0 h-full w-full" allowFullScreen />
          </div>
        ) : (
          <p className="mt-4 text-sm opacity-70">{lang === "pt" ? "Informe uma URL de vídeo suportada." : "Add a supported video URL."}</p>
        )}
      </div>
    </section>
  );
}

function toSafeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function SocialLinksBlockSection({ block, lang, page, fullWidth, showTitle }: SectionProps) {
  const align = resolveBlockAlignments(block, page.content?.theme);
  const title = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  const links = (block.config?.socialLinks as Array<{ label?: string; url?: string }>) ?? [];
  return (
    <section id={block.id} className={`py-10 ${moduleBottomBorderClass(block.config)}`} style={blockBg(block, page)}>
      <div className={moduleSectionContainerClass({ fullWidth })}>
        {showTitle !== false && title ? <SectionTitle title={String(title)} align={align.title} /> : null}
        <ul className={`mt-4 flex flex-wrap gap-3 ${align.body === "center" ? "justify-center" : align.body === "right" ? "justify-end" : "justify-start"}`}>
          {links.map((link, i) =>
            link.url ? (
              <li key={i}>
                <a href={link.url} className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10" rel="noopener noreferrer" target="_blank">
                  {link.label || link.url}
                </a>
              </li>
            ) : null,
          )}
        </ul>
      </div>
    </section>
  );
}

export function HonorsBlockSection({ block, lang, page, fullWidth, showTitle }: SectionProps) {
  const align = resolveBlockAlignments(block, page.content?.theme);
  const title = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  const items = (block.config?.honorsItems as Array<{ title?: string; year?: string; image?: string; description?: string }>) ?? [];
  return (
    <section id={block.id} className={`py-12 ${moduleBottomBorderClass(block.config)}`} style={blockBg(block, page)}>
      <div className={moduleSectionContainerClass({ fullWidth })}>
        {showTitle !== false && title ? <SectionTitle title={String(title)} align={align.title} /> : null}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
              {item.image ? (
                <div className="relative mb-3 aspect-square w-16 overflow-hidden rounded-lg">
                  <SmartImage src={getPublicImageUrl(item.image)} alt="" fill className="object-cover" sizes="64px" />
                </div>
              ) : null}
              <p className="font-semibold">{item.title}</p>
              {item.year ? <p className="text-xs opacity-70">{item.year}</p> : null}
              {item.description ? <p className="mt-2 text-sm opacity-80">{item.description}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TechnicalStaffPublicSection({ block, lang, page, fullWidth, showTitle }: SectionProps) {
  const align = resolveBlockAlignments(block, page.content?.theme);
  const title = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  const staff =
    (block.config?.staffMembers as Array<{ name?: string; role?: string; photoUrl?: string }> | undefined) ?? [];
  return (
    <section id={block.id} className={`py-12 ${moduleBottomBorderClass(block.config)}`} style={blockBg(block, page)}>
      <div className={moduleSectionContainerClass({ fullWidth })}>
        {showTitle !== false && title ? <SectionTitle title={String(title)} align={align.title} /> : null}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {staff.length ? (
            staff.map((m, i) => (
              <div key={i} className="rounded-xl border border-white/10 p-4 text-center">
                {m.photoUrl ? (
                  <div className="relative mx-auto mb-3 h-20 w-20 overflow-hidden rounded-full">
                    <SmartImage src={getPublicImageUrl(m.photoUrl)} alt="" fill className="object-cover" sizes="80px" />
                  </div>
                ) : null}
                <p className="font-medium">{m.name}</p>
                {m.role ? <p className="text-xs opacity-70">{m.role}</p> : null}
              </div>
            ))
          ) : (
            <p className="text-sm opacity-70">{lang === "pt" ? "Sem comissão técnica pública." : "No public staff data."}</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function StadiumPublicSection({ block, lang, page, fullWidth, showTitle }: SectionProps) {
  const align = resolveBlockAlignments(block, page.content?.theme);
  const title = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  const name = String(block.config?.stadiumName ?? "").trim();
  const photo = String(block.config?.stadiumPhoto ?? "").trim();
  const location = String(block.config?.stadiumLocation ?? "").trim();
  const capacity = block.config?.stadiumCapacity;
  const body = lang === "pt" ? block.config?.bodyPt : block.config?.bodyEn;
  return (
    <section id={block.id} className={`py-12 ${moduleBottomBorderClass(block.config)}`} style={blockBg(block, page)}>
      <div className={moduleSectionContainerClass({ fullWidth })}>
        {showTitle !== false && title ? <SectionTitle title={String(title)} align={align.title} /> : null}
        <div className={`mt-6 grid gap-6 md:grid-cols-2 ${alignmentClass(align.body)}`}>
          {photo ? (
            <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10">
              <SmartImage src={getPublicImageUrl(photo)} alt={name || ""} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
            </div>
          ) : null}
          <div>
            {name ? <h3 className="text-xl font-semibold">{name}</h3> : null}
            {location ? <p className="mt-1 text-sm opacity-80">{location}</p> : null}
            {capacity != null && capacity !== "" ? (
              <p className="mt-1 text-sm opacity-80">
                {lang === "pt" ? "Capacidade" : "Capacity"}: {String(capacity)}
              </p>
            ) : null}
            {body ? <p className="mt-4 whitespace-pre-wrap text-sm opacity-90">{String(body)}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MembershipPublicSection({ block, lang, page, fullWidth, showTitle }: SectionProps) {
  const theme = resolveSiteTheme(page.content?.theme);
  const align = resolveBlockAlignments(block, page.content?.theme);
  const title = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  const body = lang === "pt" ? block.config?.bodyPt : block.config?.bodyEn;
  const cta = String(block.config?.ctaUrl ?? "").trim();
  return (
    <section id={block.id} className={`py-12 ${moduleBottomBorderClass(block.config)}`} style={blockBg(block, page)}>
      <div className={moduleSectionContainerClass({ fullWidth })}>
        {showTitle !== false && title ? <SectionTitle title={String(title)} align={align.title} /> : null}
        {body ? <p className={`mt-4 ${alignmentClass(align.body)}`}>{String(body)}</p> : null}
        {cta ? (
          <div className={`mt-6 ${alignmentClass(align.body)}`}>
            <Button asChild style={{ backgroundColor: theme.accent }}>
              <a href={cta} rel="noopener noreferrer">
                {lang === "pt" ? "Seja sócio" : "Join membership"}
              </a>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StatisticsPublicSection({ block, lang, page, fullWidth, showTitle }: SectionProps) {
  const align = resolveBlockAlignments(block, page.content?.theme);
  const title = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  const stats =
    (block.config?.statItems as Array<{ label?: string; value?: string }> | undefined)?.map((x) => ({
      label: String(x.label ?? ""),
      value: String(x.value ?? ""),
    })) ?? [];
  return (
    <section id={block.id} className={`py-12 ${moduleBottomBorderClass(block.config)}`} style={blockBg(block, page)}>
      <div className={moduleSectionContainerClass({ fullWidth })}>
        {showTitle !== false && title ? <SectionTitle title={String(title)} align={align.title} /> : null}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className="rounded-xl border border-white/10 p-4 text-center">
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs uppercase tracking-wide opacity-70">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
