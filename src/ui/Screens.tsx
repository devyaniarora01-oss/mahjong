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

const DOORS = [
  { glyph: "東", n: "01 — East", d: "Learn the table, the walls and the sets.", after: "" },
  { glyph: "南", n: "02 — South", d: "A secret card of your own.", after: "East" },
  { glyph: "西", n: "03 — West", d: "Pungs and Kongs only.", after: "South" },
  { glyph: "北", n: "04 — North", d: "The dealer picks the rules.", after: "West" },
];

/** First screen: before anything is dealt. Four doors, one per round; only East opens. */
export function Welcome({ onBegin, error }: { onBegin: () => void; error?: string }) {
  return (
    <div className="screen welcome" data-screen="welcome">
      <div className="doors" aria-hidden="false">
        {DOORS.map((d, i) => (
          <div key={d.n} className={`door ${i === 0 ? "open" : "locked"}`}>
            <div className="dn m">{d.n}</div>
            <p className="dd">{d.d}</p>
            {i === 0 ? <button type="button" className="btn pri" onClick={onBegin}>Begin</button> : <div className="lk m">⌀ Opens after {d.after}</div>}
            <div className="dg" aria-hidden="true">{d.glyph}</div>
          </div>
        ))}
      </div>
      <h1 className="pinL">Mahjong</h1>
      <p className="lede pinL">Mahjong is played through directional rounds; each round begins with a different direction and can have its own rules. Your goal is to make a valid 14-tile Mahjong hand before anyone else.</p>
      {error && <p role="alert" className="err pinL" style={{ position: "static", textAlign: "left", marginTop: 14, zIndex: 3 }}>{error}</p>}
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

/** Between-rounds screen: the four doors again — finished rounds dim, this one open, the rest locked. */
export function RoundSetup(props: {
  round: "east" | "south" | "west" | "north";
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
  const now = round === "east" ? 0 : round === "south" ? 1 : round === "west" ? 2 : 3;
  return (
    <div className="screen trans" data-screen={`${round}-setup`}>
      <div className="doors">
        {DOORS.map((d, i) => {
          const st = i < now ? "done" : i === now ? "active" : "locked";
          return (
            <div key={d.n} className={`door ${st}`}>
              {st === "done" && <><div className="dn m">{d.n}</div><div className="tk m">✓ Complete</div></>}
              {st === "locked" && <><div className="dn m">{d.n}</div><div className="lk m">⌀ Opens after {d.after}</div></>}
              {st === "active" && (
                <div className="obj">
                  <h1>{cap(round)}<br /><em>Round</em></h1>
                  <p className="intro">{intro}</p>
                  <div className="kick">{kicker}</div>
                  <h2>{heading}</h2>
                  {southCard && <><div className="goal">{southCard.goal}</div><div className="pts m">{southCard.score.toLocaleString()} points{southCard.bonus ? ` · ${southCard.bonus}` : ""}</div><SouthCardKey card={southCard} /></>}
                  {round === "east" && <div className="tl"><Keys keys={["b6", "b6", "b6"]} w={34} /><Keys keys={["d4", "d5", "d6"]} w={34} /><Keys keys={["c2", "c2"]} w={34} /></div>}
                  {round === "west" && <div className="tl"><Keys keys={["b7", "b7", "b7"]} w={34} /><Keys keys={["G", "G", "G", "G"]} w={34} /><Keys keys={["R", "R"]} w={34} /></div>}
                  {round === "north" && <div className="chips"><span>East-as-North</span><span>South-as-North</span><span>West-as-North</span></div>}
                  <p>{body}</p>
                  <button type="button" className="btn pri" onClick={onStart}>{cta}</button>
                  <div className="tsc">
                    {SEAT_ORDER.map((s) => <span key={s} className={s === you ? "you" : ""}>{cap(s)}{s === you ? " · you" : ""} <b>{scores[s].toLocaleString()}</b></span>)}
                  </div>

                  {error && <p role="alert" className="err" style={{ position: "static", textAlign: "left", marginTop: 14 }}>{error}</p>}
                </div>
              )}
              <div className="dg" aria-hidden="true">{d.glyph}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FinalResults({ standings, winner, onNew }: { standings: { name: string; score: number }[]; winner: string; onNew: () => void }) {
  return (
    <div className="screen" data-screen="final">
      <div className="eb m"><i /><span>Four rounds complete</span></div>
      <h1 style={{ fontSize: 96 }}>Final <em>results.</em></h1>
      <p className="lede" style={{ color: "var(--chalk)" }}>{winner}</p>
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
