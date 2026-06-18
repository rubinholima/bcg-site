"use client";

import { useEffect } from "react";

interface BostonTvLiveLanRedirectProps {
  url: string;
}

/**
 * LiveLAN do vMix abre como página HTML (não como .m3u8 na barra do browser).
 * Na mesma rede local, redireciona a TV para a página que o vMix já serve.
 */
export function BostonTvLiveLanRedirect({ url }: BostonTvLiveLanRedirectProps) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black px-6 text-center text-zinc-300">
      <p className="text-xl font-medium text-white">Abrindo LiveLAN do vMix…</p>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-400">
        O navegador vai para a página de transmissão do vMix na rede local (igual no seu PC).
      </p>
      <p className="mt-3 font-mono text-xs text-zinc-500 break-all">{url}</p>
    </div>
  );
}
