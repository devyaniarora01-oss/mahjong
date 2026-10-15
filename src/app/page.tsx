"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { applyBotAction, chooseBotCharlestonTileIds, chooseBotClaimAction, chooseBotTurnAction } from "../game/bots";
import { analyseHand, bestMoveOptions, explainHand, handSummary, type CoachingOption } from "../game/coaching";
import { canClaimExposedKong, canClaimPung, canClaimPureChow, canDeclareConcealedKong, canDeclareMahjong, canReplaceNorthExposedJoker, claimExposedKong, claimPung, claimPureChow, declareConcealedKong, declareMahjong, discard, drawFromPile, passClaims, replaceNorthExposedJoker, type EastRoundState } from "../game/state";
import { startBrowserEastRound, startBrowserNorthRound, startBrowserSouthRound, startBrowserWestRound } from "../game/session";
import { applyCharleston, buySouthDiscard, canBuySouthDiscard, dealSouthCards, type SouthCards } from "../game/south";
import { applyWestCharleston } from "../game/west";
import { chooseNorthFormat, chooseNorthJokerRank, type NorthFormat } from "../game/north";
import { settleDrawRound, settleEastRound, settleNorthEastRound, settleNorthSouthRound, settleNorthWestRound, settleSouthRound, settleWestRound, type EastRoundSettlement } from "../game/scoring";
import { SOUTH_CHARLESTON_PAIRS, type SouthCard } from "../game/south-cards";
import { createTileSet, tileLabel as rawTileLabel, type Seat, type Tile } from "../game/tiles";
import { Stage } from "../ui/Stage";
import { TableBoard } from "../ui/Table";
import { BpTile } from "../ui/Tile";

import { groupHand, suitWord } from "../ui/groups";
import { EastVisual, SouthCardKey, SouthVisual, TOUR_META, TourOverlay, northTutorialFor, southTutorial, tutorial, westTutorial, type RoundKey } from "../ui/Lessons";
import { FinalResults, Modal, RoundSetup, Welcome } from "../ui/Screens";

const HUMAN: Seat = "east";
const seats: Seat[] = ["north", "west", "south", "east"];
const allTilesById = new Map(createTileSet().map((tile) => [tile.id, tile]));
const humanSeatOf = (game: EastRoundState): Seat => game.humanSeat ?? HUMAN;
const name = (seat: Seat, humanSeat: Seat = HUMAN) => seat === humanSeat ? `You — ${seat[0].toUpperCase()}${seat.slice(1)}` : `${seat[0].toUpperCase()}${seat.slice(1)}`;
/** Current Action uses the same readable title case as the Coach and tile labels. */
const tileLabel = (tile: Tile): string => rawTileLabel(tile).replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
const kindName = (kind: string) => kind === "pureChow" ? "Pure Chow" : kind[0].toUpperCase() + kind.slice(1);
function activityAfterFlowerWall(before: EastRoundState, after: EastRoundState, fallback: string) {
  if (after.flowerWall.length === before.flowerWall.length) return fallback;
  const newEvents = after.history.slice(before.history.length);
  const replacement = [...newEvents].reverse().find((event) => event.type === "drew" && event.source === "flowerWall");
  if (!replacement || replacement.type !== "drew") return fallback;
  const bonus = newEvents.find((event) => event.type === "replacedBonus" && event.seat === replacement.seat);
  const kong = newEvents.find((event) => (event.type === "declaredKong" || event.type === "claimedKong") && event.seat === replacement.seat);
  const actor = name(replacement.seat, humanSeatOf(after));
  const isHuman = replacement.seat === humanSeatOf(after);
  if (bonus?.type === "replacedBonus") {
    const bonusTile = allTilesById.get(bonus.tileId);
    const bonusName = bonusTile ? tileLabel(bonusTile) : "a Flower or Season";
    return isHuman
      ? `You drew ${bonusName}. It is a bonus tile, so it moved beside your hand. The Flower Wall gave you a replacement (${after.flowerWall.length} left).`
      : `${actor} drew ${bonusName}. It moved to the bonus area and was replaced from the Flower Wall (${after.flowerWall.length} left).`;
  }
  if (kong) return `${actor} declared a Kong, so they took the required replacement from the Flower Wall. It now has ${after.flowerWall.length} left.`;
  return `${actor} took a replacement from the Flower Wall. It now has ${after.flowerWall.length} left.`;
}

type FlowerReplacementReveal = { seat: Seat; bonusTileId: string; replacementTileId?: string };

/** Extract the public Flower/Season replacement that just happened in a reducer transition. */
function flowerReplacementAfter(before: EastRoundState, after: EastRoundState): FlowerReplacementReveal | undefined {
  const newEvents = after.history.slice(before.history.length);
  const bonusIndex = newEvents.map((event) => event.type).lastIndexOf("replacedBonus");
  if (bonusIndex < 0) return undefined;
  const bonus = newEvents[bonusIndex];
  if (bonus.type !== "replacedBonus") return undefined;
  const replacement = newEvents.slice(bonusIndex + 1).find((event) => event.type === "drew" && event.seat === bonus.seat && event.source === "flowerWall");
  return { seat: bonus.seat, bonusTileId: bonus.tileId, replacementTileId: replacement?.type === "drew" ? replacement.tileId : undefined };
}
type DecisionNote = { discarded: string; recommended?: string; reason?: string };

