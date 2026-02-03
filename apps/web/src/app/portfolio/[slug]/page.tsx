import Link from "next/link";

export default async function PortfolioSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params; // placeholder: slug available when needed
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <p className="text-lg text-zinc-400">Perfil em breve / Profile coming soon</p>
      <Link
        href="/"
        className="mt-4 text-sm font-medium text-amber-400 hover:text-amber-300"
      >
        ← Voltar / Back
      </Link>
    </div>
  );
}
