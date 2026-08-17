"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  convocacaoPath,
  jogosDetailPath,
  planejamentoPath,
  pressKitPath,
} from "@/lib/friendly-match-utils";
import { cn } from "@/lib/utils";

interface GameOperateLinksProps {
  tenantId: string;
  travelId: string;
  className?: string;
  size?: "sm" | "default";
}

export function GameOperateLinks({
  tenantId,
  travelId,
  className,
  size = "sm",
}: GameOperateLinksProps) {
  const btnClass = size === "sm" ? "min-h-[40px]" : "min-h-[44px]";

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button variant="default" size={size} className={btnClass} asChild>
        <Link href={convocacaoPath(travelId)}>Convocação</Link>
      </Button>
      <Button variant="outline" size={size} className={btnClass} asChild>
        <Link href={planejamentoPath(travelId)}>Planejamento</Link>
      </Button>
      <Button variant="outline" size={size} className={btnClass} asChild>
        <Link href={pressKitPath(tenantId, travelId)}>Escalação</Link>
      </Button>
      <Button variant="outline" size={size} className={btnClass} asChild>
        <Link href={jogosDetailPath(tenantId, travelId)}>Jogo</Link>
      </Button>
    </div>
  );
}
