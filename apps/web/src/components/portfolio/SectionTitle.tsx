"use client";

/**
 * Título de seção com gradiente e linha animada.
 * Cores configuráveis no editor para seguir o padrão do time.
 */
export function SectionTitle({
  title,
  gradientStart,
  gradientEnd,
  className = "",
}: {
  title: string;
  gradientStart?: string;
  gradientEnd?: string;
  className?: string;
}) {
  const start = gradientStart?.trim() || "#fcd34d"; // amber-300
  const end = gradientEnd?.trim() || "#ffffff";
  const gradientStyle = {
    background: `linear-gradient(90deg, ${start}, ${end})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
  } as React.CSSProperties;

  return (
    <h2
      className={`title-gradient-line text-2xl font-bold tracking-tight sm:text-3xl mb-6 text-transparent ${className}`}
      style={gradientStyle}
    >
      {title}
    </h2>
  );
}
