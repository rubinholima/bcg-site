/** Patch de conclusão Live Tag — preserva timestamp de captura. */

export function applyCompletionPatch(
  stamped: { startMs: number; matchClockSeconds: number },
  patch: { fieldZoneKey?: string; playerId?: string; outcome?: string },
): { startMs: number; matchClockSeconds: number } & typeof patch {
  return {
    startMs: stamped.startMs,
    matchClockSeconds: stamped.matchClockSeconds,
    ...patch,
  };
}
