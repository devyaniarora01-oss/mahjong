import {
  type NumberTile,
  type Seat,
  SEATS,
  type Tile,
  needsFlowerWallReplacement,
} from "./tiles";
import { settleEastRound, settleNorthEastRound, settleNorthSouthRound, settleNorthWestRound, settleSouthRound, settleWestRound } from "./scoring";
import type { SouthCard } from "./south-cards";
import { matchesSouthCard } from "./south-goals";
import { isWestMahjongHand } from "./west-goals";
import { isSouthNorthJoker, isWestNorthJoker, isWestNorthMahjongHand, matchesSouthNorthCard } from "./north-goals";

export type MeldKind = "pung" | "pureChow" | "crochet" | "knit" | "kong";
export type Meld = { kind: MeldKind; tiles: Tile[]; exposed: boolean };

export type PlayerState = {
  seat: Seat;
  /** Fixed physical table position for this person; their wind seat can rotate between rounds. */
  physicalSeat: Seat;
  hand: Tile[];
  bonusTiles: Tile[];
  melds: Meld[];
  /** True after this player has called a discard; used to preserve exposed-hand status. */
  hasCalled: boolean;
  score: number;
};

export type Phase = "draw" | "discard" | "claim" | "charleston";
export type HandStatus = "active" | "draw" | "mahjong";

export type GameEvent =
  | { type: "dealt"; diceTotal: number; flowerWallSize: number }
  | { type: "drew"; seat: Seat; source: "drawPile" | "flowerWall"; tileId: string }
  | { type: "replacedBonus"; seat: Seat; tileId: string }
  | { type: "discarded"; seat: Seat; tileId: string }
  | { type: "claimedPung"; seat: Seat; from: Seat; tileId: string }
  | { type: "claimedKong"; seat: Seat; from: Seat; tileId: string }
  | { type: "claimedPureChow"; seat: Seat; from: Seat; tileId: string }
  | { type: "declaredKong"; seat: Seat; tileId: string }
  | { type: "replacedJoker"; seat: Seat; tileId: string }
  | { type: "declaredMahjong"; seat: Seat; source: "draw" | "discard"; tileId?: string }
  | { type: "handDrawn"; reason: "drawPileExhausted" | "flowerWallExhausted" };

export type EastRoundState = {
  round?: "east" | "south" | "west" | "north";
  status: HandStatus;
  phase: Phase;
  turn: Seat;
  players: Record<Seat, PlayerState>;
  /** The human player's current wind seat. East Round starts with the human as East. */
  humanSeat?: Seat;
  drawPile: Tile[];
  flowerWall: Tile[];
  lastDiscard?: { tile: Tile; by: Seat };
  winner?: { seat: Seat; source: "draw" | "discard"; concealed: boolean };
  history: GameEvent[];
  south?: { cards: Record<Seat, SouthCard>; pot: number; charlestonStep: number };
  west?: { charlestonStep: number };
  /** North's East player selects one of the three rulebook formats. */
  north?: { format: "east" | "south" | "west"; jokerRank?: number };
};

const nextSeat = (seat: Seat): Seat => SEATS[(SEATS.indexOf(seat) + 1) % SEATS.length];

const emptyPlayer = (seat: Seat): PlayerState => ({ seat, physicalSeat: seat, hand: [], bonusTiles: [], melds: [], hasCalled: false, score: 35_000 });

const asPlayers = (): Record<Seat, PlayerState> => ({
  east: emptyPlayer("east"),
  south: emptyPlayer("south"),
  west: emptyPlayer("west"),
  north: emptyPlayer("north"),
});

function moveBonusTiles(player: PlayerState, flowerWall: Tile[], history: GameEvent[]): "ok" | "exhausted" {
  while (true) {
    const bonusIndex = player.hand.findIndex(needsFlowerWallReplacement);
    if (bonusIndex === -1) return "ok";
    const [bonus] = player.hand.splice(bonusIndex, 1);
    player.bonusTiles.push(bonus);
    history.push({ type: "replacedBonus", seat: player.seat, tileId: bonus.id });
    const replacement = flowerWall.shift();
    if (!replacement) return "exhausted";
    player.hand.push(replacement);
    history.push({ type: "drew", seat: player.seat, source: "flowerWall", tileId: replacement.id });
  }
}

