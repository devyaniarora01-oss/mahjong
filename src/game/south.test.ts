import { describe, expect, it } from "vitest";
import { dealSouthCards, createSouthRound } from "./south";
import { createTileSet } from "./tiles";

describe("South Round seating", () => {
  it("moves East counterclockwise while keeping each person's carried score and physical position", () => {
    const round = createSouthRound(
      createTileSet(),
      8,
      { east: 11_000, south: 22_000, west: 33_000, north: 44_000 },
      dealSouthCards(() => 0.2),
    );

    expect(round.humanSeat).toBe("north");
    expect(round.turn).toBe("east");
    expect(round.players.east).toMatchObject({ physicalSeat: "south", score: 22_000 });
    expect(round.players.south).toMatchObject({ physicalSeat: "west", score: 33_000 });
    expect(round.players.west).toMatchObject({ physicalSeat: "north", score: 44_000 });
    expect(round.players.north).toMatchObject({ physicalSeat: "east", score: 11_000 });
  });
});
