import {
  BCH_TICKET_AVAILABILITY_LABEL,
  formatBchEventDateTime,
  type BchPublicEventDetail,
  type BchPublicTicketAvailability,
} from "@/lib/bch-public-events";

function availabilityBadgeClass(state: BchPublicTicketAvailability): string {
  switch (state) {
    case "AVAILABLE":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "LOW_AVAILABILITY":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "SOLD_OUT":
      return "border-zinc-600 bg-zinc-800/80 text-zinc-400";
    case "NOT_YET_ON_SALE":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "SALES_ENDED":
      return "border-zinc-600 bg-zinc-800/80 text-zinc-500";
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-400";
  }
}

function formatPrice(price: string | null, currency: string): string {
  if (!price) return "—";
  const n = Number(price);
  if (Number.isFinite(n)) {
    try {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(n);
    } catch {
      return `${currency} ${price}`;
    }
  }
  return price;
}

export function BchPublicEventTickets({
  event,
  lang,
}: {
  event: BchPublicEventDetail;
  lang: "pt" | "en";
}) {
  if (!event.ticketing?.enabled || event.ticketing.types.length === 0) {
    return null;
  }

  const heading = lang === "pt" ? "Ingressos" : "Tickets";
  const windowLabel = lang === "pt" ? "Período de venda" : "Sale window";

  return (
    <section className="mt-12 rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white sm:text-2xl">{heading}</h2>
      <ul className="mt-6 space-y-4">
        {event.ticketing.types.map((type) => (
          <li
            key={`${type.name}-${type.price}`}
            className="rounded-xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-medium text-white">{type.name}</p>
                {type.description && (
                  <p className="mt-1 text-sm text-zinc-400">{type.description}</p>
                )}
                {type.currentLot && (
                  <p className="mt-2 text-sm text-zinc-500">
                    {lang === "pt" ? "Lote" : "Lot"}: {type.currentLot.name}
                  </p>
                )}
                {(type.salesStartAt || type.salesEndAt) && (
                  <p className="mt-2 text-xs text-zinc-500">
                    {windowLabel}:{" "}
                    {type.salesStartAt
                      ? formatBchEventDateTime(type.salesStartAt, lang)
                      : "—"}{" "}
                    —{" "}
                    {type.salesEndAt ? formatBchEventDateTime(type.salesEndAt, lang) : "—"}
                  </p>
                )}
              </div>
              <div className="flex flex-shrink-0 flex-col items-start gap-2 sm:items-end">
                <p className="text-lg font-semibold text-amber-400/95">
                  {formatPrice(type.currentLot?.price ?? type.price, type.currency)}
                </p>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${availabilityBadgeClass(type.availability)}`}
                >
                  {BCH_TICKET_AVAILABILITY_LABEL[type.availability]}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