/** Deals exactly by the rulebook's 36-card allocations and East-led dealing procedure. */
export function createEastRound(deck: readonly Tile[], diceTotal: number, options: { retainBonusTiles?: boolean } = {}): EastRoundState {
  if (deck.length !== 144) throw new Error("East Round requires the 144-card rulebook set.");
  const flowerWallSize = diceTotal * 2;
  if (!Number.isInteger(diceTotal) || flowerWallSize < 0 || flowerWallSize > 36) {
    throw new Error("Dice total must produce a Flower Wall from East's 36 cards.");
  }

  const allocations = {
    east: deck.slice(0, 36),
    south: deck.slice(36, 72),
    west: deck.slice(72, 108),
    north: deck.slice(108, 144),
  };
  const flowerWall = options.retainBonusTiles
    ? allocations.east.filter((tile) => !needsFlowerWallReplacement(tile)).slice(0, flowerWallSize)
    : [...allocations.east.slice(0, flowerWallSize)];
  const flowerWallIds = new Set(flowerWall.map((tile) => tile.id));
  const dealingQueue = [
    ...(options.retainBonusTiles ? allocations.east.filter((tile) => !flowerWallIds.has(tile.id)) : allocations.east.slice(flowerWallSize)),
    ...allocations.south,
    ...allocations.west,
    ...allocations.north,
  ];
  const players = asPlayers();
  const history: GameEvent[] = [{ type: "dealt", diceTotal, flowerWallSize }];

  for (let card = 0; card < 13; card += 1) {
    for (const seat of ["south", "west", "north", "east"] as const) {
      const tile = dealingQueue.shift();
      if (!tile) throw new Error("Insufficient cards while dealing.");
      players[seat].hand.push(tile);
    }
  }
  const eastExtra = dealingQueue.shift();
  if (!eastExtra) throw new Error("Insufficient card for East's fourteenth card.");
  players.east.hand.push(eastExtra);

  for (const seat of SEATS) {
    if (!options.retainBonusTiles && moveBonusTiles(players[seat], flowerWall, history) === "exhausted") {
      return {
        status: "draw",
        phase: "claim",
        turn: "east",
        players,
        humanSeat: "east",
        drawPile: dealingQueue,
        flowerWall,
        history: [...history, { type: "handDrawn", reason: "flowerWallExhausted" }],
      };
    }
  }

  return { status: "active", phase: "discard", turn: "east", players, humanSeat: "east", drawPile: dealingQueue, flowerWall, history };
}

export function discard(state: EastRoundState, seat: Seat, tileId: string): EastRoundState {
  if (state.status !== "active" || state.phase !== "discard" || state.turn !== seat) throw new Error("Discard is not legal now.");
  const player = state.players[seat];
  const index = player.hand.findIndex((tile) => tile.id === tileId);
  if (index === -1) throw new Error("Tile is not in this player's hand.");
  const tile = player.hand[index];
  return {
    ...state,
    phase: "claim",
    players: { ...state.players, [seat]: { ...player, hand: player.hand.filter((candidate) => candidate.id !== tileId) } },
    lastDiscard: { tile, by: seat },
    history: [...state.history, { type: "discarded", seat, tileId }],
  };
}

export function passClaims(state: EastRoundState): EastRoundState {
  if (state.status !== "active" || state.phase !== "claim" || !state.lastDiscard) throw new Error("There is no discard to pass.");
  return { ...state, phase: "draw", turn: nextSeat(state.lastDiscard.by) };
}

export function drawFromPile(state: EastRoundState, seat: Seat): EastRoundState {
  if (state.status !== "active" || state.phase !== "draw" || state.turn !== seat) throw new Error("Draw is not legal now.");
  const tile = state.drawPile[0];
  if (!tile) return { ...state, status: "draw", history: [...state.history, { type: "handDrawn", reason: "drawPileExhausted" }] };
  const player = { ...state.players[seat], hand: [...state.players[seat].hand, tile] };
  const flowerWall = [...state.flowerWall];
  const history: GameEvent[] = [...state.history, { type: "drew", seat, source: "drawPile", tileId: tile.id }];
  const southNorthJokers = state.round === "north" && state.north?.format === "south";
  if (!southNorthJokers && moveBonusTiles(player, flowerWall, history) === "exhausted") {
    return {
      ...state,
      status: "draw",
      players: { ...state.players, [seat]: player },
      drawPile: state.drawPile.slice(1),
      flowerWall,
      history: [...history, { type: "handDrawn", reason: "flowerWallExhausted" }],
    };
  }
  return { ...state, phase: "discard", players: { ...state.players, [seat]: player }, drawPile: state.drawPile.slice(1), flowerWall, history };
}

