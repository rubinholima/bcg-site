"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  emptyHomeAgendaItem,
  emptyItineraryStop,
  type TravelHomeAgendaItem,
  type TravelHotelStay,
  type TravelItinerary,
  type TravelItineraryStop,
  type TravelUniforms,
} from "@/lib/travel-itinerary.types";

type Props = {
  isHomeMatch: boolean;
  itinerary: TravelItinerary;
  hotelStay: TravelHotelStay;
  uniforms: TravelUniforms;
  onItineraryChange: (next: TravelItinerary) => void;
  onHotelStayChange: (next: TravelHotelStay) => void;
  onUniformsChange: (next: TravelUniforms) => void;
  disabled?: boolean;
};

function StopRows({
  title,
  stops,
  onChange,
  disabled,
}: {
  title: string;
  stops: TravelItineraryStop[];
  onChange: (next: TravelItineraryStop[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-semibold uppercase tracking-wide">{title}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[40px]"
          disabled={disabled}
          onClick={() => onChange([...stops, emptyItineraryStop()])}
        >
          <Plus className="mr-1 h-4 w-4" />
          Parada
        </Button>
      </div>
      {stops.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma parada. Ex.: CT → restaurante → hotel.</p>
      ) : (
        <div className="space-y-3">
          {stops.map((s, idx) => (
            <div
              key={s.id ?? `stop-${idx}`}
              className="grid gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <div className="space-y-1 sm:col-span-4">
                <Label className="text-xs">Local</Label>
                <Input
                  className="uppercase"
                  disabled={disabled}
                  value={s.place}
                  onChange={(e) => {
                    const next = [...stops];
                    next[idx] = { ...s, place: e.target.value.toLocaleUpperCase("pt-BR") };
                    onChange(next);
                  }}
                  placeholder="CT BOSTON CITY / RESTAURANTE / HOTEL…"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Chegada</Label>
                <Input
                  type="datetime-local"
                  className="text-foreground"
                  disabled={disabled}
                  value={s.arriveAt ?? ""}
                  onChange={(e) => {
                    const next = [...stops];
                    next[idx] = { ...s, arriveAt: e.target.value };
                    onChange(next);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Saída</Label>
                <Input
                  type="datetime-local"
                  className="text-foreground"
                  disabled={disabled}
                  value={s.departAt ?? ""}
                  onChange={(e) => {
                    const next = [...stops];
                    next[idx] = { ...s, departAt: e.target.value };
                    onChange(next);
                  }}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="min-h-[40px] min-w-[40px] text-destructive"
                  disabled={disabled}
                  onClick={() => onChange(stops.filter((_, i) => i !== idx))}
                  aria-label="Remover parada"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LogisticaItineraryFields({
  isHomeMatch,
  itinerary,
  hotelStay,
  uniforms,
  onItineraryChange,
  onHotelStayChange,
  onUniformsChange,
  disabled,
}: Props) {
  if (isHomeMatch) {
    const items = itinerary.homeMatchAgenda ?? [];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide">Agenda do jogo (casa)</p>
            <p className="text-xs text-muted-foreground">
              Refeições, rouparia, aquecimento, vestiário, retorno ao campo…
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[40px]"
            disabled={disabled}
            onClick={() =>
              onItineraryChange({
                ...itinerary,
                homeMatchAgenda: [...items, emptyHomeAgendaItem()],
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Item
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Adicione horários da programação do dia.</p>
        ) : (
          items.map((item: TravelHomeAgendaItem, idx) => (
            <div
              key={item.id ?? `home-${idx}`}
              className="grid gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-[100px_1fr_auto]"
            >
              <div className="space-y-1">
                <Label className="text-xs">Hora</Label>
                <Input
                  type="time"
                  className="text-foreground"
                  disabled={disabled}
                  value={item.time ?? ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...item, time: e.target.value };
                    onItineraryChange({ ...itinerary, homeMatchAgenda: next });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Atividade</Label>
                <Input
                  className="uppercase"
                  disabled={disabled}
                  value={item.label}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...item, label: e.target.value.toLocaleUpperCase("pt-BR") };
                    onItineraryChange({ ...itinerary, homeMatchAgenda: next });
                  }}
                  placeholder="CAFÉ DA MANHÃ / ROUPARIA / AQUECIMENTO…"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="min-h-[40px] text-destructive"
                  disabled={disabled}
                  onClick={() =>
                    onItineraryChange({
                      ...itinerary,
                      homeMatchAgenda: items.filter((_, i) => i !== idx),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
        <UniformsBlock uniforms={uniforms} onChange={onUniformsChange} disabled={disabled} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:max-w-xs">
        <Label>Tipo de ônibus</Label>
        <NativeSelect
          disabled={disabled}
          value={itinerary.busType ?? ""}
          onChange={(e) =>
            onItineraryChange({
              ...itinerary,
              busType: e.target.value === "LD" || e.target.value === "DD" ? e.target.value : null,
            })
          }
        >
          <option value="">Selecione…</option>
          <option value="LD">LD (1 andar)</option>
          <option value="DD">DD (2 andares)</option>
        </NativeSelect>
      </div>

      <StopRows
        title="Programação de ida"
        stops={itinerary.outbound ?? []}
        disabled={disabled}
        onChange={(outbound) => onItineraryChange({ ...itinerary, outbound })}
      />
      <StopRows
        title="Programação de retorno"
        stops={itinerary.return ?? []}
        disabled={disabled}
        onChange={(ret) => onItineraryChange({ ...itinerary, return: ret })}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Check-in hotel</Label>
          <Input
            type="datetime-local"
            className="text-foreground"
            disabled={disabled}
            value={hotelStay.checkIn ?? ""}
            onChange={(e) => onHotelStayChange({ ...hotelStay, checkIn: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Check-out hotel</Label>
          <Input
            type="datetime-local"
            className="text-foreground"
            disabled={disabled}
            value={hotelStay.checkOut ?? ""}
            onChange={(e) => onHotelStayChange({ ...hotelStay, checkOut: e.target.value })}
          />
        </div>
      </div>

      <UniformsBlock uniforms={uniforms} onChange={onUniformsChange} disabled={disabled} />
    </div>
  );
}

function UniformsBlock({
  uniforms,
  onChange,
  disabled,
}: {
  uniforms: TravelUniforms;
  onChange: (u: TravelUniforms) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-wide">Uniformes</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["athletesGame", "Atletas — jogo"],
            ["athletesTravel", "Atletas — viagem / concentração"],
            ["staffGame", "Comissão — jogo"],
            ["staffTravel", "Comissão — viagem"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <NativeSelect
              disabled={disabled}
              value={uniforms[key] ?? ""}
              onChange={(e) => onChange({ ...uniforms, [key]: e.target.value || null })}
            >
              <option value="">—</option>
              <option value="KIT 1">KIT 1</option>
              <option value="KIT 2">KIT 2</option>
              <option value="KIT 3">KIT 3</option>
            </NativeSelect>
          </div>
        ))}
      </div>
    </div>
  );
}
