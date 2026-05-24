"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export default function EnfermeirosCadastroPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  if (authLoading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Heart className="h-8 w-8" />
          Enfermeiros
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Cadastro de enfermeiros — em breve integrado ao cadastro único de funcionários (departamento Saúde).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organização em andamento</CardTitle>
          <CardDescription>
            Médicos e enfermeiros serão cadastros separados neste hub até a consolidação no cadastro mestre de
            funcionários, com departamento e foto na listagem.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Por enquanto, use o cadastro de médicos para profissionais já cadastrados na equipe médica.
        </CardContent>
      </Card>
    </div>
  );
}