const sameTile = (left: Tile, right: Tile): boolean => {
  if (left.kind !== right.kind) return false;
  if (left.kind === "number" && right.kind === "number") return left.suit === right.suit && left.rank === right.rank;
  if (left.kind === "wind" && right.kind === "wind") return left.wind === right.wind;
  if (left.kind === "dragon" && right.kind === "dragon") return left.dragon === right.dragon;
  if (left.kind === "flower" && right.kind === "flower") return left.rank === right.rank;
  if (left.kind === "season" && right.kind === "season") return left.rank === right.rank;
  return false;
};

const isPung = (tiles: readonly Tile[]): boolean => tiles.length === 3 && tiles.every((tile) => sameTile(tile, tiles[0]));

const isKong = (tiles: readonly Tile[]): boolean => tiles.length === 4 && tiles.every((tile) => sameTile(tile, tiles[0]));

const isPureChow = (tiles: readonly Tile[]): boolean => {
  if (tiles.length !== 3 || !tiles.every((tile): tile is NumberTile => tile.kind === "number")) return false;
  if (new Set(tiles.map((tile) => tile.suit)).size !== 1) return false;
  const ranks = tiles.map((tile) => tile.rank).sort((left, right) => left - right);
  return ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
};

const isCrochet = (tiles: readonly Tile[]): boolean =>
  tiles.length === 3 &&
  tiles.every((tile): tile is NumberTile => tile.kind === "number") &&
  new Set(tiles.map((tile) => tile.rank)).size === 1 &&
  new Set(tiles.map((tile) => tile.suit)).size === 3;

const isPurePair = (tiles: readonly Tile[]): boolean => tiles.length === 2 && sameTile(tiles[0], tiles[1]);

const isKnit = (tiles: readonly Tile[]): boolean =>
  tiles.length === 2 &&
  tiles[0].kind === "number" &&
  tiles[1].kind === "number" &&
  tiles[0].rank === tiles[1].rank &&
  tiles[0].suit !== tiles[1].suit;

const isValidMeld = (meld: Meld): boolean =>
  (meld.kind === "pung" && isPung(meld.tiles)) ||
  (meld.kind === "pureChow" && isPureChow(meld.tiles)) ||
  (meld.kind === "crochet" && isCrochet(meld.tiles)) ||
  (meld.kind === "kong" && isKong(meld.tiles));

const removeIndices = (tiles: readonly Tile[], indices: readonly number[]): Tile[] =>
  tiles.filter((_, index) => !indices.includes(index));

function canPartitionEastHand(tiles: readonly Tile[], setsRemaining: number, pairRemaining: boolean, hasCrochet: boolean, knitUsed = false): boolean {
  if (tiles.length === 0) return setsRemaining === 0 && !pairRemaining && (!knitUsed || hasCrochet);
  const first = tiles[0];

  if (pairRemaining) {
    for (let second = 1; second < tiles.length; second += 1) {
      const pair = [first, tiles[second]];
      if ((isPurePair(pair) || isKnit(pair)) && canPartitionEastHand(removeIndices(tiles, [0, second]), setsRemaining, false, hasCrochet, knitUsed || isKnit(pair))) return true;
    }
  }

  if (setsRemaining === 0) return false;
  for (let second = 1; second < tiles.length; second += 1) {
    for (let third = second + 1; third < tiles.length; third += 1) {
      const set = [first, tiles[second], tiles[third]];
      const valid = isPung(set) || isPureChow(set) || isCrochet(set);
      if (valid && canPartitionEastHand(removeIndices(tiles, [0, second, third]), setsRemaining - 1, pairRemaining, hasCrochet || isCrochet(set), knitUsed)) return true;
    }
  }
  return false;
}

