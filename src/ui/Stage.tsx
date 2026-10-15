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
      el.style.transform = `translate(${(window.innerWidth - STAGE_W * s) / 2}px,${(window.innerHeight - STAGE_H * s) / 2}px) scale(${s})`;
      el.dataset.scale = String(s);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div id="vp">
      <div id="stage" ref={ref} className={className}>{children}</div>
    </div>
  );
}
