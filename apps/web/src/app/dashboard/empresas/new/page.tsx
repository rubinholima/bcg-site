import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function NovaEmpresaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/empresas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Empresa</h1>
          <p className="text-muted-foreground">
            Cadastre uma nova empresa do grupo
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulário</CardTitle>
          <CardDescription>
            Em breve: formulário de criação. A API em {process.env.NEXT_PUBLIC_API_URL ?? "localhost:3001"} precisa expor POST /tenants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/dashboard/empresas">Voltar para Empresas</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
