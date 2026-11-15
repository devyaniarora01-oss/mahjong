"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { stageRect } from "./Stage";
import type { NorthFormat } from "../game/north";
import type { SouthCard } from "../game/south-cards";
import { Keys } from "./Tile";

export const tutorial = [
  ["Welcome to Mahjong", "Mahjong is a game of building a hand. Four players take turns drawing and discarding tiles, and the first to complete a hand wins.\nThe game has four rounds (East, South, West, North), each with its own rules. This is the East Round, and you are East at the bottom of the table."],
  ["The tiles", "There are 144 tiles.\n• **Numbered tiles** come in three suits, Bamboo, Characters and Dots, numbered 1 to 9.\n• **Winds** (East, South, West, North) and **Dragons** (Red, Green, White) have no numbers. They are just tiles you collect in matching groups.\n• **Flowers and Seasons** are bonus tiles, explained next."],
  ["Flowers and Seasons", "Flowers and Seasons are not part of your hand. When you are dealt or draw one, it moves to the bonus area beside your hand and you take a replacement tile from the **Flower Wall**, a separate row of tiles in the middle of the table.\nNothing is lost: you simply get another tile, so your hand stays the same size."],
  ["Sets: Pung, Kong and Chow", "Hands are built from sets.\n• A **Pung** is three identical tiles.\n• A **Kong** is four identical tiles, and counts as one set.\n• A **Chow** is three tiles in a row from the same suit, like 4-5-6 of Dots.\nA **Pair** is two identical tiles. Winds and Dragons can make Pungs, Kongs and Pairs, but never Chows."],
  ["How you win", "A winning hand is 14 tiles: **four sets plus one pair**. Sets you claimed from a discard are **exposed**: the tile was seen by everyone, so the set is shown face-up. Sets you make from your own draws stay **concealed** in your hand. Both count towards the win.\nDoes it matter? Yes: win by drawing the last tile with no claims at all, and Mahjong is worth **1,000** instead of **500**. Concealed sets also keep the others guessing.\nWhen your hand is complete, you declare **Mahjong**. Here is an example winning hand."],
  ["Your turn", "On your turn you draw one tile from the wall, then discard one tile face-up into the middle. Between turns you hold 13 tiles.\nEast starts with 14 tiles, so East discards first without drawing."],
  ["Taking another player's discard", "After any discard, you can claim it instead of waiting for your own draw. But only in these cases:\n• **Pung or Kong:** from any player, when the tile matches two or three that you hold.\n• **Chow:** only from the player on your left, who plays just before you.\n• **Mahjong:** from any player, when the tile completes your hand.\nWhen you claim, you show the new set face-up and then discard a tile. If two players want the same tile, Mahjong goes first."],
  ["Scoring", "Everyone starts with 35,000 points. When someone wins, the other players pay them. East always pays double and collects double.\nAfter each hand, the review lists every payment so you can see exactly how the points moved."],
] as const;

export const southTutorial = [
  ["Charleston exchange", "Before the first draw, every player passes three concealed tiles three times: Right, then Across, then Left. Use the Coach’s Best Move to identify three tiles that help your own South Card least."],
  ["Buying a discard", "South has one extra exception. When the player immediately to your left discards, you may buy that visible discard for **100 points** even when it does not complete a set yet. It stays concealed in your hand, the 100 goes into the round pot, and you must discard straight away."],
  ["South Round scoring", "A player who completes their own South Card declares Mahjong. If a non-East player wins, every player records the card score and East records double. If East wins, every other player records double. The 100-point buy pot goes to the winner. Any printed card bonus is shown on the card."],
] as const;

export const westTutorial = [
  ["Charleston and discards", "First, pass three tiles Right, then Across, then Left. After that, play is draw and discard as usual.\nYou cannot buy a discard in West. You may take a visible discard only when it immediately makes a Pung or Kong; you cannot take it just to keep for later."],
  ["Choose a scoring direction", "Use your starting tiles to choose what you want to build. West rewards three broad directions:\n• Stay with one numbered suit (only Bamboo, only Characters or only Dots)\n• Keep only Winds and Dragons, also called Honour tiles\n• Build a Kong-heavy hand, with as many Kongs as you can\nThe Coach will point out which direction your current tiles support."],
  ["Clean Mix", "You can combine Honour tiles with numbered tiles. Keep all of your numbered tiles in one suit—for example, Bamboo plus Winds and Dragons. Do not mix Bamboo, Characters, and Dots together. This is called a Clean Mix and scores 1,500 points."],
  ["Flower and Season bonuses", "Flowers and Seasons are bonus tiles. They are not worth points one by one. You earn a bonus by collecting a matching set: your own direction’s Flower and Season together are worth 500; all four Flowers or all four Seasons are worth 1,000; and one bonus tile for each direction is worth 500. Any score involving East is doubled."],
] as const;

export const northTutorial = [
  ["North chose East-as-North", "The rulebook lets North choose East, South or West rules. This table uses East-as-North: build the familiar East patterns of four three-tile groups and one Pair."],
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
    { compass: true, card: RIGHT },
    { card: RIGHT },
    { targets: ["flowerwall"], card: RIGHT },
    { card: RIGHT },
    { card: RIGHT },
    { targets: ["act", "drawn"], card: RIGHT },
    { card: RIGHT },
    { targets: ["scores"], card: RIGHT },
  ],
  south: [{ targets: ["act"], card: RIGHT }, { targets: ["act"], card: RIGHT }, { targets: ["scores"], card: RIGHT }],
  west: [{ targets: ["act"], card: RIGHT }, { targets: ["rail"], card: RIGHT }, { card: RIGHT }, { card: RIGHT }],
  north: [{ card: RIGHT }, { card: RIGHT }, { targets: ["scores"], card: RIGHT }],
};

