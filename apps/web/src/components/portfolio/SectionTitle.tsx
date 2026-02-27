"use client";

/** Alinhamento do título: left | center | right. */
export type SectionTitleAlign = "left" | "center" | "right";

/**
 * Título de seção com gradiente e linha animada.
 * Cores e alinhamento configuráveis no editor.
 * A linha usa as mesmas cores do gradiente do título (âmbar→branco ou personalizado).
 */
export function SectionTitle({
  title,
  gradientStart,
  gradientEnd,
  align = "left",
  className = "",
}: {
  title: string;
  gradientStart?: string;
  gradientEnd?: string;
  align?: SectionTitleAlign;
  className?: string;
}) {
  const start = gradientStart?.trim() || "#fcd34d"; // amber-300
  const end = gradientEnd?.trim() || "#ffffff";
  const gradientStyle = {
    background: `linear-gradient(90deg, ${start}, ${end})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    // linha usa o mesmo gradiente
    ["--title-line-start" as string]: start,
    ["--title-line-end" as string]: end,
  } as React.CSSProperties;
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const widthClass = align === "left" || align === "right" ? "w-full" : "";

  return (
    <h2
      className={`title-gradient-line text-2xl font-bold tracking-tight sm:text-3xl mb-6 text-transparent ${alignClass} ${widthClass} ${className}`}
      style={gradientStyle}
    >
      {title}
    </h2>
  );
}
