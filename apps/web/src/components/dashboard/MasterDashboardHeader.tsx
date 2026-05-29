"use client";

import { Globe } from "lucide-react";
import {
  DashboardDeptHeader,
  type DashboardDeptStat,
} from "@/components/dashboard/DashboardDeptHeader";

export function MasterDashboardHeader({
  groupName,
  stats,
}: {
  groupName: string;
  stats: DashboardDeptStat[];
}) {
  return (
    <DashboardDeptHeader
      section="Grupo Master"
      sectionIcon={Globe}
      title="Dashboard Master"
      description={groupName}
      stats={stats}
    />
  );
}
