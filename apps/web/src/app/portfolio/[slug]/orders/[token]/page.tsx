import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildBackendUrl, getAppBaseUrl, getBackendOriginForServerFetch } from "@/lib/apiProxy";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";
import { formatCheckoutMoney, type BchPublicOrder } from "@/lib/bch-public-checkout";
import { BchPublicTicketsList } from "@/components/portfolio/bch/BchPublicTicketsList";
import type { Page } from "@/types/page";

const BCH_SLUG = "boston-city-hall";

async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const res = await fetch(buildBackendUrl(`/public/page-by-slug/${encodeURIComponent(slug)}`), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Page;
  } catch {
    return null;
  }
}

async function fetchOrder(token: string): Promise<BchPublicOrder | null> {
  const encoded = encodeURIComponent(token);
  const urls = [
    `${getBackendOriginForServerFetch()}/public/boston-city-hall/orders/${encoded}`,
    `${getAppBaseUrl().replace(/\/$/, "")}/api/public/boston-city-hall/orders/${encoded}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      return (await res.json()) as BchPublicOrder;
    } catch {
      /* próxima origem */
    }
  }
  return null;
}

function statusCopy(order: BchPublicOrder, lang: "pt" | "en"): { title: string; body: string } {
  if (order.status === "confirmed" || order.paymentStatus === "paid") {
    const withTickets = (order.ticketCount ?? 0) > 0;
    return lang === "pt"
      ? {
          title: "Pedido confirmado",
          body: withTickets
            ? "Pagamento confirmado. Seus ingressos estão abaixo — apresente o QR na entrada."
            : "Pagamento confirmado. Os ingressos serão emitidos em instantes; atualize esta página.",
        }
      : {
          title: "Order confirmed",
          body: withTickets
            ? "Payment confirmed. Your tickets are below — show the QR at entry."
            : "Payment confirmed. Tickets will appear shortly; refresh this page.",
        };
  }
  if (order.status === "expired" || order.paymentStatus === "expired") {
    return lang === "pt"
      ? { title: "Pedido expirado", body: "O prazo para pagamento deste pedido encerrou. A reserva foi liberada." }
      : { title: "Order expired", body: "The payment window for this order has closed." };
  }
  if (order.status === "cancelled") {
    return lang === "pt"
      ? { title: "Pedido cancelado", body: "Este pedido foi cancelado." }
      : { title: "Order cancelled", body: "This order was cancelled." };
  }
  return lang === "pt"
    ? {
        title: "Pedido criado. Aguardando pagamento.",
        body: "Guarde esta página. O pagamento online será habilitado em uma fase futura; por enquanto, aguarde instruções do evento se aplicável.",
      }
    : {
        title: "Order created. Awaiting payment.",
        body: "Save this page. Online payment will be enabled in a future phase.",
      };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}): Promise<Metadata> {
  return { title: "Seu pedido — Boston City Hall" };
}

export default async function BchPublicOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug, token } = await params;
  const { lang: langParam } = await searchParams;

  if (slug !== BCH_SLUG) notFound();

  const lang = langParam === "en" ? "en" : "pt";
  const order = await fetchOrder(token);
  if (!order) notFound();

  const portfolioPage = await getPageBySlug(slug);
  const headerBlock = portfolioPage?.content?.blocks?.find((b) => b.type === "header");
  const copy = statusCopy(order, lang);

  const holdLabel =
    order.holdExpiresAt && order.status === "pending"
      ? new Date(order.holdExpiresAt).toLocaleString(lang === "pt" ? "pt-BR" : "en-US", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <PortfolioFavicon slug={slug} logoUrl={portfolioPage?.tenant?.logoUrl} />
      <PublicPortfolioHeader
        slug={slug}
        tenantName={portfolioPage?.tenant?.name ?? "Boston City Hall"}
        logoUrl={portfolioPage?.tenant?.logoUrl}
        headerBlock={headerBlock}
        lang={lang}
        basePath={`/portfolio/${slug}`}
      />
      <main className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <h1 className="text-2xl font-bold text-amber-400/95">{copy.title}</h1>
        <p className="mt-3 text-sm text-zinc-400">{copy.body}</p>

        <dl className="mt-8 space-y-4 rounded-xl border border-white/10 bg-zinc-900/80 p-5 text-sm">
          <div>
            <dt className="text-zinc-500">{lang === "pt" ? "Pedido" : "Order"}</dt>
            <dd className="font-mono text-white">{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">{lang === "pt" ? "Evento" : "Event"}</dt>
            <dd>
              <Link href={order.event.detailPath} className="text-amber-400 hover:underline">
                {order.event.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">{lang === "pt" ? "Comprador" : "Buyer"}</dt>
            <dd className="text-zinc-200">
              {order.customerName}
              <br />
              {order.customerEmail}
            </dd>
          </div>
          {holdLabel && (
            <div>
              <dt className="text-zinc-500">{lang === "pt" ? "Reserva válida até" : "Hold until"}</dt>
              <dd className="text-zinc-200">{holdLabel}</dd>
            </div>
          )}
          <div>
            <dt className="text-zinc-500 mb-2">{lang === "pt" ? "Itens" : "Items"}</dt>
            <dd>
              <ul className="space-y-2">
                {order.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-2 text-zinc-300">
                    <span>
                      {it.quantity}× {it.ticketTypeName}
                      {it.lotName ? ` (${it.lotName})` : ""}
                    </span>
                    <span>{formatCheckoutMoney(it.totalPrice, order.currency)}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          {order.confirmedAt && order.status === "confirmed" ? (
            <div>
              <dt className="text-zinc-500">{lang === "pt" ? "Confirmado em" : "Confirmed at"}</dt>
              <dd className="text-zinc-200">
                {new Date(order.confirmedAt).toLocaleString(lang === "pt" ? "pt-BR" : "en-US", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </dd>
            </div>
          ) : null}
          <div className="border-t border-white/10 pt-4 flex justify-between font-semibold">
            <span>{lang === "pt" ? "Total" : "Total"}</span>
            <span>{formatCheckoutMoney(order.total, order.currency)}</span>
          </div>
        </dl>

        {order.status === "confirmed" && order.tickets?.length ? (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-white">
              {lang === "pt" ? `Ingressos (${order.ticketCount})` : `Tickets (${order.ticketCount})`}
            </h2>
            <BchPublicTicketsList tickets={order.tickets} lang={lang} />
          </section>
        ) : null}

        <p className="mt-8 text-center text-sm">
          <Link
            href={`/portfolio/${slug}/my-tickets${lang === "en" ? "?lang=en" : ""}`}
            className="text-amber-400 hover:underline"
          >
            {lang === "pt" ? "Ver todos os meus ingressos" : "View all my tickets"}
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-zinc-500">
          {lang === "pt" ? "Status do pedido:" : "Order status:"}{" "}
          <span className="text-zinc-300">{order.status}</span>
        </p>
      </main>
    </div>
  );
}
