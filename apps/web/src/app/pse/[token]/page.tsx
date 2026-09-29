import { getServerBackendBaseUrl } from "@/lib/apiProxy";
import { PseAthleteForm, type PseFormData } from "./PseAthleteForm";

async function loadForm(token: string): Promise<PseFormData | null> {
  try {
    const base = getServerBackendBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/public/pse/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PseFormData;
  } catch {
    return null;
  }
}

export default async function PsePublicPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const data = await loadForm(token);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 text-center text-muted-foreground">
        Link inválido, expirado ou já utilizado.
      </div>
    );
  }

  return <PseAthleteForm token={token} initial={data} />;
}
