import {
  canClaimPung,
  canClaimPureChow,
  canDeclareMahjong,
  canDeclareConcealedKong,
  claimPung,
  claimPureChow,
  declareConcealedKong,
  declareMahjong,
  discard,
  drawFromPile,
  mahjongClaimants,
  passClaims,
  type EastRoundState,
} from "./state";
import { SEATS, type Seat } from "./tiles";

export type BotAction =
  | { type: "draw"; seat: Seat }
  | { type: "discard"; seat: Seat; tileId: string }
  | { type: "pung"; seat: Seat }
  | { type: "pureChow"; seat: Seat; tileIds: [string, string] }
  | { type: "kong"; seat: Seat; tileId: string }
  | { type: "mahjong"; seat: Seat }
  | { type: "pass" };

const seatsAfter = (seat: Seat): Seat[] =>
  Array.from({ length: SEATS.length - 1 }, (_, index) => SEATS[(SEATS.indexOf(seat) + index + 1) % SEATS.length]);

const sortedTileIds = (state: EastRoundState, seat: Seat): string[] =>
  state.players[seat].hand.map((tile) => tile.id).sort();

/** A deliberately simple, deterministic policy; it does not evaluate hand strength. */
export function chooseBotTurnAction(state: EastRoundState, seat: Seat): BotAction | undefined {
  if (state.status !== "active" || state.turn !== seat) return undefined;
  if (state.phase === "draw") return { type: "draw", seat };
  if (state.phase !== "discard") return undefined;
  if (canDeclareMahjong(state, seat)) return { type: "mahjong", seat };
  const kongTile = sortedTileIds(state, seat).find((tileId) => canDeclareConcealedKong(state, seat, tileId));
  if (kongTile) return { type: "kong", seat, tileId: kongTile };
  const tileId = sortedTileIds(state, seat)[0];
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
    if (seat !== humanSeat && canClaimPung(state, seat)) return { type: "pung", seat };
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
    case "pureChow": return claimPureChow(state, action.seat, action.tileIds);
    case "kong": return declareConcealedKong(state, action.seat, action.tileId);
    case "mahjong": return declareMahjong(state, action.seat);
    case "pass": return passClaims(state);
  }
}
