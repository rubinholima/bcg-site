"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, UserCircle, User, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getPublicImageUrl } from "@/lib/media-url";
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";
import { JuridicoFilters } from "./JuridicoFilters";
import { LegalDocumentsTab } from "@/components/dashboard/LegalDocumentsTab";

const DOC_TYPE_LABELS: Record<string, string> = {
  contrato_trabalho: "Contrato de trabalho",
  contrato_imagem: "Contrato de imagem",
  formacao: "Contrato de formação",
  rescisao: "Termo de rescisão",
  transferencia: "Termo de transferência",
  aditivo: "Aditivo contratual",
  procuração: "Procuração",
  nda: "NDA / Confidencialidade",
  outro: "Outro",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_signature: "Aguardando assinatura",
  signed: "Assinado",
  expired: "Expirado",
  cancelled: "Cancelado",
};

interface Player {
  id: string;
  name: string;
  photoUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  category?: string | null;
  tenantId: string;
  tenant?: { id: string; name: string; slug: string };
}

interface LegalDocWithPlayer {
  id: string;
  playerId: string;
  type: string;
  name: string;
  status: string;
  createdAt: string;
  player: { id: string; name: string; tenant?: { name: string } | null };
}

export default function JuridicoListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [selectedFromList, setSelectedFromList] = useState(false);
  const [allDocs, setAllDocs] = useState<LegalDocWithPlayer[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const handleSelectPlayerFromFilters = (id: string) => {
    setSelectedPlayerId(id);
    setSelectedFromList(false);
  };

  const tenantId = searchParams.get("tenantId") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const docType = searchParams.get("docType") ?? undefined;
  const docStatus = searchParams.get("docStatus") ?? undefined;

  useEffect(() => {
    if (!canAccessModule("juridico") && !authLoading) return;
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    setLoading(true);
    api
      .get<Player[]>(`/players?${params.toString()}`)
      .then(({ data }) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, [canAccessModule, authLoading, tenantId, category, search]);

  useEffect(() => {
    if (!canAccessModule("juridico") || authLoading) return;
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (docType) params.set("type", docType);
    if (docStatus) params.set("status", docStatus);
    setLoadingDocs(true);
    api
      .get<LegalDocWithPlayer[]>(`/legal-documents?${params.toString()}`)
      .then(({ data }) => setAllDocs(Array.isArray(data) ? data : []))
      .catch(() => setAllDocs([]))
      .finally(() => setLoadingDocs(false));
  }, [canAccessModule, authLoading, tenantId, docType, docStatus]);

  useEffect(() => {
    if (!selectedPlayerId) {
      setSelectedPlayer(null);
      return;
    }
    const fromList = players.find((p) => p.id === selectedPlayerId);
    if (fromList) {
      setSelectedPlayer(fromList);
      setLoadingPlayer(false);
      return;
    }
    setLoadingPlayer(true);
    api
      .get<Player>(`/players/${selectedPlayerId}`)
      .then(({ data }) => setSelectedPlayer(data))
      .catch(() => setSelectedPlayer(null))
      .finally(() => setLoadingPlayer(false));
  }, [selectedPlayerId, players]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("juridico")) {
    router.replace("/403");
    return null;
  }

  const playerOptions = players.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jurídico</h1>
          <p className="text-muted-foreground">
            Selecione um atleta nos filtros para ver contratos e documentos
          </p>
        </div>
      </div>

      <JuridicoFilters
        players={playerOptions}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={handleSelectPlayerFromFilters}
      />

      {(!selectedPlayerId || selectedFromList) && (
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Todos os contratos
          </h3>
          {loadingDocs ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Carregando contratos...
            </div>
          ) : allDocs.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground text-center">
              Nenhum contrato encontrado com os filtros selecionados.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atleta</TableHead>
                    <TableHead>Clube</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDocs.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedPlayerId(doc.playerId);
                        setSelectedFromList(true);
                      }}
                    >
                      <TableCell className="font-medium">
                        {doc.player.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.player.tenant?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                      </TableCell>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell>
                        <span
                          className={
                            doc.status === "signed"
                              ? "text-green-600 dark:text-green-400 font-medium"
                              : doc.status === "pending_signature"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                          }
                        >
                          {DOC_STATUS_LABELS[doc.status] ?? doc.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {selectedPlayerId && (
        <>
          {loadingPlayer ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedPlayer ? (
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="h-14 w-14 rounded-full overflow-hidden bg-muted shrink-0 border-2 border-border">
                      {selectedPlayer.photoUrl ? (
                        <img
                          src={getPublicImageUrl(selectedPlayer.photoUrl)}
                          alt={selectedPlayer.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                          <User className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">
                        {selectedPlayer.jerseyNumber ? `${selectedPlayer.jerseyNumber} – ` : ""}
                        {selectedPlayer.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedPlayer.tenant?.name}
                        {selectedPlayer.category ? ` • ${selectedPlayer.category}` : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <LegalDocumentsTab
                playerId={selectedPlayer.id}
                playerName={selectedPlayer.name}
              />
            </div>
          ) : (
            <p className="text-muted-foreground py-6">
              Atleta não encontrado.
            </p>
          )}
        </>
      )}

      {!selectedPlayerId && !loading && players.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum atleta encontrado com os filtros selecionados. Ajuste Clube ou Categoria.</p>
            <Link href="/dashboard/cadastros/jogadores">
              <Button variant="outline" className="mt-4">
                Ir para {DASHBOARD_LABELS.atletas}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
