"use client";

import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLogisticaCadastrosLookups } from "@/hooks/useLogisticaCadastrosLookups";
import {
  EMPTY_LOGISTICS_TRAVEL_CADASTROS,
  type LogisticsTravelCadastros,
} from "@/lib/logistica-travel-cadastros.types";
import { LOGISTICA_CADASTROS_BASE, LOGISTICA_REFERENCIAS_BREADCRUMB } from "@/lib/logistica-cadastros.config";

interface Props {
  transportType: string;
  logisticsCadastros: LogisticsTravelCadastros;
  onLogisticsCadastrosChange: (next: LogisticsTravelCadastros) => void;
  hotelName: string;
  hotelAddress: string;
  onHotelNameChange: (v: string) => void;
  onHotelAddressChange: (v: string) => void;
  disabled?: boolean;
  /** transport = cia/momento/pagamento; hotel = hospedagem; all = tudo */
  variant?: "transport" | "hotel" | "all";
}

function showAirFields(transportType: string): boolean {
  return transportType === "aereo_comercial" || transportType === "aereo_fretado" || transportType === "misto";
}

export function LogisticaTravelCadastrosFields({
  transportType,
  logisticsCadastros,
  onLogisticsCadastrosChange,
  hotelName,
  hotelAddress,
  onHotelNameChange,
  onHotelAddressChange,
  disabled,
  variant = "all",
}: Props) {
  const lookups = useLogisticaCadastrosLookups();
  const showTransport = variant === "transport" || variant === "all";
  const showHotel = variant === "hotel" || variant === "all";

  const setCadastro = (patch: Partial<LogisticsTravelCadastros>) => {
    onLogisticsCadastrosChange({ ...logisticsCadastros, ...patch });
  };

  const handleHotelSelect = (value: string) => {
    if (value === "none" || !value) {
      setCadastro({ hotelId: null });
      return;
    }
    const hotel = lookups.hotels.find((h) => h.id === value);
    setCadastro({ hotelId: value });
    if (hotel) {
      onHotelNameChange(hotel.name);
      const parts = [
        (hotel as { address?: string }).address,
        (hotel as { city?: string }).city,
        (hotel as { state?: string }).state,
      ].filter(Boolean);
      onHotelAddressChange(parts.join(" — "));
    }
  };

  const loyaltyOptions = lookups.loyaltyPrograms.filter((lp) => {
    if (!logisticsCadastros.transportCompanyId) return true;
    const tcId = (lp as { transportCompanyId?: string | null }).transportCompanyId;
    return !tcId || tcId === logisticsCadastros.transportCompanyId;
  });

  return (
    <div className="space-y-4">
      {showTransport ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Finalidade do deslocamento</Label>
              <Select
                value={logisticsCadastros.usageMomentId ?? "none"}
                onValueChange={(v) => setCadastro({ usageMomentId: v === "none" ? null : v })}
                disabled={disabled || lookups.loading}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder={lookups.loading ? "Carregando…" : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {lookups.usageMoments.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select
                value={logisticsCadastros.paymentTypeId ?? "none"}
                onValueChange={(v) => setCadastro({ paymentTypeId: v === "none" ? null : v })}
                disabled={disabled || lookups.loading}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {lookups.paymentTypes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showAirFields(transportType) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Transportadora</Label>
                <Select
                  value={logisticsCadastros.transportCompanyId ?? "none"}
                  onValueChange={(v) => {
                    const id = v === "none" ? null : v;
                    setCadastro({
                      transportCompanyId: id,
                      loyaltyProgramId:
                        id && logisticsCadastros.loyaltyProgramId
                          ? loyaltyOptions.some((lp) => lp.id === logisticsCadastros.loyaltyProgramId)
                            ? logisticsCadastros.loyaltyProgramId
                            : null
                          : logisticsCadastros.loyaltyProgramId,
                    });
                  }}
                  disabled={disabled || lookups.loading}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecione a transportadora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {lookups.transportCompanies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Programa de milhas</Label>
                <Select
                  value={logisticsCadastros.loyaltyProgramId ?? "none"}
                  onValueChange={(v) => setCadastro({ loyaltyProgramId: v === "none" ? null : v })}
                  disabled={disabled || lookups.loading}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {loyaltyOptions.map((lp) => (
                      <SelectItem key={lp.id} value={lp.id}>
                        {lp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {showHotel ? (
        <>
          <div className="space-y-2">
            <Label>Hospedagem (referência)</Label>
            <Select
              value={logisticsCadastros.hotelId ?? "none"}
              onValueChange={handleHotelSelect}
              disabled={disabled || lookups.loading}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Selecione ou edite manualmente abaixo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Outro / manual</SelectItem>
                {lookups.hotels.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                    {(h as { city?: string }).city ? ` · ${(h as { city?: string }).city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotelName">Nome do hotel</Label>
            <Input
              id="hotelName"
              value={hotelName}
              onChange={(e) => {
                onHotelNameChange(e.target.value);
                if (logisticsCadastros.hotelId) setCadastro({ hotelId: null });
              }}
              placeholder="Ex.: Hotel Central"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hotelAddress">Endereço do hotel</Label>
            <Textarea
              id="hotelAddress"
              value={hotelAddress}
              onChange={(e) => {
                onHotelAddressChange(e.target.value);
                if (logisticsCadastros.hotelId) setCadastro({ hotelId: null });
              }}
              placeholder="Endereço completo"
              rows={2}
              disabled={disabled}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Referências em{" "}
            <Link href={LOGISTICA_CADASTROS_BASE} className="text-primary underline-offset-2 hover:underline">
              {LOGISTICA_REFERENCIAS_BREADCRUMB}
            </Link>
            .
          </p>
        </>
      ) : null}
    </div>
  );
}

export { EMPTY_LOGISTICS_TRAVEL_CADASTROS };
