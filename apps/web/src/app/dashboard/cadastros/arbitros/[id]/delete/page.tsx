"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { FeedbackModal } from "@/components/ui/feedback-modal";

export default function DeleteArbitroPage({
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
      await api.delete(`/match-referees/${id}`);
      router.push("/dashboard/cadastros/arbitros");
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível excluir o árbitro.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/cadastros/arbitros"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Árbitros
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Excluir árbitro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta ação remove o cadastro. Escalas já salvas no Press Kit mantêm o nome digitado.
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
              <Link href="/dashboard/cadastros/arbitros">Cancelar</Link>
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
