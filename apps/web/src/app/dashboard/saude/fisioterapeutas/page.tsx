"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, Building2, Loader2, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableTableRow, TableRowActions } from "@/components/ui/clickable-table-row";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import { getRegistryLabel } from "@/lib/medical-staff-roles";
import type { MedicalStaff } from "@/types/medical-staff";
import { FisioterapeutasFilters } from "./FisioterapeutasFilters";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";
}

export default function FisioterapeutasPage() {
  const searchParams = useSearchParams();
  const [list, setList] = useState<MedicalStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const tenantId = searchParams.get("tenantId") ?? "";
  const search = (searchParams.get("search") ?? "").trim().toLowerCase();

  useEffect(() => {
    const params = new URLSearchParams({ role: "fisioterapeuta" });
    if (tenantId) params.set("tenantId", tenantId);
    api
      .get<MedicalStaff[]>(`/medical-staff?${params}`)
      .then(({ data }) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const filtered = useMemo(() => {
    if (!search) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.crmCoren ?? "").toLowerCase().includes(search) ||
        (p.specialty ?? "").toLowerCase().includes(search),
    );
  }, [list, search]);

  const showSuccess = searchParams.get("success") === "true";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Activity className="h-8 w-8" />
          Fisioterapeutas
        </h1>
        <p className="mt-1 text-muted-foreground">
          Cadastro de profissionais para atendimentos e recovery em grupo.
        </p>
      </div>

      {showSuccess ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-green-600 dark:text-green-400">
          Operação realizada com sucesso!
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/dashboard/saude/fisioterapeutas/new">
          <Button className="min-h-[44px]">
            <Plus className="mr-2 h-4 w-4" />
            Novo fisioterapeuta
          </Button>
        </Link>
      </div>

      <FisioterapeutasFilters />

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
          <CardDescription>
            {filtered.length === 0
              ? "Nenhum fisioterapeuta encontrado."
              : `${filtered.length} cadastrado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Activity className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="font-medium">Nenhum fisioterapeuta cadastrado.</p>
              <Link href="/dashboard/saude/fisioterapeutas/new">
                <Button variant="outline" className="mt-4 min-h-[44px]">Cadastrar</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Foto</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">{getRegistryLabel("fisioterapeuta")}</TableHead>
                  <TableHead className="hidden lg:table-cell">Especialidade</TableHead>
                  <TableHead>Clube</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <ClickableTableRow key={p.id} href={`/dashboard/saude/fisioterapeutas/${p.id}/edit`}>
                    <TableCell>
                      {p.photoUrl ? (
                        <img src={getPublicImageUrl(p.photoUrl)} alt="" className="h-10 w-10 rounded-full object-cover object-[center_20%]" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {initials(p.name)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{p.crmCoren ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{p.specialty ?? "—"}</TableCell>
                    <TableCell>
                      {p.tenant?.name ? (
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Building2 className="h-3.5 w-3.5" />
                          {p.tenant.name}
                        </span>
                      ) : (
                        "Grupo / todos"
                      )}
                    </TableCell>
                    <TableCell>
                      <TableRowActions>
                        <Link href={`/dashboard/saude/fisioterapeutas/${p.id}/edit`}>
                          <Button variant="ghost" size="icon" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/saude/fisioterapeutas/${p.id}/delete`}>
                          <Button variant="ghost" size="icon" aria-label="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </Link>
                      </TableRowActions>
                    </TableCell>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
