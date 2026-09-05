import { describe, expect, it } from "vitest";
import { chooseNorthFormat, createNorthRound } from "./north";
import { isWestNorthMahjongHand, matchesSouthNorthCard } from "./north-goals";
import { canClaimExposedKong, canReplaceNorthExposedJoker, claimExposedKong, replaceNorthExposedJoker } from "./state";
import { SOUTH_CARDS } from "./south-cards";
import { createTileSet } from "./tiles";

const deck = createTileSet();
const tile = (id: string) => deck.find((item) => item.id === id)!;
const scores = { east: 35_000, south: 35_000, west: 35_000, north: 35_000 };
const physical = { east: "west", south: "north", west: "east", north: "south" } as const;

describe("North format selection", () => {
  it("gives East, South, and West equal one-third random ranges", () => {
    expect(chooseNorthFormat(() => 0)).toBe("east");
    expect(chooseNorthFormat(() => 0.3333334)).toBe("south");
    expect(chooseNorthFormat(() => 0.6666667)).toBe("west");
  });

  it("starts South-as-North with Charleston and keeps Flowers/Seasons concealed", () => {
    const round = createNorthRound(deck, 8, scores, "west", physical, "south");
    expect(round.round).toBe("north");
    expect(round.north?.format).toBe("south");
    expect(round.phase).toBe("charleston");
    expect(round.south).toBeDefined();
    expect(round.players.south.bonusTiles).toEqual([]);
  });

  it("starts West-as-North with the selected joker number and Charleston", () => {
    const round = createNorthRound(deck, 8, scores, "west", physical, "west", 6);
    expect(round.north).toEqual({ format: "west", jokerRank: 6 });
    expect(round.phase).toBe("charleston");
    expect(round.west).toBeDefined();
  });
});

describe("North joker validation", () => {
  it("allows a selected West-number tile to complete a West Pair", () => {
    const hand = [tile("bamboo-5-1"), tile("bamboo-1-1")];
    const melds = [
      { kind: "pung" as const, exposed: true, tiles: [tile("bamboo-2-1"), tile("bamboo-2-2"), tile("bamboo-2-3")] },
      { kind: "pung" as const, exposed: true, tiles: [tile("bamboo-3-1"), tile("bamboo-3-2"), tile("bamboo-3-3")] },
      { kind: "pung" as const, exposed: true, tiles: [tile("bamboo-4-1"), tile("bamboo-4-2"), tile("bamboo-4-3")] },
      { kind: "kong" as const, exposed: true, tiles: [tile("bamboo-9-1"), tile("bamboo-9-2"), tile("bamboo-9-3"), tile("bamboo-9-4")] },
    ];
    expect(isWestNorthMahjongHand(hand, melds, 1)).toBe(true);
  });

  it("allows a concealed Flower/Season joker to complete a South Card group, not a Pair", () => {
    const card = SOUTH_CARDS.find((item) => item.id === "western-command")!;
    const hand = [
      ...[1, 2, 3].flatMap((rank) => [tile(`bamboo-${rank}-1`), tile(`bamboo-${rank}-2`), tile(`bamboo-${rank}-3`)]),
      tile("bamboo-4-1"), tile("bamboo-5-1"), tile("flower-1"), tile("bamboo-7-1"), tile("bamboo-7-2"),
    ];
    expect(matchesSouthNorthCard(card, hand, [])).toBe(true);
  });

  it("allows a later matching draw to replace an exposed West-as-North joker", () => {
    const base = createNorthRound(deck, 8, scores, "west", physical, "west", 1);
    const state = {
      ...base,
      phase: "discard" as const,
      turn: "south" as const,
      players: {
        ...base.players,
        south: {
          ...base.players.south,
          hand: [tile("bamboo-6-4")],
          melds: [{ kind: "pung" as const, exposed: true, tiles: [tile("bamboo-6-1"), tile("bamboo-6-2"), tile("bamboo-1-1")] }],
        },
      },
    };
    expect(canReplaceNorthExposedJoker(state, "south")).toBe(true);
    const replaced = replaceNorthExposedJoker(state, "south");
    expect(replaced.players.south.melds[0].tiles.map((item) => item.id)).toContain("bamboo-6-4");
    expect(replaced.players.south.hand.map((item) => item.id)).toContain("bamboo-1-1");
  });

  it("uses selected-rank West jokers explicitly when they complete a Kong", () => {
    const base = createNorthRound(deck, 8, scores, "west", physical, "west", 5);
    const state = {
      ...base,
      phase: "claim" as const,
      lastDiscard: { by: "east" as const, tile: tile("bamboo-1-1") },
      players: {
        ...base.players,
        south: { ...base.players.south, hand: [tile("bamboo-1-2"), tile("bamboo-5-1"), tile("bamboo-5-2")] },
      },
    };

    expect(canClaimExposedKong(state, "south")).toBe(true);
    const after = claimExposedKong(state, "south");
    expect(after.players.south.melds.at(-1)?.tiles.map((item) => item.id)).toEqual(["bamboo-1-2", "bamboo-5-1", "bamboo-5-2", "bamboo-1-1"]);
  });
});
