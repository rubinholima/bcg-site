"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getPublicImageUrl } from "@/lib/media-url";
import { initialsFromName } from "./coach-team-report-utils";

interface Props {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-16 w-16 text-sm",
} as const;

export function CoachTeamReportPlayerAvatar({ name, photoUrl, size = "md", className }: Props) {
  const src = photoUrl ? getPublicImageUrl(photoUrl) : null;
  return (
    <Avatar className={cn(SIZE_CLASS[size], "rounded-none", className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback className="rounded-none bg-muted font-semibold text-muted-foreground">
        {initialsFromName(name)}
      </AvatarFallback>
    </Avatar>
  );
}
