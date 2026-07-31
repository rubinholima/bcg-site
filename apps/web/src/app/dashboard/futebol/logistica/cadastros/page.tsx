import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LOGISTICA_CADASTRO_RESOURCES,
  LOGISTICA_CADASTROS_BASE,
} from "@/lib/logistica-cadastros.config";

export default function LogisticaCadastrosHubPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cadastros de logística</CardTitle>
          <CardDescription>
            Tabelas auxiliares para viagens, convocação e despesas — aeroportos, fornecedores, destinos,
            serviços e cadastros operacionais.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LOGISTICA_CADASTRO_RESOURCES.map((resource) => {
          const Icon = resource.icon;
          return (
            <Link key={resource.slug} href={`${LOGISTICA_CADASTROS_BASE}/${resource.slug}`}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{resource.labelPlural}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-3">{resource.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