/**
 * Validates only East Round patterns explicitly defined in the supplied rulebook.
 * Mixed Chows are deliberately unsupported because the rulebook does not define them.
 */
export function isEastMahjongHand(hand: readonly Tile[], melds: readonly Meld[] = []): boolean {
  if (melds.length > 4 || !melds.every(isValidMeld)) return false;
  const representedCards = melds.length * 3;
  if (hand.length + representedCards !== 14) return false;
  return canPartitionEastHand(hand, 4 - melds.length, true, melds.some((meld) => meld.kind === "crochet"));
}

const isRoundMahjongHand = (state: EastRoundState, seat: Seat, hand: readonly Tile[], melds: readonly Meld[] = state.players[seat].melds): boolean =>
  state.round === "south" && state.south
    ? matchesSouthCard(state.south.cards[seat], [...hand, ...melds.flatMap((meld) => meld.tiles)])
    : state.round === "west"
      ? isWestMahjongHand(hand, melds)
      : state.round === "north" && state.north?.format === "south" && state.south
        ? matchesSouthNorthCard(state.south.cards[seat], hand, melds)
        : state.round === "north" && state.north?.format === "west"
          ? isWestNorthMahjongHand(hand, melds, state.north.jokerRank)
      : state.round === "north" && state.north?.format === "east"
        ? isEastMahjongHand(hand, melds)
      : isEastMahjongHand(hand, melds);

const seatsAfter = (seat: Seat): Seat[] => Array.from({ length: SEATS.length - 1 }, (_, index) => SEATS[(SEATS.indexOf(seat) + index + 1) % SEATS.length]);

/** Returns eligible discard winners in rulebook tie-break order. */
export function mahjongClaimants(state: EastRoundState): Seat[] {
  if (state.status !== "active" || state.phase !== "claim" || !state.lastDiscard) return [];
  return seatsAfter(state.lastDiscard.by).filter((seat) => isRoundMahjongHand(state, seat, [...state.players[seat].hand, state.lastDiscard!.tile]));
}

export function canDeclareMahjong(state: EastRoundState, seat: Seat): boolean {
  if (state.status !== "active") return false;
  if (state.phase === "discard") return state.turn === seat && isRoundMahjongHand(state, seat, state.players[seat].hand);
  return state.phase === "claim" && mahjongClaimants(state)[0] === seat;
}

export function declareMahjong(state: EastRoundState, seat: Seat): EastRoundState {
  if (!canDeclareMahjong(state, seat)) throw new Error("Mahjong declaration is not legal now.");
  if (state.phase === "claim") {
    const discard = state.lastDiscard!;
    const player = state.players[seat];
    const winner = { seat, source: "discard" as const, concealed: false };
    const unsettledPlayers = { ...state.players, [seat]: { ...player, hand: [...player.hand, discard.tile], hasCalled: true } };
    const settlement = state.round === "south" && state.south ? settleSouthRound(unsettledPlayers, { seat, cardScore: state.south.cards[seat].score }, state.south.pot) : state.round === "west" ? settleWestRound(unsettledPlayers, winner) : state.round === "north" && state.north?.format === "south" && state.south ? settleNorthSouthRound(unsettledPlayers, { seat, cardScore: state.south.cards[seat].score }, state.south.pot) : state.round === "north" && state.north?.format === "west" ? settleNorthWestRound(unsettledPlayers, winner, state.north.jokerRank) : state.round === "north" ? settleNorthEastRound(unsettledPlayers, winner) : settleEastRound(unsettledPlayers, winner);
    const players = Object.fromEntries(SEATS.map((item) => [item, { ...unsettledPlayers[item], score: unsettledPlayers[item].score + settlement.changes[item] }])) as Record<Seat, PlayerState>;
    return {
      ...state,
      status: "mahjong",
      lastDiscard: undefined,
      players,
      winner,
      history: [...state.history, { type: "declaredMahjong", seat, source: "discard", tileId: discard.tile.id }],
    };
  }
  const player = state.players[seat];
  const winner = { seat, source: "draw" as const, concealed: !player.hasCalled };
  const settlement = state.round === "south" && state.south ? settleSouthRound(state.players, { seat, cardScore: state.south.cards[seat].score }, state.south.pot) : state.round === "west" ? settleWestRound(state.players, winner) : state.round === "north" && state.north?.format === "south" && state.south ? settleNorthSouthRound(state.players, { seat, cardScore: state.south.cards[seat].score }, state.south.pot) : state.round === "north" && state.north?.format === "west" ? settleNorthWestRound(state.players, winner, state.north.jokerRank) : state.round === "north" ? settleNorthEastRound(state.players, winner) : settleEastRound(state.players, winner);
  const players = Object.fromEntries(SEATS.map((item) => [item, { ...state.players[item], score: state.players[item].score + settlement.changes[item] }])) as Record<Seat, PlayerState>;
  return {
    ...state,
    status: "mahjong",
    players,
    winner,
    history: [...state.history, { type: "declaredMahjong", seat, source: "draw" }],
  };
}

