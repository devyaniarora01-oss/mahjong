"use client";

import { Body, CompassNotes } from "./Lessons";
import { Keys } from "./Tile";
import type { GuideCard } from "../game/practice";

/** The coach note for the scripted practice hand. It sits where the Learn Mahjong cards sit. */
export function PracticeGuide(props: {
  card: GuideCard;
  step?: { index: number; total: number };
  nudge?: string;
  onNext: () => void;
  onExit: () => void;
  onPlay: () => void;
  onRestart: () => void;
}) {
  const { card, step, nudge, onNext, onExit, onPlay, onRestart } = props;
  // While the other players simply take their turns there is nothing to explain: show no note at all.
  if (card.id === "watch" && !nudge) return null;
  // Intro and finish cards sit at the side; every key-moment card sits just above the action button it talks about.
  const near = !step && !card.finish;
  return (
    <>
      {card.compass && <CompassNotes />}
      <div id="tc" className={`pinR practice bare ${near ? "near" : "side"}`} role="dialog" aria-label={card.title} style={near ? undefined : { left: 922, top: 150, width: 300 }}>
        <div className="eyr">
          {!near && <span className="pk">Practice hand</span>}
          {step && <div className="dots">{Array.from({ length: step.total }, (_, i) => <i key={i} className={i === step.index ? "on" : ""} />)}</div>}
        </div>
        <h2>{card.title}</h2>
        <Body text={card.body} />
        {card.tiles && (!near || card.next) && <div className="vis" style={{ marginTop: 10 }}><Keys keys={card.tiles} w={30} /></div>}
        {nudge && <p className="nudge" role="status">{nudge}</p>}
        <div className="nav">
          {card.finish ? <>
            <button type="button" className="sk" onClick={onRestart}>Practice again</button>
            <span className="sp" />
            <button type="button" className="tb go" onClick={onPlay}>Play a real game</button>
          </> : <>
            {!near && <button type="button" className="sk" onClick={onExit}>Leave practice</button>}
            <span className="sp" />
            {card.next && <button type="button" className="tb go" onClick={onNext}>{card.next}</button>}
          </>}
        </div>
      </div>
    </>
  );
}
