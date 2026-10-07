"use client";

import Link from "next/link";
import { CalendarPlus, Copy, ExternalLink, Kanban, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { VenuePipelineLead } from "@/types/boston-city-hall";
import {
  LEAD_SOURCE_LABEL,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABEL,
} from "@/types/boston-city-hall";
import {
  BCH_BASE,
  copyText,
  formatDateTime,
  type DetailForm,
} from "./boston-city-hall-lead-shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: VenuePipelineLead | null;
  detailForm: DetailForm | null;
  onDetailFormChange: (updater: (prev: DetailForm | null) => DetailForm | null) => void;
  onSave: () => void;
  saving: boolean;
  /** Onde o usuário abriu o detalhe — ajusta atalhos laterais */
  context: "crm" | "pipeline";
  onCopyFeedback: (payload: {
    title: string;
    message: string;
    variant: "success" | "error";
  }) => void;
};

export function BostonCityHallLeadDetailDialog({
  open,
  onOpenChange,
  selected,
  detailForm,
  onDetailFormChange,
  onSave,
  saving,
  context,
  onCopyFeedback,
}: Props) {
  if (!selected || !detailForm) return null;

  const reservationHref = selected.booking?.id
    ? `${BCH_BASE}/reservas?edit=${encodeURIComponent(selected.booking.id)}`
    : `${BCH_BASE}/reservas`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{detailForm.companyName || detailForm.contactName}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {context === "crm" ? (
            <Button variant="outline" size="sm" className="min-h-[40px] gap-1" asChild>
              <Link href={`${BCH_BASE}/pipeline`}>
                <Kanban className="h-4 w-4" />
                Pipeline
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="min-h-[40px] gap-1" asChild>
              <Link href={`${BCH_BASE}/crm`}>
                <Users className="h-4 w-4" />
                CRM
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" className="min-h-[40px] gap-1" asChild>
            <Link href={reservationHref}>
              <CalendarPlus className="h-4 w-4" />
              {selected.booking ? "Ver reserva" : "Reservas"}
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[40px] gap-1"
            onClick={async () => {
              const ok = await copyText(detailForm.contactEmail);
              onCopyFeedback({
                title: ok ? "E-mail copiado" : "Não foi possível copiar",
                message: detailForm.contactEmail,
                variant: ok ? "success" : "error",
              });
            }}
          >
            <Copy className="h-4 w-4" />
            E-mail
          </Button>
          {detailForm.contactPhone ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[40px] gap-1"
              onClick={async () => {
                const ok = await copyText(detailForm.contactPhone);
                onCopyFeedback({
                  title: ok ? "Telefone copiado" : "Não foi possível copiar",
                  message: detailForm.contactPhone,
                  variant: ok ? "success" : "error",
                });
              }}
            >
              <Copy className="h-4 w-4" />
              Telefone
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="bch-lead-d-name">Nome *</Label>
            <Input
              id="bch-lead-d-name"
              value={detailForm.contactName}
              onChange={(e) =>
                onDetailFormChange((f) => (f ? { ...f, contactName: e.target.value } : f))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bch-lead-d-email">E-mail *</Label>
            <Input
              id="bch-lead-d-email"
              type="email"
              value={detailForm.contactEmail}
              onChange={(e) =>
                onDetailFormChange((f) => (f ? { ...f, contactEmail: e.target.value } : f))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bch-lead-d-phone">Telefone</Label>
            <Input
              id="bch-lead-d-phone"
              value={detailForm.contactPhone}
              onChange={(e) =>
                onDetailFormChange((f) => (f ? { ...f, contactPhone: e.target.value } : f))
              }
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="bch-lead-d-company">Empresa</Label>
            <Input
              id="bch-lead-d-company"
              value={detailForm.companyName}
              onChange={(e) =>
                onDetailFormChange((f) => (f ? { ...f, companyName: e.target.value } : f))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bch-lead-d-event">Tipo de evento</Label>
            <Input
              id="bch-lead-d-event"
              value={detailForm.eventType}
              onChange={(e) =>
                onDetailFormChange((f) => (f ? { ...f, eventType: e.target.value } : f))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bch-lead-d-guests">Convidados</Label>
            <Input
              id="bch-lead-d-guests"
              inputMode="numeric"
              value={detailForm.guestCount}
              onChange={(e) =>
                onDetailFormChange((f) => (f ? { ...f, guestCount: e.target.value } : f))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bch-lead-d-pref">Data preferida</Label>
            <Input
              id="bch-lead-d-pref"
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={detailForm.preferredDate}
              onChange={(e) =>
                onDetailFormChange((f) => (f ? { ...f, preferredDate: e.target.value } : f))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bch-lead-d-stage">Estágio</Label>
            <NativeSelect
              id="bch-lead-d-stage"
              value={detailForm.stage}
              onChange={(e) =>
                onDetailFormChange((f) => (f ? { ...f, stage: e.target.value } : f))
              }
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {PIPELINE_STAGE_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Origem</Label>
            <p className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              {LEAD_SOURCE_LABEL[selected.source] ?? selected.source}
            </p>
          </div>
          {selected.message ? (
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Mensagem original</Label>
              <p className="rounded-md border border-border bg-muted/20 p-3 text-sm text-foreground">
                {selected.message}
              </p>
            </div>
          ) : null}
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="bch-lead-d-notes">Anotações comerciais</Label>
            <textarea
              id="bch-lead-d-notes"
              rows={4}
              className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={detailForm.notes}
              onChange={(e) =>
                onDetailFormChange((f) => (f ? { ...f, notes: e.target.value } : f))
              }
            />
          </div>
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Criado em {formatDateTime(selected.createdAt)} · Atualizado em{" "}
            {formatDateTime(selected.updatedAt)}
            {selected.booking ? (
              <>
                {" "}
                ·{" "}
                <Link
                  href={reservationHref}
                  className="inline-flex items-center gap-0.5 text-violet-300 hover:underline"
                >
                  Reserva vinculada
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </>
            ) : null}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px]"
          >
            Fechar
          </Button>
          <Button onClick={onSave} disabled={saving} className="min-h-[44px]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
