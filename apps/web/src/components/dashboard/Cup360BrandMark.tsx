import { cn } from "@/lib/utils";
import { PLATFORM_APP_NAME, PLATFORM_LOGO_MARK_SRC } from "@/lib/platform-branding";

type Cup360BrandMarkProps = {
  /** Tamanho do ícone quadrado */
  logoClassName?: string;
  /** Mostrar texto CUP360 ao lado */
  showName?: boolean;
  nameClassName?: string;
  className?: string;
};

export function Cup360BrandMark({
  logoClassName = "h-8 w-8",
  showName = true,
  nameClassName = "text-lg font-bold tracking-tight",
  className,
}: Cup360BrandMarkProps) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <img
        src={PLATFORM_LOGO_MARK_SRC}
        alt={PLATFORM_APP_NAME}
        width={32}
        height={32}
        className={cn("flex-shrink-0 object-contain", logoClassName)}
      />
      {showName ? (
        <span className={cn("truncate", nameClassName)}>
          <span className="text-foreground">CUP</span>
          <span className="bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">360</span>
        </span>
      ) : null}
    </span>
  );
}
