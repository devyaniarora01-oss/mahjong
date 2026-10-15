"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import type { NorthFormat } from "../game/north";
import type { SouthCard } from "../game/south-cards";
import { Keys } from "./Tile";

export const tutorial = [
  ["This is the East Round", "This game begins with the East Round. East takes the first turn, begins with one extra tile, and therefore discards first."],
  ["The 144 tiles", "The full set has 108 numbered tiles, 16 Winds, 12 Dragons, and 8 bonus tiles. Bamboo, Characters, Dots, Winds, and Dragons build your hand. Flowers and Seasons go to the bonus area and are replaced from the Flower Wall."],
  ["Building the table and Flower Wall", "The 144 tiles are shuffled. East rolls and doubles the result to create the Flower Wall. Everyone receives 13 tiles; East receives one extra and starts with 14. Flowers, Seasons, and Kongs take replacement tiles from the Flower Wall. Everything else becomes the Draw Wall."],
  ["Your objective", "A winning East Round hand has four three-tile groups and one two-tile pair. You will slowly improve incomplete groups while keeping a useful pair."],
  ["The building blocks", "These are the patterns you can create. Look at the tiles—not just the names—to see what makes each pattern valid."],
  ["How scoring works", "Everyone starts at 35,000. When someone declares Mahjong, the game records the East Round score. Flowers and Seasons can add separate bonus awards when their documented combinations are collected. The final result screen explains the score after a hand ends."],
  ["How your turn works", "East begins with 14 tiles and discards one. After that, players draw one tile, consider their hand, and discard one. In East, a discard may be claimed only to complete a Pung, or—by the next player only—a Pure Chow, unless it completes Mahjong. You cannot take a discard merely because you may want it later."],
] as const;

export const southTutorial = [
  ["Welcome to South Round", "Same table as East, but every player now has a private South Card with their own winning objective."],
  ["Your South Card is your objective", "Your secret card tells you the exact tiles and groups you need to complete. Keep comparing your hand to this card, not to another player’s card. Your secret card stays available at the top of the table whenever you need it."],
  ["Charleston exchange", "Before the first draw, every player passes three concealed tiles three times: Right, then Across, then Left. Use the Coach’s Best Move to identify three tiles that help your own South Card least."],
  ["Buying a discard", "South has one extra exception. When the player immediately to your left discards, you may buy that visible discard for **100 points** even when it does not complete a set yet. It stays concealed in your hand, the 100 goes into the round pot, and you must discard straight away."],
  ["South Round scoring", "A player who completes their own South Card declares Mahjong. If a non-East player wins, every player records the card score and East records double. If East wins, every other player records double. The 100-point buy pot goes to the winner. Any printed card bonus is shown on the card."],
] as const;

export const westTutorial = [
  ["Welcome to West Round", "West Round keeps the same table and Charleston exchange, but the goal changes. East moves counterclockwise again, so you are now West."],
  ["Your West hand", "A West Mahjong hand uses only Pungs, Kongs, and one Pair. A Pung is three identical tiles. A Kong is four identical tiles. You must have at least one Kong—Pure Chows do not count in this round."],
  ["Charleston and discards", "First, pass three tiles Right, then Across, then Left. After that, play is draw and discard as usual.\nYou cannot buy a discard in West. You may take a visible discard only when it immediately makes a Pung or Kong; you cannot take it just to keep for later."],
  ["Choose a scoring direction", "Use your starting tiles to choose what you want to build. West rewards three broad directions:\n• Stay with one numbered suit\n• Keep only Winds and Dragons\n• Build a Kong-heavy hand\nThe Coach will point out which direction your current tiles support."],
  ["One numbered suit", "If you keep only Bamboo, only Characters, or only Dots, you are building a one-suit West hand. It is one of the stronger scoring directions in this round."],
  ["Winds and Dragons only", "A hand made only from Winds and Dragons is another high-scoring West direction. Winds and Dragons are called Honour tiles."],
  ["Clean Mix", "You can combine Honour tiles with numbered tiles. Keep all of your numbered tiles in one suit—for example, Bamboo plus Winds and Dragons. Do not mix Bamboo, Characters, and Dots together. This is called a Clean Mix and scores 1,500 points."],
  ["Kong-heavy hands", "Kongs can create another high-scoring West hand. The more of your required groups that are Kongs, the stronger this direction can become."],
  ["Flower and Season bonuses", "Flowers and Seasons are bonus tiles. They are not worth points one by one. You earn a bonus by collecting a matching set: your own direction’s Flower and Season together are worth 500; all four Flowers or all four Seasons are worth 1,000; and one bonus tile for each direction is worth 500. Any score involving East is doubled."],
] as const;

