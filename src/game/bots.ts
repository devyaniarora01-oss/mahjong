import {
  canClaimPung,
  canClaimExposedKong,
  canClaimPureChow,
  canDeclareMahjong,
  canDeclareConcealedKong,
  claimPung,
  claimExposedKong,
  claimPureChow,
  declareConcealedKong,
  declareMahjong,
  discard,
  drawFromPile,
  mahjongClaimants,
  passClaims,
  type EastRoundState,
} from "./state";
import { bestMoveOptions } from "./coaching";
import { SEATS, type Seat, type Tile } from "./tiles";

export type BotAction =
  | { type: "draw"; seat: Seat }
  | { type: "discard"; seat: Seat; tileId: string }
  | { type: "pung"; seat: Seat }
  | { type: "exposedKong"; seat: Seat }
  | { type: "pureChow"; seat: Seat; tileIds: [string, string] }
  | { type: "kong"; seat: Seat; tileId: string }
  | { type: "mahjong"; seat: Seat }
  | { type: "pass" };

const seatsAfter = (seat: Seat): Seat[] =>
  Array.from({ length: SEATS.length - 1 }, (_, index) => SEATS[(SEATS.indexOf(seat) + index + 1) % SEATS.length]);

const sortedTileIds = (state: EastRoundState, seat: Seat): string[] =>
  state.players[seat].hand.map((tile) => tile.id).sort();

const isWestFormat = (state: EastRoundState) => state.round === "west" || (state.round === "north" && state.north?.format === "west");

/** Pick the numbered suit the bot already has most reason to keep. */
const westPreferredSuit = (hand: readonly Tile[]) => (["bamboo", "character", "dot"] as const)
  .map((suit) => {
    const tiles = hand.filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number" && tile.suit === suit);
    const repeats = tiles.reduce((total, tile) => total + Math.max(0, tiles.filter((other) => other.rank === tile.rank).length - 1), 0);
    return { suit, count: tiles.length, repeats };
  })
  .sort((left, right) => right.count - left.count || right.repeats - left.repeats)[0].suit;

/** West bots discard/pass other numbered suits before breaking their chosen suit or Honour tiles. */
const westSheddingOrder = (hand: readonly Tile[]): Tile[] => {
  const preferredSuit = westPreferredSuit(hand);
  return [...hand].sort((left, right) => {
    const leftExtraSuit = left.kind === "number" && left.suit !== preferredSuit ? 0 : 1;
    const rightExtraSuit = right.kind === "number" && right.suit !== preferredSuit ? 0 : 1;
    if (leftExtraSuit !== rightExtraSuit) return leftExtraSuit - rightExtraSuit;
    const leftCopies = hand.filter((tile) => identity(tile) === identity(left)).length;
    const rightCopies = hand.filter((tile) => identity(tile) === identity(right)).length;
    return leftCopies - rightCopies || left.id.localeCompare(right.id);
  });
};

const identity = (tile: Tile) => tile.kind === "number" ? `${tile.kind}-${tile.suit}-${tile.rank}` : tile.kind === "wind" ? `${tile.kind}-${tile.wind}` : tile.kind === "dragon" ? `${tile.kind}-${tile.dragon}` : `${tile.kind}-${tile.rank}`;

export function chooseBotCharlestonTileIds(state: EastRoundState, seat: Seat): string[] {
  const hand = state.players[seat].hand;
  const southFormat = state.round === "south" || (state.round === "north" && state.north?.format === "south");
  // South Cards are personal targets, so South bots use the same card-aware
  // Charleston recommendations shown to the human player.
  if (southFormat) {
    const choices = bestMoveOptions(state, seat).map((option) => option.tileId);
    if (choices.length === 3) return choices;
  }
  return (isWestFormat(state) ? westSheddingOrder(hand) : [...hand].sort((left, right) => left.id.localeCompare(right.id))).slice(0, 3).map((tile) => tile.id);
}

