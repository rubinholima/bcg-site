"use client";

import type { Lang } from "@/lib/home-copy";

const STYLE_ID = "bcg-lang-selector-custom";

/** Luminância aproximada de uma cor hex (0 = preto, 1 = branco). */
function hexLuminance(hex: string): number {
  const h = hex.replace(/^#/, "");
  if (h.length !== 3 && h.length !== 6) return 0.5;
  const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16) / 255;
  const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16) / 255;
  const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function escapeCss(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

interface LanguageSelectorProps {
  lang: Lang;
  onSelect: (l: Lang) => void;
  headerBg: string;
  headerTextColor: string;
  selectedBg?: string;
  selectedTextColor?: string;
}

/**
 * Seletor PT/EN com contraste garantido. Usa cores do bloco header quando definidas
 * (headerLanguageSelectedBg, headerLanguageSelectedText); senão usa automático.
 */
export function LanguageSelector({
  lang,
  onSelect,
  headerBg,
  headerTextColor,
  selectedBg,
  selectedTextColor,
}: LanguageSelectorProps) {
  const headerDark = hexLuminance(headerBg) < 0.4;
  const defaultSelectedBg = headerDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
  const defaultSelectedText = headerDark ? "#ffffff" : "#18181b";
  const hasCustomBg = typeof selectedBg === "string" && selectedBg.trim() !== "";
  const hasCustomText = typeof selectedTextColor === "string" && selectedTextColor.trim() !== "";
  const bg = hasCustomBg ? selectedBg!.trim() : defaultSelectedBg;
  const text = hasCustomText ? selectedTextColor!.trim() : defaultSelectedText;

  const unselectedColor = headerTextColor || "#e4e4e7";
  const borderColor = headerDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";

  const selectedStyle: React.CSSProperties = {
    backgroundColor: bg,
    color: text,
  };
  const unselectedStyle: React.CSSProperties = { color: unselectedColor };

  const cssBg = escapeCss(bg);
  const cssText = escapeCss(text);

  return (
    <>
      <style
        id={STYLE_ID}
        dangerouslySetInnerHTML={{
          __html: `[data-bcg-lang-selected]{background-color:${cssBg} !important;color:${cssText} !important}[data-bcg-lang-selected] span{color:${cssText} !important}`,
        }}
      />
      <div
        className="flex rounded-lg p-0.5"
        style={{
          border: `1px solid ${borderColor}`,
          backgroundColor: headerDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
        }}
      >
        <button
          type="button"
          onClick={() => onSelect("pt")}
          data-bcg-lang-selected={lang === "pt" ? true : undefined}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 border-0"
          style={lang === "pt" ? selectedStyle : unselectedStyle}
        >
          <span style={lang === "pt" ? { color: text } : { color: unselectedColor }}>PT</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect("en")}
          data-bcg-lang-selected={lang === "en" ? true : undefined}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 border-0"
          style={lang === "en" ? selectedStyle : unselectedStyle}
        >
          <span style={lang === "en" ? { color: text } : { color: unselectedColor }}>EN</span>
        </button>
      </div>
    </>
  );
}
