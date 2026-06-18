"use client";

import { useEffect, useState } from "react";
import { BOSTON_TV_ORIENTATION_PORTRAIT } from "@/lib/boston-tv-display-orientation";

/** Viewport reporta landscape (comum em TV montada em pé). */
function isViewportLandscape(): boolean {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= window.innerHeight;
}

interface BostonTvPlayerShellProps {
  displayOrientation?: string | null;
  children: React.ReactNode;
  pauseOverlay?: React.ReactNode;
}

/**
 * Modo vertical: gira o conteúdo 90° quando a TV ainda reporta landscape,
 * para mídia horizontal aparecer em pé na tela portrait (sem zoom/crop).
 */
export function BostonTvPlayerShell({
  displayOrientation,
  children,
  pauseOverlay,
}: BostonTvPlayerShellProps) {
  const portrait = displayOrientation === BOSTON_TV_ORIENTATION_PORTRAIT;
  const [rotateForPortrait, setRotateForPortrait] = useState(
    () => portrait && isViewportLandscape(),
  );

  useEffect(() => {
    if (!portrait) return;
    const sync = () => setRotateForPortrait(isViewportLandscape());
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, [portrait]);

  if (!portrait || !rotateForPortrait) {
    return (
      <div className="relative h-[100dvh] w-[100dvw] overflow-hidden bg-black">
        {children}
        {pauseOverlay}
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-[100dvw] overflow-hidden bg-black">
      <div
        className="absolute left-1/2 top-1/2 origin-center"
        style={{
          width: "100dvh",
          height: "100dvw",
          transform: "translate(-50%, -50%) rotate(90deg)",
        }}
      >
        <div className="relative h-full w-full overflow-hidden bg-black">
          {children}
          {pauseOverlay}
        </div>
      </div>
    </div>
  );
}
