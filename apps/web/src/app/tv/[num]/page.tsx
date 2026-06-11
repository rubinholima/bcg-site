import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BostonTvPlayerView } from "@/components/boston-tv/BostonTvPlayerView";
import { fetchHallPlayerToken, isHallScreenNum } from "@/lib/boston-tv-hall";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ num: string }>;
}): Promise<Metadata> {
  const { num } = await params;
  if (!isHallScreenNum(num)) {
    return { title: "Boston TV" };
  }
  return { title: `Boston TV — Tela ${num}` };
}

export default async function BostonTvHallScreenPage({
  params,
}: {
  params: Promise<{ num: string }>;
}) {
  const { num } = await params;
  if (!isHallScreenNum(num)) {
    notFound();
  }

  const playerToken = await fetchHallPlayerToken(parseInt(num, 10));
  if (!playerToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
        <p className="text-lg text-zinc-300">Tela {num} não encontrada.</p>
        <Link href="/tv" className="mt-4 text-sm font-medium text-amber-400">
          ← Voltar à instalação
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <BostonTvPlayerView token={playerToken} />
    </div>
  );
}
