import type { CSSProperties, ReactNode } from "react";
import type { Tile as GameTile } from "../game/tiles";

/**
 * Blueprint tile faces. Pure presentation: takes an engine Tile and draws it.
 * Size is controlled by one CSS variable (--w) so every face scales together.
 */

const CHAR_NUMERALS = "一二三四五六七八九";
const DOT_COLOURS = ["#1f7a47", "#c4321f", "#1d4f91"];
const DOT_POS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[50, 28], [50, 72]],
  3: [[24, 18], [50, 50], [76, 82]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 22], [74, 22], [50, 50], [26, 78], [74, 78]],
  6: [[30, 20], [70, 20], [30, 50], [70, 50], [30, 80], [70, 80]],
  7: [[22, 14], [50, 24], [78, 34], [30, 60], [70, 60], [30, 86], [70, 86]],
  8: [[30, 14], [70, 14], [30, 38], [70, 38], [30, 62], [70, 62], [30, 86], [70, 86]],
  9: [[22, 18], [50, 18], [78, 18], [22, 50], [50, 50], [78, 50], [22, 82], [50, 82], [78, 82]],
};

const FLOWER_ART: Record<string, ReactNode> = {
  F1: <svg viewBox="0 0 24 24"><g fill="#c94a62"><circle cx="12" cy="6.2" r="4.2" /><circle cx="17.5" cy="10.2" r="4.2" /><circle cx="15.4" cy="16.6" r="4.2" /><circle cx="8.6" cy="16.6" r="4.2" /><circle cx="6.5" cy="10.2" r="4.2" /></g><circle cx="12" cy="12" r="2.6" fill="#e0b445" /></svg>,
  F2: <svg viewBox="0 0 24 24"><path d="M12 22C12 16 9 12 4 9" stroke="#3f7f55" strokeWidth="1.6" fill="none" strokeLinecap="round" /><g fill="#8a5fb0"><ellipse cx="12" cy="7" rx="3" ry="5.5" /><ellipse cx="12" cy="7" rx="3" ry="5.5" transform="rotate(-62 12 12)" /><ellipse cx="12" cy="7" rx="3" ry="5.5" transform="rotate(62 12 12)" /></g><ellipse cx="12" cy="14.5" rx="2.4" ry="3" fill="#e08fb4" /></svg>,
  F3: <svg viewBox="0 0 24 24"><g fill="#d9962a">{Array.from({ length: 14 }, (_, i) => <ellipse key={i} cx="12" cy="5.4" rx="1.5" ry="4.4" transform={`rotate(${(i * 360) / 14} 12 12)`} />)}</g><circle cx="12" cy="12" r="2.6" fill="#9a4a0c" /></svg>,
  F4: <svg viewBox="0 0 24 24"><g stroke="#2f8a55" strokeWidth="2.2" strokeLinecap="round"><path d="M8 21V4" /><path d="M13 21V7" /><path d="M18 21V10" /></g><g stroke="#2f8a55" strokeWidth="1.6"><path d="M6.4 9h3.2M11.4 12h3.2M16.4 15h3.2" /></g></svg>,
  T1: <svg viewBox="0 0 24 24"><path d="M12 21V11" stroke="#3a8a58" strokeWidth="1.8" strokeLinecap="round" /><path d="M12 12C7 12 4.5 9.5 4 5c5 0 8 2.5 8 7z" fill="#68b078" /><path d="M12 10c0-4 2.5-6.5 8-6.5 0 4.5-3 7-8 6.5z" fill="#4a9a62" /><path d="M6 21h12" stroke="#8a5a3a" strokeWidth="1.6" strokeLinecap="round" /></svg>,
  T2: <svg viewBox="0 0 24 24"><g stroke="#e09a28" strokeWidth="1.8" strokeLinecap="round">{Array.from({ length: 8 }, (_, j) => <line key={j} x1="12" y1="2.5" x2="12" y2="5.2" transform={`rotate(${j * 45} 12 12)`} />)}</g><circle cx="12" cy="12" r="4.6" fill="#e09a28" /></svg>,
  T3: <svg viewBox="0 0 24 24"><path d="M12 3c4 3 7 6 6 11-2 1-4 0-6 2-2-2-4-1-6-2-1-5 2-8 6-11z" fill="#c4621f" /><path d="M12 8v13" stroke="#7a3a10" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  T4: <svg viewBox="0 0 24 24"><g stroke="#3d86c8" strokeWidth="1.8" strokeLinecap="round">{Array.from({ length: 3 }, (_, j) => <line key={j} x1="12" y1="2.5" x2="12" y2="21.5" transform={`rotate(${j * 60} 12 12)`} />)}</g><circle cx="12" cy="12" r="2" fill="#3d86c8" /></svg>,
};

const BIRD = <svg viewBox="0 0 24 24"><path d="M12 15c-3 4-4 7-3 8M12 15c0 4 0 6 1 8M12 15c3 4 4 7 3 8" stroke="#c4321f" strokeWidth="1.4" fill="none" strokeLinecap="round" /><ellipse cx="12" cy="11" rx="4.2" ry="5.2" fill="#1f7a47" /><circle cx="12" cy="5" r="2.6" fill="#1f7a47" /><path d="M14.4 4.6l3 .8-3 1z" fill="#c4321f" /><circle cx="12.6" cy="4.5" r=".6" fill="#f3ead2" /></svg>;

export type TileKey = string;

