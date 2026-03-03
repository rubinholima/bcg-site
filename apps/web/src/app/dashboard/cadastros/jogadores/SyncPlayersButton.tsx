"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/authFetch";

export function SyncPlayersButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch("/api/integrations/sync-players", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error ?? data?.message ?? (typeof data === "string" ? data : "Erro ao sincronizar");
        setError(msg);
        return;
      }
      const { created = 0, updated = 0, skipped = 0 } = data;
      setSuccess(`Sincronização concluída: ${created} criados, ${updated} atualizados${skipped > 0 ? `, ${skipped} ignorados (sem clube/slug válido)` : ""}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={loading}
        title="Importa todos os jogadores da planilha Times por Categorias (usa coluna clube/slug para o clube)"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        Sync da planilha
      </Button>
      {success && (
        <span className="text-sm text-green-600 dark:text-green-500">{success}</span>
      )}
      {error && (
        <span className="text-sm text-destructive">{error}</span>
      )}
    </div>
  );
}
