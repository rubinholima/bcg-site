"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const INTEGRATIONS = [
  "SNMP",
  "RouterOS API",
  "SSH",
  "Omada API",
  "UniFi API",
  "Zabbix",
  "LibreNMS",
  "Grafana",
];

export default function InfraMonitoramentoPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monitoramento — documentação (v1)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Nesta primeira versão, o monitoramento é apenas documentação na ficha de cada patrimônio
          (campo Observações de monitoramento). A arquitetura já está preparada para integrações
          futuras:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          {INTEGRATIONS.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
