"use client";

import { Body, CompassNotes } from "./Lessons";
import { Keys } from "./Tile";
import type { GuideCard } from "../game/practice";

/** The coach box for the scripted practice hand. It sits where the Learn Mahjong cards sit. */
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
  return (
    <>
      {card.compass && <CompassNotes />}
      <div id="tc" className="pinR practice" role="dialog" aria-label={card.title} style={{ left: 922, top: 150, width: 340 }}>
        <div className="eyr">
          <span className="pk">Practice hand</span>
          {step && <div className="dots">{Array.from({ length: step.total }, (_, i) => <i key={i} className={i === step.index ? "on" : ""} />)}</div>}
        </div>
        <h2>{card.title}</h2>
        <Body text={card.body} />
        {card.tiles && <div className="vis" style={{ marginTop: 10 }}><Keys keys={card.tiles} w={30} /></div>}
        {nudge && <p className="nudge" role="status">{nudge}</p>}
        <div className="nav">
          {card.finish ? <>
            <button type="button" className="sk" onClick={onRestart}>Practice again</button>
            <span className="sp" />
            <button type="button" className="tb go" onClick={onPlay}>Play a real game</button>
          </> : <>
            <button type="button" className="sk" onClick={onExit}>Leave practice</button>
            <span className="sp" />
            {card.next && <button type="button" className="tb go" onClick={onNext}>{card.next}</button>}
          </>}
        </div>
      </div>
    </>
  );
}
