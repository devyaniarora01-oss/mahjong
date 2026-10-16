"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { stageRect } from "./Stage";
import type { EastRoundState, Meld } from "../game/state";
import { SEATS, createTileSet, type Seat, type Tile } from "../game/tiles";
import type { HandGroup } from "./groups";
import { BpBack, BpTile, tileKey } from "./Tile";

const allTiles = new Map(createTileSet().map((tile) => [tile.id, tile]));
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const kindName = (kind: string) => (kind === "pureChow" ? "Chow" : cap(kind));

type Pos = "west" | "north" | "south" | "east";
const SEAT_FRAME: Record<Exclude<Pos, "east">, { x: number; y: number; ang: number }> = {
  west: { x: 680, y: 58, ang: 180 },
  north: { x: 66, y: 378, ang: 90 },
  south: { x: 1294, y: 378, ang: -90 },
};
const POND_FRAME: Record<Pos, { x: number; y: number; ang: number }> = {
  west: { x: 680, y: 208, ang: 180 },
  north: { x: 506, y: 382, ang: 90 },
  south: { x: 854, y: 382, ang: -90 },
  east: { x: 680, y: 552, ang: 0 },
};
const frame = (f: { x: number; y: number; ang: number }): CSSProperties => ({ left: f.x, top: f.y, transform: `translate(-50%,-50%) rotate(${f.ang}deg)` });

const tileOrder = (tile: Tile) =>
  tile.kind === "number" ? ({ dot: 0, bamboo: 1, character: 2 }[tile.suit] * 10 + tile.rank)
  : tile.kind === "wind" ? 40 + ["east", "south", "west", "north"].indexOf(tile.wind)
  : tile.kind === "dragon" ? 50 + ["red", "green", "white"].indexOf(tile.dragon)
  : tile.kind === "flower" ? 60 + tile.rank : 70 + tile.rank;

export const seatAt = (game: EastRoundState, pos: Pos): Seat => SEATS.find((s) => game.players[s].physicalSeat === pos) ?? "east";

/** Discards still sitting in each pond (claimed tiles have moved into a meld), grouped by the discarder's table position. */
function pondsOf(game: EastRoundState) {
  const claimed = new Set<string>();
  for (const s of SEATS) {
    game.players[s].melds.forEach((m) => m.tiles.forEach((t) => claimed.add(t.id)));
    game.players[s].bonusTiles.forEach((t) => claimed.add(t.id));
  }
  const ponds: Record<Pos, Tile[]> = { west: [], north: [], south: [], east: [] };
  for (const event of game.history) {
    if (event.type !== "discarded" || claimed.has(event.tileId)) continue;
    const tile = allTiles.get(event.tileId);
    if (tile) ponds[game.players[event.seat].physicalSeat].push(tile);
  }
  return ponds;
}

function Meldrow({ meld, w, label }: { meld: Meld; w: number; label?: string }) {
  return (
    <div className="sg">
      <span className="cap">{label ?? kindName(meld.kind)}</span>
      {meld.tiles.map((t) => <BpTile key={t.id} tile={t} w={w} />)}
    </div>
  );
}

type TableProps = {
  game: EastRoundState;
  /** Same as game, except opening bonus tiles can be hidden while they animate in. */
  tableGame: EastRoundState;
  humanSeat: Seat;
  selectedId?: string;
  selectedIds?: readonly string[];
  drawnId?: string;
  onTile?: (id: string) => void;
  chips?: Record<string, string>;
  chipSel?: string;
  jokerRank?: number;
  /** When set (Explain my hand), the rack is drawn as labelled groups instead of one row. */
  groups?: HandGroup[];
};