/** Short key used by the blueprint stylesheet: c1..c9, d1..d9, b1..b9, E S W N, R G H, F1..F4, T1..T4. */
export function tileKey(tile: GameTile): TileKey {
  if (tile.kind === "number") return `${tile.suit === "character" ? "c" : tile.suit === "dot" ? "d" : "b"}${tile.rank}`;
  if (tile.kind === "wind") return { east: "E", south: "S", west: "W", north: "N" }[tile.wind];
  if (tile.kind === "dragon") return { red: "R", green: "G", white: "H" }[tile.dragon];
  return `${tile.kind === "flower" ? "F" : "T"}${tile.rank}`;
}

function Face({ k }: { k: TileKey }) {
  const m = /^([cdb])(\d)$/.exec(k);
  if (m) {
    const suit = m[1];
    const n = Number(m[2]);
    const cls = suit === "c" ? "c" : suit === "d" ? "p" : "s";
    let pic: ReactNode;
    if (suit === "c") {
      pic = <span className="cz"><span>{CHAR_NUMERALS[n - 1]}</span><span>萬</span></span>;
    } else if (suit === "d") {
      pic = DOT_POS[n].map(([x, y], i) => {
        const big = n === 1;
        const size = big ? "calc(var(--w)*.5)" : n >= 7 ? "calc(var(--w)*.18)" : "calc(var(--w)*.23)";
        const colour = big ? "#c4321f" : n === 5 && i === 2 ? "#c4321f" : DOT_COLOURS[n >= 7 ? (i < 3 ? 0 : i < 5 ? 1 : 2) : i % 3];
        return <i key={i} className="dt" style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, ["--c" as string]: colour } as CSSProperties} />;
      });
    } else if (n === 1) {
      pic = <span className="bird">{BIRD}</span>;
    } else {
      const cols = n <= 3 ? n : n === 4 ? 2 : 3;
      const rows = Math.ceil(n / cols);
      const h = rows === 1 ? "calc(var(--w)*.4)" : rows === 2 ? "calc(var(--w)*.3)" : "calc(var(--w)*.24)";
      pic = Array.from({ length: n }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const inRow = r === rows - 1 && n % cols ? n % cols : cols;
        const red = (n >= 5 && i % 2 === 1 && n !== 8) || (n === 3 && i === 1) || (n === 8 && i % 3 === 1);
        return <i key={i} className="bs" style={{ left: `${((c + 0.5) * 100) / inRow}%`, top: `${((r + 0.5) * 100) / rows}%`, height: h, ["--c" as string]: red ? "#c4321f" : "#1f7a47" } as CSSProperties} />;
      });
    }
    return <><span className="nx">{n}</span><span className="pic">{pic}</span></>;
  }
  if (/^[FT]\d$/.test(k)) {
    const flower = k[0] === "F";
    return <>{FLOWER_ART[k] ?? FLOWER_ART[flower ? "F1" : "T1"]}<span className="fm">{flower ? "✿" : "✦"} {k[1]}</span></>;
  }
  if (k === "H") return null;
  return <>{{ E: "東", S: "南", W: "西", N: "北", R: "中", G: "發" }[k]}</>;
}

function classFor(k: TileKey): string {
  const m = /^([cdb])\d$/.exec(k);
  if (m) return `n ${m[1] === "c" ? "c" : m[1] === "d" ? "p" : "s"}`;
  if ("ESWN".includes(k) && k.length === 1) return "w";
  if (k === "R") return "r";
  if (k === "G") return "g";
  if (k === "H") return "h";
  return `fl ${k[0] === "F" ? "f" : "z"}`;
}

type Props = {
  tile: GameTile;
  /** Width in px (height is 1.34x). */
  w?: number;
  className?: string;
  title?: string;
};

export function BpTile({ tile, w = 58, className = "", title }: Props) {
  const k = tileKey(tile);
  return (
    <b className={`t ${classFor(k)} ${w <= 30 ? "sm" : ""} ${className}`} style={{ ["--w" as string]: `${w}px` } as CSSProperties} title={title}>
      <Face k={k} />
    </b>
  );
}

/** Face-down tile (opponent racks, walls). */
export function BpBack({ w = 26, className = "" }: { w?: number; className?: string }) {
  return <i className={`bk ${className}`} style={{ width: w, height: w * 1.35 }} />;
}

/** Build a display-only tile from its short key (used for lesson artwork). */
export function tileFromKey(k: TileKey, id = k): GameTile {
  const m = /^([cdb])(\d)$/.exec(k);
  if (m) return { id, kind: "number", suit: m[1] === "c" ? "character" : m[1] === "d" ? "dot" : "bamboo", rank: Number(m[2]) };
  if (k === "R" || k === "G" || k === "H") return { id, kind: "dragon", dragon: k === "R" ? "red" : k === "G" ? "green" : "white" };
  if (/^[FT]\d$/.test(k)) return { id, kind: k[0] === "F" ? "flower" : "season", rank: Number(k[1]) };
  return { id, kind: "wind", wind: ({ E: "east", S: "south", W: "west", N: "north" } as const)[k as "E" | "S" | "W" | "N"] };
}

export function Keys({ keys, w = 26 }: { keys: TileKey[]; w?: number }) {
  return <div className="ts">{keys.map((k, i) => <BpTile key={`${k}-${i}`} tile={tileFromKey(k, `${k}-${i}`)} w={w} />)}</div>;
}
