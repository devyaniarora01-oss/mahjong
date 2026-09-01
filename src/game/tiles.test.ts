import { describe, expect, it } from "vitest";
import { createTileSet, needsFlowerWallReplacement, shuffle } from "./tiles";

describe("the rulebook tile set", () => {
  it("contains 144 distinct cards", () => {
    const tiles = createTileSet();
    expect(tiles).toHaveLength(144);
    expect(new Set(tiles.map((tile) => tile.id)).size).toBe(144);
  });

  it("contains four copies of every numbered, wind, and dragon card", () => {
    const tiles = createTileSet();
    expect(tiles.filter((tile) => tile.kind === "number")).toHaveLength(108);
    expect(tiles.filter((tile) => tile.kind === "wind")).toHaveLength(16);
    expect(tiles.filter((tile) => tile.kind === "dragon")).toHaveLength(12);
    expect(tiles.filter((tile) => tile.kind === "flower")).toHaveLength(4);
    expect(tiles.filter((tile) => tile.kind === "season")).toHaveLength(4);
  });

  it("uses the approved MVP Flower/Season-only replacement interpretation", () => {
    const tiles = createTileSet();
    expect(needsFlowerWallReplacement(tiles.find((tile) => tile.kind === "flower")!)).toBe(true);
    expect(needsFlowerWallReplacement(tiles.find((tile) => tile.kind === "season")!)).toBe(true);
    expect(needsFlowerWallReplacement(tiles.find((tile) => tile.kind === "wind")!)).toBe(false);
  });

  it("shuffles without losing cards", () => {
    const tiles = createTileSet();
    const shuffled = shuffle(tiles, () => 0);
    expect(shuffled).toHaveLength(144);
    expect(new Set(shuffled.map((tile) => tile.id))).toEqual(new Set(tiles.map((tile) => tile.id)));
  });
});
