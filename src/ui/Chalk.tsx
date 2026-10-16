"use client";

import { useLayoutEffect, useState } from "react";
import { stageRect } from "./Stage";

/** A hand-drawn chalk arrow from a fixed point on the felt to a tile or group in your rack. */
export function ChalkArrow({ target, watch }: { target: string; watch: unknown }) {
  const [d, setD] = useState<string>("");
  useLayoutEffect(() => {
    const measure = () => {
      const stage = document.getElementById("stage");
      const el = document.querySelector(target) as HTMLElement | null;
      if (!stage || !el) { setD(""); return; }
      const r = stageRect(el.getBoundingClientRect());
      const tx = r.x + r.w / 2;
      const ty = r.y - 30;
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

/** Chalk arrow from the commentary line to the tile that was just discarded. */
export function DiscardArrow({ watch }: { watch: unknown }) {
  const [d, setD] = useState("");
  useLayoutEffect(() => {
    const measure = () => {
      const stage = document.getElementById("stage");
      const from = document.getElementById("com");
      const el = document.querySelector("[data-pond] .last") as HTMLElement | null;
      if (!stage || !from || !el) { setD(""); return; }
      const f = stageRect(from.getBoundingClientRect());
      const r = stageRect(el.getBoundingClientRect());
      const x1 = f.x + 230;
      const y1 = f.y + f.h + 6;
      const cxT = r.x + r.w / 2;
      const cyT = r.y + r.h / 2;
      const dx0 = cxT - x1, dy0 = cyT - y1, len0 = Math.hypot(dx0, dy0) || 1;
      const x2 = cxT - (dx0 / len0) * (r.w * 0.9 + 6);
      const y2 = cyT - (dy0 / len0) * (r.h * 0.9 + 6);
      const k = -0.28, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
      const cx = mx - dy * k, cy = my + dx * k;
      const a = Math.atan2(y2 - cy, x2 - cx);
      const h = (o: number) => `${x2 - 15 * Math.cos(a + o)},${y2 - 15 * Math.sin(a + o)}`;
      setD(`M${x1},${y1} Q${cx},${cy} ${x2},${y2} M${h(0.5)} L${x2},${y2} L${h(-0.5)}`);
    };
    measure();
    const t = window.setTimeout(measure, 150);
    window.addEventListener("resize", measure);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [watch]);
  return <svg id="chalk2" className="ab" viewBox="0 0 1360 850" aria-hidden="true">{d && <path d={d} />}</svg>;
}
