"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Cup360PageShell } from "@/components/dashboard/cup360/Cup360PageShell";
import { Button } from "@/components/ui/button";

type CatalogItem = {
  id: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  tenant?: { name: string } | null;
  enrolled: { id: string; status: string; progressPct: number } | null;
};

export default function DesenvolvimentoCatalogoPage() {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();
  const [items, setItems] = useState<CatalogItem[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!canAccessModule("desenvolvimento")) {
      router.replace("/dashboard");
      return;
    }
    void api.get<CatalogItem[]>("/desenvolvimento/catalog").then(({ data }) => setItems(Array.isArray(data) ? data : []));
  }, [canAccessModule, loading, router]);

  return (
    <Cup360PageShell>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((c) => (
          <article key={c.id} className="rounded-lg border border-border/60 bg-card p-4 flex flex-col gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold leading-snug">{c.title}</h2>
              {c.subtitle ? <p className="mt-1 text-sm text-muted-foreground">{c.subtitle}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">{c.tenant?.name ?? "Grupo"}</p>
            </div>
            {c.enrolled ? (
              <Button asChild size="sm">
                <Link href={`/dashboard/desenvolvimento/curso/${c.id}`}>
                  Continuar ({c.enrolled.progressPct}%)
                </Link>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Aguardando atribuição administrativa.</p>
            )}
          </article>
        ))}
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum curso publicado no seu escopo.</p> : null}
    </Cup360PageShell>
  );
}
