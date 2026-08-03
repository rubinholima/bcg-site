"use client";

import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  LOGISTICA_CADASTROS_BASE,
  LOGISTICA_CADASTROS_BREADCRUMB,
} from "@/lib/logistica-cadastros.config";

interface Props {
  transportType: string;
  logisticsCadastros: LogisticsTravelCadastros;
  onLogisticsCadastrosChange: (next: LogisticsTravelCadastros) => void;
  hotelName: string;
  hotelAddress: string;
  onHotelNameChange: (v: string) => void;
  onHotelAddressChange: (v: string) => void;
  /** Destino cadastrado preenche a cidade (opcional) */
  onDestinationNameChange?: (name: string) => void;
  pointOfInterestIds?: string[];
  onPointOfInterestIdsChange?: (ids: string[]) => void;
  /** Clube da viagem — fornecedores unificados (Adm) */
  tenantId?: string;
  disabled?: boolean;
  /** transport | hotel | destination | all */
  variant?: "transport" | "hotel" | "destination" | "all";
}

function showAirFields(transportType: string): boolean {
  return (
    transportType === "aereo_comercial" ||
    transportType === "aereo_fretado" ||
    transportType === "misto"
  );
}

function airportLabel(a: { name: string; code?: string | null }): string {
  return a.code ? `${a.name} (${a.code})` : a.name;
}

export function LogisticaTravelCadastrosFields({
  transportType,
  logisticsCadastros,
  onLogisticsCadastrosChange,
  hotelName,
  hotelAddress,
  onHotelNameChange,
  onHotelAddressChange,
  onDestinationNameChange,
  pointOfInterestIds = [],
  onPointOfInterestIdsChange,
  tenantId,
  disabled,
  variant = "all",
}: Props) {
  const lookups = useLogisticaCadastrosLookups(tenantId);
  const showTransport = variant === "transport" || variant === "all";
  const showHotel = variant === "hotel" || variant === "all";
  const showDestination = variant === "destination" || variant === "all";

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
      const parts = [hotel.address, hotel.city, hotel.state].filter(Boolean);
      onHotelAddressChange(parts.join(" — "));
    }
  };

  const handleDestinationSelect = (value: string) => {
    if (value === "none" || !value) {
      setCadastro({ destinationId: null });
      return;
    }
    const dest = lookups.destinations.find((d) => d.id === value);
    setCadastro({ destinationId: value });
    if (dest && onDestinationNameChange) onDestinationNameChange(dest.name);
  };

  const togglePoi = (id: string, checked: boolean) => {
    if (!onPointOfInterestIdsChange) return;
    if (checked) {
      onPointOfInterestIdsChange([...new Set([...pointOfInterestIds, id])]);
    } else {
      onPointOfInterestIdsChange(pointOfInterestIds.filter((x) => x !== id));
    }
  };

  const loyaltyOptions = lookups.loyaltyPrograms.filter((lp) => {
    if (!logisticsCadastros.transportCompanyId) return true;
    return !lp.transportCompanyId || lp.transportCompanyId === logisticsCadastros.transportCompanyId;
  });

  return (
    <div className="space-y-4">
      {showDestination ? (
        <div className="space-y-2">
          <Label>Destino (cadastro)</Label>
          <Select
            value={logisticsCadastros.destinationId ?? "none"}
            onValueChange={handleDestinationSelect}
            disabled={disabled || lookups.loading}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder={lookups.loading ? "Carregando…" : "Selecione"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {lookups.destinations.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

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
              <Label>Forma de pagamento (padrão)</Label>
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

          <div className="space-y-2">
            <Label>Fornecedor principal</Label>
            <Select
              value={logisticsCadastros.supplierId ?? "none"}
              onValueChange={(v) => setCadastro({ supplierId: v === "none" ? null : v })}
              disabled={disabled || lookups.loading || !tenantId}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue
                  placeholder={
                    !tenantId
                      ? "Selecione o clube antes"
                      : lookups.loading
                        ? "Carregando…"
                        : "Selecione do cadastro"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {lookups.suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Cadastro único em{" "}
              <Link
                href="/dashboard/adm/fornecedores"
                className="text-primary underline-offset-2 hover:underline"
              >
                Adm → Fornecedores
              </Link>
              {tenantId && lookups.suppliers.length === 0
                ? " — nenhum fornecedor neste clube ainda."
                : "."}
            </p>
          </div>

          {showAirFields(transportType) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Aeroporto de embarque</Label>
                <Select
                  value={logisticsCadastros.departureAirportId ?? "none"}
                  onValueChange={(v) =>
                    setCadastro({ departureAirportId: v === "none" ? null : v })
                  }
                  disabled={disabled || lookups.loading}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {lookups.airports.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {airportLabel(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aeroporto de desembarque</Label>
                <Select
                  value={logisticsCadastros.arrivalAirportId ?? "none"}
                  onValueChange={(v) =>
                    setCadastro({ arrivalAirportId: v === "none" ? null : v })
                  }
                  disabled={disabled || lookups.loading}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {lookups.airports.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {airportLabel(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Transportadora</Label>
                <Select
                  value={logisticsCadastros.transportCompanyId ?? "none"}
                  onValueChange={(v) => {
                    const id = v === "none" ? null : v;
                    const keepLoyalty =
                      id &&
                      logisticsCadastros.loyaltyProgramId &&
                      loyaltyOptions.some(
                        (lp) =>
                          lp.id === logisticsCadastros.loyaltyProgramId &&
                          (!lp.transportCompanyId || lp.transportCompanyId === id),
                      );
                    setCadastro({
                      transportCompanyId: id,
                      loyaltyProgramId: keepLoyalty
                        ? logisticsCadastros.loyaltyProgramId
                        : null,
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
                  onValueChange={(v) =>
                    setCadastro({ loyaltyProgramId: v === "none" ? null : v })
                  }
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
                    {h.city ? ` · ${h.city}` : ""}
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

          {onPointOfInterestIdsChange ? (
            <div className="space-y-2">
              <Label>Apoio logístico próximo</Label>
              {lookups.pointsOfInterest.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum local cadastrado. Cadastre em Cadastros → Apoio logístico.
                </p>
              ) : (
                <div className="grid max-h-40 gap-2 overflow-y-auto rounded-md border border-border/70 p-3 sm:grid-cols-2">
                  {lookups.pointsOfInterest.map((poi) => {
                    const checked = pointOfInterestIds.includes(poi.id);
                    return (
                      <label
                        key={poi.id}
                        className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => togglePoi(poi.id, v === true)}
                          disabled={disabled || lookups.loading}
                        />
                        <span>{poi.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Cadastros em{" "}
            <Link
              href={LOGISTICA_CADASTROS_BASE}
              className="text-primary underline-offset-2 hover:underline"
            >
              {LOGISTICA_CADASTROS_BREADCRUMB}
            </Link>
            .
          </p>
        </>
      ) : null}
    </div>
  );
}

export { EMPTY_LOGISTICS_TRAVEL_CADASTROS };
