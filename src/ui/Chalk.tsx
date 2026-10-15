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
      const tx = (r.left - sr.left) / s + r.width / s / 2;
      const ty = (r.top - sr.top) / s - 30;
      const from = { x: tx - 38, y: ty - 44 };
      const cx = tx - 40;
      const cy = ty - 8;
      const ang = Math.atan2(ty - cy, tx - cx);
      const a = (k: number) => `${tx - 11 * Math.cos(ang + k)},${ty - 11 * Math.sin(ang + k)}`;
      setD(`M${from.x},${from.y} Q${cx},${cy} ${tx},${ty} M${a(0.45)} L${tx},${ty} L${a(-0.45)}`);
    };
    measure();
    const t = window.setTimeout(measure, 120);
    const t2 = window.setTimeout(measure, 1000);
    window.addEventListener("resize", measure);
    return () => { window.clearTimeout(t); window.clearTimeout(t2); window.removeEventListener("resize", measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, watch]);
  return <svg id="chalk" className="ab" viewBox="0 0 1360 850" aria-hidden="true">{d && <path d={d} />}</svg>;
}
