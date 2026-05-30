"use client";

import { Playfair_Display } from "next/font/google";

/** Fonte clássica para letra de hino / hino nacional. */
export const hinoLyricFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

/** Clave de sol grande — início / intro. */
export function HinoClefHero({ accent, size = "lg" }: { accent: string; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "text-6xl sm:text-7xl" : "text-4xl sm:text-5xl";
  return (
    <span
      className={`${cls} animate-hino-clef-glow leading-none`}
      style={{ color: accent, fontFamily: "serif" }}
      aria-hidden
    >
      𝄞
    </span>
  );
}

/** Antes do play — clave em destaque, sem poluição visual. */
export function HinoIntroPulse({ accent, lang }: { accent: string; lang: "pt" | "en" }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <HinoClefHero accent={accent} />
      <p className={`mt-6 max-w-xs text-sm leading-relaxed text-zinc-400 ${hinoLyricFont.className}`}>
        {lang === "pt"
          ? "Toque em play — a letra surge no ritmo da música."
          : "Press play — lyrics appear in time with the music."}
      </p>
    </div>
  );
}

/** Intro instrumental (antes da 1ª linha LRC). */
export function HinoIntroPlaying({ accent, lang }: { accent: string; lang: "pt" | "en" }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
      <HinoClefHero accent={accent} size="md" />
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-1.5 w-1.5 rounded-full animate-hino-eq-bar"
            style={{ backgroundColor: accent, animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
        {lang === "pt" ? "Introdução…" : "Intro…"}
      </p>
    </div>
  );
}

/** Fundo quase invisível enquanto a letra canta. */
export function HinoLyricsBackdrop({ accent }: { accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]" aria-hidden>
      <svg className="absolute inset-x-4 top-1/2 h-20 w-[calc(100%-2rem)] -translate-y-1/2" viewBox="0 0 400 80">
        {[18, 32, 46, 60, 74].map((y) => (
          <line key={y} x1="0" y1={y} x2="400" y2={y} stroke={accent} strokeWidth="1" />
        ))}
      </svg>
    </div>
  );
}
