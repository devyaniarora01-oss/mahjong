import { describe, expect, it } from "vitest";
import { createTileSet } from "./tiles";
import { canClaimExposedKong, canDeclareMahjong, claimExposedKong, createEastRound } from "./state";
import { createWestRound } from "./west";

describe("West Round seating", () => {
  it("rotates East again while each person keeps their physical place and carried score", () => {
    const round = createWestRound(
      createTileSet(),
      8,
      { east: 22_000, south: 33_000, west: 44_000, north: 11_000 },
      "north",
      { east: "south", south: "west", west: "north", north: "east" },
    );

    expect(round.round).toBe("west");
    expect(round.humanSeat).toBe("west");
    // The former North player is now West, but remains physically at East/bottom.
    expect(round.players.west).toMatchObject({ physicalSeat: "east", score: 11_000 });
    expect(round.phase).toBe("charleston");
  });
});

describe("West exposed Kong", () => {
  it("allows a visible discard to complete a Kong and takes its replacement from the Flower Wall", () => {
    const base = createEastRound(createTileSet(), 8);
    const target = createTileSet().find((tile) => tile.id === "bamboo-6-1")!;
    const matching = createTileSet().filter((tile) => tile.kind === "number" && tile.suit === "bamboo" && tile.rank === 6).slice(1);
    const state = {
      ...base,
      round: "west" as const,
      phase: "claim" as const,
      turn: "north" as const,
      lastDiscard: { tile: target, by: "north" as const },
      players: { ...base.players, west: { ...base.players.west, hand: [...matching, ...base.players.west.hand.slice(0, 10)] } },
    };
    expect(canClaimExposedKong(state, "west")).toBe(true);
    const next = claimExposedKong(state, "west");
    expect(next.players.west.melds.at(-1)).toMatchObject({ kind: "kong", exposed: true });
    expect(next.flowerWall).toHaveLength(state.flowerWall.length - 1);
    expect(next.turn).toBe("west");
    expect(next.phase).toBe("discard");
  });
});

describe("West Mahjong declaration", () => {
  it("recognises three declared Pungs, one declared Kong, and a Pair as Mahjong", () => {
    const deck = createTileSet();
    const tile = (id: string) => deck.find((item) => item.id === id)!;
    const base = createEastRound(deck, 8);
    const state = {
      ...base,
      round: "west" as const,
      phase: "discard" as const,
      turn: "west" as const,
      players: {
        ...base.players,
        west: {
          ...base.players.west,
          hand: [tile("bamboo-5-1"), tile("bamboo-5-2")],
          melds: [
            { kind: "pung" as const, exposed: true, tiles: [tile("bamboo-2-1"), tile("bamboo-2-2"), tile("bamboo-2-3")] },
            { kind: "pung" as const, exposed: true, tiles: [tile("bamboo-3-1"), tile("bamboo-3-2"), tile("bamboo-3-3")] },
            { kind: "pung" as const, exposed: true, tiles: [tile("bamboo-4-1"), tile("bamboo-4-2"), tile("bamboo-4-3")] },
            { kind: "kong" as const, exposed: true, tiles: [tile("bamboo-1-1"), tile("bamboo-1-2"), tile("bamboo-1-3"), tile("bamboo-1-4")] },
          ],
        },
      },
    };
    expect(canDeclareMahjong(state, "west")).toBe(true);
  });
});
