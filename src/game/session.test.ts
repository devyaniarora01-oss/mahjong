import { describe, expect, it } from "vitest";
import { startBrowserEastRound } from "./session";

describe("browser game-session initialization", () => {
  it("creates the active East opening state used by Start Game", () => {
    const game = startBrowserEastRound(() => 0.5);
    expect(game.status).toBe("active");
    expect(game.turn).toBe("east");
    expect(game.phase).toBe("discard");
    expect(game.players.east.hand).toHaveLength(14);
  });

  it("uses the supplied random source to produce reproducible, shuffled deals", () => {
    const first = startBrowserEastRound(() => 0);
    const second = startBrowserEastRound(() => 0.999);
    expect(first.history[0]).toMatchObject({ type: "dealt", diceTotal: 8 });
    expect(second.history[0]).toMatchObject({ type: "dealt", diceTotal: 8 });
    expect(first.players.east.hand.map((tile) => tile.id)).not.toEqual(second.players.east.hand.map((tile) => tile.id));
  });

  it("creates a clean new-hand state without prior discards or melds", () => {
    const game = startBrowserEastRound(() => 0.5);
    expect(game.lastDiscard).toBeUndefined();
    expect(game.history.some((event) => event.type === "discarded" || event.type === "claimedPung" || event.type === "claimedPureChow")).toBe(false);
    for (const player of Object.values(game.players)) {
      expect(player.melds).toEqual([]);
    }
  });
});
