"use client";

import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DashboardDeptHeader, DashboardDeptSection } from "@/components/dashboard/DashboardDeptHeader";

interface ModulePlaceholderPageProps {
  section?: string;
  title: string;
  description: string;
  moduleSlug: string;
  Icon: LucideIcon;
}

export function ModulePlaceholderPage({
  section,
  title,
  description,
  moduleSlug,
  Icon,
}: ModulePlaceholderPageProps) {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule(moduleSlug)) {
    router.replace("/403");
    return null;
  }

  return (
    <>
      <DashboardDeptHeader
        section={section ?? title}
        sectionIcon={Icon}
        title={title}
        description={description}
      />
      <DashboardDeptSection title={title}>
        <p className="text-muted-foreground">
          Em breve: conteúdo deste módulo será disponibilizado aqui.
        </p>
      </DashboardDeptSection>
    </>
  );
}
