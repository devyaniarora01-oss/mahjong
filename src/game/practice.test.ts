import { describe, expect, it } from "vitest";
import { canClaimPung, canClaimPureChow, canDeclareMahjong, claimPung, claimPureChow, declareMahjong, discard, drawFromPile, type EastRoundState } from "./state";
import { PRACTICE_SPARES, applyPracticeBot, createPracticeRound, practiceCard } from "./practice";

/** Lets the scripted bots play until it is the human's move (or a claim the human can make). */
function botsUntilHuman(start: EastRoundState): EastRoundState {
  let game = start;
  for (let guard = 0; guard < 60; guard += 1) {
    if (game.status !== "active") return game;
    if (game.turn === "east" && (game.phase === "draw" || game.phase === "discard")) return game;
    if (game.phase === "claim" && (canClaimPung(game, "east") || canClaimPureChow(game, "east") || canDeclareMahjong(game, "east"))) return game;
    game = applyPracticeBot(game);
  }
  throw new Error("bots never yielded");
}

describe("scripted practice hand", () => {
  it("deals you 14 tiles, a bonus Flower and the spares", () => {
    const game = createPracticeRound();
    expect(game.players.east.hand).toHaveLength(14);
    expect(game.players.east.bonusTiles.map((tile) => tile.id)).toEqual(["flower-1"]);
    PRACTICE_SPARES.forEach((id) => expect(game.players.east.hand.some((tile) => tile.id === id)).toBe(true));
    for (const seat of ["south", "west", "north"] as const) {
      expect(game.players[seat].hand).toHaveLength(13);
      expect(game.players[seat].bonusTiles).toHaveLength(0);
    }
  });

  it("plays through Pung, a Chow West cannot give, a Chow from North, and a winning draw", () => {
    let game = createPracticeRound();
    expect(practiceCard(game, []).id).toBe("discard1");
    game = discard(game, "east", "wind-south-1");
    game = botsUntilHuman(game);
    expect(practiceCard(game, []).id).toBe("pung");
    expect(canClaimPureChow(game, "east")).toBe(false);
    game = claimPung(game, "east");
    expect(practiceCard(game, []).id).toBe("afterPung");
    game = discard(game, "east", "character-9-1");
    // South's second discard, then West's 3 Dots (not claimable: West is not on your left), then North's 6 Dots.
    game = botsUntilHuman(game);
    expect(game.lastDiscard?.tile.id).toBe("dot-6-1");
    expect(canClaimPureChow(game, "east")).toBe(true);
    expect(practiceCard(game, []).id).toBe("chow");
    const tiles = game.players.east.hand.filter((tile) => tile.id === "dot-4-1" || tile.id === "dot-5-1");
    game = claimPureChow(game, "east", [tiles[0].id, tiles[1].id]);
    expect(practiceCard(game, []).id).toBe("afterChow");
    game = discard(game, "east", "bamboo-1-1");
    game = botsUntilHuman(game);
    expect(practiceCard(game, []).id).toBe("draw");
    game = drawFromPile(game, "east");
    expect(canDeclareMahjong(game, "east")).toBe(true);
    expect(practiceCard(game, []).id).toBe("win");
    game = declareMahjong(game, "east");
    expect(game.status).toBe("mahjong");
    expect(practiceCard(game, []).finish).toBe(true);
  });

  it("shows the West card when West discards the tile you cannot take", () => {
    let game = createPracticeRound();
    game = discard(game, "east", "wind-south-1");
    game = claimPung(botsUntilHuman(game), "east");
    game = discard(game, "east", "character-9-1");
    for (let guard = 0; guard < 40 && game.lastDiscard?.tile.id !== "dot-3-1"; guard += 1) game = applyPracticeBot(game);
    expect(game.lastDiscard?.tile.id).toBe("dot-3-1");
    expect(canClaimPureChow(game, "east")).toBe(false);
    expect(practiceCard(game, []).id).toBe("west");
    expect(practiceCard(game, ["west"]).id).toBe("watch");
  });
});
