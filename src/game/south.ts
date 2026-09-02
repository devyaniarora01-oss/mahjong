import { createEastRound, type EastRoundState, type PlayerState } from "./state";
import { SOUTH_CARDS, SOUTH_CHARLESTON_PAIRS, type SouthCard } from "./south-cards";
import { SEATS, type Seat, type Tile } from "./tiles";

export type SouthCards = Record<Seat, SouthCard>;
export type CharlestonChoices = Record<Seat, readonly string[]>;

const emptyScores = (): Record<Seat, number> => ({ east: 35_000, south: 35_000, west: 35_000, north: 35_000 });

/** Deals South exactly like the rulebook's normal deal, then waits for the required R-A-L Charleston. */
export function createSouthRound(deck: readonly Tile[], diceTotal: number, scores: Record<Seat, number> = emptyScores(), cards: SouthCards = dealSouthCards(() => Math.random())): EastRoundState {
  const dealt = createEastRound(deck, diceTotal);
  const players = Object.fromEntries(SEATS.map((seat) => [seat, { ...dealt.players[seat], score: scores[seat] }])) as Record<Seat, PlayerState>;
  return { ...dealt, round: "south", phase: "charleston", players, south: { cards, pot: 0, charlestonStep: 0 } };
}

/** Each player secretly receives one South Card. A supplied random source keeps tests reproducible. */
export function dealSouthCards(random: () => number): SouthCards {
  const bag = [...SOUTH_CARDS];
  const result = {} as SouthCards;
  for (const seat of SEATS) {
    const index = Math.floor(random() * bag.length);
    result[seat] = bag.splice(index, 1)[0] ?? SOUTH_CARDS[0];
  }
  return result;
}

/** Applies one exact R-A-L Charleston step: every player exchanges three chosen cards with their paired seat. */
export function applyCharleston(state: EastRoundState, choices: CharlestonChoices): EastRoundState {
  if (state.round !== "south" || state.phase !== "charleston" || !state.south) throw new Error("Charleston is not active.");
  const pairs = SOUTH_CHARLESTON_PAIRS[state.south.charlestonStep];
  if (!pairs) throw new Error("Charleston has already finished.");
  for (const seat of SEATS) {
    const picked = choices[seat];
    if (!picked || picked.length !== 3 || new Set(picked).size !== 3 || !picked.every((id) => state.players[seat].hand.some((tile) => tile.id === id))) throw new Error("Each player must choose exactly three cards from their concealed hand.");
  }
  const players = Object.fromEntries(SEATS.map((seat) => [seat, { ...state.players[seat], hand: [...state.players[seat].hand] }])) as Record<Seat, PlayerState>;
  for (const [first, second] of pairs) {
    const firstGiven = players[first].hand.filter((tile) => choices[first].includes(tile.id));
    const secondGiven = players[second].hand.filter((tile) => choices[second].includes(tile.id));
    players[first] = { ...players[first], hand: [...players[first].hand.filter((tile) => !choices[first].includes(tile.id)), ...secondGiven] };
    players[second] = { ...players[second], hand: [...players[second].hand.filter((tile) => !choices[second].includes(tile.id)), ...firstGiven] };
  }
  const nextStep = state.south.charlestonStep + 1;
  return { ...state, players, phase: nextStep === SOUTH_CHARLESTON_PAIRS.length ? "discard" : "charleston", turn: "east", south: { ...state.south, charlestonStep: nextStep } };
}

const leftOf = (seat: Seat): Seat => SEATS[(SEATS.indexOf(seat) + SEATS.length - 1) % SEATS.length];

/** South-only buy: the player to the discarder’s left may take the discard for 100 into the shared pot, then must discard immediately. */
export function canBuySouthDiscard(state: EastRoundState, seat: Seat): boolean {
  return state.round === "south" && state.status === "active" && state.phase === "claim" && !!state.lastDiscard && leftOf(state.lastDiscard.by) === seat;
}

export function buySouthDiscard(state: EastRoundState, seat: Seat): EastRoundState {
  if (!canBuySouthDiscard(state, seat) || !state.lastDiscard || !state.south) throw new Error("This South Round buy is not legal now.");
  const player = state.players[seat];
  return { ...state, phase: "discard", turn: seat, lastDiscard: undefined, players: { ...state.players, [seat]: { ...player, hand: [...player.hand, state.lastDiscard.tile], score: player.score - 100 } }, south: { ...state.south, pot: state.south.pot + 100 } };
}
