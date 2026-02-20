"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { getPublicImageUrl, isProxyImageUrl, isSvgUrl } from "@/lib/media-url";

const EXTERNAL_LOGO_EXTENSIONS = [".png", ".webp", ".svg"] as const;

function slugFromTeamName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const PLACEHOLDER_OUR_TEAM_NAMES = ["nosso clube", "nosso", "our club", "our team", "nosso time"];

function isPlaceholderOurTeam(teamName: string): boolean {
  const t = teamName.trim().toLowerCase();
  return PLACEHOLDER_OUR_TEAM_NAMES.some((p) => t === p || t.startsWith(p + " ") || t.includes(p));
}

export function isOurTeam(teamName: string, ourTeamName: string | null | undefined): boolean {
  if (!ourTeamName?.trim()) return false;
  const a = teamName.trim().toLowerCase();
  const b = ourTeamName.trim().toLowerCase();
  if (a === b) return true;
  if (isPlaceholderOurTeam(teamName)) return true;
  return a.includes(b) || b.includes(a);
}

export function FixtureTeamLogo({
  teamName,
  ourTeamName,
  ourTeamLogoUrl,
  logoUrlOverride,
  size = 40,
}: {
  teamName: string;
  ourTeamName?: string | null;
  ourTeamLogoUrl?: string | null;
  logoUrlOverride?: string | null;
  size?: number;
}) {
  const [externalExtIndex, setExternalExtIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  if (logoUrlOverride?.trim()) {
    const src = getPublicImageUrl(logoUrlOverride);
    if (src) {
      const useImg = isSvgUrl(logoUrlOverride);
      return (
        <div
          className="relative flex shrink-0 items-center justify-center rounded-lg bg-zinc-800 p-1.5"
          style={{ width: size, height: size }}
        >
          {useImg ? (
            <img
              src={src}
              alt=""
              width={size}
              height={size}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <Image
              src={src}
              alt=""
              width={size}
              height={size}
              className="max-h-full max-w-full object-contain"
              unoptimized={isProxyImageUrl(src)}
            />
          )}
        </div>
      );
    }
  }

  const isOurs = isOurTeam(teamName, ourTeamName);
  const slug = slugFromTeamName(teamName);

  if (isOurs && ourTeamLogoUrl) {
    const src = getPublicImageUrl(ourTeamLogoUrl);
    if (!src) {
      return (
        <div
          className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400"
          style={{ width: size, height: size }}
        >
          <Building2 className="h-5 w-5" />
        </div>
      );
    }
    const useImg = isSvgUrl(ourTeamLogoUrl);
    return (
      <div
        className="relative flex shrink-0 items-center justify-center rounded-lg bg-zinc-800 p-1.5"
        style={{ width: size, height: size }}
      >
        {useImg ? (
          <img
            src={src}
            alt=""
            width={size}
            height={size}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <Image
            src={src}
            alt=""
            width={size}
            height={size}
            className="max-h-full max-w-full object-contain"
            unoptimized={isProxyImageUrl(src)}
          />
        )}
      </div>
    );
  }

  const base = "/logos/teams-externos/" + slug;
  const externalSrc = base + EXTERNAL_LOGO_EXTENSIONS[externalExtIndex];

  if (showPlaceholder) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400"
        style={{ width: size, height: size }}
      >
        <Building2 className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-lg bg-zinc-800 p-1.5"
      style={{ width: size, height: size }}
    >
      <img
        src={externalSrc}
        alt=""
        width={size}
        height={size}
        className="max-h-full max-w-full object-contain"
        onError={() => {
          if (externalExtIndex < EXTERNAL_LOGO_EXTENSIONS.length - 1) {
            setExternalExtIndex((i) => i + 1);
          } else {
            setShowPlaceholder(true);
          }
        }}
      />
    </div>
  );
}
