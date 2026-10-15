import { describe, expect, it } from "vitest";
import { SOUTH_CARDS } from "./south-cards";
import { southPlan } from "./south-plan";
import { createTileSet, type Tile } from "./tiles";

const all = createTileSet();
const used = new Set<string>();
const t = (key: string): Tile => {
  const found = all.find((tile) => tile.id.startsWith(key) && !used.has(tile.id));
  if (!found) throw new Error(`missing ${key}`);
  used.add(found.id);
  return found;
};
const hand = (...keys: string[]) => { used.clear(); return keys.map(t); };
const card = (id: string) => SOUTH_CARDS.find((c) => c.id === id)!;

describe("South card plan", () => {
  it("The Moon: a Bamboo pair is not progress, Dot chows are", () => {
    const h = hand("bamboo-2", "bamboo-2", "dot-1", "dot-2", "dot-3", "dot-4", "dot-5", "dot-6", "dot-8", "dot-9", "character-5", "wind-east", "dot-7", "dot-7");
    const plan = southPlan(card("the-moon"), h, h)!;
    expect(plan.slots.filter((s) => s.name === "Chow" && s.complete).length).toBeGreaterThanOrEqual(2);
    expect(plan.slots.flatMap((s) => s.held).some((tile) => tile.kind === "number" && tile.suit === "bamboo")).toBe(false);
    expect(plan.offCard.map((x) => x.id)).toEqual(expect.arrayContaining(h.filter((x) => x.kind === "number" && x.suit === "bamboo").map((x) => x.id)));
  });
  it("Western Command: no Honours, so an Honour pair is a loose pair", () => {
    const h = hand("wind-east", "wind-east", "dragon-red", "dragon-red", "bamboo-3", "bamboo-3", "bamboo-3", "dot-4", "dot-5", "dot-6", "character-9", "character-9", "dot-1", "dot-8");
    const plan = southPlan(card("western-command"), h, h)!;
    expect(plan.offCard.length).toBe(4);
    expect(plan.slots.find((s) => s.name === "Pung" && s.complete)).toBeTruthy();
    expect(plan.slots.find((s) => s.name === "Chow" && s.complete)).toBeTruthy();
    expect(plan.slots.find((s) => s.name === "Pair" && s.complete)).toBeTruthy();
  });
  it("Wriggly Snake picks the suit with the longest run and needs the winds", () => {
    const h = hand("dot-1", "dot-2", "dot-3", "dot-4", "dot-5", "bamboo-9", "wind-east", "wind-south", "character-2", "character-2", "dragon-red", "dot-7", "dot-8", "bamboo-4");
    const plan = southPlan(card("wriggly-snake"), h, h)!;
    expect(plan.slots[0].name).toContain("Dot");
    expect(plan.slots[0].held.length).toBe(7);
    expect(plan.slots[1].held.length).toBe(2);
    expect(plan.offCard.some((x) => x.kind === "dragon")).toBe(true);
  });
  it("every card has a plan", () => {
    const h = hand("dot-1", "dot-2", "bamboo-3", "wind-east", "dragon-red", "character-7", "character-7", "bamboo-7", "dot-9", "dot-9", "wind-south", "dragon-white", "bamboo-1", "character-4");
    SOUTH_CARDS.forEach((c) => expect(southPlan(c, h, h)).toBeTruthy());
  });
});