export const northTutorial = [
  ["North Chose East-As-North", "North selected the East version for this hand. The same four players and their running scores continue into North. East moves counterclockwise once more, so you are now South."],
  ["East-as-North", "The rulebook lets East choose whether North uses East, South, or West rules. This playable table uses East-as-North: use the familiar East hand patterns of four three-tile groups and one Pair."],
  ["North scoring", "East-as-North keeps the East Mahjong award. Flowers and Seasons still move to the bonus area and receive replacements, but they do not add separate North Round score awards."],
] as const;

export const northTutorialFor = (format: NorthFormat, jokerRank?: number) => format === "south"
  ? [["North Chose South-As-North", "North selected the South version for this hand. Complete the required Charleston, then build the private South Card shown at the table."], ["Concealed Flower/Season jokers and claims", "Flowers and Seasons stay privately in your 14-tile hand in this format. They are jokers: they can stand in for a needed card, but cannot make a Pair. North does not allow discard buying. Discards still need to complete a legal Pung, a next-player Pure Chow, or Mahjong before they can be claimed."], ["North scoring", "This uses South scoring for your completed South Card, without separate Flower/Season awards."]] as const
  : format === "west"
    ? [["North Chose West-As-North", "North selected the West version for this hand. Complete Charleston, then build only West Pungs, Kongs, and a Pair under the selected joker number."], [`${jokerRank}s are jokers`, `Every ${jokerRank} Bamboo, Character, and Dot is a joker in this hand. A joker can help complete a permitted West group. North does not allow discard buying, and a discard can be claimed only when it immediately makes a Pung or Kong—not a Chow.`], ["North scoring", "This uses West scoring for a completed West hand, without separate Flower/Season awards."]] as const
    : northTutorial;

/* ------------------------------------------------------------------ */
/* Tour meta: which table parts each step points at, and where its card sits. */

export type RoundKey = "east" | "south" | "west" | "north";
type StepMeta = { targets?: string[]; card?: { x: number; y: number; w?: number }; compass?: boolean };
const RIGHT = { x: 960, y: 150 };

export const TOUR_META: Record<RoundKey, StepMeta[]> = {
  east: [
    { compass: true, card: { x: 960, y: 130 } },
    { card: RIGHT },
    { targets: ["wall"], card: RIGHT },
    { targets: ["rail"], card: { x: 960, y: 190 } },
    { card: { x: 360, y: 92, w: 640 } },
    { targets: ["scores"], card: RIGHT },
    { targets: ["act", "drawn"], card: { x: 975, y: 250 } },
  ],
  south: [{ card: RIGHT }, { targets: ["southcard"], card: RIGHT }, { targets: ["act"], card: { x: 975, y: 250 } }, { targets: ["act"], card: { x: 975, y: 250 } }, { targets: ["scores"], card: RIGHT }],
  west: [{ card: RIGHT }, { targets: ["rail"], card: { x: 960, y: 190 } }, { targets: ["act"], card: { x: 975, y: 250 } }, { card: RIGHT }, { card: RIGHT }, { card: RIGHT }, { card: RIGHT }, { card: RIGHT }, { card: RIGHT }],
  north: [{ card: RIGHT }, { card: RIGHT }, { targets: ["scores"], card: RIGHT }],
};

