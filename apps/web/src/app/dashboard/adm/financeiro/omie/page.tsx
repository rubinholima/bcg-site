"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useFinanceiroTenant } from "../financeiro-tenant-shell";

type OmieStatus = {
  configured?: boolean;
  ok?: boolean;
  message?: string;
};

export default function FinanceiroOmiePage() {
  const { tenantId, tenant } = useFinanceiroTenant();
  const [status, setStatus] = useState<OmieStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    void api
      .get<OmieStatus>(`/settings/integrations/omie/status?tenantId=${tenantId}`)
      .then((r) => {
        setStatus(r.data);
        setErr(null);
      })
      .catch(() => {
        setStatus(null);
        setErr("Não foi possível consultar o status Omie.");
      });
  }, [tenantId]);

  if (!tenantId) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Omie — consulta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Consultas Omie são <strong className="text-foreground">somente leitura</strong> e separadas
            dos lançamentos manuais CUP360 ({tenant?.name ?? "empresa ativa"}).
          </p>
          {err ? <p className="text-destructive">{err}</p> : null}
          {status ? (
            <div className="rounded-md border border-border/50 p-3 text-foreground">
              <p>Configurado: {status.configured ? "sim" : "não"}</p>
              {status.message ? <p className="text-muted-foreground mt-1">{status.message}</p> : null}
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Lançamentos com origem <code className="text-foreground">manual_cup360</code> ou{" "}
            <code className="text-foreground">cup360_module</code> não são sincronizados com Omie nesta
            fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
