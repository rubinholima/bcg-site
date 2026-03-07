"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

interface ModulePlaceholderPageProps {
  title: string;
  description: string;
  moduleSlug: string;
  Icon: LucideIcon;
  backHref?: string;
}

export function ModulePlaceholderPage({
  title,
  description,
  moduleSlug,
  Icon,
  backHref = "/dashboard",
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Em breve: conteúdo deste módulo será disponibilizado aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
