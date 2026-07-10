"use client";

import { usePathname } from "next/navigation";
import {
  DashboardDeptHeader,
  DashboardDeptShell,
} from "@/components/dashboard/DashboardDeptHeader";
import {
  resolveDashboardPageMeta,
  shouldShowAutoDashboardHeader,
} from "@/lib/dashboard-page-meta";

export function DashboardPageFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const meta = resolveDashboardPageMeta(pathname);
  const showAutoHeader = shouldShowAutoDashboardHeader(pathname) && meta;

  return (
    <DashboardDeptShell>
      {showAutoHeader ? (
        <DashboardDeptHeader
          section={meta.section}
          sectionIcon={meta.sectionIcon}
          title={meta.title}
          description={meta.description}
          backHref={meta.backHref}
          backLabel={meta.backLabel}
          accent={meta.accent}
          variant="standard"
        />
      ) : null}
      {children}
    </DashboardDeptShell>
  );
}
