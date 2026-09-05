import { describe, expect, it } from "vitest";
import { applyBotAction, chooseBotCharlestonTileIds, chooseBotClaimAction, chooseBotTurnAction } from "./bots";
import { createEastRound, discard, passClaims } from "./state";
import { createTileSet } from "./tiles";
import { createWestRound } from "./west";

describe("deterministic bot integration", () => {
  it("draws and then discards through the reducer on a bot turn", () => {
    const start = createEastRound(createTileSet(), 8);
    const pending = discard(start, "east", start.players.east.hand[0].id);
    const southDraw = chooseBotTurnAction(passClaims(pending), "south");
    expect(southDraw).toEqual({ type: "draw", seat: "south" });
    const afterDraw = applyBotAction(passClaims(pending), southDraw!);
    const southDiscard = chooseBotTurnAction(afterDraw, "south");
    expect(southDiscard?.type).toBe("discard");
    const afterDiscard = applyBotAction(afterDraw, southDiscard!);
    expect(afterDiscard.phase).toBe("claim");
    expect(afterDiscard.lastDiscard?.by).toBe("south");
  });

  it("selects the first clockwise legal bot Pung after a human has passed", () => {
    const state = createEastRound(createTileSet(), 8);
    const discarded = state.players.east.hand[0];
    const matching = createTileSet().filter((tile) => tile.kind === discarded.kind && tile.id !== discarded.id && tile.kind === "number" && discarded.kind === "number" && tile.suit === discarded.suit && tile.rank === discarded.rank).slice(0, 2);
    const staged = { ...state, players: { ...state.players, west: { ...state.players.west, hand: matching } } };
    const action = chooseBotClaimAction(discard(staged, "east", discarded.id), "east");
    expect(action).toEqual({ type: "pung", seat: "west" });
  });

  it("keeps a completed Pung instead of discarding it before a weak honour", () => {
    const tiles = createTileSet();
    const tile = (id: string) => tiles.find((item) => item.id === id) ?? (() => { throw new Error(`Missing ${id}`); })();
    const base = createEastRound(tiles, 8);
    const hand = [
      tile("bamboo-2-1"), tile("bamboo-2-2"), tile("bamboo-2-3"),
      tile("character-3-1"), tile("character-4-1"),
      tile("dot-5-1"), tile("dot-6-1"), tile("dot-7-1"),
      tile("bamboo-8-1"), tile("bamboo-8-2"), tile("character-9-1"),
      tile("wind-east-1"), tile("wind-south-1"), tile("dragon-red-1"),
    ];
    const staged = { ...base, phase: "discard" as const, turn: "south" as const, players: { ...base.players, south: { ...base.players.south, hand } } };

    const action = chooseBotTurnAction(staged, "south");
    expect(action).toMatchObject({ type: "discard" });
    expect(action?.type === "discard" && action.tileId.startsWith("bamboo-2")).toBe(false);
  });

  it("West bots shed extra numbered suits before their chosen suit", () => {
    const tiles = createTileSet();
    const tile = (suit: "bamboo" | "character" | "dot", rank: number, copy = 0) => tiles.filter((item) => item.kind === "number" && item.suit === suit && item.rank === rank)[copy]!;
    const hand = [
      tile("bamboo", 1), tile("bamboo", 1, 1), tile("bamboo", 4), tile("bamboo", 6), tile("bamboo", 6, 1),
      tile("bamboo", 8), tile("bamboo", 9), tile("character", 3), tile("character", 7), tile("dot", 2), tile("dot", 5),
      ...tiles.filter((item) => item.kind === "wind").slice(0, 2),
    ];
    const base = createWestRound(tiles, 8, { east: 35_000, south: 35_000, west: 35_000, north: 35_000 }, "north");
    const staged = {
      ...base,
      phase: "discard" as const,
      turn: "east" as const,
      players: { ...base.players, east: { ...base.players.east, hand } },
    };

    const action = chooseBotTurnAction(staged, "east");
    expect(action?.type).toBe("discard");
    const discarded = staged.players.east.hand.find((item) => item.id === (action?.type === "discard" ? action.tileId : ""));
    expect(discarded).toMatchObject({ kind: "number" });
    expect(discarded && discarded.kind === "number" && discarded.suit).not.toBe("bamboo");
  });

  it("West bots use Charleston to pass tiles outside their strongest numbered suit", () => {
    const tiles = createTileSet();
    const tile = (suit: "bamboo" | "character" | "dot", rank: number, copy = 0) => tiles.filter((item) => item.kind === "number" && item.suit === suit && item.rank === rank)[copy]!;
    const hand = [tile("bamboo", 1), tile("bamboo", 2), tile("bamboo", 3), tile("bamboo", 4), tile("bamboo", 5), tile("bamboo", 6), tile("bamboo", 7), tile("bamboo", 8), tile("character", 2), tile("character", 9), tile("dot", 1), tile("dot", 9), ...tiles.filter((item) => item.kind === "dragon").slice(0, 1)];
    const base = createWestRound(tiles, 8, { east: 35_000, south: 35_000, west: 35_000, north: 35_000 }, "north");
    const staged = { ...base, players: { ...base.players, east: { ...base.players.east, hand } } };
    const passed = chooseBotCharlestonTileIds(staged, "east");
    const passedTiles = hand.filter((item) => passed.includes(item.id));

    expect(passedTiles).toHaveLength(3);
    expect(passedTiles.every((item) => item.kind === "number" && item.suit !== "bamboo")).toBe(true);
  });

  it("West bots do not declare a concealed Kong from a suit they are shedding", () => {
    const tiles = createTileSet();
    const bamboo = [1, 2, 3, 4, 5].flatMap((rank) => tiles.filter((item) => item.kind === "number" && item.suit === "bamboo" && item.rank === rank).slice(0, 2));
    const dotKong = tiles.filter((item) => item.kind === "number" && item.suit === "dot" && item.rank === 9);
    const base = createWestRound(tiles, 8, { east: 35_000, south: 35_000, west: 35_000, north: 35_000 }, "north");
    const staged = {
      ...base,
      phase: "discard" as const,
      turn: "east" as const,
      players: { ...base.players, east: { ...base.players.east, hand: [...bamboo.slice(0, 9), ...dotKong] } },
    };

    expect(chooseBotTurnAction(staged, "east")?.type).toBe("discard");
  });
});
