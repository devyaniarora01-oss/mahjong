import { createEastRound, type EastRoundState } from "./state";
import { createSouthRound, dealSouthCards, type SouthCards } from "./south";
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
