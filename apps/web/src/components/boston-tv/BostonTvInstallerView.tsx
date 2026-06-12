"use client";

import { useMemo, useState } from "react";
import type { HallInstallerScreen } from "@/lib/boston-tv-hall";

interface BostonTvInstallerViewProps {
  screens: HallInstallerScreen[];
}

export function BostonTvInstallerView({ screens }: BostonTvInstallerViewProps) {
  const [selected, setSelected] = useState(() => String(screens[0]?.num ?? ""));

  const current = useMemo(
    () => screens.find((s) => String(s.num) === selected),
    [screens, selected],
  );

  const openScreen = () => {
    if (!selected) return;
    window.location.assign(`/tv/${selected}`);
  };

  if (screens.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <p className="text-xl font-medium text-zinc-200">Boston TV — Instalação</p>
        <p className="mt-4 max-w-md text-sm text-zinc-400">
          Nenhuma tela numerada encontrada. Rode o seed das telas do Hall no servidor.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-10 text-white sm:px-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl sm:p-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Boston TV
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold sm:text-3xl">Instalação nas TVs</h1>
        <p className="mt-3 text-center text-sm text-zinc-400">
          Recomendado: app <strong className="font-medium text-zinc-200">BCG TV</strong> (APK Android).
          Navegador só para Samsung Tizen (#10 Inglaterra) ou telão via stick/PC.
        </p>

        <label htmlFor="hall-screen" className="mt-8 block text-sm font-medium text-zinc-300">
          Qual TV?
        </label>
        <select
          id="hall-screen"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-2 w-full min-h-[52px] rounded-lg border border-zinc-700 bg-zinc-950 px-4 text-base text-foreground [&>option]:bg-zinc-950"
        >
          {screens.map((s) => (
            <option key={s.num} value={String(s.num)}>
              {s.name}
              {s.locationHint ? ` — ${s.locationHint}` : ""}
            </option>
          ))}
        </select>

        {current?.locationHint ? (
          <p className="mt-2 text-xs text-zinc-500">{current.locationHint}</p>
        ) : null}

        <button
          type="button"
          onClick={openScreen}
          disabled={!selected}
          className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-lg bg-amber-500 text-base font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Abrir no navegador (teste)
        </button>

        {selected ? (
          <p className="mt-6 text-center text-xs text-zinc-500">
            URL do navegador:{" "}
            <span className="font-mono text-zinc-300">/tv/{selected}</span>
            <span className="block mt-1 text-zinc-600">
              (ex.: www.bostoncitygroup.biz/tv/{selected})
            </span>
          </p>
        ) : null}

        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-400 leading-relaxed">
          <p className="font-semibold text-zinc-300">App BCG TV (APK)</p>
          <p className="mt-2">
            Semp e Philips (Android): instale o APK, escolha o número da tela (1–21) e deixe aberto.
            Reinicia sozinho após ligar a TV. Menu no controle = trocar tela.
          </p>
          <p className="mt-2 text-zinc-500">
            Build: pasta <span className="font-mono text-zinc-400">apps/bcg-tv-android</span> no Android
            Studio → Generate Signed APK.
          </p>
        </div>
      </div>
    </div>
  );
}
