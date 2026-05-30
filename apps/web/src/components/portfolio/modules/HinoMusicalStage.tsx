"use client";

import { Playfair_Display } from "next/font/google";

/** Fonte clássica para letra de hino / hino nacional. */
export const hinoLyricFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

type NoteSpec = {
  id: number;
  char: string;
  left: string;
  delay: string;
  duration: string;
  size: number;
  drift: string;
};

const FLOATING_NOTES: NoteSpec[] = [
  { id: 1, char: "♪", left: "6%", delay: "0s", duration: "9s", size: 22, drift: "-12px" },
  { id: 2, char: "♫", left: "18%", delay: "1.2s", duration: "11s", size: 28, drift: "8px" },
  { id: 3, char: "♩", left: "32%", delay: "2.4s", duration: "10s", size: 20, drift: "-6px" },
  { id: 4, char: "♬", left: "48%", delay: "0.6s", duration: "12s", size: 26, drift: "10px" },
  { id: 5, char: "♪", left: "62%", delay: "3s", duration: "9.5s", size: 24, drift: "-14px" },
  { id: 6, char: "♫", left: "76%", delay: "1.8s", duration: "10.5s", size: 30, drift: "6px" },
  { id: 7, char: "♩", left: "88%", delay: "2.2s", duration: "11.5s", size: 18, drift: "-8px" },
  { id: 8, char: "♪", left: "42%", delay: "4s", duration: "13s", size: 16, drift: "12px" },
  { id: 9, char: "♬", left: "24%", delay: "3.6s", duration: "10s", size: 22, drift: "-10px" },
  { id: 10, char: "♫", left: "54%", delay: "5s", duration: "12s", size: 20, drift: "4px" },
];

const BAR_DELAYS = ["0ms", "120ms", "240ms", "80ms", "200ms", "160ms", "40ms", "280ms"];

/** Pauta + notas flutuantes + equalizer sutil. */
export function HinoMusicalStage({
  playing,
  accent,
  intense,
}: {
  playing: boolean;
  accent: string;
  /** Mais movimento durante a letra ativa. */
  intense?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Pauta */}
      <svg
        className="absolute inset-x-0 top-[38%] h-24 w-full opacity-[0.07] sm:top-[40%]"
        viewBox="0 0 400 80"
        preserveAspectRatio="none"
      >
        {[18, 32, 46, 60, 74].map((y) => (
          <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="currentColor" strokeWidth="1" className="text-white" />
        ))}
      </svg>

      {/* Clave de sol decorativa */}
      <span
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[42%] select-none text-[4.5rem] leading-none opacity-[0.06] sm:text-[6rem] ${
          playing ? "animate-hino-clef-glow" : ""
        }`}
        style={{ color: accent, fontFamily: "serif" }}
      >
        𝄞
      </span>

      {/* Brilho central quando toca */}
      <div
        className={`absolute left-1/2 top-[58%] h-32 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-700 ${
          playing ? "opacity-30" : "opacity-10"
        } ${intense ? "opacity-45" : ""}`}
        style={{ backgroundColor: accent }}
      />

      {/* Notas em volta */}
      {FLOATING_NOTES.map((note) => (
        <span
          key={note.id}
          className={`absolute bottom-0 font-serif will-change-transform ${
            playing ? "animate-hino-note-rise" : "animate-hino-note-idle"
          }`}
          style={{
            left: note.left,
            fontSize: note.size,
            color: accent,
            animationDelay: note.delay,
            animationDuration: note.duration,
            ["--hino-drift" as string]: note.drift,
            opacity: playing ? undefined : 0.25,
          }}
        >
          {note.char}
        </span>
      ))}

      {/* Equalizer na base */}
      <div
        className={`absolute inset-x-0 bottom-0 flex h-10 items-end justify-center gap-1 px-8 pb-2 transition-opacity duration-500 ${
          playing ? "opacity-70" : "opacity-25"
        }`}
      >
        {BAR_DELAYS.map((delay, i) => (
          <span
            key={i}
            className={`w-1 rounded-full ${playing ? "animate-hino-eq-bar" : "h-2"}`}
            style={{
              background: `linear-gradient(to top, ${accent}, #ffffffaa)`,
              animationDelay: delay,
              height: playing ? undefined : 8,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Ícone grande na intro / idle. */
export function HinoIntroPulse({ accent, lang }: { accent: string; lang: "pt" | "en" }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <HinoMusicalStage playing={false} accent={accent} />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <span
          className="animate-hino-clef-glow text-5xl leading-none sm:text-6xl"
          style={{ color: accent, fontFamily: "serif" }}
          aria-hidden
        >
          𝄞
        </span>
        <div className="flex gap-3 text-2xl sm:text-3xl" aria-hidden>
          {["♪", "♫", "♬"].map((c, i) => (
            <span
              key={c}
              className="animate-hino-note-idle font-serif"
              style={{ color: accent, animationDelay: `${i * 0.45}s` }}
            >
              {c}
            </span>
          ))}
        </div>
        <p className={`max-w-xs text-sm leading-relaxed text-zinc-400 ${hinoLyricFont.className}`}>
          {lang === "pt"
            ? "Toque em play — a letra surge no ritmo da música."
            : "Press play — lyrics appear in time with the music."}
        </p>
      </div>
    </div>
  );
}

/** Intro instrumental animada. */
export function HinoIntroPlaying({ accent, lang }: { accent: string; lang: "pt" | "en" }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
      <HinoMusicalStage playing intense accent={accent} />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <span className="animate-hino-clef-glow text-4xl sm:text-5xl" style={{ color: accent, fontFamily: "serif" }}>
          𝄞
        </span>
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="inline-block h-2 w-2 rounded-full animate-hino-eq-bar"
              style={{ backgroundColor: accent, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          {lang === "pt" ? "Introdução…" : "Intro…"}
        </p>
      </div>
    </div>
  );
}
