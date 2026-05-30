/** Velocidade do crawl/marquee em Próximos Jogos e Últimos Resultados. */
export type FixturesMarqueeSpeed = "slow" | "normal" | "fast";

const DURATION_SEC: Record<FixturesMarqueeSpeed, number> = {
  slow: 100,
  normal: 75,
  fast: 45,
};

export function fixturesMarqueeDurationSeconds(speed: string | undefined): number {
  const key: FixturesMarqueeSpeed =
    speed === "slow" || speed === "fast" ? speed : "normal";
  return DURATION_SEC[key];
}
