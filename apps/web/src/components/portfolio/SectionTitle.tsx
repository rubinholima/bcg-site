"use client";

/** Alinhamento do título: left | center | right. */
export type SectionTitleAlign = "left" | "center" | "right";

/**
 * Título de seção com gradiente e linha animada.
 * Cores e alinhamento configuráveis no editor.
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
  } as React.CSSProperties;
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  return (
    <h2
      className={`title-gradient-line text-2xl font-bold tracking-tight sm:text-3xl mb-6 text-transparent ${alignClass} ${className}`}
      style={gradientStyle}
    >
      {title}
    </h2>
  );
}
