import { describe, expect, it } from "vitest";
import { createTileSet } from "./tiles";
import { isWestMahjongHand, westHandKind } from "./west-goals";

const tiles = createTileSet();
const take = (...ids: string[]) => ids.map((id) => {
  const tile = tiles.find((item) => item.id === id);
  if (!tile) throw new Error(`Missing fixture tile ${id}`);
  return tile;
});

describe("West/Goulash hand validation", () => {
  it("accepts a one-suit Pung/Kong/Pair hand with a required Kong", () => {
    const melds = [{ kind: "kong" as const, exposed: false, tiles: take("bamboo-1-1", "bamboo-1-2", "bamboo-1-3", "bamboo-1-4") }];
    const hand = take(
      "bamboo-2-1", "bamboo-2-2", "bamboo-2-3",
      "bamboo-3-1", "bamboo-3-2", "bamboo-3-3",
      "bamboo-4-1", "bamboo-4-2", "bamboo-4-3",
      "bamboo-5-1", "bamboo-5-2",
    );
    expect(isWestMahjongHand(hand, melds)).toBe(true);
    expect(westHandKind(hand, melds)).toBe("sameSuit");
  });

  it("rejects a hand that has no Kong, even when its Pungs and Pair otherwise fit", () => {
    const hand = take(
      "bamboo-1-1", "bamboo-1-2", "bamboo-1-3",
      "bamboo-2-1", "bamboo-2-2", "bamboo-2-3",
      "bamboo-3-1", "bamboo-3-2", "bamboo-3-3",
      "bamboo-4-1", "bamboo-4-2", "bamboo-4-3",
      "bamboo-5-1", "bamboo-5-2",
    );
    expect(isWestMahjongHand(hand)).toBe(false);
  });
});
