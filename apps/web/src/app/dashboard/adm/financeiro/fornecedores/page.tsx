"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFinanceiroTenant } from "../financeiro-tenant-shell";

export default function FinanceiroFornecedoresPage() {
  const { tenantId, tenant } = useFinanceiroTenant();

  if (!tenantId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fornecedores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          O cadastro canônico de fornecedores fica em Compras. No Financeiro, utilize o fornecedor
          vinculado nas contas a pagar e consulte destinos de pagamento quando autorizado.
        </p>
        <Button asChild variant="secondary">
          <Link href={`/dashboard/adm/compras/fornecedores?tenantId=${tenantId}`}>
            Abrir fornecedores (Compras)
          </Link>
        </Button>
        {tenant?.name ? (
          <p className="text-xs">Empresa ativa: {tenant.name}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
