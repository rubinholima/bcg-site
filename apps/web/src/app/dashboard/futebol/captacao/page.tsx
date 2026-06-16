"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export default function FutebolCaptacaoPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("futebol_captacao")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  if (authLoading || !canAccessModule("futebol_captacao")) {
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
          href="/dashboard/futebol"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Depto Futebol
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <UserPlus className="h-8 w-8" />
          Captação
        </h1>
        <p className="mt-1 text-muted-foreground">
          Prospecção, observação e acompanhamento de atletas em captação.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
          <CardDescription>
            O hub de Captação centralizará relatórios de observação, listas de alvos e pipeline de
            atletas prospectados.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Enquanto isso, utilize o cadastro de atletas e o módulo de Try-outs quando estiver ativo.
        </CardContent>
      </Card>
    </div>
  );
}
