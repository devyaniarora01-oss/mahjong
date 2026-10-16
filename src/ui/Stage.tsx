"use client";

import { useEffect, useRef, type ReactNode } from "react";

export const STAGE_W = 1360;
export const STAGE_H = 850;

/** Fixed-size board scaled to fit the window, centred. Children use stage coordinates. */
export function Stage({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
      // On wide windows the stage grows sideways: the 1360px board stays centred and the side panels pin to the edges.
      const w = Math.max(STAGE_W, window.innerWidth / s);
      const dx = (w - STAGE_W) / 2;
      const ox = (window.innerWidth - w * s) / 2;
      const oy = (window.innerHeight - STAGE_H * s) / 2;
      el.style.width = `${w}px`;
      el.style.setProperty("--dx", `${dx}px`);
      el.style.transform = `translate(${ox}px,${oy}px) scale(${s})`;
      el.dataset.scale = String(s);
      // let the felt and its grid continue past the stage so there are no black bars
      document.body.style.backgroundPosition = `${ox}px ${oy}px`;
      document.body.style.backgroundSize = `${46 * s}px ${46 * s}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => { window.removeEventListener("resize", fit); document.body.style.backgroundPosition = ""; document.body.style.backgroundSize = ""; };
  }, []);
  return (
    <div id="vp">
      <div id="stage" ref={ref} className={className}><div id="board">{children}</div></div>
    </div>
  );
}
