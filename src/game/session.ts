import { createEastRound, type EastRoundState } from "./state";
import { createSouthRound, dealSouthCards, type SouthCards } from "./south";
import { createWestRound } from "./west";
import { createNorthRound, type NorthFormat } from "./north";
import { createTileSet, shuffle, type Seat } from "./tiles";

/** Creates a fresh browser hand; tests may supply a deterministic random source. */
export function startBrowserEastRound(random: () => number = Math.random): EastRoundState {
  // The rulebook's illustrated 8-roll Flower Wall keeps the teaching setup stable;
  // the deck itself is freshly shuffled for every browser hand.
  return createEastRound(shuffle(createTileSet(), random), 8);
}

/** Starts South with carried match scores and the required Charleston still to complete. */
export function startBrowserSouthRound(scores: Record<Seat, number>, random: () => number = Math.random, cards: SouthCards = dealSouthCards(random)): EastRoundState {
  return createSouthRound(shuffle(createTileSet(), random), 8, scores, cards);
}

/** Starts West/Goulash after South, preserving scores and rotating East counterclockwise again. */
export function startBrowserWestRound(
  scores: Record<Seat, number>,
  previousHumanSeat: Seat,
  random: () => number = Math.random,
  physicalSeats?: Record<Seat, Seat>,
): EastRoundState {
  return createWestRound(shuffle(createTileSet(), random), 8, scores, previousHumanSeat, physicalSeats);
}

/** Starts North after West. The setup choice is retained as part of serialized game state. */
export function startBrowserNorthRound(
  scores: Record<Seat, number>,
  previousHumanSeat: Seat,
  physicalSeats: Record<Seat, Seat>,
  format: NorthFormat,
  jokerRank?: number,
  cards?: SouthCards,
  random: () => number = Math.random,
): EastRoundState {
  return createNorthRound(shuffle(createTileSet(), random), 8, scores, previousHumanSeat, physicalSeats, format, jokerRank, cards ?? dealSouthCards(random));
}
