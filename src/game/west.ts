import { createEastRound, type EastRoundState, type PlayerState } from "./state";
import { SEATS, type Seat, type Tile } from "./tiles";

export type CharlestonChoices = Record<Seat, readonly string[]>;

/** East moves counterclockwise: South becomes East, West becomes South, North becomes West, East becomes North. */
const previousSeatForNextRound: Record<Seat, Seat> = { east: "south", south: "west", west: "north", north: "east" };
const nextSeatForPrevious: Record<Seat, Seat> = { east: "north", south: "east", west: "south", north: "west" };

/** Creates the West/Goulash deal, preserving people and scores while rotating their wind seats. */
/**
 * Starts West from the people and scores that ended South.  `physicalSeats`
 * belongs to people, not winds: the human remains at the bottom of the table
 * even as their wind seat rotates.
 */
export function createWestRound(
  deck: readonly Tile[],
  diceTotal: number,
  scores: Record<Seat, number>,
  previousHumanSeat: Seat = "north",
  physicalSeats: Record<Seat, Seat> = { east: "south", south: "west", west: "north", north: "east" },
): EastRoundState {
  const dealt = createEastRound(deck, diceTotal);
  const players = Object.fromEntries(SEATS.map((seat) => {
    const previousSeat = previousSeatForNextRound[seat];
    return [seat, { ...dealt.players[seat], seat, physicalSeat: physicalSeats[previousSeat], score: scores[previousSeat] }];
  })) as Record<Seat, PlayerState>;
  return {
    ...dealt,
    round: "west",
    phase: "charleston",
    players,
    humanSeat: nextSeatForPrevious[previousHumanSeat],
    west: { charlestonStep: 0 },
  };
}

const exchanges: readonly (readonly (readonly [Seat, Seat])[])[] = [
  [["east", "south"], ["north", "west"]],
  [["east", "west"], ["north", "south"]],
  [["east", "north"], ["south", "west"]],
];

/** West uses the same mandatory Right, Across, Left Charleston as described in the rulebook. */
export function applyWestCharleston(state: EastRoundState, choices: CharlestonChoices): EastRoundState {
  if (state.round !== "west" || state.phase !== "charleston" || !state.west) throw new Error("West Charleston is not active.");
  const pairs = exchanges[state.west.charlestonStep];
  if (!pairs) throw new Error("West Charleston has already finished.");
  for (const seat of SEATS) {
    const picked = choices[seat];
    if (!picked || picked.length !== 3 || new Set(picked).size !== 3 || !picked.every((id) => state.players[seat].hand.some((tile) => tile.id === id))) throw new Error("Each player must choose exactly three tiles from their concealed hand.");
  }
  const players = Object.fromEntries(SEATS.map((seat) => [seat, { ...state.players[seat], hand: [...state.players[seat].hand] }])) as Record<Seat, PlayerState>;
  for (const [first, second] of pairs) {
    const firstTiles = players[first].hand.filter((tile) => choices[first].includes(tile.id));
    const secondTiles = players[second].hand.filter((tile) => choices[second].includes(tile.id));
    players[first] = { ...players[first], hand: [...players[first].hand.filter((tile) => !choices[first].includes(tile.id)), ...secondTiles] };
    players[second] = { ...players[second], hand: [...players[second].hand.filter((tile) => !choices[second].includes(tile.id)), ...firstTiles] };
  }
  const charlestonStep = state.west.charlestonStep + 1;
  return { ...state, players, phase: charlestonStep === exchanges.length ? "discard" : "charleston", turn: "east", west: { charlestonStep } };
}
