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

/** First screen: before anything is dealt. */
export function Welcome({ onBegin, error }: { onBegin: () => void; error?: string }) {
  const deco: [string, number, number, number, number][] = [
    ["c5", 40, 30, 120, -8], ["R", 190, 10, 110, 6], ["d5", 330, 40, 120, -4],
    ["b8", 120, 210, 130, 5], ["E", 290, 230, 120, -6], ["F1", 440, 190, 110, 9],
    ["d1", 20, 410, 120, 4], ["G", 170, 440, 120, -5], ["c9", 320, 430, 130, 7], ["T2", 450, 400, 100, -7],
  ];
  return (
    <div className="screen" data-screen="welcome">
      <Rounds now={0} />
      <h1>Mahjong<br /><em>Coach</em></h1>
      <div className="stats">
        {[["108", "Numbered tiles"], ["16", "Winds"], ["12", "Dragons"], ["4", "Flowers"], ["4", "Seasons"]].map(([n, l]) => <div className="stat" key={l}><b>{n}</b><span>{l}</span></div>)}
      </div>
      <div className="cta">
        <button type="button" className="btn pri" onClick={onBegin}>Begin</button>
      </div>
      {error && <p role="alert" className="err" style={{ position: "static", textAlign: "left", marginTop: 14 }}>{error}</p>}
      <div className="deco" aria-hidden="true">
        {deco.map(([k, x, y, w, a], i) => <div key={i} style={{ position: "absolute", left: x, top: y, transform: `rotate(${a}deg)` }}><Keys keys={[k]} w={w} /></div>)}
      </div>
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
      <Rounds now={round === "south" ? 1 : round === "west" ? 2 : 3} />
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
      <p className="lede" style={{ color: "var(--chalk)", fontFamily: "var(--hand)", fontSize: 30, lineHeight: 1 }}>{winner}</p>
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
