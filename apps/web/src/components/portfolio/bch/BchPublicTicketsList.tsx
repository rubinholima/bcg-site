"use client";

import { publicTicketStatusLabel, type BchPublicTicket } from "@/lib/bch-my-tickets";

type Props = {
  tickets: BchPublicTicket[];
  lang: "pt" | "en";
};

export function BchPublicTicketsList({ tickets, lang }: Props) {
  if (!tickets.length) return null;

  return (
    <ul className="mt-6 space-y-4">
      {tickets.map((ticket) => (
        <li
          key={ticket.publicTicketRef}
          className="rounded-xl border border-white/10 bg-zinc-900/80 p-4 text-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-mono text-xs text-zinc-500">{ticket.ticketCode}</p>
              <p className="font-medium text-white">{ticket.ticketTypeName}</p>
              {ticket.lotName ? <p className="text-zinc-400">{ticket.lotName}</p> : null}
              <p className="text-zinc-300">{ticket.holderName}</p>
              {ticket.seating ? (
                <p className="text-zinc-400">
                  {[ticket.seating.section, ticket.seating.tableName, ticket.seating.seatLabel]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              <p
                className={
                  ticket.status === "VALID"
                    ? "text-emerald-400"
                    : ticket.status === "USED"
                      ? "text-amber-400"
                      : "text-red-400"
                }
              >
                {publicTicketStatusLabel(ticket.status, lang)}
              </p>
            </div>
            {ticket.status === "VALID" ? (
              <div className="flex shrink-0 flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ticket.qrPath}
                  alt={lang === "pt" ? "Código de barras do ingresso" : "Ticket barcode"}
                  width={280}
                  height={120}
                  className="max-w-full rounded-lg bg-white p-2"
                />
                <a
                  href={ticket.qrPath}
                  download={`ingresso-${ticket.ticketCode}.png`}
                  className="text-xs text-amber-400 hover:underline"
                >
                  {lang === "pt" ? "Baixar PNG" : "Download PNG"}
                </a>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
