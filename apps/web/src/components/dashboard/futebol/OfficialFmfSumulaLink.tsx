import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OfficialFmfSumulaLinkProps = {
  url: string | null | undefined;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
};

export function OfficialFmfSumulaLink({
  url,
  className,
  size = "sm",
}: OfficialFmfSumulaLinkProps) {
  const href = url?.trim();
  if (!href) return null;

  return (
    <Button variant="outline" size={size} className={cn("min-h-[44px]", className)} asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="mr-2 h-4 w-4" />
        Súmula oficial (FMF)
      </a>
    </Button>
  );
}

export function collectOfficialSumulaLinks(
  rounds: Array<{ shortLabel: string; sourceUrl?: string | null }>,
): Array<{ label: string; url: string }> {
  const seen = new Set<string>();
  const links: Array<{ label: string; url: string }> = [];
  for (const round of rounds) {
    const url = round.sourceUrl?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    links.push({ label: round.shortLabel, url });
  }
  return links;
}