const takeMatching = (hand: Tile[], target: Tile, count: number): Tile[] | undefined => {
  const matching = hand.filter((tile) => sameTile(tile, target)).slice(0, count);
  return matching.length === count ? matching : undefined;
};

const canActAsMatch = (state: EastRoundState, tile: Tile, target: Tile): boolean =>
  sameTile(tile, target) ||
  (state.round === "north" && state.north?.format === "south" && isSouthNorthJoker(tile)) ||
  (state.round === "north" && state.north?.format === "west" && isWestNorthJoker(tile, state.north.jokerRank));

const takeMatchingOrNorthJokers = (state: EastRoundState, hand: Tile[], target: Tile, count: number): Tile[] | undefined => {
  const exact = hand.filter((tile) => sameTile(tile, target));
  const jokers = hand.filter((tile) => !sameTile(tile, target) && canActAsMatch(state, tile, target));
  const result = [...exact, ...jokers].slice(0, count);
  return result.length === count ? result : undefined;
};

export function canClaimPung(state: EastRoundState, seat: Seat): boolean {
  return state.status === "active" && state.phase === "claim" && !!state.lastDiscard && mahjongClaimants(state).length === 0 && !!takeMatchingOrNorthJokers(state, state.players[seat].hand, state.lastDiscard.tile, 2);
}

export function claimPung(state: EastRoundState, seat: Seat): EastRoundState {
  if (!state.lastDiscard || !canClaimPung(state, seat)) throw new Error("Pung claim is not legal now.");
  const claimed = takeMatchingOrNorthJokers(state, state.players[seat].hand, state.lastDiscard.tile, 2)!;
  const player = state.players[seat];
  return {
    ...state,
    phase: "discard",
    turn: seat,
    lastDiscard: undefined,
    players: {
      ...state.players,
      [seat]: { ...player, hand: player.hand.filter((tile) => !claimed.some((used) => used.id === tile.id)), melds: [...player.melds, { kind: "pung", tiles: [...claimed, state.lastDiscard.tile], exposed: true }], hasCalled: true },
    },
    history: [...state.history, { type: "claimedPung", seat, from: state.lastDiscard.by, tileId: state.lastDiscard.tile.id }],
  };
}

/** West explicitly permits calling a discard to complete an exposed Kong. */
export function canClaimExposedKong(state: EastRoundState, seat: Seat): boolean {
  return (state.round === "west" || (state.round === "north" && state.north?.format === "west")) && state.status === "active" && state.phase === "claim" && !!state.lastDiscard && mahjongClaimants(state).length === 0 && !!takeMatchingOrNorthJokers(state, state.players[seat].hand, state.lastDiscard.tile, 3);
}