function southCardProgress(game: EastRoundState, seat: Seat) {
  const card = game.south!.cards[seat];
  const goal = card.goal.toLowerCase();
  const analysis = analyseHand(game, seat);
  const hand = game.players[seat].hand;
  const pieces: string[] = [];
  if (goal.includes("pair") && analysis.pairs.length) pieces.push(`${analysis.pairs.length} visible Pair${analysis.pairs.length === 1 ? "" : "s"}`);
  if (goal.includes("pung") && analysis.pungs.length) pieces.push(`${analysis.pungs.length} visible Pung${analysis.pungs.length === 1 ? "" : "s"}`);
  if (goal.includes("chow") && analysis.chows.length) pieces.push(`${analysis.chows.length} complete Pure Chow${analysis.chows.length === 1 ? "" : "s"}`);
  const crochetCount = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((rank) => new Set(hand.filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number" && tile.rank === rank).map((tile) => tile.suit)).size === 3).length;
  if (goal.includes("crochet") && crochetCount) pieces.push(`${crochetCount} complete Crochet${crochetCount === 1 ? "" : "s"}`);
  const knitCount = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((rank) => new Set(hand.filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number" && tile.rank === rank).map((tile) => tile.suit)).size === 2).length;
  if (goal.includes("knit") && knitCount) pieces.push(`${knitCount} Knit start${knitCount === 1 ? "" : "s"}`);
  return { card, pieces };
}

function reviewFeedback(game: EastRoundState, decisions: readonly DecisionNote[]) {
  const humanSeat = humanSeatOf(game);
  const summary = handSummary(game, humanSeat);
  const humanClaims = game.history.filter((event) => (event.type === "claimedPung" || event.type === "claimedPureChow") && event.seat === humanSeat);
  const humanBonuses = game.history.filter((event) => event.type === "replacedBonus" && event.seat === humanSeat).length;
  const humanKongs = game.history.filter((event) => event.type === "declaredKong" && event.seat === humanSeat).length;
  const humanDiscards = game.history.filter((event) => event.type === "discarded" && event.seat === humanSeat).length;
  const happened = game.status === "mahjong"
    ? game.winner?.seat === humanSeat
      ? `You completed Mahjong and ended the ${game.round === "west" ? "West" : game.round === "south" ? "South" : game.round === "north" ? "North" : "East"} Round.`
      : `${name(game.winner!.seat, humanSeat)} completed Mahjong before you did.`
    : "Neither player completed Mahjong before the Draw Pile or Flower Wall ran out, so this hand ended as a draw.";
  const completed = summary.built.length ? ` Your final hand showed: ${summary.built.map((item) => item.split(" — ")[0]).join("; ")}.` : "";
  const followed = decisions.filter((decision) => decision.recommended === decision.discarded);
  const alternatives = decisions.filter((decision) => decision.recommended && decision.recommended !== decision.discarded);
  const isSouthCardRound = (game.round === "south" || (game.round === "north" && game.north?.format === "south")) && !!game.south;
  const southProgress = isSouthCardRound ? southCardProgress(game, humanSeat) : undefined;
  const didWell = isSouthCardRound
    ? game.winner?.seat === humanSeat
      ? `You completed your ${southProgress!.card.title} South Card: ${southProgress!.card.goal}${followed.length ? ` You also followed the Coach’s top card-focused recommendation on ${followed.length} discard${followed.length === 1 ? "" : "s"}.` : ""}`
      : southProgress!.pieces.length
        ? `You finished with ${southProgress!.pieces.join(" and ")} that relate to your ${southProgress!.card.title} card. ${followed.length ? `You also protected the Coach’s top card-focused choice on ${followed.length} discard${followed.length === 1 ? "" : "s"}.` : ""}`
        : `You kept each decision tied to your ${southProgress!.card.title} objective rather than treating this as an East Round hand.${followed.length ? ` You followed the Coach’s top card-focused choice on ${followed.length} discard${followed.length === 1 ? "" : "s"}.` : ""}`
    : game.winner?.seat === humanSeat
    ? `You completed a ${game.round === "south" ? "South" : game.round === "west" ? "West" : game.round === "north" ? "North" : "East"} Round Mahjong hand.${completed}${followed.length ? ` You also chose the Coach’s top visible-hand recommendation on ${followed.length} discard${followed.length === 1 ? "" : "s"}.` : ""}`
    : humanClaims.length
      ? `You declared ${humanClaims.length} exposed ${humanClaims.length === 1 ? "set" : "sets"} after using a discard from another player.`
      : humanKongs
        ? `You declared ${humanKongs} Kong${humanKongs === 1 ? "" : "s"} and took the required Flower Wall replacement.`
        : humanBonuses
          ? `You correctly moved ${humanBonuses} Flower/Season ${humanBonuses === 1 ? "tile" : "tiles"} to the bonus area and kept your hand at the right size.`
          : `You completed ${humanDiscards} turn${humanDiscards === 1 ? "" : "s"} while keeping the table moving.`;
  const next = isSouthCardRound && southProgress
    ? alternatives[0]
      ? `For ${southProgress.card.title}, revisit the decision to discard ${alternatives[0].discarded}: the Coach ranked ${alternatives[0].recommended} higher because ${alternatives[0].reason ?? "it matched your card more directly"}`
      : southProgress.pieces.length
        ? `On the next ${southProgress.card.title} hand, preserve the ${southProgress.pieces.join(" and ")} you already started, then discard tiles that do not appear to serve that card.`
        : `On the next ${southProgress.card.title} hand, compare every tile directly with: ${southProgress.card.goal}`
    : alternatives[0]
    ? `At one decision, you discarded ${alternatives[0].discarded} while the Coach ranked ${alternatives[0].recommended} higher. ${alternatives[0].reason ?? "Compare those two tiles before making the same choice next hand."}`
    : summary.weak[0]
    ? `On the next hand, reconsider ${summary.weak[0].split(" — ")[0]}. ${summary.weak[0].split(" — ").slice(1).join(" — ")}`
    : summary.developing[0]
      ? `On the next hand, protect ${summary.developing[0].split(" — ")[0]}; it already has a clear path toward a supported group.`
        : decisions.length
          ? `You had ${decisions.length} recorded discard decision${decisions.length === 1 ? "" : "s"}. On the next hand, compare the Coach’s first option with your own choice before discarding.`
          : "No human discard decisions were recorded before this hand ended.";
  return { happened, didWell, next };
}

function scoreReviewLines(settlement: EastRoundSettlement, humanSeat: Seat) {
  const grouped = new Map<string, typeof settlement.transfers>();
  for (const transfer of settlement.transfers) {
    grouped.set(transfer.reason, [...(grouped.get(transfer.reason) ?? []), transfer]);
  }
  return [...grouped.entries()].map(([reason, transfers]) => {
    const pot = transfers.find((transfer) => transfer.from === transfer.to);
    if (pot) return `${reason}: ${pot.amount.toLocaleString()} points were collected through discard buys. ${name(pot.to, humanSeat)} won the hand and receives the full pot.`;
    const recipient = transfers[0]?.to;
    const paid = transfers.map((transfer) => `${name(transfer.from, humanSeat)} −${transfer.amount.toLocaleString()}`).join(" · ");
    const received = transfers.reduce((total, transfer) => total + transfer.amount, 0);
    return `${reason}: ${paid} → ${recipient ? `${name(recipient, humanSeat)} +${received.toLocaleString()}` : "no score change"}.`;
  });
}
function latestTableCommentary(game: EastRoundState): string | undefined {
  const event = game.history.at(-1);
  if (!event) return undefined;
  const tile = "tileId" in event && event.tileId ? allTilesById.get(event.tileId) : undefined;
  const humanSeat = humanSeatOf(game);
  if (event.type === "drew") return event.seat === humanSeat ? `You drew ${tile ? tileLabel(tile) : "a tile"} from the ${event.source === "flowerWall" ? "Flower Wall" : "Draw Wall"}.` : `${name(event.seat, humanSeat)} drew a concealed tile from the ${event.source === "flowerWall" ? "Flower Wall" : "Draw Wall"}.`;
  if (event.type === "discarded") return `${name(event.seat, humanSeat)} discarded ${tile ? tileLabel(tile) : "a tile"}.`;
  if (event.type === "claimedPung") return `${name(event.seat, humanSeat)} claimed ${tile ? tileLabel(tile) : "the discard"} from ${name(event.from, humanSeat)} and made a Pung.`;
  if (event.type === "claimedKong") return `${name(event.seat, humanSeat)} claimed ${tile ? tileLabel(tile) : "the discard"} from ${name(event.from, humanSeat)} and made an exposed Kong.`;
  if (event.type === "claimedPureChow") return `${name(event.seat, humanSeat)} claimed ${tile ? tileLabel(tile) : "the discard"} from ${name(event.from, humanSeat)} and made a Pure Chow.`;
  if (event.type === "declaredKong") return `${name(event.seat, humanSeat)} declared a concealed Kong using ${tile ? tileLabel(tile) : "four matching tiles"}.`;
  if (event.type === "replacedJoker") return `${name(event.seat, humanSeat)} replaced an exposed North joker with a subsequently drawn matching tile and returned the joker to their hand.`;
  if (event.type === "declaredMahjong") return `${name(event.seat, humanSeat)} declared Mahjong${event.source === "discard" ? " using a discarded tile" : " after drawing"}.`;
  if (event.type === "replacedBonus") return `${name(event.seat, humanSeat)} placed ${tile ? tileLabel(tile) : "a Flower or Season"} in the bonus area.`;
  return undefined;
}

/** First sentence only, trimmed to a length that fits the chalk panel. */
function brief(text: string, max = 100): string {
  const first = text.split(/(?<=[.!?])\s+/)[0].replace(/\s+—.*$/, "");
  return first.length <= max ? first : `${first.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/** Whole sentences only, never cut mid-sentence. */
function sents(text: string, n: number): string {
  return text.split(/(?<=[.!?])\s+/).slice(0, n).join(" ");
}

/** Presentation-only correction: Winds/Dragons can't be Chows, but they can be Pungs. */
function honourFix(text: string, label: string, copies: number): string {
  if (!/cannot make a Pure Chow because Winds and Dragons/.test(text)) return text;
  const need = Math.max(0, 3 - copies);
  const fixed = `${label} can only become a Pung, and you hold ${copies === 1 ? "just 1" : copies}. It needs ${need} more ${need === 1 ? "copy" : "copies"}, so it is far from useful.`;
  return text.replace(/\S[^.]*cannot make a Pure Chow because Winds and Dragons[^.]*\.(\s+You have no matching[^.]*\.)?/, fixed);
}

function CoachText({ text }: { text: string }) {
  const reference = /(?:\d(?:–\d){0,2}\s(?:Bamboo|Character|Dot)|(?:East|South|West|North)\sWind|(?:Red|Green|White)\sDragon)/g;
  const tileFor = (value: string): Tile[] => {
    const numbered = value.match(/^(\d(?:–\d){0,2})\s(Bamboo|Character|Dot)$/);
    if (numbered) return numbered[1].split("–").map((rank) => allTilesById.get(`${numbered[2].toLowerCase()}-${rank}-1`)).filter((tile): tile is Tile => !!tile);
    const wind = value.match(/^(East|South|West|North) Wind$/);
    if (wind) return [allTilesById.get(`wind-${wind[1].toLowerCase()}-1`)!];
    const dragon = value.match(/^(Red|Green|White) Dragon$/);
    if (dragon) return [allTilesById.get(`dragon-${dragon[1].toLowerCase()}-1`)!];
    return [];
  };
  const fragments = text.split(reference);
  const matches = text.match(reference) ?? [];
  return <>{fragments.flatMap((fragment, index) => index < matches.length ? [fragment, <span className="mini" key={`${matches[index]}-${index}`}>{tileFor(matches[index]).map((tile) => <BpTile key={tile.id} tile={tile} w={20} />)}</span>] : [fragment])}</>;
}

export default function HomePage() {
  const [game, setGame] = useState<EastRoundState>();
  const [round, setRound] = useState<"east" | "south-setup" | "west-setup" | "north-setup" | "match-summary">("east");
  const [southCard, setSouthCard] = useState<SouthCard>();
  const [preparedSouthCards, setPreparedSouthCards] = useState<SouthCards>();
  const [southCardOpen, setSouthCardOpen] = useState(false);
  const [charlestonSelection, setCharlestonSelection] = useState<string[]>([]);
  const [decisionNotes, setDecisionNotes] = useState<DecisionNote[]>([]);
  const [setupStep, setSetupStep] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [coach, setCoach] = useState("");
  const [moveOptions, setMoveOptions] = useState<CoachingOption[]>([]);
  const [coachOpen, setCoachOpen] = useState(false);
  const [bestIdx, setBestIdx] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [activity, setActivity] = useState("Press Start Game to sit at the East Round table.");
  const [error, setError] = useState("");
  const [flowerReveal, setFlowerReveal] = useState<FlowerReplacementReveal>();
  const [openingBonusIds, setOpeningBonusIds] = useState<string[]>([]);
  const [openingBonusShown, setOpeningBonusShown] = useState(0);
  useEffect(() => {
    setHasSeenTutorial(window.localStorage.getItem("mahjong-coach-onboarding") === "complete");
  }, []);
  useEffect(() => {
    if (!flowerReveal) return;
    const timer = window.setTimeout(() => setFlowerReveal(undefined), 6_000);
    return () => window.clearTimeout(timer);
  }, [flowerReveal]);
  const begin = () => { try { const next = startBrowserEastRound(); setRound("east"); setSouthCard(undefined); setDecisionNotes([]); setFlowerReveal(undefined); setOpeningBonusIds(next.players.east.bonusTiles.map((tile) => tile.id)); setOpeningBonusShown(0); setGame(next); setSetupStep(hasSeenTutorial ? tutorial.length : 0); setSelected(undefined); setCoach(hasSeenTutorial ? "Coach tip: you are East, so you begin with 14 tiles and discard first." : ""); setMoveOptions([]); setCoachOpen(false); setActivity(hasSeenTutorial ? "Your 14 normal hand tiles are ready. Any Flowers or Seasons from the deal will appear beside your hand next." : "Welcome. Before your first discard, let’s look at how this East Round table was set up."); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start a new hand."); } };
  const play = () => { const currentTutorial = game?.round === "south" ? southTutorial : game?.round === "west" ? westTutorial : game?.round === "north" ? northTutorialFor(game.north!.format, game.north!.jokerRank) : tutorial; window.localStorage.setItem("mahjong-coach-onboarding", "complete"); setHasSeenTutorial(true); setSetupStep(currentTutorial.length); setCoachOpen(false); setMoveOptions([]); setCoach(explainHand(game!, humanSeatOf(game!), true)); setActivity(game?.round === "south" ? "South Round: compare your tiles to your secret South Card as you play." : game?.round === "west" ? "West Round begins with Charleston. Pass three tiles, then build only Pungs, Kongs, and one Pair." : game?.round === "north" && game.north?.format === "south" ? "South-as-North begins with Charleston. Follow your South Card; Flowers and Seasons are concealed jokers, and buying is not allowed." : game?.round === "north" && game.north?.format === "west" ? `West-as-North begins with Charleston. ${game.north.jokerRank}s are jokers; build only West Pungs, Kongs, and a Pair.` : game?.round === "north" ? "North Round uses the East-as-North format. South begins with 14 tiles and discards first." : "Your turn — choose a tile in your hand, then discard it. East begins with 14 tiles."); };
  const continueToSouth = () => {
    const cards = dealSouthCards(Math.random);
    setPreparedSouthCards(cards);
    setSouthCard(cards.north);
    setRound("south-setup");
    setCoachOpen(false);
    setMoveOptions([]);
    setActivity("East Round is complete. South Round begins with a Charleston exchange, then each player receives a secret South Card objective.");
  };
  const startSouthRound = () => {
    if (!game) {
      setError("South Round could not start because the previous table is unavailable. Start a new South test hand instead.");
      return;
    }
    try {
      const scores = Object.fromEntries(seats.map((seat) => [seat, game.players[seat].score])) as Record<Seat, number>;
      const next = startBrowserSouthRound(scores, Math.random, preparedSouthCards);
      setGame(next);
      setDecisionNotes([]);
      setRound("east");
      setSouthCard(next.south!.cards[humanSeatOf(next)]);
      setSouthCardOpen(false);
      setSetupStep(0);
      setSelected(undefined);
      setCharlestonSelection([]);
      setCoachOpen(false);
      setMoveOptions([]);
      setError("");
      setActivity("South Round is ready. Review your private South Card, then complete Charleston before normal play begins.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "South Round could not start. Please try again.");
    }
  };
  const beginSouthTest = () => {
    const cards = dealSouthCards(Math.random);
    setPreparedSouthCards(cards);
    setGame(startBrowserEastRound());
    setRound("south-setup");
    setSouthCard(cards.north);
    setSouthCardOpen(false);
    setSetupStep(0);
    setSelected(undefined);
    setCharlestonSelection([]);
    setDecisionNotes([]);
    setCoachOpen(false);
    setMoveOptions([]);
    setActivity("South Round is ready. Review your secret South Card, then begin the Charleston exchange.");
  };
  const beginWestTest = () => {
    const next = startBrowserWestRound({ east: 35_000, south: 35_000, west: 35_000, north: 35_000 }, "north");
    setGame(next);
    setRound("west-setup");
    setSouthCard(undefined);
    setSouthCardOpen(false);
    setSetupStep(0);
    setSelected(undefined);
    setCharlestonSelection([]);
    setDecisionNotes([]);
    setCoachOpen(false);
    setMoveOptions([]);
    setActivity("West Round is ready. Review its objective, then start the required Charleston exchange.");
  };
  const beginNorthTest = () => {
    // Direct testing intentionally uses the rulebook's East-as-North option:
    // it adds no new hand mechanics, while still rotating names and preserving North scoring.
    const physicalSeats: Record<Seat, Seat> = { east: "west", south: "north", west: "east", north: "south" };
    const next = startBrowserNorthRound({ east: 35_000, south: 35_000, west: 35_000, north: 35_000 }, "west", physicalSeats, "east");
    setGame(next);
    setRound("north-setup");
    setSouthCard(undefined);
    setSouthCardOpen(false);
    setSetupStep(0);
    setSelected(undefined);
    setCharlestonSelection([]);
    setDecisionNotes([]);
    setCoachOpen(false);
    setMoveOptions([]);
    setActivity("North Round is ready. North will choose its format when the round begins.");
  };
  const westFrom = (game: EastRoundState) => {
    const scores = Object.fromEntries(seats.map((seat) => [seat, game.players[seat].score])) as Record<Seat, number>;
    const physicalSeats = Object.fromEntries(seats.map((seat) => [seat, game.players[seat].physicalSeat])) as Record<Seat, Seat>;
    const next = startBrowserWestRound(scores, humanSeatOf(game), Math.random, physicalSeats);
    setGame(next);
    setRound("west-setup");
    setSouthCard(undefined);
    setSouthCardOpen(false);
    setSetupStep(0);
    setSelected(undefined);
    setCharlestonSelection([]);
    setDecisionNotes([]);
    setCoachOpen(false);
    setMoveOptions([]);
    setActivity("South Round is complete. West Round begins with a Charleston exchange and a new Pung/Kong/Pair objective.");
  };
  const northFrom = (game: EastRoundState) => {
    const scores = Object.fromEntries(seats.map((seat) => [seat, game.players[seat].score])) as Record<Seat, number>;
    const physicalSeats = Object.fromEntries(seats.map((seat) => [seat, game.players[seat].physicalSeat])) as Record<Seat, Seat>;
    const next = startBrowserNorthRound(scores, humanSeatOf(game), physicalSeats, "east");
    setGame(next);
    setRound("north-setup");
    setSouthCard(undefined);
    setSouthCardOpen(false);
    setSetupStep(0);
    setSelected(undefined);
    setCharlestonSelection([]);
    setDecisionNotes([]);
    setCoachOpen(false);
    setMoveOptions([]);
    setActivity("West Round is complete. North Round begins with the rulebook’s East-as-North format.");
  };
  const continueToWest = () => { if (game) westFrom(game); };
  const continueToNorth = () => { if (game) northFrom(game); };
  /** Preview shortcut: jump straight to the start of any round on a fresh table. */
  const jumpTo = (target: "east" | "south" | "west" | "north") => {
    if (target === "east") { begin(); return; }
    const base = startBrowserEastRound();
    if (target === "south") { const cards = dealSouthCards(Math.random); setPreparedSouthCards(cards); setSouthCard(cards.north); setGame(base); setRound("south-setup"); setCoachOpen(false); setMoveOptions([]); setError(""); return; }
    if (target === "west") westFrom(base); else northFrom(base);
  };
  const jumpBar = (cls: string) => <div className={`${cls} jump`}><span className="m">Jump to</span>{(["east", "south", "west", "north"] as const).map((r) => <button key={r} type="button" className={`lnk ${game?.round === r || (!game?.round && r === "east") ? "on" : ""}`} onClick={() => jumpTo(r)}>{r[0].toUpperCase() + r.slice(1)}</button>)}</div>;
  const redoCurrentRound = () => {
    if (!game) return;
    try {
      const scores = Object.fromEntries(seats.map((seat) => [seat, game.players[seat].score])) as Record<Seat, number>;
      const physicalSeats = Object.fromEntries(seats.map((seat) => [seat, game.players[seat].physicalSeat])) as Record<Seat, Seat>;
      const humanSeat = humanSeatOf(game);
      const next = game.round === "south"
        ? startBrowserSouthRound(scores, Math.random, dealSouthCards(Math.random))
        : game.round === "west"
          ? startBrowserWestRound(scores, humanSeat, Math.random, physicalSeats)
          : startBrowserNorthRound(scores, humanSeat, physicalSeats, game.north?.format ?? "east", game.north?.jokerRank, game.north?.format === "south" ? dealSouthCards(Math.random) : undefined);
      setGame(next);
      setRound("east");
      setSouthCard(next.south?.cards[humanSeatOf(next)]);
      setSouthCardOpen(false);
      setSetupStep(0);
      setSelected(undefined);
      setCharlestonSelection([]);
      setDecisionNotes([]);
      setFlowerReveal(undefined);
      setCoachOpen(false);
      setMoveOptions([]);
      const restartedRound = game.round ?? "east";
      setActivity(`${restartedRound[0].toUpperCase()}${restartedRound.slice(1)} Round restarted. Review the setup, then play the hand again.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not restart this round.");
    }
  };
  const startWestRound = () => {
    setRound("east");
    setSetupStep(0);
    setSelected(undefined);
    setCharlestonSelection([]);
    setCoachOpen(false);
    setMoveOptions([]);
    setActivity("West Round begins with Charleston. Choose three tiles to exchange; build Pungs, Kongs, and one Pair after it.");
  };
  const startNorthRound = () => {
    if (!game) {
      setError("North Round could not start because the previous table is unavailable. Start a new North test hand instead.");
      return;
    }
    try {
      const previousSeatForCurrent: Record<Seat, Seat> = { east: "south", south: "west", west: "north", north: "east" };
      const previousHumanSeat = previousSeatForCurrent[humanSeatOf(game)];
      const previousPhysicalSeats = Object.fromEntries(seats.map((seat) => [previousSeatForCurrent[seat], game.players[seat].physicalSeat])) as Record<Seat, Seat>;
      const scores = Object.fromEntries(seats.map((seat) => [previousSeatForCurrent[seat], game.players[seat].score])) as Record<Seat, number>;
      const selectedFormat = chooseNorthFormat();
      const selectedJokerRank = selectedFormat === "west" ? chooseNorthJokerRank() : undefined;
      const next = startBrowserNorthRound(scores, previousHumanSeat, previousPhysicalSeats, selectedFormat, selectedJokerRank, selectedFormat === "south" ? dealSouthCards(Math.random) : undefined);
      setGame(next);
      setRound("east");
      setSetupStep(0);
      setSelected(undefined);
      setCharlestonSelection([]);
      setCoachOpen(false);
      setMoveOptions([]);
      setSouthCard(selectedFormat === "south" ? next.south!.cards[humanSeatOf(next)] : undefined);
      setError("");
      setActivity(selectedFormat === "east" ? "North chose East-as-North. You are South this round; the hand patterns are the East patterns, and Flowers/Seasons do not add North Round score awards." : selectedFormat === "south" ? "North chose South-as-North. Complete Charleston, follow your secret South Card, and treat Flowers/Seasons as concealed jokers. Buying is not allowed." : `North chose West-as-North. Complete Charleston, then follow West rules; every ${selectedJokerRank} Bamboo, Character, and Dot is a joker. Buying is not allowed.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "North Round could not start. Please try again.");
    }
  };
  const commit = (fn: (state: EastRoundState) => EastRoundState, message: string) => setGame((current) => { if (!current) return current; try { setError(""); const humanSeat = humanSeatOf(current); const next = fn(current); const event = next.history.at(-1); if (event?.type === "discarded" && event.seat === humanSeat) { const options = bestMoveOptions(current, humanSeat); const chosen = options.find((option) => option.tileId === event.tileId); setDecisionNotes((notes) => [...notes, { discarded: tileLabel(current.players[humanSeat].hand.find((tile) => tile.id === event.tileId)!), recommended: options[0] ? options[0].title.replace(/^(Discard|Pass) /, "") : undefined, reason: chosen?.reason }]); } setFlowerReveal(flowerReplacementAfter(current, next)); setActivity(activityAfterFlowerWall(current, next, message)); return next; } catch (cause) { setError(cause instanceof Error ? cause.message : "That action is not legal now."); return current; } });
  const toggleCharlestonTile = (tileId: string) => { setSelected(tileId); setCharlestonSelection((picked) => picked.includes(tileId) ? picked.filter((id) => id !== tileId) : picked.length < 3 ? [...picked, tileId] : picked); };
  const completeCharlestonStep = () => commit((state) => {
    const humanSeat = humanSeatOf(state);
    const choices = Object.fromEntries(seats.map((seat) => [seat, seat === humanSeat ? charlestonSelection : chooseBotCharlestonTileIds(state, seat)])) as Record<Seat, string[]>;
    return state.round === "west" || (state.round === "north" && state.north?.format === "west") ? applyWestCharleston(state, choices) : applyCharleston(state, choices);
  }, `Charleston exchange ${(game?.south?.charlestonStep ?? game?.west?.charlestonStep) === 0 ? "Right" : (game?.south?.charlestonStep ?? game?.west?.charlestonStep) === 1 ? "Across" : "Left"} is complete.`);
  const canBuyDiscard = !!game && canBuySouthDiscard(game, humanSeatOf(game));
  const humanClaim = !!game && game.status === "active" && game.phase === "claim" && (canDeclareMahjong(game, humanSeatOf(game)) || canClaimExposedKong(game, humanSeatOf(game)) || canClaimPung(game, humanSeatOf(game)) || canClaimPureChow(game, humanSeatOf(game)) || canBuyDiscard);
  const claimActions = !!game && game.status === "active" && game.phase === "claim" && (canDeclareMahjong(game, humanSeatOf(game)) || canClaimExposedKong(game, humanSeatOf(game)) || canClaimPung(game, humanSeatOf(game)) || canClaimPureChow(game, humanSeatOf(game)) || canBuyDiscard);

  const tutorialLength = game?.round === "south" ? southTutorial.length : game?.round === "west" ? westTutorial.length : game?.round === "north" ? northTutorialFor(game.north!.format, game.north!.jokerRank).length : tutorial.length;
  useEffect(() => {
    if (!game || setupStep < tutorialLength || openingBonusShown >= openingBonusIds.length) return;
    const tile = allTilesById.get(openingBonusIds[openingBonusShown]);
    const timer = window.setTimeout(() => {
      setOpeningBonusShown((shown) => shown + 1);
      if (tile) { setFlowerReveal({ seat: humanSeatOf(game), bonusTileId: tile.id }); setActivity(`${tileLabel(tile)} is a bonus tile. It moved beside your hand, and the Flower Wall gave you a replacement.`); }
    }, openingBonusShown === 0 ? 350 : 1250);
    return () => window.clearTimeout(timer);
  }, [game, openingBonusIds, openingBonusShown, setupStep, tutorialLength]);
  useEffect(() => {
    if (openingBonusIds.length && openingBonusShown >= openingBonusIds.length) setOpeningBonusIds([]);
  }, [openingBonusIds.length, openingBonusShown]);
  useEffect(() => {
    if (!game || setupStep < tutorialLength || game.status !== "active" || game.phase === "charleston") return;
    const humanSeat = humanSeatOf(game);
    const humanTurn = game.turn === humanSeat && (game.phase === "draw" || game.phase === "discard");
    if (humanTurn || humanClaim) return;
    setActivity(game.phase === "claim" ? "The table is checking whether anyone can claim this discard…" : `${name(game.turn, humanSeat)} is thinking…`);
    const timer = window.setTimeout(() => setGame((current) => {
      if (!current || current !== game) return current;
      const currentHumanSeat = humanSeatOf(current);
      const action = current.phase === "claim" ? chooseBotClaimAction(current, currentHumanSeat) : chooseBotTurnAction(current, current.turn);
      if (!action) return current;
      const message = action.type === "draw" ? `${name(action.seat, currentHumanSeat)} draws a tile from the Draw Pile.`
        : action.type === "discard" ? `${name(action.seat, currentHumanSeat)} discarded ${tileLabel(current.players[action.seat].hand.find((tile) => tile.id === action.tileId)!)}.`
          : action.type === "pung" || action.type === "pureChow" || action.type === "exposedKong" ? `${name(action.seat, currentHumanSeat)} claimed the discard and made ${action.type === "exposedKong" ? "an exposed Kong" : `a ${kindName(action.type)}`}.`
            : action.type === "kong" ? `${name(action.seat, currentHumanSeat)} declared a concealed Kong.`
              : action.type === "mahjong" ? `${name(action.seat, currentHumanSeat)} declared Mahjong.`
                : "No one claimed the discard. Play continues to the next seat.";
      const next = applyBotAction(current, action);
      setFlowerReveal(flowerReplacementAfter(current, next));
      setActivity(activityAfterFlowerWall(current, next, message));
      return next;
    }), 1500);
    return () => window.clearTimeout(timer);
  }, [game, humanClaim, setupStep, tutorialLength]);

  const chowChoices = useMemo(() => {
    const humanSeat = game ? humanSeatOf(game) : HUMAN;
    if (!game || !canClaimPureChow(game, humanSeat)) return [] as [Tile, Tile][];
    const hand = game.players[humanSeat].hand; const results: [Tile, Tile][] = []; const shapes = new Set<string>();
    for (let first = 0; first < hand.length; first += 1) for (let second = first + 1; second < hand.length; second += 1) try {
      claimPureChow(game, humanSeat, [hand[first].id, hand[second].id]);
      const numbered = [game.lastDiscard!.tile, hand[first], hand[second]].filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number");
      // Different physical copies of (for example) 7 Bamboo still make the same 5–6–7 Chow.
      // Show one decision per resulting sequence, not one per interchangeable tile copy.
      const shape = numbered.length === 3 ? `${numbered[0].suit}:${numbered.map((tile) => tile.rank).sort((left, right) => left - right).join("-")}` : `${hand[first].id}:${hand[second].id}`;
      if (!shapes.has(shape)) { shapes.add(shape); results.push([hand[first], hand[second]]); }
    } catch { /* reducer decides legality */ }
    return results;
  }, [game]);
  const chowChoiceText = ([first, second]: [Tile, Tile]) => {
    const tiles = [...(game?.lastDiscard ? [game.lastDiscard.tile] : []), first, second];
    const numbered = tiles.filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number");
    return numbered.length === 3 && new Set(numbered.map((tile) => tile.suit)).size === 1
      ? `Claim ${numbered.map((tile) => tile.rank).sort((left, right) => left - right).join("–")} ${numbered[0].suit}`
      : "Claim Pure Chow";
  };
  const claimActionCount = !game || !humanClaim ? 0
    : (canBuyDiscard ? 1 : 0)
      + (canDeclareMahjong(game, humanSeatOf(game)) ? 1 : 0)
      + (canClaimExposedKong(game, humanSeatOf(game)) ? 1 : 0)
      + (canClaimPung(game, humanSeatOf(game)) ? 1 : 0)
      + chowChoices.length
      + 1; // Pass is always available whenever a claim prompt is visible.
  const claimActionRows = Math.max(1, Math.ceil(claimActionCount / 2));
  if (!game) return <Stage><Welcome onBegin={begin} error={error} /></Stage>;
  const scoresOf = (g: EastRoundState) => Object.fromEntries(seats.map((seat) => [seat, g.players[seat].score])) as Record<Seat, number>;
  if (round === "south-setup") return <Stage>{jumpBar("ab jumpfix")}<RoundSetup round="south" scores={scoresOf(game)} you={humanSeatOf(game)} intro="Scores carry forward and East moves counterclockwise, so you move from East to North. Your winning objective now comes from a private South Card." kicker="Your secret South Card" heading={southCard?.title ?? "South Card"} body="First, Charleston: three exchanges of three concealed tiles. Then build only the goal on your card. Learn Mahjong stays available during play." southCard={southCard} cta="Start South Round" onStart={startSouthRound} error={error} /></Stage>;
  if (round === "west-setup") return <Stage>{jumpBar("ab jumpfix")}<RoundSetup round="west" scores={scoresOf(game)} you={humanSeatOf(game)} intro="East moves counterclockwise again. You are now West. Scores and players carry forward from South." kicker="West Round objective" heading="Pungs, Kongs, and one Pair" body="Build four groups made only from Pungs and Kongs, plus one Pair. At least one group must be a Kong. Pure Chows do not count in West." cta="Start West Round" onStart={startWestRound} /></Stage>;
  if (round === "north-setup") return <Stage>{jumpBar("ab jumpfix")}<RoundSetup round="north" scores={scoresOf(game)} you={humanSeatOf(game)} intro="East moves counterclockwise one final time. You are now South, while your place at the table stays the same. Scores carry forward from West." kicker="North's format choice" heading="North will decide this hand" body="North can choose East-as-North, South-as-North, or West-as-North under the rulebook. Start the round to reveal North's selection and the rules it creates for this hand." cta="Let North choose" onStart={startNorthRound} /></Stage>;
  if (round === "match-summary") {
    const humanSeat = humanSeatOf(game);
    const standings = [...seats].sort((left, right) => game.players[right].score - game.players[left].score);
    const topScore = game.players[standings[0]].score;
    const leaders = standings.filter((seat) => game.players[seat].score === topScore);
    const winnerText = leaders.length > 1 ? `${leaders.map((seat) => name(seat, humanSeat)).join(" and ")} share the match lead.` : leaders[0] === humanSeat ? "You win the four-round game." : `${name(leaders[0], humanSeat)} wins the four-round game.`;
    return <Stage><FinalResults standings={standings.map((seat) => ({ name: name(seat, humanSeat), score: game.players[seat].score }))} winner={winnerText} onNew={begin} /></Stage>;
  }

  const humanSeat = humanSeatOf(game);
  const player = game.players[humanSeat];
  const tableGame = openingBonusShown >= openingBonusIds.length ? game : {
    ...game,
    players: {
      ...game.players,
      [humanSeat]: { ...player, bonusTiles: player.bonusTiles.filter((tile) => !openingBonusIds.includes(tile.id) || openingBonusIds.indexOf(tile.id) < openingBonusShown) },
    },
  };
  const charlestonStep = game.south?.charlestonStep ?? game.west?.charlestonStep ?? 0;
  const activeTutorial = game.round === "south" ? southTutorial : game.round === "west" ? westTutorial : game.round === "north" ? northTutorialFor(game.north!.format, game.north!.jokerRank) : tutorial;
  const isPlaying = setupStep >= activeTutorial.length;
  const lastDrew = [...game.history].reverse().find((event) => event.type === "drew" && event.seat === humanSeat);
  const drawnId = lastDrew?.type === "drew" ? lastDrew.tileId : undefined;
  const kongTile = player.hand.find((tile) => canDeclareConcealedKong(game, humanSeat, tile.id));
  const summary = handSummary(game, humanSeat);
  const review = game.status !== "active" ? reviewFeedback(game, decisionNotes) : undefined;
  const latestCommentary = latestTableCommentary(game);
  const settlement = game.status === "mahjong" && game.winner ? game.round === "south" && game.south ? settleSouthRound(game.players, { seat: game.winner.seat, cardScore: game.south.cards[game.winner.seat].score }, game.south.pot) : game.round === "west" ? settleWestRound(game.players, game.winner) : game.round === "north" && game.north?.format === "south" && game.south ? settleNorthSouthRound(game.players, { seat: game.winner.seat, cardScore: game.south.cards[game.winner.seat].score }, game.south.pot) : game.round === "north" && game.north?.format === "west" ? settleNorthWestRound(game.players, game.winner, game.north.jokerRank) : game.round === "north" ? settleNorthEastRound(game.players, game.winner) : settleEastRound(game.players, game.winner) : game.status === "draw" ? settleDrawRound(game.players, game.round !== "north") : undefined;

  const rk: RoundKey = game.round ?? "east";
  const roundTitle = game.round === "south" ? "South" : game.round === "west" ? "West" : game.round === "north" ? "North" : "East";
  const isSouthCardRound = game.round === "south" || (game.round === "north" && game.north?.format === "south");
  const myTurn = game.status === "active" && game.turn === humanSeat;
  const cap = (value: string) => value[0].toUpperCase() + value.slice(1);

  // ---- headline + one line of commentary ----
  const headline = !isPlaying ? "How to play."
    : game.phase === "charleston" ? "Pass 3 tiles."
    : game.status === "mahjong" ? `${cap(game.winner!.seat)} won.`
    : game.status === "draw" ? "Hand drawn."
    : humanClaim ? "Claim it?"
    : myTurn ? (game.phase === "draw" ? "Pick a tile." : "Discard a tile.")
    : game.phase === "claim" ? "Any claims?"
    : `${cap(game.turn)}'s turn.`;
  const eyebrow = !isPlaying ? "Learn Mahjong" : `${roundTitle} round`;
  const sentences = (game.phase === "charleston"
    ? `Charleston ${charlestonStep + 1} of 3: pass ${charlestonStep === 0 ? "right" : charlestonStep === 1 ? "across" : "left"}. Choose three tiles.`
    : game.phase === "claim" && latestCommentary ? latestCommentary : activity).split(/(?<=[.!?])\s+/);
  const commentary = sentences[0].length < 46 && sentences[1] ? `${sentences[0]} ${sentences[1]}` : sentences[0];

  // ---- coach (chalk) ----
  const bestMode = coachOpen && moveOptions.length > 0;
  const explainMode = coachOpen && moveOptions.length === 0;
  const chips: Record<string, string> = {};
  if (bestMode) moveOptions.forEach((option, index) => { chips[option.tileId] = index === 0 ? "★ Best" : `Option ${index + 1}`; });
  const bestIndex = Math.min(bestIdx, Math.max(0, moveOptions.length - 1));
  const onTile = (id: string) => {
    if (game.phase === "charleston") { toggleCharlestonTile(id); return; }
    const hit = moveOptions.findIndex((option) => option.tileId === id);
    if (hit >= 0) setBestIdx(hit);
    setSelected(id);
  };
  const showBest = () => { const options = bestMoveOptions(game, humanSeat); setBestIdx(0); setCoachOpen(true); setMoveOptions(options); if (game.phase === "charleston" && options.length === 3) { setCharlestonSelection(options.map((option) => option.tileId)); setSelected(options[0].tileId); } };
  const westLike = game.round === "west" || (game.round === "north" && game.north?.format === "west");
  const eastLike = game.round === "east" || !game.round || (game.round === "north" && game.north?.format === "east");
  const groups = explainMode && isPlaying ? groupHand(tableGame.players[humanSeat].hand, { chows: !westLike }) : undefined;
  const needGroup = groups?.find((g) => g.kind === "need");
  const setCount = (groups?.filter((g) => g.kind === "set").length ?? 0) + player.melds.length;
  const hasPair = !!groups?.some((g) => g.kind === "pair");
  const looseCount = groups?.find((g) => g.kind === "loose")?.tiles.length ?? 0;

  // ---- actions ----
  const turnNow = game.status === "active" && game.turn === humanSeat;
  const act: ReactNode[] = [];
  const press = (label: string, onClick: () => void, kind = "", disabled = false) => act.push(<button key={label} type="button" className={`btn ${kind}`} disabled={disabled} onClick={onClick}>{label}</button>);
  if (!isPlaying) press("Discard a tile", () => undefined, "pri", true);
  if (isPlaying) {
    if (game.phase === "charleston") {
      press(`${charlestonSelection.length}/3 selected · Exchange`, () => { completeCharlestonStep(); setCharlestonSelection([]); setSelected(undefined); }, "pri", charlestonSelection.length !== 3);
    }
    if (turnNow && game.phase === "draw") press("Pick tile", () => commit((state) => drawFromPile(state, humanSeat), "You drew a tile. Choose one tile to discard."), "pri");
    if (turnNow && game.phase === "discard" && canDeclareMahjong(game, humanSeat)) press("Declare Mahjong", () => commit((state) => declareMahjong(state, humanSeat), "You declared Mahjong."), "pri");
    if (turnNow && game.phase === "discard" && !canDeclareMahjong(game, humanSeat)) {
      const chosen = selected ? player.hand.find((item) => item.id === selected) : undefined;
      if (chosen) press(`Discard ${tileLabel(chosen)}`, () => { setSelected(undefined); commit((state) => discard(state, humanSeat, chosen.id), `You discarded ${tileLabel(chosen)}. The other seats may now claim it.`); }, "pri");
      else press("Select a tile to discard", () => undefined, "", true);
      if (kongTile) press("Declare Kong", () => commit((state) => declareConcealedKong(state, humanSeat, kongTile.id), "You declared a concealed Kong. Your replacement comes from the Flower Wall."));
    }
    if (canReplaceNorthExposedJoker(game, humanSeat)) press("Replace exposed joker", () => commit((state) => replaceNorthExposedJoker(state, humanSeat), "You replaced a visible North joker with the matching tile you drew. The joker returns to your concealed hand."));
    if (humanClaim) {
      if (canBuyDiscard) press("Buy discard · 100", () => commit((state) => buySouthDiscard(state, humanSeat), "You bought the discard for 100 points. It enters the South Round pot; discard a tile now."), "pri");
      if (canDeclareMahjong(game, humanSeat)) press("Claim Mahjong", () => commit((state) => declareMahjong(state, humanSeat), "You claimed the discard and declared Mahjong."), "pri");
      if (canClaimExposedKong(game, humanSeat)) press("Claim Kong", () => commit((state) => claimExposedKong(state, humanSeat), `You claimed ${tileLabel(game.lastDiscard!.tile)} and made an exposed Kong. Your replacement comes from the Flower Wall.`), "pri");
      if (canClaimPung(game, humanSeat)) press("Claim Pung", () => commit((state) => claimPung(state, humanSeat), `You claimed ${tileLabel(game.lastDiscard!.tile)} and made a Pung. Your set is now exposed.`), "pri");
      chowChoices.forEach(([first, second]) => press(chowChoiceText([first, second]), () => commit((state) => claimPureChow(state, humanSeat, [first.id, second.id]), `You claimed ${tileLabel(game.lastDiscard!.tile)} and made a Pure Chow. Your set is now exposed.`), "pri"));
      press("Pass", () => commit((state) => { const action = chooseBotClaimAction(state, humanSeat); return action ? applyBotAction(state, action) : passClaims(state); }, "You passed. The other seats now have their chance to claim."));
    }
  }

  const tourStep = TOUR_META[rk][Math.min(setupStep, TOUR_META[rk].length - 1)];
  const tourScores = !isPlaying && (tourStep?.targets ?? []).includes("scores");
  const nextStep = () => (setupStep === activeTutorial.length - 1 ? play() : setSetupStep((step) => step + 1));
  const continueLabel = game.round === "east" ? "Continue to South Round" : game.round === "south" ? "Continue to West Round" : game.round === "west" ? "Continue to North Round" : "View final results";
  const redo = game.round === "east" ? begin : redoCurrentRound;
  const goOn = game.round === "east" ? continueToSouth : game.round === "south" ? continueToWest : game.round === "west" ? continueToNorth : () => setRound("match-summary");

  return (
    <Stage className={`${tourScores ? "tour-scores" : ""} ${coachOpen && isPlaying ? "coach-on" : ""}`}>
      <div className="ab" id="hdr"><div className="eb m"><i /><span>{eyebrow}</span></div><h1>{headline}</h1></div>
      {isPlaying && <div className="ab" id="com">{commentary}</div>}
      <div className="ab" id="tools">
        <div className="row">
          <button type="button" className={`btn ${explainMode ? "on" : ""}`} onClick={() => { setMoveOptions([]); setCoachOpen((open) => !open || bestMode); }}>Explain my hand</button>
          <button type="button" className={`btn cream ${bestMode ? "on" : ""}`} onClick={showBest}>Best move</button>
        </div>
        <div className="row">
          {isSouthCardRound && <button type="button" className="lnk" data-tour="southcard" onClick={() => { setCoachOpen(false); setSouthCardOpen((open) => !open); }}>Your South Card</button>}
          <button type="button" className="lnk" onClick={() => setSetupStep(0)}>Learn Mahjong</button>
          <button type="button" className="lnk" onClick={begin}>New game</button>
        </div>
        {jumpBar("row")}
      </div>

      <TableBoard game={game} tableGame={tableGame} humanSeat={humanSeat} selectedId={selected} selectedIds={game.phase === "charleston" ? charlestonSelection : undefined} drawnId={drawnId} onTile={isPlaying ? onTile : undefined} chips={chips} chipSel={bestMode ? moveOptions[bestIndex]?.tileId : undefined} groups={groups} />
      {tourScores && <div className="ab sn m" style={{ left: 52, top: 668, zIndex: 65, background: "var(--ink)", padding: "3px 8px" }}><b>{cap(humanSeat)}</b> · <span className="sc">{player.score.toLocaleString()}</span></div>}

      {isPlaying && <div className="ab" id="act" data-tour="act">{act}</div>}
      {isPlaying && error && <div className="err">{error}</div>}

      {coachOpen && isPlaying && (
        <>
          <div className="ab" id="chalkp">
            <button type="button" className="x" onClick={() => setCoachOpen(false)} aria-label="Close coach">×</button>
            {bestMode ? <>
              <h3>Best move</h3>
              <div className="tabs">{moveOptions.map((option, index) => <button key={option.tileId} type="button" className={index === bestIndex ? "sel" : ""} onClick={() => { setBestIdx(index); setSelected(option.tileId); }}>{index === 0 ? "★ " : ""}{index + 1}</button>)}</div>
              <p><CoachText text={moveOptions[bestIndex].title} /></p>
              {(() => {
                const o = moveOptions[bestIndex];
                const base = o.tileId.replace(/-\d+$/, "");
                const copies = player.hand.filter((t) => t.id.replace(/-\d+$/, "") === base).length;
                const label = o.title.replace(/^(Discard|Pass)\s+/i, "").replace(/[.:].*$/, "");
                return <>
                  <p className="cline"><b>Why · </b><CoachText text={sents(honourFix(o.reason, label, copies), 2)} /></p>
                  {o.preserves && <p className="cline"><b>Keep · </b><CoachText text={sents(o.preserves.replace(/^Keep /, ""), 1)} /></p>}
                  {o.lookingFor && <p className="cline"><b>Look for · </b><CoachText text={sents(o.lookingFor, 1)} /></p>}
                </>;
              })()}
            </> : <>
              <h3>Your hand</h3>
              {(eastLike || westLike) && <p className="cline"><b>{setCount} of 4 sets built · {hasPair ? "Pair ✓" : "No pair yet"}</b></p>}
              {(() => {
                const oneHonour = (w: string) => /(Wind|Dragon)/.test(w) ? w.replace(/ — .*$/, "") + " — only 1 copy. It can only become a Pung, which needs two more." : w;
                const trim = (i: string) => i
                  .replace(/ — a developing Pure Chow; draw (.*?) to complete it\.?$/, " → needs $1")
                  .replace(/ — these consecutive tiles can become a Chow if you draw (.*?)\. .*$/, " → needs $1")
                  .replace(/ — one more matching tile makes a Pung.*$/, " → 1 more makes a Pung")
                  .replace(/ — it is not currently in a pair.*$/, " — not part of a set yet")
                  .replace(/( — (?!only 1 copy|not part).*)$/, "");
                const row = (label: string, items: string[], n: number) => items.length > 0 && <p className="cline"><b>{label} · </b><CoachText text={items.slice(0, n).map(trim).join(" · ")} /></p>;
                return <>
                  {row("Built", summary.built, 3)}
                  {row("Developing", summary.developing, 2)}
                  {row("Weak", summary.weak.map((w) => (eastLike || westLike ? oneHonour(w) : w)), 2)}
                  <p className="cline"><b>Focus · </b><CoachText text={summary.focus} /></p>
                </>;
              })()}
            </>}
          </div>
        </>
      )}

      {!isPlaying && (
        <TourOverlay
          title={activeTutorial[setupStep][0]}
          body={activeTutorial[setupStep][1]}
          index={setupStep}
          total={activeTutorial.length}
          meta={tourStep}
          visual={isSouthCardRound ? <SouthVisual step={setupStep} card={southCard} /> : game.round === "east" || !game.round ? <EastVisual step={setupStep} /> : null}
          onBack={() => setSetupStep((step) => Math.max(0, step - 1))}
          onNext={nextStep}
          onSkip={play}
        />
      )}

      {southCardOpen && southCard && (
        <Modal label="Your South Card" onClose={() => setSouthCardOpen(false)}>
          <div className="kick">Your secret South Card</div>
          <h2>{southCard.title}</h2>
          <p>This is the hand you are privately trying to make in {game.round === "north" ? "South-as-North" : "South Round"}.</p>
          <div className="goal">{southCard.goal}</div>
          <div className="m" style={{ marginTop: 8, color: "rgba(243,234,210,.7)" }}>{southCard.score.toLocaleString()} points{southCard.bonus ? ` · Bonus: ${southCard.bonus}` : ""}</div>
          <p>The tiles below show the building blocks named on this card. {game.round === "north" ? "Flowers and Seasons are concealed jokers here, but cannot form a Pair. " : ""}Keep this card open whenever you want to compare your hand to its goal.</p>
          <SouthCardKey card={southCard} />
        </Modal>
      )}

      {game.status !== "active" && review && (
        <Modal label="Game review">
          <div className="kick">Game review</div>
          <h2>{game.status === "mahjong" ? `${name(game.winner!.seat, humanSeat)} declared Mahjong` : "The hand ended in a draw"}</h2>
          <p>{review.happened}</p>
          {settlement && <><h3>Score summary</h3>{settlement.transfers.length ? scoreReviewLines(settlement, humanSeat).map((line) => <p key={line}>{line}</p>) : <p>No score was awarded for this draw.</p>}<div className="modal-scores">{seats.map((seat) => <div key={seat}><b>{name(seat, humanSeat)}</b><strong>{game.players[seat].score.toLocaleString()}</strong></div>)}</div></>}
          <h3>What you did well</h3><p>{review.didWell}</p>
          <h3>Try next time</h3><p>{review.next}</p>
          <div className="actions"><button type="button" className="btn" onClick={redo}>Redo {roundTitle} Round</button><button type="button" className="btn pri" onClick={goOn}>{continueLabel}</button></div>
        </Modal>
      )}
    </Stage>
  );
}
