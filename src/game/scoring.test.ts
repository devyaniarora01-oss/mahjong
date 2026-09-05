import { describe, expect, it } from "vitest";
import { settleDrawRound, settleEastRound, settleSouthRound } from "./scoring";
import { createTileSet, type Seat } from "./tiles";

const tiles = createTileSet();
const players = (bonuses: Partial<Record<Seat, string[]>> = {}) => Object.fromEntries((["east", "south", "west", "north"] as Seat[]).map((seat) => [seat, { seat, bonusTiles: (bonuses[seat] ?? []).map((id) => tiles.find((tile) => tile.id === id)!) }])) as Record<Seat, { seat: Seat; bonusTiles: typeof tiles }>;

describe("East Round scoring", () => {
  it("uses the rulebook's exposed non-East Mahjong payment", () => {
    const result = settleEastRound(players(), { seat: "south", concealed: false });
    expect(result.changes).toEqual({ east: -1000, south: 2000, west: -500, north: -500 });
  });

  it("settles cumulative Flower/Season awards with East paying double", () => {
    const result = settleEastRound(players({ south: ["flower-2", "season-2"] }));
    expect(result.changes).toEqual({ east: -1000, south: 2000, west: -500, north: -500 });
    expect(result.transfers.every((transfer) => transfer.reason === "Seating-wind Flower/Season pair")).toBe(true);
  });

  it("still settles Flower/Season awards when a hand ends in a draw", () => {
    const result = settleDrawRound(players({ south: ["flower-2", "season-2"] }), true);
    expect(result.changes).toEqual({ east: -1000, south: 2000, west: -500, north: -500 });
    expect(result.transfers.every((transfer) => transfer.reason === "Seating-wind Flower/Season pair")).toBe(true);
  });

  it("does not award Flower/Season points in North Round", () => {
    const result = settleDrawRound(players({ south: ["flower-2", "season-2"] }), false);
    expect(result.changes).toEqual({ east: 0, south: 0, west: 0, north: 0 });
    expect(result.transfers).toEqual([]);
  });

  it("shows every South Card payer and gives the accumulated buy pot to the winner", () => {
    const result = settleSouthRound(players(), { seat: "north", cardScore: 2_000 }, 200);
    expect(result.changes).toEqual({ east: -4_000, south: -2_000, west: -2_000, north: 8_200 });
    expect(result.transfers).toContainEqual({ from: "east", to: "north", amount: 4_000, reason: "South Card Mahjong" });
    expect(result.transfers).toContainEqual({ from: "north", to: "north", amount: 200, reason: "South Round buy pot" });
  });
});