/* ------------------------------------------------------------------ */
/* Small visuals inside the tour card. */

const keys = (...k: string[]) => k;

function Cell({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return <div className="cell"><b className="h">{title}</b>{children}{note && <div>{note}</div>}</div>;
}

export function EastVisual({ step }: { step: number }) {
  if (step === 1) {
    return (
      <div className="lesson g4 vis">
        <Cell title="Numbered suits"><Keys keys={keys("b1", "c1", "d1")} /></Cell>
        <Cell title="Winds"><Keys keys={keys("E", "S", "W", "N")} w={24} /></Cell>
        <Cell title="Dragons"><Keys keys={keys("R", "G", "H")} /></Cell>
        <Cell title="Bonus tiles"><Keys keys={keys("F1", "T1")} /></Cell>
      </div>
    );
  }
  if (step === 4) {
    const items: [string, string[], string][] = [
      ["Pung", ["b6", "b6", "b6"], "Three identical tiles."],
      ["Pure Chow", ["d4", "d5", "d6"], "Three in a row, one suit."],
      ["Crochet", ["b7", "c7", "d7"], "Same number, all three suits. Keep it concealed."],
      ["Pure Pair", ["c2", "c2"], "Two identical tiles."],
      ["Knit", ["b3", "d3"], "Same number, two suits. Needs a Crochet."],
      ["Kong", ["b5", "b5", "b5", "b5"], "Four identical; counts as three."],
    ];
    return (
      <div className="vis">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px 18px" }}>
          {items.map(([t, k, d]) => <div key={t}><Keys keys={k} w={28} /><b style={{ font: "700 14px var(--display)" }}>{t}</b><div style={{ font: "400 11px/1.45 var(--mono)", color: "rgba(243,234,210,.75)", marginTop: 3 }}>{d}</div></div>)}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(243,234,210,.16)", font: "500 10.5px var(--mono)", letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(243,234,210,.65)" }}>
          Example winning hand · 4 groups + 1 pair
          <div style={{ marginTop: 8 }}><Keys keys={keys("b6", "b6", "b6", "d4", "d5", "d6", "b7", "c7", "d7", "c1", "c2", "c3", "c2", "c2")} w={28} /></div>
        </div>
      </div>
    );
  }
  return null;
}

export function SouthCardKey({ card }: { card: SouthCard }) {
  const goal = card.goal.toLowerCase();
  const groups: [string, string[]][] = [];
  if (goal.includes("pung")) groups.push(["Pung · three identical", ["b6", "b6", "b6"]]);
  if (goal.includes("chow") || goal.includes("run")) groups.push(["Chow / Run · consecutive", ["d4", "d5", "d6"]]);
  if (goal.includes("pair")) groups.push(["Pair · two identical", ["c2", "c2"]]);
  if (goal.includes("kong")) groups.push(["Kong · four identical", ["b5", "b5", "b5", "b5"]]);
  if (goal.includes("crochet")) groups.push(["Crochet · one number, three suits", ["b7", "c7", "d7"]]);
  if (goal.includes("knit")) groups.push(["Knit · one number, two suits", ["b3", "d3"]]);
  if (goal.includes("wind")) groups.push(["Winds on this card", ["E", "S", "W", "N"]]);
  if (goal.includes("dragon")) groups.push(["Dragons on this card", ["R", "G", "H"]]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 12 }}>
      {groups.slice(0, 4).map(([label, k]) => (
        <div key={label}><div style={{ font: "500 10px var(--mono)", letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(243,234,210,.7)", marginBottom: 6 }}>{label}</div><Keys keys={k} w={28} /></div>
      ))}
    </div>
  );
}

