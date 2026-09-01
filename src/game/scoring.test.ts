import { describe, expect, it } from "vitest";
import { settleEastRound } from "./scoring";
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
});
