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
            <div className="dn m">{i === 0 ? "01 — East Round" : d.n}</div>
            {i === 0 ? (
              <div className="eo">
                <h2>Four sets and a pair</h2>
                <p>Make a 14-tile hand: four sets of three tiles, plus one pair.</p>
                <button type="button" className="btn pri" onClick={onBegin}>Begin</button>
              </div>
            ) : <><p className="dd">{d.d}</p><div className="lk m">⌀ Opens after {d.after}</div></>}
            <div className="dg" aria-hidden="true">{d.glyph}</div>
          </div>
        ))}
      </div>
      <h1 className="pinL">Mahjong</h1>
      <p className="lede pinL">Four rounds, each with its own rules. Make a valid 14-tile hand before anyone else.</p>
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
  round: "south" | "west" | "north";
  northFormat?: "east" | "south" | "west";
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
  const now = round === "south" ? 1 : round === "west" ? 2 : 3;
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
                  {round === "north" && !props.northFormat && <div className="chips"><span>East-as-North</span><span>South-as-North</span><span>West-as-North</span></div>}
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

export type FinalSeat = { pos: "east" | "south" | "west" | "north"; wind: "east" | "south" | "west" | "north"; you: boolean; score: number; win: boolean };
const GLYPH = { east: "東", south: "南", west: "西", north: "北" } as const;
/** Chairs never move: you sit at the bottom, so the players who were East and West at the start face each other. */
const CHAIR = { east: "cb", west: "ct", north: "cl", south: "cr" } as const;

export function FinalResults({ seats, headline, onNew }: { seats: FinalSeat[]; headline: string; onNew: () => void }) {
  const [lead, ...rest] = headline.split(" ");
  return (
    <div className="screen final" data-screen="final">
      <div className="ftable">
        <div className="fctr"><h1>{lead}<br /><em>{rest.join(" ")}</em></h1></div>
        {seats.map((s) => (
          <div key={s.pos} className={`fseat ${CHAIR[s.pos]} ${s.win ? "w" : ""}`} data-seat={s.pos}>
            <div className="ftl">{GLYPH[s.wind]}</div>
            <div><div className="fnm">{s.you ? "You" : s.wind[0].toUpperCase() + s.wind.slice(1)}</div><div className="fsc">{s.score.toLocaleString()}</div></div>
          </div>
        ))}
      </div>
      <button type="button" className="btn pri fnew" onClick={onNew}>New game</button>
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
