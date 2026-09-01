import { describe, expect, it } from "vitest";
import { bestMoveOptions, explainHand, handSummary } from "./coaching";
import { startBrowserEastRound } from "./session";

describe("teaching coaching helpers", () => {
  it("explains East's opening hand without looking at opponents", () => {
    const game = startBrowserEastRound(() => 0.5);
    expect(explainHand(game, "east", true)).toContain("East begins the round with 14");
  });

  it("offers no more than three transparent legal-discard options", () => {
    const game = startBrowserEastRound(() => 0.5);
    const options = bestMoveOptions(game, "east");
    expect(options).toHaveLength(3);
    expect(options.every((option) => game.players.east.hand.some((tile) => tile.id === option.tileId))).toBe(true);
  });

  it("explains each recommendation using its own hand contribution and what it preserves", () => {
    const game = startBrowserEastRound(() => 0.5);
    const options = bestMoveOptions(game, "east");
    expect(options.every((option) => option.preserves.length > 0 && option.lookingFor.length > 0)).toBe(true);
    expect(options.every((option) => !option.reason.includes("Currently isolated from nearby tiles"))).toBe(true);
    expect(new Set(options.map((option) => option.reason)).size).toBeGreaterThan(1);
  });

  it("summarises the hand against the winning objective instead of repeating turn instructions", () => {
    const game = startBrowserEastRound(() => 0.5);
    const summary = handSummary(game, "east");
    expect(summary.overview).toContain("four three-tile groups plus one two-tile pair");
    expect(summary.progress).toContain("Visible hand progress");
    expect(summary.focus.length).toBeGreaterThan(20);
  });
});
