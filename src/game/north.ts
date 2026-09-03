import { createEastRound, type EastRoundState, type PlayerState } from "./state";
import { dealSouthCards, type SouthCards } from "./south";
import { SEATS, type Seat, type Tile } from "./tiles";

export type NorthFormat = "east" | "south" | "west";

/**
 * North chooses one of the three rulebook formats.  Keeping the random source
 * injectable makes the three equal ranges easy to test without making browser
 * games deterministic.
 */
export const NORTH_FORMATS: readonly NorthFormat[] = ["east", "south", "west"];

export function chooseNorthFormat(random: () => number = Math.random): NorthFormat {
  return NORTH_FORMATS[Math.floor(random() * NORTH_FORMATS.length)] ?? "east";
}

export function chooseNorthJokerRank(random: () => number = Math.random): number {
  return Math.floor(random() * 9) + 1;
}

const previousSeatForNextRound: Record<Seat, Seat> = { east: "south", south: "west", west: "north", north: "east" };
const nextSeatForPrevious: Record<Seat, Seat> = { east: "north", south: "east", west: "south", north: "west" };

/** Creates the North table and retains people, scores, and physical seats from West. */
export function createNorthRound(
  deck: readonly Tile[],
  diceTotal: number,
  scores: Record<Seat, number>,
  previousHumanSeat: Seat,
  physicalSeats: Record<Seat, Seat>,
  format: NorthFormat,
  jokerRank?: number,
  cards: SouthCards = dealSouthCards(Math.random),
): EastRoundState {
  const dealt = createEastRound(deck, diceTotal, { retainBonusTiles: format === "south" });
  const players = Object.fromEntries(SEATS.map((seat) => {
    const previousSeat = previousSeatForNextRound[seat];
    return [seat, { ...dealt.players[seat], seat, physicalSeat: physicalSeats[previousSeat], score: scores[previousSeat] }];
  })) as Record<Seat, PlayerState>;
  const needsCharleston = format === "south" || format === "west";
  return {
    ...dealt,
    round: "north",
    players,
    humanSeat: nextSeatForPrevious[previousHumanSeat],
    phase: needsCharleston ? "charleston" : dealt.phase,
    north: { format, jokerRank: format === "west" ? jokerRank : undefined },
    ...(format === "south" ? { south: { cards, pot: 0, charlestonStep: 0 } } : {}),
    ...(format === "west" ? { west: { charlestonStep: 0 } } : {}),
  };
}
