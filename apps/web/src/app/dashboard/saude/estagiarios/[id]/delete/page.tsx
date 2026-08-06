"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { FeedbackModal } from "@/components/ui/feedback-modal";

export default function DeleteEstagiarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/health-interns/${id}`);
      router.push("/dashboard/saude/estagiarios?success=true");
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível excluir o estagiário.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/saude/estagiarios"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Estagiários
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Excluir estagiário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta ação remove o cadastro. Históricos de agenda que citam o nome permanecem.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              className="min-h-[44px]"
              disabled={busy}
              onClick={() => void remove()}
            >
              Excluir
            </Button>
            <Button type="button" variant="outline" className="min-h-[44px]" asChild>
              <Link href="/dashboard/saude/estagiarios">Cancelar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