/* ------------------------------------------------------------------ */
/* Small visuals inside the tour card. */

const keys = (...k: string[]) => k;

function Cell({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return <div className="cell"><b className="ch">{title}</b>{children}{note && <div>{note}</div>}</div>;
}

export function EastVisual({ step }: { step: number }) {
  const caption = { font: "400 11px/1.45 var(--mono)", color: "rgba(243,234,210,.75)", marginTop: 3 } as const;
  if (step === 1) {
    return (
      <div className="lesson g4 vis">
        <Cell title="Numbered suits"><Keys keys={keys("b1", "c1", "d1")} /></Cell>
        <Cell title="Winds"><Keys keys={keys("E", "S", "W", "N")} w={24} /></Cell>
        <Cell title="Dragons"><Keys keys={keys("R", "G", "H")} w={30} /></Cell>
        <Cell title="Bonus tiles"><Keys keys={keys("F1", "T1")} /></Cell>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="lesson vis">
        <div className="flow"><span>Flower</span><span>→ moves to the side</span><span>→ replacement from the Flower Wall</span></div>
        <div style={{ marginTop: 10 }}><Keys keys={keys("F1", "T1")} w={30} /></div>
      </div>
    );
  }
  if (step === 3) {
    const items: [string, string[], string][] = [
      ["Pung", ["b6", "b6", "b6"], "Three identical tiles."],
      ["Chow", ["d4", "d5", "d6"], "Three in a row, one suit."],
      ["Kong", ["b5", "b5", "b5", "b5"], "Four identical; counts as one set."],
      ["Pair", ["c2", "c2"], "Two identical tiles."],
    ];
    return (
      <div className="vis">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "10px 18px" }}>
          {items.map(([t, k, d]) => <div key={t}><Keys keys={k} w={28} /><b style={{ font: "700 14px var(--display)" }}>{t}</b><div style={caption}>{d}</div></div>)}
        </div>
      </div>
    );
  }
  if (step === 4) {
    return (
      <div className="vis">
        <div style={{ display: "flex", gap: 10, flexWrap: "nowrap" }}>
          {[["b6", "b6", "b6"], ["d4", "d5", "d6"], ["c1", "c2", "c3"], ["R", "R", "R"], ["c2", "c2"]].map((g, i) => <Keys key={i} keys={g} w={20} className="grp" />)}
        </div>
        <div style={{ ...caption, marginTop: 8 }}>Pung · Chow · Chow · Pung · Pair</div>
      </div>
    );
  }
  if (step === 6) {
    const rows: [string, string][] = [["Pung / Kong", "any player"], ["Chow", "only the player on your left"], ["Mahjong", "any player"]];
    return (
      <div className="vis" style={{ display: "grid", gap: 6 }}>
        {rows.map(([what, who]) => <div key={what} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(243,234,210,.16)", paddingBottom: 5 }}><b style={{ font: "700 13px var(--display)" }}>{what}</b><span style={caption}>{who}</span></div>)}
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
  if (step === 0) return flow(["1 · Right", "2 · Across", "3 · Left"]);
  if (step === 1) return flow(["Left player's discard", "100 to the pot", "Your hand"]);
  if (step === 2) return flow(["Card score", "East doubles", "Pot to winner"]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Tour overlay: dims the board, outlines the targets, shows the card. */

type Rect = { x: number; y: number; w: number; h: number };

function rectsFor(names: string[]): Rect[] {
  const stage = document.getElementById("stage");
  const board = document.getElementById("board");
  if (!stage || !board) return [];
  const out: Rect[] = [];
  for (const name of names) {
    document.querySelectorAll(`[data-tour~="${name}"]`).forEach((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width === 0) return;
      const a = stageRect(r);
      out.push({ x: a.x - 8, y: a.y - 8, w: a.w + 16, h: a.h + 16 });
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
  onPractice?: () => void;
}) {
  const { title, body, index, total, meta, visual, onBack, onNext, onSkip, onPractice } = props;
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
      {meta.compass && <CompassNotes />}
      <div id="tc" className={card.x > 680 ? "pinR" : ""} role="dialog" aria-label={title} style={{ left: card.x, top: card.y, width: card.w ?? 340 }}>
        <div className="eyr"><div className="dots">{Array.from({ length: total }, (_, i) => <i key={i} className={i === index ? "on" : ""} />)}</div></div>
        <h2>{title}</h2>
        <Body text={body} />
        {visual}
        {onPractice && (index === 0 || last) && <button type="button" className="lnk plink" onClick={onPractice}>New to Mahjong? Try a practice hand →</button>}
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


export function CompassNotes() {
  return <>
    <div className="tnote" style={{ left: 560, top: 118 }}>West faces you</div>
    <div className="tnote pinL" style={{ left: 142, top: 372 }}>North is on your left</div>
    <div className="tnote pinR" style={{ left: 940, top: 560 }}>South is on your right</div>
    <div className="tnote" style={{ left: 520, top: 616 }}>You are East, at the bottom</div>
  </>;
}

/** Tour body text: blank-line breaks, "• " pointer lines, and **bold** runs. */
export function Body({ text }: { text: string }) {
  const bold = (t: string) => t.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let items: string[] = [];
  const flush = () => { if (items.length) { out.push(<ul key={`u${out.length}`} className="ptr">{items.map((t, i) => <li key={i}>{bold(t)}</li>)}</ul>); items = []; } };
  lines.forEach((line) => { if (line.startsWith("• ")) items.push(line.slice(2)); else { flush(); out.push(<p key={`p${out.length}`}>{bold(line)}</p>); } });
  flush();
  return <>{out}</>;
}
