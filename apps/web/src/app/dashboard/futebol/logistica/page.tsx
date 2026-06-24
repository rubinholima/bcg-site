import Link from "next/link";
import { Suspense } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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
import { formatTravelCategoriesDisplay } from "@/lib/travel-categories-utils";
import { LogisticaFilters } from "./LogisticaFilters";

interface TravelLogisticsItem {
  id: string;
  tenantId: string;
  tenant?: { id: string; name: string; slug: string };
  category?: string | null;
  categories?: string[] | null;
  matchDate: string;
  opponentName?: string | null;
  stadiumName?: string | null;
  city?: string | null;
  country?: string | null;
  championshipName?: string | null;
  distanceKm?: number | null;
  transportType?: string | null;
  hotelName?: string | null;
  estimatedCostTotal?: number | null;
  status: string;
}

const TRANSPORT_LABELS: Record<string, string> = {
  aereo_comercial: "Aéreo comercial",
  aereo_fretado: "Aéreo fretado",
  rodoviario: "Rodoviário",
  misto: "Misto",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  planejamento: "Planejamento",
  aprovado: "Aprovado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

async function getLogistica(params: {
  tenantId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<TravelLogisticsItem[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.tenantId) searchParams.set("tenantId", params.tenantId);
    if (params.status) searchParams.set("status", params.status);
    if (params.fromDate) searchParams.set("fromDate", params.fromDate);
    if (params.toDate) searchParams.set("toDate", params.toDate);
    const { data } = await api.get<TravelLogisticsItem[]>(
      `/logistica?${searchParams.toString()}`
    );
    return data ?? [];
  } catch {
    return [];
  }
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
}

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

type LogisticaPageProps = {
  searchParams: Promise<{
    success?: string;
    tenantId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }>;
};

export default async function LogisticaPage(props: LogisticaPageProps) {
  const { searchParams } = props;
  const params = await searchParams;
  const items = await getLogistica({
    tenantId: params.tenantId,
    status: params.status,
    fromDate: params.fromDate,
    toDate: params.toDate,
  });
  const showSuccess = params.success === "true";

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 flex items-center gap-2 text-green-500">
          <span>Operação realizada com sucesso!</span>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Logística — Viagens</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Planejamento de deslocamentos: transporte, hospedagem, alimentação e custos — somente clubes.
          </p>
        </div>
        <Link href="/dashboard/futebol/logistica/new">
          <Button className="min-h-[44px] shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Novo planejamento
          </Button>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <LogisticaFilters />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Planejamentos de deslocamento</CardTitle>
          <CardDescription>
            {items.length === 0
              ? "Nenhum planejamento cadastrado"
              : `${items.length} planejamento${items.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum planejamento encontrado.</p>
              <Link href="/dashboard/futebol/logistica/new">
                <Button variant="outline" className="mt-4">
                  Cadastrar primeiro planejamento
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data jogo</TableHead>
                    <TableHead>Clube</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Adversário / Local</TableHead>
                    <TableHead>Competição</TableHead>
                    <TableHead>Transporte</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Custo est.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <ClickableTableRow key={item.id} href={`/dashboard/futebol/logistica/${item.id}/edit`}>
                      <TableCell>{formatDate(item.matchDate)}</TableCell>
                      <TableCell>{item.tenant?.name ?? item.tenantId}</TableCell>
                      <TableCell>
                        {formatTravelCategoriesDisplay(item.category, item.categories, "pt")}
                      </TableCell>
                      <TableCell>
                        <div>
                          {item.opponentName && <span className="font-medium">{item.opponentName}</span>}
                          {item.city && (
                            <span className="text-muted-foreground text-sm ml-1">
                              ({item.city}
                              {item.country ? `, ${item.country}` : ""})
                            </span>
                          )}
                          {!item.opponentName && !item.city && "—"}
                        </div>
                      </TableCell>
                      <TableCell>{item.championshipName ?? "—"}</TableCell>
                      <TableCell>
                        {item.transportType
                          ? TRANSPORT_LABELS[item.transportType] ?? item.transportType
                          : "—"}
                      </TableCell>
                      <TableCell>{item.hotelName ?? "—"}</TableCell>
                      <TableCell>{formatCurrency(item.estimatedCostTotal)}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </TableCell>
                      <TableRowActions>
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/futebol/logistica/${item.id}/edit`}>
                            <Button variant="ghost" size="icon" aria-label="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/futebol/logistica/${item.id}/delete`}>
                            <Button variant="ghost" size="icon" aria-label="Excluir">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </Link>
                        </div>
                      </TableRowActions>
                    </ClickableTableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
