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
      // On a phone held upright the board is turned 90° so it fills the long side of the screen, like landscape.
      const rot = window.innerHeight > window.innerWidth;
      const vw = rot ? window.innerHeight : window.innerWidth;
      const vh = rot ? window.innerWidth : window.innerHeight;
      const s = Math.min(vw / STAGE_W, vh / STAGE_H);
      // On wide windows the stage grows sideways: the 1360px board stays centred and the side panels pin to the edges.
      const w = Math.max(STAGE_W, vw / s);
      const dx = (w - STAGE_W) / 2;
      const ox = (vw - w * s) / 2;
      const oy = (vh - STAGE_H * s) / 2;
      el.style.width = `${w}px`;
      el.style.setProperty("--dx", `${dx}px`);
      // screen position of the stage's top-left corner (rotated: the board's top edge runs down the right of the screen)
      const tx = rot ? window.innerWidth - oy : ox;
      const ty = rot ? ox : oy;
      el.style.transform = `translate(${tx}px,${ty}px) ${rot ? "rotate(90deg) " : ""}scale(${s})`;
      el.dataset.scale = String(s);
      el.dataset.tx = String(tx);
      el.dataset.ty = String(ty);
      el.dataset.rot = rot ? "1" : "0";
      // let the felt and its grid continue past the stage so there are no black bars
      document.body.style.backgroundPosition = `${tx}px ${ty}px`;
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

/** A screen rectangle (e.g. from getBoundingClientRect) expressed in stage coordinates, whatever the scale or rotation. */
export function stageRect(r: { left: number; top: number; right: number; bottom: number }): { x: number; y: number; w: number; h: number } {
  const stage = document.getElementById("stage");
  const s = Number(stage?.dataset.scale || 1);
  const tx = Number(stage?.dataset.tx || 0);
  const ty = Number(stage?.dataset.ty || 0);
  const point = (X: number, Y: number) => stage?.dataset.rot === "1" ? { x: (Y - ty) / s, y: (tx - X) / s } : { x: (X - tx) / s, y: (Y - ty) / s };
  const a = point(r.left, r.top);
  const b = point(r.right, r.bottom);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}
