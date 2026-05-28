"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, FileText, Loader2, Pencil, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardDeptHeader,
  DashboardDeptToolbarAside,
} from "@/components/dashboard/DashboardDeptHeader";
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
import { getPublicImageUrl } from "@/lib/media-url";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface EventItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  organizer?: string;
  tenantName?: string | null;
  content?: { blocks?: unknown[] };
}

export default function EventosPage() {
  const { canAccessModule, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const canAccess = canAccessModule("eventos");

  useEffect(() => {
    if (!canAccess) return;
    api
      .get<EventItem[]>("/events")
      .then((r) => setEvents(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [canAccess]);

  if (authLoading || !canAccess) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">Você não tem acesso ao módulo Eventos.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <DashboardDeptHeader
        section="Eventos"
        sectionIcon={Sparkles}
        title="Campeonatos e torneios"
        description="Cadastre e edite os dados de cada evento."
        stats={[
          { value: events.length, label: "Eventos" },
          { value: events.filter((e) => e.status === "published").length, label: "Publicados" },
        ]}
        toolbar={
          <>
            <div className="flex-1" />
            <DashboardDeptToolbarAside>
              <Link href="/dashboard/eventos/new">
                <Button className="min-h-[44px]">
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar evento
                </Button>
              </Link>
            </DashboardDeptToolbarAside>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Eventos</CardTitle>
          <CardDescription>
            {events.length === 0
              ? "Nenhum evento cadastrado."
              : `${events.length} evento${events.length > 1 ? "s" : ""} cadastrado${events.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>Nenhum evento cadastrado.</p>
              <Link href="/dashboard/eventos/new">
                <Button variant="outline" className="mt-4">
                  Cadastrar primeiro evento
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Logo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Organizador</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => (
                  <ClickableTableRow key={ev.id} href={`/dashboard/eventos/${ev.id}/editar`}>
                    <TableCell>
                      {ev.logoUrl ? (
                        <img
                          src={getPublicImageUrl(ev.logoUrl)}
                          alt=""
                          className="h-8 w-8 object-contain rounded border"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{ev.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {ev.organizer === "tenant" && ev.tenantName
                        ? ev.tenantName
                        : ev.organizer === "tenant"
                          ? "Empresa (—)"
                          : "Grupo BCG"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ev.slug}</TableCell>
                    <TableCell>
                      <span
                        className={
                          ev.status === "published"
                            ? "text-green-600 dark:text-green-400"
                            : ev.status === "archived"
                              ? "text-muted-foreground"
                              : ""
                        }
                      >
                        {ev.status === "published" ? "Publicado" : ev.status === "archived" ? "Arquivado" : "Rascunho"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {ev.startDate && ev.endDate
                        ? `${ev.startDate} a ${ev.endDate}`
                        : ev.startDate
                          ? ev.startDate
                          : "—"}
                    </TableCell>
                    <TableRowActions>
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/eventos/${ev.id}/editar`} title="Dados do evento">
                          <Button variant="ghost" size="icon" aria-label="Editar evento">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/paginas/evento/${ev.id}/editar`} title="Editar página">
                          <Button variant="ghost" size="icon" aria-label="Editar página">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableRowActions>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