const westBotShouldCall = (state: EastRoundState, seat: Seat): boolean => {
  const discard = state.lastDiscard?.tile;
  if (!discard || !isWestFormat(state) || discard.kind !== "number") return true;
  return discard.suit === westPreferredSuit([...state.players[seat].hand, discard]);
};

const westBotKeepsTile = (state: EastRoundState, seat: Seat, tileId: string): boolean => {
  if (!isWestFormat(state)) return true;
  const tile = state.players[seat].hand.find((item) => item.id === tileId);
  return !tile || tile.kind !== "number" || tile.suit === westPreferredSuit(state.players[seat].hand);
};

/** A deterministic policy that keeps completed and developing visible structures. */
export function chooseBotTurnAction(state: EastRoundState, seat: Seat): BotAction | undefined {
  if (state.status !== "active" || state.turn !== seat) return undefined;
  if (state.phase === "draw") return { type: "draw", seat };
  if (state.phase !== "discard") return undefined;
  if (canDeclareMahjong(state, seat)) return { type: "mahjong", seat };
  const kongTile = sortedTileIds(state, seat).find((tileId) => canDeclareConcealedKong(state, seat, tileId) && westBotKeepsTile(state, seat, tileId));
  if (kongTile) return { type: "kong", seat, tileId: kongTile };
  const coachedChoice = !isWestFormat(state) ? bestMoveOptions(state, seat)[0]?.tileId : undefined;
  const tileId = coachedChoice ?? (isWestFormat(state) ? westSheddingOrder(state.players[seat].hand).map((tile) => tile.id) : sortedTileIds(state, seat))[0];
  return tileId ? { type: "discard", seat, tileId } : undefined;
}

/**
 * Selects an automated claim after the human has had an opportunity to act.
 * Mahjong priority comes from the reducer; non-Mahjong bot claims are resolved
 * clockwise, with Pung before the next player's Pure Chow as a documented UI policy.
 */
export function chooseBotClaimAction(state: EastRoundState, humanSeat: Seat): BotAction | undefined {
  if (state.status !== "active" || state.phase !== "claim" || !state.lastDiscard) return undefined;
  const winner = mahjongClaimants(state)[0];
  if (winner) return winner === humanSeat ? undefined : { type: "mahjong", seat: winner };

  for (const seat of seatsAfter(state.lastDiscard.by)) {
    if (seat !== humanSeat && canClaimExposedKong(state, seat) && westBotShouldCall(state, seat)) return { type: "exposedKong", seat };
    if (seat !== humanSeat && canClaimPung(state, seat) && westBotShouldCall(state, seat)) return { type: "pung", seat };
  }

  const chowSeat = seatsAfter(state.lastDiscard.by)[0];
  if (chowSeat !== humanSeat && canClaimPureChow(state, chowSeat)) {
    const candidates = state.players[chowSeat].hand;
    for (let first = 0; first < candidates.length; first += 1) {
      for (let second = first + 1; second < candidates.length; second += 1) {
        try {
          // The reducer remains the authority for validating the selected pair.
          claimPureChow(state, chowSeat, [candidates[first].id, candidates[second].id]);
          return { type: "pureChow", seat: chowSeat, tileIds: [candidates[first].id, candidates[second].id] };
        } catch {
          // Try the next pair; an invalid candidate is not a rule decision.
        }
      }
    }
  }
  return { type: "pass" };
}

/** Applies an already-selected legal bot action through the existing reducer. */
export function applyBotAction(state: EastRoundState, action: BotAction): EastRoundState {
  switch (action.type) {
    case "draw": return drawFromPile(state, action.seat);
    case "discard": return discard(state, action.seat, action.tileId);
    case "pung": return claimPung(state, action.seat);
    case "exposedKong": return claimExposedKong(state, action.seat);
    case "pureChow": return claimPureChow(state, action.seat, action.tileIds);
    case "kong": return declareConcealedKong(state, action.seat, action.tileId);
    case "mahjong": return declareMahjong(state, action.seat);
    case "pass": return passClaims(state);
  }
}