export function TableBoard({ game, tableGame, humanSeat, selectedId, selectedIds, drawnId, onTile, chips, chipSel, groups }: TableProps) {
  const ponds = pondsOf(game);

  // Explain my hand: when the rack regroups (or goes back to one row), slide each tile from where it was to where it is now.
  const groupsKey = groups ? groups.map((g) => g.label).join("|") : "";
  const rects = useRef<Map<string, DOMRect>>(new Map());
  const lastKey = useRef(groupsKey);
  useLayoutEffect(() => {
    const now = new Map<string, DOMRect>();
    document.querySelectorAll<HTMLElement>("#rail [data-tile]").forEach((el) => now.set(el.dataset.tile!, el.getBoundingClientRect()));
    if (lastKey.current !== groupsKey && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll<HTMLElement>("#rail [data-tile]").forEach((el, i) => {
        const before = rects.current.get(el.dataset.tile!);
        const after = now.get(el.dataset.tile!)!;
        if (!before) return;
        const b = stageRect(before), a = stageRect(after);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "translate(0,0)" }], { duration: 650, delay: Math.min(i, 14) * 18, easing: "cubic-bezier(.3,.7,.2,1)", fill: "backwards" });
      });
    }
    lastKey.current = groupsKey;
    rects.current = now;
  });
  const lastId = game.lastDiscard?.tile.id;
  const turnSeat = game.status === "active" ? game.turn : undefined;

  // copies of each tile you can see (your hand, all exposed sets, all ponds), for the four-dot counters
  const seenCount = new Map<string, number>();
  const bump = (t: Tile) => { const k = tileKey(t); seenCount.set(k, (seenCount.get(k) ?? 0) + 1); };
  game.players[humanSeat].hand.forEach(bump);
  SEATS.forEach((s) => game.players[s].melds.forEach((m) => m.tiles.forEach(bump)));
  (Object.keys(ponds) as Pos[]).forEach((p) => ponds[p].forEach(bump));
  const pips = (t: Tile) => { const n = Math.min(4, seenCount.get(tileKey(t)) ?? 0); return "●".repeat(n) + "○".repeat(4 - n); };

  const label = (pos: Exclude<Pos, "east">, style: CSSProperties, extra = "") => {
    const s = seatAt(game, pos);
    return (
      <div className={`ab bl sn m ${turnSeat === s ? "turn" : ""} ${extra}`} style={style} data-tour="scores">
        <b>{cap(s)}</b> · <span className="sc">{game.players[s].score.toLocaleString()}</span>
      </div>
    );
  };

  const opponent = (pos: Exclude<Pos, "east">) => {
    const p = game.players[seatAt(game, pos)];
    // Size the hand as if the freshly drawn tile were not there, so tiles never shrink and regrow each turn.
    const units = p.hand.length - (p.hand.length % 3 === 2 ? 1 : 0) + p.melds.reduce((n, m) => n + m.tiles.length, 0) + p.bonusTiles.length;
    const ow = units > 17 ? 21 : units > 15 ? 23 : 26;
    return (
      <div className={`ab bl ${pos === "north" ? "pinL" : pos === "south" ? "pinR" : ""}`} style={frame(SEAT_FRAME[pos])}>
        <div className="seat" data-seat={pos}>
          {p.hand.map((t) => <span key={t.id} style={{ marginRight: 1, display: "block" }}><BpBack w={ow} /></span>)}
          {p.melds.map((m, i) => <Meldrow key={i} meld={m} w={ow} />)}
          {p.bonusTiles.length > 0 && <><div className="sd" /><div className="sg" style={{ marginLeft: 14 }}>{p.bonusTiles.map((t) => <BpTile key={t.id} tile={t} w={ow} />)}</div></>}
        </div>
      </div>
    );
  };

  const pond = (pos: Pos) => {
    const tiles = ponds[pos];
    const w = tiles.length > 18 ? 30 : 36;
    return (
      <div className={`ab ${pos === "east" ? "" : "bl"}`} style={frame(POND_FRAME[pos])} data-pond={pos}>
        <div className="pond">{tiles.map((t) => <BpTile key={t.id} tile={t} w={w} className={t.id === lastId ? "last" : ""} />)}</div>
      </div>
    );
  };

  // ---- your rack ----
  const me = tableGame.players[humanSeat];
  const hand = [...me.hand].sort((a, b) => tileOrder(a) - tileOrder(b));
  const shown = drawnId ? [...hand.filter((t) => t.id !== drawnId), ...hand.filter((t) => t.id === drawnId)] : hand;
  const meldCount = me.melds.reduce((n, m) => n + m.tiles.length, 0);
  const ghostCount = groups ? groups.filter((g) => g.kind === "need").length : 0;
  const settledHand = shown.length - (shown.length % 3 === 2 ? 1 : 0); // ignore the drawn tile so sizes stay steady
  const total = settledHand + meldCount + me.bonusTiles.length + ghostCount;
  const gaps = (me.melds.length + (me.bonusTiles.length ? 1 : 0) + (groups ? groups.length : 0)) * 24 + (!groups ? 14 : 0);
  const tw = Math.max(34, Math.min(58, Math.floor((1230 - gaps) / Math.max(1, total) - 2)));
  const cell = (t: Tile, interactive: boolean, extra = "", showPips = interactive) => {
    const lifted = t.id === selectedId || selectedIds?.includes(t.id);
    const chip = chips?.[t.id];
    return (
      <div key={t.id} className={`hc ${interactive && onTile ? "click" : ""} ${lifted ? "lift" : ""} ${extra}`} onClick={interactive && onTile ? () => onTile(t.id) : undefined} data-tile={t.id} data-tour={extra.includes("drawn") ? "drawn" : undefined}>
        {chip && <div className={`chipb ${chipSel === t.id ? "sel" : ""}`}>{chip}</div>}
        <BpTile tile={t} w={tw} />
        {showPips && <div className="pips">{pips(t)}</div>}
      </div>
    );
  };

  return (
    <>
      <div className="ab bl" id="box" data-tour="box" />
      {label("west", { left: 0, right: 0, top: 106, textAlign: "center" })}
      {label("north", { left: 120, top: 375, transform: "translate(-50%,-50%) rotate(-90deg)" }, "pinL")}
      {label("south", { left: 1240, top: 375, transform: "translate(-50%,-50%) rotate(90deg)" }, "pinR")}
      {opponent("west")}{opponent("north")}{opponent("south")}
      {pond("west")}{pond("north")}{pond("south")}{pond("east")}

      <div className="ab bl wallc" data-tour="wall">
        <div className="cap">Draw wall · {game.drawPile.length}</div>
        <div className="row">{Array.from({ length: Math.min(9, Math.ceil(game.drawPile.length / 7)) }, (_, i) => <BpBack key={i} w={22} />)}</div>
        <div className="cap" data-tour="flowers">Flower wall · {game.flowerWall.length}</div>
        <div className="fw">{game.flowerWall.slice(0, 14).map((t) => <BpBack key={t.id} w={22} />)}</div>
      </div>

      <div className="ab" id="rail" data-tour="rail">
        <div className="rh m">
          <span><b>{cap(humanSeat)}</b> · you · <span>{me.score.toLocaleString()}</span></span>
          <span>● = copies you&apos;ve seen, of 4</span>
        </div>
        <div className="rack">
          {groups
            ? groups.map((g, i) => (
                <div className="rg" key={i}>
                  <span className={`cap ${g.kind === "need" ? "need" : ""}`}>{g.label}</span>
                  {g.tiles.map((t) => cell(t, false, "", true))}
                  {g.kind === "need" && g.needs && (() => {
                    const left = g.needs.reduce((n, k) => n + Math.max(0, 4 - (seenCount.get(k) ?? 0)), 0);
                    return <div className="hc ghost" data-ghost><div className="ghb" style={{ width: tw, height: tw * 1.34 }}>{g.needs.map((k) => k.slice(1)).join("/")}<small>{left} left</small></div></div>;
                  })()}
                </div>
              ))
            : shown.map((t) => cell(t, true, t.id === drawnId ? "drawn" : ""))}
          {me.melds.map((m, i) => (
            <div className="rg" key={i}>
              <span className="cap">{kindName(m.kind)}</span>
              {m.tiles.map((t) => cell(t, false, "", true))}
            </div>
          ))}
          {me.bonusTiles.length > 0 && <><div className="rdiv" /><div className="rg" style={{ marginLeft: 22 }}>{me.bonusTiles.map((t) => cell(t, false))}</div></>}
        </div>
      </div>
    </>
  );
}
