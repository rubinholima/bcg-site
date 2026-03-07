"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MedicalHistoryBlock } from "@/components/dashboard/MedicalHistoryBlock";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { getPublicImageUrl } from "@/lib/media-url";
import { formatPhoneForDisplay } from "@/lib/format-phone";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface PlayerData {
  id: string;
  name: string;
  photoUrl?: string | null;
  jerseyNumber?: number | null;
  tenant?: { id: string; name: string };
  category?: string | null;
  medicalHistory?: unknown;
  publicFields?: Record<string, boolean> | null;
  emergencyContactName?: string | null;
  emergencyContactEmail?: string | null;
  emergencyContactPhone?: string | null;
}

export default function MedicoPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params?.playerId ?? params?.id) as string | undefined;
  const { canAccessModule, loading: authLoading } = useAuth();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  useEffect(() => {
    if (!id || (!canAccessModule("medico") && !authLoading)) return;
    setLoading(true);
    api
      .get<PlayerData>(`/players/${id}`)
      .then(({ data }) => setPlayer(data))
      .catch(() => setPlayer(null))
      .finally(() => setLoading(false));
  }, [id, canAccessModule, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("medico")) {
      router.replace("/403");
    }
  }, [canAccessModule, authLoading, router]);

  const handleUpdate = (patch: {
    medicalHistory?: { profile: unknown; records: unknown[] };
    publicFields?: Record<string, boolean>;
  }) => {
    if (!player) return;
    setPlayer((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        medicalHistory: patch.medicalHistory ?? prev.medicalHistory,
        publicFields: patch.publicFields ?? prev.publicFields,
      };
    });
  };

  const handleSave = async () => {
    if (!player?.id) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/players/${player.id}`, {
        medicalHistory: player.medicalHistory,
        publicFields: player.publicFields,
      });
      setSuccessOpen(true);
      setSuccessBanner(true);
      // esconder o banner após 5s
      setTimeout(() => setSuccessBanner(false), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !canAccessModule("medico")) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!id) {
    router.replace("/dashboard/medico");
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="space-y-6">
        <p className="text-destructive">Jogador não encontrado.</p>
        <Link href="/dashboard/medico">
          <Button variant="outline">Voltar para Depto Médico</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/medico">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="h-14 w-14 rounded-full overflow-hidden bg-muted shrink-0 border-2 border-border">
          {player.photoUrl ? (
            <img
              src={getPublicImageUrl(player.photoUrl)}
              alt={player.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <User className="h-7 w-7" />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {player.jerseyNumber ? `${player.jerseyNumber} – ` : ""}
            {player.name}
          </h1>
          <p className="text-muted-foreground">
            {player.tenant?.name} {player.category ? `• ${player.category}` : ""}
          </p>
          {player.emergencyContactName && (
            <p className="text-sm text-muted-foreground mt-1">
              Contato emergência: <span className="text-foreground">{player.emergencyContactName}</span>
              {player.emergencyContactEmail && <span className="text-foreground"> • {player.emergencyContactEmail}</span>}
              {player.emergencyContactPhone && <span className="text-foreground"> • {formatPhoneForDisplay(player.emergencyContactPhone)}</span>}
            </p>
          )}
          {!player.emergencyContactName && (player.emergencyContactEmail || player.emergencyContactPhone) && (
            <p className="text-sm text-muted-foreground mt-1">
              Contato emergência:
              {player.emergencyContactEmail && <span className="text-foreground"> {player.emergencyContactEmail}</span>}
              {player.emergencyContactPhone && <span className="text-foreground"> {formatPhoneForDisplay(player.emergencyContactPhone)}</span>}
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

      {successBanner && (
        <div className="rounded-md bg-emerald-500/20 border border-emerald-500/40 p-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <span className="font-medium">Salvo.</span>
          Histórico médico salvo com sucesso.
        </div>
      )}

      <FeedbackModal
        open={successOpen}
        onOpenChange={setSuccessOpen}
        variant="success"
        title="Salvo"
        message="Histórico médico salvo com sucesso."
      />

      <MedicalHistoryBlock
        medicalHistory={player.medicalHistory}
        publicFields={player.publicFields}
        onUpdate={handleUpdate}
        showPublicToggle={true}
        emergencyContactName={player.emergencyContactName}
        emergencyContactEmail={player.emergencyContactEmail}
        emergencyContactPhone={player.emergencyContactPhone}
      />
    </div>
  );
}
