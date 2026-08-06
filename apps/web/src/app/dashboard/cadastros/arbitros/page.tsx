"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import type { MatchReferee } from "@/types/match-referee";

export default function ArbitrosPage() {
  const [rows, setRows] = useState<MatchReferee[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (term = q) => {
    setLoading(true);
    try {
      const { data } = await api.get<MatchReferee[]>(
        `/match-referees${term.trim() ? `?q=${encodeURIComponent(term.trim())}` : ""}`,
      );
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Árbitros</h1>
        </div>
        <Button asChild className="min-h-[44px]">
          <Link href="/dashboard/cadastros/arbitros/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lista</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="min-h-[44px] text-foreground"
              placeholder="Buscar por nome, federação ou registro…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load();
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={() => void load()}
            >
              Buscar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum árbitro cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foto</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Federação</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const src = getPublicImageUrl(r.photoUrl);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt=""
                            className="h-12 w-9 rounded object-cover object-[center_12%]"
                          />
                        ) : (
                          <div className="flex h-12 w-9 items-center justify-center rounded bg-muted text-xs font-bold">
                            {r.name.slice(0, 1)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.federation ?? "—"}</TableCell>
                      <TableCell>{r.licenseNumber ?? "—"}</TableCell>
                      <TableCell>{r.active ? "Ativo" : "Inativo"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button asChild size="icon" variant="ghost" className="min-h-[40px] min-w-[40px]">
                            <Link href={`/dashboard/cadastros/arbitros/${r.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button asChild size="icon" variant="ghost" className="min-h-[40px] min-w-[40px] text-destructive">
                            <Link href={`/dashboard/cadastros/arbitros/${r.id}/delete`}>
                              <Trash2 className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
