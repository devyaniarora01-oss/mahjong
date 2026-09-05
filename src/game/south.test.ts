import { describe, expect, it } from "vitest";
import { canBuySouthDiscard, buySouthDiscard } from "./south";
import { createEastRound } from "./state";
import { SOUTH_CARDS } from "./south-cards";
import { createTileSet } from "./tiles";

describe("South discard buying", () => {
  it("lets a player buy the visible discard from the player on their left", () => {
    const game = createEastRound(createTileSet(), 4);
    const discard = game.players.west.hand[0];
    const south = {
      ...game,
      round: "south" as const,
      phase: "claim" as const,
      turn: "south" as const,
      lastDiscard: { tile: discard, by: "west" as const },
      south: {
        cards: { east: SOUTH_CARDS[0], south: SOUTH_CARDS[1], west: SOUTH_CARDS[2], north: SOUTH_CARDS[3] },
        pot: 0,
        charlestonStep: 3,
      },
    };

    expect(canBuySouthDiscard(south, "south")).toBe(true);
    expect(canBuySouthDiscard(south, "north")).toBe(false);

    const bought = buySouthDiscard(south, "south");
    expect(bought.players.south.hand.some((tile) => tile.id === discard.id)).toBe(true);
    expect(bought.players.south.score).toBe(south.players.south.score - 100);
    expect(bought.south?.pot).toBe(100);
    expect(bought.phase).toBe("discard");
  });
});
