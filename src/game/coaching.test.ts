import { describe, expect, it } from "vitest";
import { bestMoveOptions, explainHand, handSummary } from "./coaching";
import { startBrowserEastRound } from "./session";
import { createTileSet } from "./tiles";

describe("teaching coaching helpers", () => {
  it("explains East's opening hand without looking at opponents", () => {
    const game = startBrowserEastRound(() => 0.5);
    expect(explainHand(game, "east", true)).toContain("East begins the round with 14");
  });

  it("offers up to three transparent legal-discard options", () => {
    const game = startBrowserEastRound(() => 0.5);
    const options = bestMoveOptions(game, "east");
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThanOrEqual(3);
    expect(options.every((option) => game.players.east.hand.some((tile) => tile.id === option.tileId))).toBe(true);
  });

  it("does not pad Best Move with weak alternatives when one discard is clearly better", () => {
    const game = startBrowserEastRound(() => 0.5);
    const allTiles = createTileSet();
    const tile = (id: string) => allTiles.find((item) => item.id === id) ?? (() => { throw new Error(`Missing ${id}`); })();
    const hand = [
      tile("bamboo-2-1"), tile("bamboo-2-2"), tile("bamboo-2-3"),
      tile("character-3-1"), tile("character-3-2"), tile("character-3-3"),
      tile("dot-4-1"), tile("dot-4-2"), tile("dot-4-3"),
      tile("bamboo-8-1"), tile("bamboo-8-2"), tile("bamboo-6-1"), tile("bamboo-7-1"), tile("wind-east-1"),
    ];
    const next = { ...game, players: { ...game.players, east: { ...game.players.east, hand } } };

    expect(bestMoveOptions(next, "east").map((option) => option.title)).toEqual(["Discard East Wind"]);
  });

  it("explains each recommendation using its own hand contribution and what it preserves", () => {
    const game = startBrowserEastRound(() => 0.5);
    const options = bestMoveOptions(game, "east");
    expect(options.every((option) => option.preserves.length > 0 && option.lookingFor.length > 0)).toBe(true);
    expect(options.every((option) => !option.reason.includes("Currently isolated from nearby tiles"))).toBe(true);
    expect(new Set(options.map((option) => option.reason)).size).toBeGreaterThan(1);
  });

  it("calls three matching tiles a completed Pung, never a pair that can grow", () => {
    const game = startBrowserEastRound(() => 0.5);
    const allTiles = createTileSet();
    const tile = (id: string) => allTiles.find((item) => item.id === id) ?? (() => { throw new Error(`Missing ${id}`); })();
    const hand = [
      tile("bamboo-2-1"), tile("bamboo-2-2"), tile("bamboo-2-3"),
      tile("dot-1-1"), tile("dot-4-1"), tile("dot-7-1"),
      tile("character-1-1"), tile("character-4-1"), tile("character-7-1"),
      tile("wind-east-1"), tile("wind-south-1"), tile("wind-west-1"), tile("dragon-red-1"), tile("dragon-green-1"),
    ];
    const next = { ...game, players: { ...game.players, east: { ...game.players.east, hand } } };

    expect(handSummary(next, "east").built).toContain("Pung: 2 Bamboo ×3 — three identical tiles.");
    expect(handSummary(next, "east").built).not.toContain("Pair: 2 Bamboo ×2 — two identical tiles; a winning hand needs one pair.");
    const preserves = bestMoveOptions(next, "east").map((option) => option.preserves).join(" ");
    expect(preserves).toContain("2 Bamboo Pung");
    expect(preserves).not.toContain("2 Bamboo pair, which can stay as the pair your winning hand needs or grow into a Pung");
  });

  it("ranks an extra draw beside an exposed Pung below a concealed Pair", () => {
    const game = startBrowserEastRound(() => 0.5);
    const allTiles = createTileSet();
    const tile = (id: string) => allTiles.find((item) => item.id === id) ?? (() => { throw new Error(`Missing ${id}`); })();
    const hand = [
      tile("bamboo-1-4"), tile("wind-east-1"), tile("wind-east-2"),
      tile("character-3-1"), tile("character-4-1"), tile("character-5-1"),
      tile("dot-6-1"), tile("dot-7-1"), tile("dot-8-1"),
      tile("bamboo-5-1"), tile("bamboo-5-2"), tile("dragon-red-1"), tile("dragon-green-1"), tile("dragon-white-1"),
    ];
    const next = {
      ...game,
      players: {
        ...game.players,
        east: {
          ...game.players.east,
          hand,
          melds: [{ kind: "pung" as const, exposed: true, tiles: [tile("bamboo-1-1"), tile("bamboo-1-2"), tile("bamboo-1-3")] }],
        },
      },
    };

    const [recommendation] = bestMoveOptions(next, "east");
    expect(recommendation.title).toBe("Discard 1 Bamboo");
    expect(recommendation.reason).toContain("exposed Pung of 1 Bamboo");
    expect(bestMoveOptions(next, "east").map((option) => option.title)).not.toContain("Discard East Wind");
  });

  it("summarises the hand against the winning objective instead of repeating turn instructions", () => {
    const game = startBrowserEastRound(() => 0.5);
    const summary = handSummary(game, "east");
    expect(summary.overview).toContain("four three-tile groups plus one two-tile pair");
    expect(summary.progress).toContain("Visible hand progress");
    expect(summary.focus.length).toBeGreaterThan(20);
  });

  it("warns about visible opponent tiles that narrow a kept development route", () => {
    const game = startBrowserEastRound(() => 0.5);
    const allTiles = createTileSet();
    const tile = (id: string) => allTiles.find((item) => item.id === id) ?? (() => { throw new Error(`Missing ${id}`); })();
    const next = {
      ...game,
      players: {
        ...game.players,
        east: { ...game.players.east, hand: [tile("bamboo-4-1"), tile("bamboo-5-1"), tile("dot-1-1"), ...game.players.east.hand.slice(3, 13)] },
        north: { ...game.players.north, melds: [{ kind: "pung" as const, exposed: true, tiles: [tile("bamboo-6-1"), tile("bamboo-6-2"), tile("bamboo-6-3")] }] },
      },
    };
    expect(bestMoveOptions(next, "east").some((option) => option.tableWatch?.includes("North has exposed 3 copies of 6 Bamboo"))).toBe(true);
  });
});