export function SouthVisual({ step, card }: { step: number; card?: SouthCard }) {
  const flow = (parts: string[]) => <div className="lesson vis"><div className="flow">{parts.map((p, i) => <span key={i}>{i > 0 ? "→ " : ""}{p}</span>)}</div></div>;
  if (step === 2) return flow(["1 · Right", "2 · Across", "3 · Left"]);
  if (step === 3) return flow(["Left player's discard", "100 to the pot", "Your hand"]);
  if (step === 4) return flow(["Card score", "East doubles", "Pot to winner"]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Tour overlay: dims the board, outlines the targets, shows the card. */

type Rect = { x: number; y: number; w: number; h: number };

function rectsFor(names: string[]): Rect[] {
  const stage = document.getElementById("stage");
  const board = document.getElementById("board");
  if (!stage || !board) return [];
  const s = Number(stage.dataset.scale || 1);
  const sr = board.getBoundingClientRect();
  const out: Rect[] = [];
  for (const name of names) {
    document.querySelectorAll(`[data-tour~="${name}"]`).forEach((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width === 0) return;
      out.push({ x: (r.left - sr.left) / s - 8, y: (r.top - sr.top) / s - 8, w: r.width / s + 16, h: r.height / s + 16 });
    });
  }
  return out;
}

export function TourOverlay(props: {
  title: string;
  body: string;
  index: number;
  total: number;
  meta: StepMeta;
  visual?: ReactNode;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { title, body, index, total, meta, visual, onBack, onNext, onSkip } = props;
  const [rects, setRects] = useState<Rect[]>([]);
  const targets = (meta.targets ?? []).filter((t) => t !== "scores");
  useLayoutEffect(() => { setRects(rectsFor(targets)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [index, meta]);
  useEffect(() => {
    const on = () => setRects(rectsFor(targets));
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, meta]);
  const card = meta.card ?? { x: 960, y: 150 };
  const last = index === total - 1;
  return (
    <>
      <svg id="dim" className="ab" viewBox="-2000 0 5360 850" aria-hidden="true">
        <defs>
          <mask id="dimmask">
            <rect x="-2000" width="5360" height="850" fill="white" />
            {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="10" fill="black" />)}
          </mask>
        </defs>
        <rect x="-2000" width="5360" height="850" fill="#050e0a" opacity={targets.length ? 0.74 : 0.62} mask="url(#dimmask)" />
        {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="10" fill="none" stroke="#ffd84a" strokeWidth="2" strokeDasharray="7 7" />)}
      </svg>
      {meta.compass && <>
        <div className="tnote" style={{ left: 560, top: 118 }}>West faces you</div>
        <div className="tnote pinL" style={{ left: 142, top: 372 }}>North is on your left</div>
        <div className="tnote pinR" style={{ left: 940, top: 560 }}>South is on your right</div>
        <div className="tnote" style={{ left: 520, top: 616 }}>You are East, at the bottom</div>
      </>}
      <div id="tc" className={card.x > 680 ? "pinR" : ""} role="dialog" aria-label={title} style={{ left: card.x, top: card.y, width: card.w ?? 340 }}>
        <div className="eyr"><div className="dots">{Array.from({ length: total }, (_, i) => <i key={i} className={i === index ? "on" : ""} />)}</div></div>
        <h2>{title}</h2>
        <Body text={body} />
        {visual}
        <div className="nav">
          {index > 0 && <button type="button" className="tb" onClick={onBack}>Back</button>}
          <span className="sp" />
          {!last && <button type="button" className="sk" onClick={onSkip}>Skip to play</button>}
          <button type="button" className="tb go" onClick={onNext}>{last ? "Start playing" : "Next"}</button>
        </div>
      </div>
    </>
  );
}


/** Tour body text: blank-line breaks, "• " pointer lines, and **bold** runs. */
function Body({ text }: { text: string }) {
  const bold = (t: string) => t.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let items: string[] = [];
  const flush = () => { if (items.length) { out.push(<ul key={`u${out.length}`} className="ptr">{items.map((t, i) => <li key={i}>{bold(t)}</li>)}</ul>); items = []; } };
  lines.forEach((line) => { if (line.startsWith("• ")) items.push(line.slice(2)); else { flush(); out.push(<p key={`p${out.length}`}>{bold(line)}</p>); } });
  flush();
  return <>{out}</>;
}
