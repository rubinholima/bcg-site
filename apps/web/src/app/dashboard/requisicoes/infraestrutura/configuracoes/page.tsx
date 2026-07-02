"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InfraConfiguracoesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <p>
          Permissões do módulo Infraestrutura TI são gerenciadas em Configurações → Acessos
          (slug <code className="text-foreground">infraestrutura</code>).
        </p>
        <p>
          Equipamentos continuam cadastrados apenas em ADM → Patrimônio. Este módulo estende a ficha
          técnica sem duplicar bens.
        </p>
        <p>Categorias com aba Infraestrutura: Informática, Infraestrutura, Audiovisual e Segurança.</p>
      </CardContent>
    </Card>
  );
}
