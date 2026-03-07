"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getPublicImageUrl } from "@/lib/media-url";
import { formatPhoneForDisplay } from "@/lib/format-phone";
import { MedicalHistoryBlock } from "@/components/dashboard/MedicalHistoryBlock";
import { MedicoFilters } from "./MedicoFilters";

interface Player {
  id: string;
  name: string;
  photoUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  category?: string | null;
  birthDate?: string | null;
  tenantId: string;
  tenant?: { id: string; name: string; slug: string };
}

interface PlayerFull extends Player {
  medicalHistory?: unknown;
  publicFields?: Record<string, boolean> | null;
  emergencyContactName?: string | null;
  emergencyContactEmail?: string | null;
  emergencyContactPhone?: string | null;
}

export default function MedicoListPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerFull | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { canAccessModule, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  useEffect(() => {
    if (!canAccessModule("medico") && !authLoading) return;
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
    if (!selectedPlayerId) {
      setSelectedPlayer(null);
      return;
    }
    setLoadingPlayer(true);
    api
      .get<PlayerFull>(`/players/${selectedPlayerId}`)
      .then(({ data }) => setSelectedPlayer(data))
      .catch(() => setSelectedPlayer(null))
      .finally(() => setLoadingPlayer(false));
  }, [selectedPlayerId]);

  const handleUpdate = useCallback(
    (patch: {
      medicalHistory?: { profile: unknown; records: unknown[] };
      publicFields?: Record<string, boolean>;
    }) => {
      if (!selectedPlayer) return;
      setSelectedPlayer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          medicalHistory: patch.medicalHistory ?? prev.medicalHistory,
          publicFields: patch.publicFields ?? prev.publicFields,
        };
      });
    },
    [selectedPlayer]
  );

  const handleSave = async () => {
    if (!selectedPlayer?.id) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.patch(`/players/${selectedPlayer.id}`, {
        medicalHistory: selectedPlayer.medicalHistory,
        publicFields: selectedPlayer.publicFields,
      });
      setSuccessMessage("Histórico médico salvo com sucesso.");
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("medico")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Depto Médico</h1>
          <p className="text-muted-foreground">
            Selecione um atleta nos filtros para ver e editar o histórico médico
          </p>
        </div>
      </div>

      {/* Filtros em cima apenas */}
      <MedicoFilters
        players={players}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={setSelectedPlayerId}
      />

      {/* Ao selecionar atleta: exibe histórico abaixo */}
      {selectedPlayerId && (
        <>
          {loadingPlayer ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedPlayer ? (
            <div className="space-y-6">
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
                  {(selectedPlayer.emergencyContactName || selectedPlayer.emergencyContactEmail || selectedPlayer.emergencyContactPhone) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Contato emergência:
                      {selectedPlayer.emergencyContactName && <span className="text-foreground"> {selectedPlayer.emergencyContactName}</span>}
                      {selectedPlayer.emergencyContactEmail && <span className="text-foreground"> • {selectedPlayer.emergencyContactEmail}</span>}
                      {selectedPlayer.emergencyContactPhone && <span className="text-foreground"> • {formatPhoneForDisplay(selectedPlayer.emergencyContactPhone)}</span>}
                    </p>
                  )}
                </div>
                <div className="ml-auto">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="rounded-md bg-emerald-500/20 border border-emerald-500/40 p-3 text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                  {successMessage}
                </div>
              )}

              <MedicalHistoryBlock
                medicalHistory={selectedPlayer.medicalHistory}
                publicFields={selectedPlayer.publicFields}
                onUpdate={handleUpdate}
                showPublicToggle={true}
                emergencyContactName={selectedPlayer.emergencyContactName}
                emergencyContactEmail={selectedPlayer.emergencyContactEmail}
                emergencyContactPhone={selectedPlayer.emergencyContactPhone}
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
            <p>Nenhum atleta encontrado com os filtros selecionados. Ajuste Clube ou Categoria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
