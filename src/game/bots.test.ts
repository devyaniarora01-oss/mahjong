import { describe, expect, it } from "vitest";
import { applyBotAction, chooseBotClaimAction, chooseBotTurnAction } from "./bots";
import { createEastRound, discard, passClaims } from "./state";
import { createTileSet } from "./tiles";

describe("deterministic bot integration", () => {
  it("draws and then discards through the reducer on a bot turn", () => {
    const start = createEastRound(createTileSet(), 8);
    const pending = discard(start, "east", start.players.east.hand[0].id);
    const southDraw = chooseBotTurnAction(passClaims(pending), "south");
    expect(southDraw).toEqual({ type: "draw", seat: "south" });
    const afterDraw = applyBotAction(passClaims(pending), southDraw!);
    const southDiscard = chooseBotTurnAction(afterDraw, "south");
    expect(southDiscard?.type).toBe("discard");
    const afterDiscard = applyBotAction(afterDraw, southDiscard!);
    expect(afterDiscard.phase).toBe("claim");
    expect(afterDiscard.lastDiscard?.by).toBe("south");
  });

  it("selects the first clockwise legal bot Pung after a human has passed", () => {
    const state = createEastRound(createTileSet(), 8);
    const discarded = state.players.east.hand[0];
    const matching = createTileSet().filter((tile) => tile.kind === discarded.kind && tile.id !== discarded.id && tile.kind === "number" && discarded.kind === "number" && tile.suit === discarded.suit && tile.rank === discarded.rank).slice(0, 2);
    const staged = { ...state, players: { ...state.players, west: { ...state.players.west, hand: matching } } };
    const action = chooseBotClaimAction(discard(staged, "east", discarded.id), "east");
    expect(action).toEqual({ type: "pung", seat: "west" });
  });
});
