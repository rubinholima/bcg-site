import Link from "next/link";
import { Plus, Building2, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableTableRow, TableRowActions } from "@/components/ui/clickable-table-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateTimeDayMonYear } from "@/lib/format-date";
import { getPublicImageUrl } from "@/lib/media-url";
import { Tenant } from "@/types/tenant";
import { TenantKind } from "@/types/tenant-kind";
import { EmpresasFilters } from "@/components/dashboard/EmpresasFilters";
import type { MeResponse } from "@/types/auth";

async function getTenants(): Promise<Tenant[]> {
  try {
    const { data } = await api.get<Tenant[]>("/tenants");
    return data ?? [];
  } catch (error) {
    console.error("Erro ao carregar empresas:", error);
    return [];
  }
}

async function getTenantKinds(): Promise<TenantKind[]> {
  try {
    const { data } = await api.get<TenantKind[]>("/tenant-kinds");
    return data ?? [];
  } catch (error) {
    console.error("Erro ao carregar tipos:", error);
    return [];
  }
}

async function getCanManageCompanies(): Promise<boolean> {
  try {
    const { data } = await api.get<MeResponse>("/me");
    return data?.role === "super_admin";
  } catch {
    return false;
  }
}

function filterTenants(
  tenants: Tenant[],
  tipo: string | null,
  q: string | null,
): Tenant[] {
  let list = tenants;
  if (tipo) list = list.filter((t) => t.kindId === tipo);
  if (q && q.trim()) {
    const lower = q.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        (t.tradeName ?? "").toLowerCase().includes(lower) ||
        (t.slug ?? "").toLowerCase().includes(lower),
    );
  }
  return list;
}

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; tipo?: string; q?: string }>;
}) {
  const [tenants, kinds, canManageCompanies] = await Promise.all([
    getTenants(),
    getTenantKinds(),
    getCanManageCompanies(),
  ]);
  const params = await searchParams;
  const showSuccess = params.success === "true";
  const tipo = params.tipo ?? null;
  const q = params.q ?? null;
  const filtered = filterTenants(tenants, tipo, q);

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 flex items-center gap-2 text-green-500">
          <span>Operação realizada com sucesso!</span>
        </div>
      )}
      {canManageCompanies ? (
        <div className="flex justify-end">
          <Link href="/dashboard/empresas/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Empresa
            </Button>
          </Link>
        </div>
      ) : null}
      {kinds.length > 0 && (
        <EmpresasFilters kinds={kinds} currentTipo={tipo} currentQ={q} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Empresas</CardTitle>
          <CardDescription>
            {tenants.length === 0
              ? "Nenhuma empresa cadastrada."
              : filtered.length === tenants.length
                ? `${tenants.length} empresa${tenants.length > 1 ? "s" : ""} cadastrada${tenants.length > 1 ? "s" : ""}`
                : `${filtered.length} de ${tenants.length} empresa${tenants.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>
                {tenants.length === 0
                  ? "Nenhuma empresa encontrada."
                  : "Nenhuma empresa corresponde aos filtros. Tente outro tipo ou busca."}
              </p>
              {tenants.length > 0 && (tipo || (q && q.trim())) ? (
                <Link href="/dashboard/empresas">
                  <Button variant="outline" className="mt-4">
                    Limpar filtros
                  </Button>
                </Link>
              ) : tenants.length === 0 && canManageCompanies ? (
                <Link href="/dashboard/empresas/new">
                  <Button variant="outline" className="mt-4">
                    Criar primeira empresa
                  </Button>
                </Link>
              ) : null}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Logo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Criado em</TableHead>
                  {canManageCompanies ? (
                    <TableHead className="text-right">Ações</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <ClickableTableRow key={t.id} href={`/dashboard/empresas/${t.id}/edit`}>
                    <TableCell>
                      {t.logoUrl ? (
                        <img
                          src={getPublicImageUrl(t.logoUrl)}
                          alt=""
                          className="h-8 w-8 object-contain rounded border"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="block font-medium">{t.name}</span>
                      {t.tradeName ? (
                        <span className="block text-xs text-muted-foreground">
                          {t.tradeName}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.slug}</TableCell>
                    <TableCell>{t.kind?.name ?? t.kindId ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTimeDayMonYear(t.createdAt)}
                    </TableCell>
                    {canManageCompanies ? (
                      <TableRowActions>
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/paginas/tenant/${t.id}/editar`} title="Página da empresa">
                            <Button variant="ghost" size="icon" aria-label="Página da empresa">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/empresas/${t.id}/edit`}>
                            <Button variant="ghost" size="icon" aria-label="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/empresas/${t.id}/delete`}>
                            <Button variant="ghost" size="icon" aria-label="Excluir">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </Link>
                        </div>
                      </TableRowActions>
                    ) : null}
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
