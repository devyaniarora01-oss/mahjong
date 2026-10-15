import { describe, expect, it } from "vitest";
import { SOUTH_CARDS } from "./south-cards";
import { southCardAllows } from "./south-fit";
import { createTileSet } from "./tiles";

const card = (id: string) => SOUTH_CARDS.find((item) => item.id === id)!;
const tiles = createTileSet();
const find = (pred: (t: (typeof tiles)[number]) => boolean) => tiles.find(pred)!;

describe("South card tile fit", () => {
  it("The Moon only uses Dots", () => {
    const moon = card("the-moon");
    expect(southCardAllows(moon, find((t) => t.kind === "number" && t.suit === "bamboo"))).toBe(false);
    expect(southCardAllows(moon, find((t) => t.kind === "number" && t.suit === "dot"))).toBe(true);
    expect(southCardAllows(moon, find((t) => t.kind === "wind"))).toBe(false);
  });
  it("Seven Brothers only uses 7s and Winds", () => {
    const sb = card("seven-brothers");
    expect(southCardAllows(sb, find((t) => t.kind === "number" && t.rank === 7))).toBe(true);
    expect(southCardAllows(sb, find((t) => t.kind === "number" && t.rank === 4))).toBe(false);
    expect(southCardAllows(sb, find((t) => t.kind === "wind"))).toBe(true);
    expect(southCardAllows(sb, find((t) => t.kind === "dragon"))).toBe(false);
  });
  it("covers every card", () => {
    SOUTH_CARDS.forEach((c) => expect(tiles.some((t) => southCardAllows(c, t))).toBe(true));
  });
});
