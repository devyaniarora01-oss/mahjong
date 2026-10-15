"use client";

import type { ReactNode } from "react";
import { SouthCardKey } from "./Lessons";
import type { SouthCard } from "../game/south-cards";
import { Keys } from "./Tile";

const SEAT_ORDER = ["east", "south", "west", "north"] as const;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function Rounds({ now }: { now: number }) {
  return (
    <div className="rounds">
      {["East", "South", "West", "North"].map((r, i) => <span key={r} style={{ display: "contents" }}>{i > 0 && <i />}<b className={i === now ? "now" : ""}>{r}</b></span>)}
    </div>
  );
}

const MAP_ROWS: { label: string; color: (i: number) => string }[] = [
  { label: "Characters · 36", color: () => "#c8321e" },
  { label: "Bamboo · 36", color: () => "#1b7a4e" },
  { label: "Dots · 36", color: () => "#1d4f9a" },
  { label: "Winds 16 · Dragons 12 · Flowers 4 · Seasons 4", color: (i) => (i < 16 ? "#16202e" : i < 28 ? ["#c8321e", "#1b7a4e", "#1d4f9a"][(i - 16) % 3] : i < 32 ? "#b3365a" : "#2b6cb0") },
];
// fixed positions (row-column) of the 14 lifted tiles, so server and client render the same thing
const LIT = new Set(["3-3", "2-11", "1-19", "0-25", "1-6", "3-31", "3-15", "2-22", "0-1", "3-28", "1-9", "2-34", "1-17", "0-5"]);

/** All 144 tiles in one picture, grouped by kind. Fourteen are lifted: the hand you will hold. */
function Map144() {
  return (
    <div className="m144" aria-hidden="true">
      <div className="mk m">▲ your 14 tiles</div>
      {MAP_ROWS.map((row, r) => (
        <div className="mrow" key={r}>
          <div className="mtiles">
            {Array.from({ length: 36 }, (_, i) => (
              <i key={i} className={LIT.has(`${r}-${i}`) ? "lit" : ""}><b style={{ background: row.color(i) }} /></i>
            ))}
          </div>
          <span className="ml m">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

/** First screen: before anything is dealt. */
export function Welcome({ onBegin, error }: { onBegin: () => void; error?: string }) {
  return (
    <div className="screen welcome" data-screen="welcome">
      <h1>Mahjong</h1>
      <p className="lede">Mahjong is played through directional rounds; each round begins with a different direction and can have its own rules. Your goal is to make a valid 14-tile Mahjong hand before anyone else.</p>
      <div className="cta">
        <button type="button" className="btn pri" onClick={onBegin}>Begin</button>
        <Rounds now={0} />
      </div>
      {error && <p role="alert" className="err" style={{ position: "static", textAlign: "left", marginTop: 14 }}>{error}</p>}
      <Map144 />
    </div>
  );
}

export function ScoreRow({ scores, you }: { scores: Record<string, number>; you?: string }) {
  return (
    <div className="scores">
      {SEAT_ORDER.map((s) => <div key={s} className={s === you ? "you" : ""}><b>{cap(s)}{s === you ? " · you" : ""}</b><span>{scores[s].toLocaleString()}</span></div>)}
    </div>
  );
}

/** Between-rounds screen: what changes, where the scores stand, one button to go on. */
export function RoundSetup(props: {
  round: "south" | "west" | "north";
  scores: Record<string, number>;
  you?: string;
  intro: string;
  kicker: string;
  heading: string;
  body: string;
  southCard?: SouthCard;
  cta: string;
  onStart: () => void;
  error?: string;
}) {
  const { round, scores, you, intro, kicker, heading, body, southCard, cta, onStart, error } = props;
  return (
    <div className="screen" data-screen={`${round}-setup`}>
      <h1 style={{ fontSize: 96 }}>{cap(round)} <em>Round</em></h1>
      <div className="panel">
        <p style={{ marginTop: 0 }}>{intro}</p>
        <ScoreRow scores={scores} you={you} />
        <div style={{ marginTop: 22 }}>
          <div className="kick">{kicker}</div>
          <h2>{heading}</h2>
          {southCard && <><div className="goal">{southCard.goal}</div><div className="m" style={{ marginTop: 8, color: "rgba(243,234,210,.7)" }}>{southCard.score.toLocaleString()} points{southCard.bonus ? ` · ${southCard.bonus}` : ""}</div><SouthCardKey card={southCard} /></>}
          <p>{body}</p>
        </div>
      </div>
      <div className="cta" style={{ marginTop: 26 }}>
        <button type="button" className="btn pri" onClick={onStart}>{cta}</button>
        <Rounds now={round === "south" ? 1 : round === "west" ? 2 : 3} />
      </div>
      {error && <p role="alert" className="err" style={{ position: "static", textAlign: "left", marginTop: 14 }}>{error}</p>}
    </div>
  );
}

export function FinalResults({ standings, winner, onNew }: { standings: { name: string; score: number }[]; winner: string; onNew: () => void }) {
  return (
    <div className="screen" data-screen="final">
      <div className="eb m"><i /><span>Four rounds complete</span></div>
      <h1 style={{ fontSize: 96 }}>Final <em>results.</em></h1>
      <p className="lede" style={{ color: "var(--chalk)", fontFamily: "var(--hand)", fontSize: 24, lineHeight: 1.2 }}>{winner}</p>
      <div className="panel" style={{ maxWidth: 560, padding: "10px 20px 20px" }}>
        <div className="standings">{standings.map((s, i) => <div key={s.name}><b>#{i + 1}</b><span>{s.name}</span><small>{s.score.toLocaleString()}</small></div>)}</div>
      </div>
      <div className="cta" style={{ marginTop: 26 }}><button type="button" className="btn pri" onClick={onNew}>New game</button></div>
    </div>
  );
}

export function Modal({ children, onClose, label }: { children: ReactNode; onClose?: () => void; label: string }) {
  return (
    <div className="veil" role="dialog" aria-label={label}>
      <div className="panel modal">
        {onClose && <button type="button" className="x" onClick={onClose} aria-label="Close">×</button>}
        {children}
      </div>
    </div>
  );
}
