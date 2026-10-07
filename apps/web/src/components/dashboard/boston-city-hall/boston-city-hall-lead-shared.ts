import type { VenuePipelineLead } from "@/types/boston-city-hall";

export const BCH_BASE = "/dashboard/eventos/boston-city-hall";

export type LeadForm = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  eventType: string;
  guestCount: string;
  preferredDate: string;
  message: string;
  notes: string;
};

export type DetailForm = LeadForm & { stage: string };

export const emptyLead = (): LeadForm => ({
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  companyName: "",
  eventType: "",
  guestCount: "",
  preferredDate: "",
  message: "",
  notes: "",
});

export function leadToDetailForm(lead: VenuePipelineLead): DetailForm {
  return {
    contactName: lead.contactName,
    contactEmail: lead.contactEmail,
    contactPhone: lead.contactPhone ?? "",
    companyName: lead.companyName ?? "",
    eventType: lead.eventType ?? "",
    guestCount: lead.guestCount != null ? String(lead.guestCount) : "",
    preferredDate: lead.preferredDate?.slice(0, 10) ?? "",
    message: lead.message ?? "",
    notes: lead.notes ?? "",
    stage: lead.stage,
  };
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function periodToDates(period: string): { createdFrom?: string; createdTo?: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (period === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { createdFrom: iso(from) };
  }
  if (period === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { createdFrom: iso(from) };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { createdFrom: iso(from), createdTo: iso(now) };
  }
  return {};
}

export type PipelineListFilters = {
  stageFilter?: string;
  sourceFilter?: string;
  commercialFilter?: string;
  periodFilter?: string;
  searchDebounced?: string;
  sort?: string;
  eventTypeFilter?: string;
};

export function buildPipelineListQuery(filters: PipelineListFilters): string {
  const params = new URLSearchParams();
  const {
    stageFilter = "all",
    sourceFilter = "all",
    commercialFilter = "all",
    periodFilter = "all",
    searchDebounced = "",
    sort = "updatedDesc",
    eventTypeFilter = "",
  } = filters;

  if (stageFilter !== "all") params.set("stage", stageFilter);
  if (sourceFilter !== "all") params.set("source", sourceFilter);
  if (commercialFilter !== "all") params.set("commercialStatus", commercialFilter);
  if (searchDebounced) params.set("q", searchDebounced);
  if (sort) params.set("sort", sort);
  const et = eventTypeFilter.trim();
  if (et) params.set("eventType", et);
  const period = periodToDates(periodFilter);
  if (period.createdFrom) params.set("createdFrom", period.createdFrom);
  if (period.createdTo) params.set("createdTo", period.createdTo);
  return params.toString();
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

const STALE_DAYS = 14;
const PREFERRED_SOON_DAYS = 30;

export function isStaleLead(lead: VenuePipelineLead): boolean {
  if (["confirmado", "perdido"].includes(lead.stage)) return false;
  const days = (Date.now() - new Date(lead.updatedAt).getTime()) / 86_400_000;
  return days >= STALE_DAYS;
}

export function isPreferredDateSoon(lead: VenuePipelineLead): boolean {
  if (!lead.preferredDate) return false;
  const pref = new Date(lead.preferredDate);
  if (Number.isNaN(pref.getTime())) return false;
  const diff = (pref.getTime() - Date.now()) / 86_400_000;
  return diff >= 0 && diff <= PREFERRED_SOON_DAYS;
}

export const STAGE_BADGE: Record<string, string> = {
  lead: "bg-violet-500/15 text-violet-300",
  analise: "bg-sky-500/15 text-sky-300",
  proposta: "bg-amber-500/15 text-amber-300",
  contrato: "bg-emerald-500/15 text-emerald-300",
  confirmado: "bg-green-600/20 text-green-300",
  perdido: "bg-zinc-500/20 text-zinc-400",
};
