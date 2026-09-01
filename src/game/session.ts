import { createEastRound, type EastRoundState } from "./state";
import { createTileSet, shuffle } from "./tiles";

/** Creates a fresh browser hand; tests may supply a deterministic random source. */
export function startBrowserEastRound(random: () => number = Math.random): EastRoundState {
  // The rulebook's illustrated 8-roll Flower Wall keeps the teaching setup stable;
  // the deck itself is freshly shuffled for every browser hand.
  return createEastRound(shuffle(createTileSet(), random), 8);
}