export function claimExposedKong(state: EastRoundState, seat: Seat): EastRoundState {
  if (!state.lastDiscard || !canClaimExposedKong(state, seat)) throw new Error("Exposed Kong claim is not legal now.");
  const claimed = takeMatchingOrNorthJokers(state, state.players[seat].hand, state.lastDiscard.tile, 3)!;
  const player = state.players[seat];
  const hand = player.hand.filter((tile) => !claimed.some((used) => used.id === tile.id));
  const replacement = state.flowerWall[0];
  const kongPlayer = { ...player, hand: replacement ? [...hand, replacement] : hand, melds: [...player.melds, { kind: "kong" as const, tiles: [...claimed, state.lastDiscard.tile], exposed: true }], hasCalled: true };
  const history: GameEvent[] = [...state.history, { type: "claimedKong", seat, from: state.lastDiscard.by, tileId: state.lastDiscard.tile.id }];
  if (!replacement) return { ...state, status: "draw", lastDiscard: undefined, players: { ...state.players, [seat]: kongPlayer }, history: [...history, { type: "handDrawn", reason: "flowerWallExhausted" }] };
  history.push({ type: "drew", seat, source: "flowerWall", tileId: replacement.id });
  const flowerWall = state.flowerWall.slice(1);
  if (!(state.round === "north" && state.north?.format === "south") && moveBonusTiles(kongPlayer, flowerWall, history) === "exhausted") {
    return { ...state, status: "draw", lastDiscard: undefined, flowerWall, players: { ...state.players, [seat]: kongPlayer }, history: [...history, { type: "handDrawn", reason: "flowerWallExhausted" }] };
  }
  return { ...state, phase: "discard", turn: seat, lastDiscard: undefined, flowerWall, players: { ...state.players, [seat]: kongPlayer }, history };
}

export function canClaimPureChow(state: EastRoundState, seat: Seat): boolean {
  const discardTile = state.lastDiscard?.tile;
  if (state.round === "west" || (state.round === "north" && state.north?.format === "west") || state.status !== "active" || state.phase !== "claim" || !discardTile || mahjongClaimants(state).length > 0 || seat !== nextSeat(state.lastDiscard!.by) || discardTile.kind !== "number") return false;
  const southNorth = state.round === "north" && state.north?.format === "south";
  const candidates = state.players[seat].hand.filter((tile) => (tile.kind === "number" && tile.suit === discardTile.suit) || (southNorth && isSouthNorthJoker(tile)));
  for (const first of candidates) for (const second of candidates) {
    if (first.id === second.id) continue;
    const numbered = [discardTile, first, second].filter((tile): tile is NumberTile => tile.kind === "number");
    if (numbered.length !== new Set(numbered.map((tile) => tile.rank)).size || numbered.some((tile) => tile.suit !== discardTile.suit)) continue;
    if ([discardTile.rank - 2, discardTile.rank - 1, discardTile.rank].some((start) => start >= 1 && start <= 7 && numbered.every((tile) => tile.rank >= start && tile.rank <= start + 2))) return true;
  }
  return false;
}

export function claimPureChow(state: EastRoundState, seat: Seat, tileIds: readonly [string, string]): EastRoundState {
  if (!state.lastDiscard || !canClaimPureChow(state, seat)) throw new Error("Pure Chow claim is not legal now.");
  const chosen = tileIds.map((id) => state.players[seat].hand.find((tile) => tile.id === id));
  if (chosen.some((tile) => !tile) || chosen[0]!.id === chosen[1]!.id) throw new Error("Choose two distinct hand tiles.");
  const discardTile = state.lastDiscard.tile;
  if (discardTile.kind !== "number") throw new Error("Pure Chow requires a numbered discard.");
  const southNorth = state.round === "north" && state.north?.format === "south";
  const numbered = [discardTile, ...(chosen as Tile[])].filter((tile): tile is NumberTile => tile.kind === "number");
  if (numbered.some((tile) => tile.suit !== discardTile.suit) || (chosen as Tile[]).some((tile) => tile.kind !== "number" && !(southNorth && isSouthNorthJoker(tile)))) throw new Error("Pure Chow requires the same numbered suit.");
  if (numbered.length !== new Set(numbered.map((tile) => tile.rank)).size || ![discardTile.rank - 2, discardTile.rank - 1, discardTile.rank].some((start) => start >= 1 && start <= 7 && numbered.every((tile) => tile.rank >= start && tile.rank <= start + 2))) throw new Error("Tiles do not form a Pure Chow.");
  const player = state.players[seat];
  return {
    ...state,
    phase: "discard",
    turn: seat,
    lastDiscard: undefined,
    players: {
      ...state.players,
      [seat]: { ...player, hand: player.hand.filter((tile) => !tileIds.includes(tile.id)), melds: [...player.melds, { kind: "pureChow", tiles: [...(chosen as Tile[]), discardTile], exposed: true }], hasCalled: true },
    },
    history: [...state.history, { type: "claimedPureChow", seat, from: state.lastDiscard.by, tileId: discardTile.id }],
  };
}

