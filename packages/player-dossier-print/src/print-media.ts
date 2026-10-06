const BCG_GROUP_LOGO_PATH = "/bcg-logo.png";

export function reportLogoUrlForPrint(
  tenantLogo: string | null | undefined,
  allClubs: boolean,
): string | null | undefined {
  if (allClubs) return BCG_GROUP_LOGO_PATH;
  return tenantLogo ?? null;
}

/** URL absoluta para iframe / PDF (sem depender de window). */
export function resolveLogoUrlForPrint(
  logoUrl: string | null | undefined,
  origin = "https://www.bostoncitygroup.biz",
): string {
  if (!logoUrl) return "";
  const raw = logoUrl.trim();
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${origin.replace(/\/$/, "")}${raw}`;
  return raw;
}
