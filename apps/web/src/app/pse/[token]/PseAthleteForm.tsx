"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { buildBackendUrl } from "@/lib/apiProxy";

export type PseFormData = {
  playerName: string;
  sessionDate?: string;
  category?: string | null;
  location?: string | null;
  alreadySubmitted: boolean;
  rpe: number | null;
};

export function PseAthleteForm({ token, initial }: { token: string; initial: PseFormData }) {
  const [rpe, setRpe] = useState(initial.rpe != null ? String(initial.rpe) : "");
  const [submitted, setSubmitted] = useState(initial.alreadySubmitted);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const handleSubmit = async () => {
    const value = Number(rpe);
    if (!Number.isInteger(value) || value < 0 || value > 10) {
      setFeedback({ open: true, title: "Atenção", message: "Escolha um PSE entre 0 e 10." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(buildBackendUrl(`/public/pse/${encodeURIComponent(token)}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rpe: value }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(err?.message ?? "Não foi possível enviar.");
      }
      setSubmitted(true);
      setFeedback({ open: true, title: "Enviado", message: "Obrigado! Seu PSE foi registrado." });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao enviar.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>PSE — percepção de esforço</CardTitle>
          <p className="text-sm text-muted-foreground">
            {initial.playerName}
            {initial.sessionDate ? ` · ${initial.sessionDate}` : ""}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted ? (
            <p className="text-sm text-emerald-400">PSE já registrado para esta sessão.</p>
          ) : (
            <>
              <NativeSelectField
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
                placeholder="Selecione 0–10"
                options={Array.from({ length: 11 }, (_, i) => ({
                  value: String(i),
                  label: String(i),
                }))}
              />
              <Button type="button" className="w-full min-h-11" onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar PSE
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.title === "Erro" ? "error" : "success"}
      />
    </div>
  );
}
