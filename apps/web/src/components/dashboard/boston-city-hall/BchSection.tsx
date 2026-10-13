"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function BchSection({
  title,
  actionHref,
  actionLabel,
  children,
  className,
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-800/80 bg-[#0c1222]/60 p-4 sm:p-5",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="text-xs font-medium text-amber-400/90 hover:text-amber-300"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
