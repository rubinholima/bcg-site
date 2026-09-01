import type {
  MedicalDepartureCareType,
  MedicalDepartureStatus,
  MedicalDepartureTransportMode,
} from "@/types/medical-departure";

export const MEDICAL_DEPARTURE_CARE_TYPE_OPTIONS: Array<{
  value: MedicalDepartureCareType;
  label: string;
}> = [
  { value: "medico", label: "Médico" },
  { value: "dentista", label: "Dentista" },
  { value: "exames", label: "Exames" },
  { value: "pronto_atendimento", label: "Pronto atendimento" },
  { value: "emergencia", label: "Emergência" },
  { value: "cirurgia", label: "Cirurgia" },
  { value: "outro", label: "Outro" },
];

export const MEDICAL_DEPARTURE_TRANSPORT_OPTIONS: Array<{
  value: MedicalDepartureTransportMode;
  label: string;
}> = [
  { value: "proprio", label: "Meios próprios" },
  { value: "onibus", label: "Ônibus" },
  { value: "aplicativo", label: "Aplicativo" },
  { value: "taxi", label: "Táxi" },
  { value: "ambulancia_clube", label: "Ambulância do clube" },
  { value: "carro_clube", label: "Carro do clube" },
  { value: "outro", label: "Outro" },
];

export const MEDICAL_DEPARTURE_STATUS_OPTIONS: Array<{
  value: MedicalDepartureStatus | "all";
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "programada", label: "Programada" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "retornou", label: "Retornou" },
  { value: "cancelada", label: "Cancelada" },
];

export const MEDICAL_DEPARTURE_STATUS_LABEL: Record<string, string> = {
  programada: "Programada",
  em_atendimento: "Em atendimento",
  retornou: "Retornou",
  cancelada: "Cancelada",
};

export const MEDICAL_DEPARTURE_CARE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  MEDICAL_DEPARTURE_CARE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

export const MEDICAL_DEPARTURE_TRANSPORT_LABEL: Record<string, string> = Object.fromEntries(
  MEDICAL_DEPARTURE_TRANSPORT_OPTIONS.map((o) => [o.value, o.label]),
);

export const MEDICAL_DEPARTURE_DOC_KIND_OPTIONS = [
  { value: "atestado", label: "Atestado", documentType: "atestado_saida_ct" },
  { value: "exame", label: "Exame", documentType: "exame_saida_ct" },
  { value: "outro", label: "Outro documento", documentType: "doc_saida_ct" },
] as const;

export function formatMedicalDepartureDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function defaultMedicalDepartureReportPeriod() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}
