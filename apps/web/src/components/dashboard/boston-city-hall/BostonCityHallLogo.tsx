import { BCH_LOGO_STATIC } from "@/lib/boston-city-hall";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-5 w-5",
  md: "h-10 w-10",
  lg: "h-14 w-14 sm:h-16 sm:w-16",
} as const;

export function BostonCityHallLogo({
  size = "md",
  className,
  alt = "Boston City Hall",
}: {
  size?: keyof typeof SIZES;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={BCH_LOGO_STATIC}
      alt={alt}
      className={cn("shrink-0 object-contain", SIZES[size], className)}
    />
  );
}