export function canDeclareConcealedKong(state: EastRoundState, seat: Seat, tileId: string): boolean {
  if (state.status !== "active" || state.phase !== "discard" || state.turn !== seat) return false;
  const tile = state.players[seat].hand.find((candidate) => candidate.id === tileId);
  return !!tile && !!takeMatchingOrNorthJokers(state, state.players[seat].hand, tile, 4);
}

export function declareConcealedKong(state: EastRoundState, seat: Seat, tileId: string): EastRoundState {
  if (!canDeclareConcealedKong(state, seat, tileId)) throw new Error("Concealed Kong declaration is not legal now.");
  const target = state.players[seat].hand.find((tile) => tile.id === tileId)!;
  const kongTiles = takeMatchingOrNorthJokers(state, state.players[seat].hand, target, 4)!;
  const player = state.players[seat];
  const flowerWall = [...state.flowerWall];
  const history: GameEvent[] = [...state.history, { type: "declaredKong", seat, tileId }];
  const kongPlayer = { ...player, hand: player.hand.filter((tile) => !kongTiles.some((used) => used.id === tile.id)), melds: [...player.melds, { kind: "kong" as const, tiles: kongTiles, exposed: false }] };
  const replacement = flowerWall.shift();
  if (!replacement) {
    return { ...state, status: "draw", players: { ...state.players, [seat]: kongPlayer }, flowerWall, history: [...history, { type: "handDrawn", reason: "flowerWallExhausted" }] };
  }
  kongPlayer.hand.push(replacement);
  history.push({ type: "drew", seat, source: "flowerWall", tileId: replacement.id });
  if (!(state.round === "north" && state.north?.format === "south") && moveBonusTiles(kongPlayer, flowerWall, history) === "exhausted") {
    return { ...state, status: "draw", players: { ...state.players, [seat]: kongPlayer }, flowerWall, history: [...history, { type: "handDrawn", reason: "flowerWallExhausted" }] };
  }
  return { ...state, players: { ...state.players, [seat]: kongPlayer }, flowerWall, history };
}

/** West-as-North: a later drawn matching card may replace a visible joker in an exposed Pung/Kong. */
export function canReplaceNorthExposedJoker(state: EastRoundState, seat: Seat): boolean {
  if (state.round !== "north" || state.north?.format !== "west" || state.status !== "active" || state.turn !== seat || state.phase !== "discard") return false;
  return state.players[seat].melds.some((meld) => {
    if (!meld.exposed || (meld.kind !== "pung" && meld.kind !== "kong")) return false;
    const joker = meld.tiles.find((tile) => isWestNorthJoker(tile, state.north?.jokerRank));
    const target = meld.tiles.find((tile) => !isWestNorthJoker(tile, state.north?.jokerRank));
    return !!joker && !!target && state.players[seat].hand.some((tile) => sameTile(tile, target));
  });
}

export function replaceNorthExposedJoker(state: EastRoundState, seat: Seat): EastRoundState {
  if (!canReplaceNorthExposedJoker(state, seat)) throw new Error("No exposed North joker can be replaced now.");
  const player = state.players[seat];
  let reclaimed: Tile | undefined;
  let matching: Tile | undefined;
  const melds = player.melds.map((meld) => {
    if (reclaimed || !meld.exposed || (meld.kind !== "pung" && meld.kind !== "kong")) return meld;
    const jokerIndex = meld.tiles.findIndex((tile) => isWestNorthJoker(tile, state.north?.jokerRank));
    const target = meld.tiles.find((tile) => !isWestNorthJoker(tile, state.north?.jokerRank));
    const replacement = target && player.hand.find((tile) => sameTile(tile, target));
    if (jokerIndex < 0 || !target || !replacement) return meld;
    reclaimed = meld.tiles[jokerIndex];
    matching = replacement;
    const tiles = [...meld.tiles];
    tiles[jokerIndex] = replacement;
    return { ...meld, tiles };
  });
  if (!reclaimed || !matching) throw new Error("No exposed North joker can be replaced now.");
  return {
    ...state,
    players: { ...state.players, [seat]: { ...player, hand: [...player.hand.filter((tile) => tile.id !== matching!.id), reclaimed], melds } },
    history: [...state.history, { type: "replacedJoker", seat, tileId: reclaimed.id }],
  };
}
