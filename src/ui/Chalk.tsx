"use client";

import { useLayoutEffect, useState } from "react";

/** A hand-drawn chalk arrow from a fixed point on the felt to a tile or group in your rack. */
export function ChalkArrow({ target, watch }: { target: string; watch: unknown }) {
  const [d, setD] = useState<string>("");
  useLayoutEffect(() => {
    const measure = () => {
      const stage = document.getElementById("stage");
      const el = document.querySelector(target) as HTMLElement | null;
      if (!stage || !el) { setD(""); return; }
      const s = Number(stage.dataset.scale || 1);
      const sr = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const panel = document.getElementById("chalkp");
      const pr = panel?.getBoundingClientRect();
      const from = pr ? { x: (pr.left - sr.left) / s + pr.width / s * 0.55, y: Math.min(520, (pr.bottom - sr.top) / s + 14) } : { x: 1100, y: 330 };
      const tx = (r.left - sr.left) / s + r.width / s / 2;
      const ty = (r.top - sr.top) / s - 28;
      const cx = (from.x + tx) / 2 + 60;
      const cy = (from.y + ty) / 2 - 30;
      const ang = Math.atan2(ty - cy, tx - cx);
      const a = (k: number) => `${tx - 14 * Math.cos(ang + k)},${ty - 14 * Math.sin(ang + k)}`;
      setD(`M${from.x},${from.y} Q${cx},${cy} ${tx},${ty} M${a(0.45)} L${tx},${ty} L${a(-0.45)}`);
    };
    measure();
    const t = window.setTimeout(measure, 120);
    window.addEventListener("resize", measure);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, watch]);
  return <svg id="chalk" className="ab" viewBox="0 0 1360 850" aria-hidden="true">{d && <path d={d} />}</svg>;
}
