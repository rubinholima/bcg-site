import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HubStatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  accent?: string;
  iconClass?: string;
}

export function HubStatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  accent = "from-primary/10 to-primary/5 border-primary/20",
  iconClass = "text-primary",
}: HubStatCardProps) {
  const content = (
    <Card
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border bg-gradient-to-br shadow-md transition-shadow hover:shadow-lg",
        accent,
        href && "cursor-pointer",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span className={cn("rounded-xl bg-background/80 p-2.5 shadow-sm", iconClass)}>
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        {hint ? (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            {hint}
            {href ? <ArrowRight className="h-3.5 w-3.5" /> : null}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="group block min-w-0">
        {content}
      </Link>
    );
  }

  return content;
}
