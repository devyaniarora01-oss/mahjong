import { describe, expect, it } from "vitest";
import {
  canClaimPung,
  canClaimPureChow,
  canDeclareMahjong,
  claimPung,
  claimPureChow,
  createEastRound,
  createEastRound as deal,
  declareConcealedKong,
  declareMahjong,
  discard,
  drawFromPile,
  isEastMahjongHand,
  mahjongClaimants,
  passClaims,
} from "./state";
import { createTileSet, type Tile } from "./tiles";

const numbered = (suit: "bamboo" | "character" | "dot", rank: number, count = 1, offset = 0): Tile[] =>
  createTileSet().filter((tile) => tile.kind === "number" && tile.suit === suit && tile.rank === rank).slice(offset, offset + count);

const eastWinningHand = (knit = false): Tile[] => [
  ...numbered("bamboo", 1, 3),
  ...numbered("character", 2), ...numbered("character", 3), ...numbered("character", 4),
  ...numbered("bamboo", 5), ...numbered("character", 5), ...numbered("dot", 5),
  ...numbered("dot", 6), ...numbered("dot", 7), ...numbered("dot", 8),
  ...(knit ? [...numbered("bamboo", 9), ...numbered("character", 9)] : numbered("bamboo", 9, 2)),
];

describe("East Round setup and turn state", () => {
  it("deals 13 cards each, a fourteenth card to East, and a dice-sized Flower Wall", () => {
    const state = createEastRound(createTileSet(), 8);
    expect(state.status).toBe("active");
    expect(state.phase).toBe("discard");
    expect(state.turn).toBe("east");
    expect(state.players.east.hand).toHaveLength(14);
    expect(state.players.south.hand).toHaveLength(13);
    expect(state.players.west.hand).toHaveLength(13);
    expect(state.players.north.hand).toHaveLength(13);
    expect(state.flowerWall).toHaveLength(16);
    expect(state.drawPile).toHaveLength(75);
  });

  it("moves dealt and drawn Flowers/Seasons to bonuses and replaces them from the Flower Wall", () => {
    const deck = createTileSet();
    const flowerIndex = deck.findIndex((tile) => tile.kind === "flower");
    [deck[2], deck[flowerIndex]] = [deck[flowerIndex], deck[2]];
    const dealt = createEastRound(deck, 1);
    expect(dealt.players.south.bonusTiles).toHaveLength(1);
    expect(dealt.players.south.hand).toHaveLength(13);

    const flower = createTileSet().find((tile) => tile.kind === "flower")!;
    const replacement = numbered("dot", 9)[0];
    const afterDiscard = discard(dealt, "east", dealt.players.east.hand[0].id);
    const waiting = { ...passClaims(afterDiscard), drawPile: [flower], flowerWall: [replacement] };
    const drawn = drawFromPile(waiting, "south");
    expect(drawn.players.south.bonusTiles).toHaveLength(2);
    expect(drawn.players.south.hand).toHaveLength(14);
    expect(drawn.players.south.hand).toContainEqual(replacement);
  });

  it("moves play from East's discard to the next player's draw", () => {
    const start = deal(createTileSet(), 8);
    const afterDiscard = discard(start, "east", start.players.east.hand[0].id);
    const afterPass = passClaims(afterDiscard);
    const afterDraw = drawFromPile(afterPass, "south");
    expect(afterDiscard.phase).toBe("claim");
    expect(afterPass.turn).toBe("south");
    expect(afterDraw.phase).toBe("discard");
    expect(afterDraw.players.south.hand).toHaveLength(14);
  });

  it("allows any seat to call a discard for a Pung", () => {
    const state = deal(createTileSet(), 8);
    const discardTile = state.players.east.hand[0];
    const matching = createTileSet().filter((tile) => tile.id !== discardTile.id && tile.kind === discardTile.kind && tile.kind === "number" && discardTile.kind === "number" && tile.suit === discardTile.suit && tile.rank === discardTile.rank).slice(0, 2);
    const staged = { ...state, players: { ...state.players, west: { ...state.players.west, hand: matching } } };
    const pending = discard(staged, "east", discardTile.id);
    expect(canClaimPung(pending, "west")).toBe(true);
    const claimed = claimPung(pending, "west");
    expect(claimed.turn).toBe("west");
    expect(claimed.players.west.melds[0].kind).toBe("pung");
  });

  it("only allows the next player to claim a Pure Chow", () => {
    const state = deal(createTileSet(), 8);
    const source = createTileSet();
    const discardTile = source.find((tile) => tile.kind === "number" && tile.suit === "bamboo" && tile.rank === 2)!;
    const chowTiles = [
      source.find((tile) => tile.kind === "number" && tile.suit === "bamboo" && tile.rank === 1)!,
      source.find((tile) => tile.kind === "number" && tile.suit === "bamboo" && tile.rank === 3)!,
    ];
    const staged = { ...state, players: { ...state.players, east: { ...state.players.east, hand: [discardTile] }, south: { ...state.players.south, hand: chowTiles }, west: { ...state.players.west, hand: chowTiles } } };
    const pending = discard(staged, "east", discardTile.id);
    expect(canClaimPureChow(pending, "south")).toBe(true);
    expect(canClaimPureChow(pending, "west")).toBe(false);

    const claimed = claimPureChow(pending, "south", [chowTiles[0].id, chowTiles[1].id]);
    expect(claimed.phase).toBe("discard");
    expect(claimed.turn).toBe("south");
    expect(claimed.players.south.melds).toMatchObject([{ kind: "pureChow", exposed: true }]);
  });

  it("validates the explicitly defined East Round hand patterns, including Crochet and Knit", () => {
    expect(isEastMahjongHand(eastWinningHand())).toBe(true);
    expect(isEastMahjongHand(eastWinningHand(true))).toBe(true);

    const noCrochet = [
      ...numbered("bamboo", 1, 3),
      ...numbered("character", 2), ...numbered("character", 3), ...numbered("character", 4),
      ...numbered("dot", 5), ...numbered("dot", 6), ...numbered("dot", 7),
      ...numbered("bamboo", 6), ...numbered("bamboo", 7), ...numbered("bamboo", 8),
      ...numbered("character", 9), ...numbered("dot", 9),
    ];
    expect(isEastMahjongHand(noCrochet)).toBe(false);
  });

  it("allows a legal self-drawn Mahjong declaration and records a concealed winner", () => {
    const state = deal(createTileSet(), 8);
    const staged = { ...state, players: { ...state.players, east: { ...state.players.east, hand: eastWinningHand() } } };
    expect(canDeclareMahjong(staged, "east")).toBe(true);
    const won = declareMahjong(staged, "east");
    expect(won.status).toBe("mahjong");
    expect(won.winner).toEqual({ seat: "east", source: "draw", concealed: true });
  });

  it("gives Mahjong priority over a Pung and applies the closest-player Mahjong tie-break", () => {
    const state = deal(createTileSet(), 8);
    const hand = eastWinningHand();
    const discardTile = numbered("bamboo", 1, 1, 3)[0];
    const waitingHand = hand.filter((tile) => tile.id !== hand[0].id);
    const staged = {
      ...state,
      players: {
        ...state.players,
        east: { ...state.players.east, hand: [discardTile] },
        south: { ...state.players.south, hand: waitingHand },
        west: { ...state.players.west, hand: waitingHand },
        north: { ...state.players.north, hand: numbered("bamboo", 1, 2, 1) },
      },
    };
    const pending = discard(staged, "east", discardTile.id);
    expect(mahjongClaimants(pending)).toEqual(["south", "west"]);
    expect(canClaimPung(pending, "north")).toBe(false);
    expect(canDeclareMahjong(pending, "west")).toBe(false);
    const won = declareMahjong(pending, "south");
    expect(won.winner).toEqual({ seat: "south", source: "discard", concealed: false });
    expect(won.players.south.hasCalled).toBe(true);
  });

  it("allows only a concealed own-turn Kong and draws its Flower Wall replacement", () => {
    const state = deal(createTileSet(), 8);
    const kongTiles = numbered("bamboo", 1, 4);
    const replacement = numbered("dot", 9)[0];
    const staged = {
      ...state,
      flowerWall: [replacement, ...state.flowerWall],
      players: { ...state.players, east: { ...state.players.east, hand: kongTiles } },
    };
    const afterKong = declareConcealedKong(staged, "east", kongTiles[0].id);
    expect(afterKong.players.east.melds).toMatchObject([{ kind: "kong", exposed: false }]);
    expect(afterKong.players.east.hand).toEqual([replacement]);
    expect(afterKong.flowerWall).not.toContainEqual(replacement);
    expect(afterKong.phase).toBe("discard");
  });
});
