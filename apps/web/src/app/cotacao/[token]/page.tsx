import { getServerBackendBaseUrl } from "@/lib/apiProxy";
import { QuoteInviteForm, type QuoteInviteFormData } from "./QuoteInviteForm";

async function loadForm(token: string): Promise<QuoteInviteFormData | null> {
  try {
    const base = getServerBackendBaseUrl().replace(/\/$/, "");
    const res = await fetch(
      `${base}/public/purchase-quote-invite/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as QuoteInviteFormData;
  } catch {
    return null;
  }
}

export default async function CotacaoPublicPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const data = await loadForm(token);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 text-center text-muted-foreground">
        Link inválido, expirado ou indisponível.
      </div>
    );
  }

  return <QuoteInviteForm token={token} initial={data} />;
}
