import { describe, expect, it } from "vitest";
import { dealSouthCards, createSouthRound } from "./south";
import { canClaimPung, canClaimPureChow, canDeclareConcealedKong, discard } from "./state";
import { createTileSet } from "./tiles";

describe("South Round seating", () => {
  it("moves East counterclockwise while keeping each person's carried score and physical position", () => {
    const round = createSouthRound(
      createTileSet(),
      8,
      { east: 11_000, south: 22_000, west: 33_000, north: 44_000 },
      dealSouthCards(() => 0.2),
    );

    expect(round.humanSeat).toBe("north");
    expect(round.turn).toBe("east");
    expect(round.players.east).toMatchObject({ physicalSeat: "south", score: 22_000 });
    expect(round.players.south).toMatchObject({ physicalSeat: "west", score: 33_000 });
    expect(round.players.west).toMatchObject({ physicalSeat: "north", score: 44_000 });
    expect(round.players.north).toMatchObject({ physicalSeat: "east", score: 11_000 });
  });

  it("does not offer a Pung claim for an All Pairs South Card", () => {
    const tiles = createTileSet();
    const cards = dealSouthCards(() => 0.2);
    cards.north = {
      id: "all-pairs",
      title: "All Pairs",
      goal: "All 7 Pairs in the same suit. No Honour Cards.",
      score: 500,
    };
    const round = createSouthRound(tiles, 8, undefined, cards);
    const discardTile = tiles.find((tile) => tile.kind === "number" && tile.suit === "bamboo" && tile.rank === 1)!;
    const matching = tiles.filter((tile) => tile.id !== discardTile.id && tile.kind === "number" && tile.suit === "bamboo" && tile.rank === 1).slice(0, 2);
    const staged = {
      ...round,
      phase: "discard" as const,
      turn: "east" as const,
      players: {
        ...round.players,
        east: { ...round.players.east, hand: [discardTile] },
        north: { ...round.players.north, hand: matching },
      },
    };
    const pending = discard(staged, "east", discardTile.id);
    expect(canClaimPung(pending, "north")).toBe(false);
  });

  it("limits calls to the patterns on the holder's South Card", () => {
    const tiles = createTileSet();
    const cards = dealSouthCards(() => 0.2);
    const allPairs = { id: "all-pairs", title: "All Pairs", goal: "All 7 Pairs in the same suit. No Honour Cards.", score: 500 };
    cards.south = allPairs;
    cards.north = allPairs;
    const round = createSouthRound(tiles, 8, undefined, cards);
    const discardTile = tiles.find((tile) => tile.kind === "number" && tile.suit === "bamboo" && tile.rank === 2)!;
    const chowTiles = tiles.filter((tile) => tile.kind === "number" && tile.suit === "bamboo" && (tile.rank === 1 || tile.rank === 3)).slice(0, 2);
    const kongTiles = tiles.filter((tile) => tile.kind === "number" && tile.suit === "dot" && tile.rank === 9).slice(0, 4);
    const staged = {
      ...round,
      phase: "discard" as const,
      turn: "east" as const,
      players: {
        ...round.players,
        east: { ...round.players.east, hand: [discardTile] },
        south: { ...round.players.south, hand: chowTiles },
        north: { ...round.players.north, hand: kongTiles },
      },
    };
    const pending = discard(staged, "east", discardTile.id);
    expect(canClaimPureChow(pending, "south")).toBe(false);
    expect(canDeclareConcealedKong({ ...round, phase: "discard", turn: "north", players: { ...round.players, north: { ...round.players.north, hand: kongTiles } } }, "north", kongTiles[0].id)).toBe(false);
  });
});
