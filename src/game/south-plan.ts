import type { SouthCard } from "./south-cards";
import { createTileSet, tileLabel as rawTileLabel, type Tile } from "./tiles";

/**
 * Card-aware hand reading for South. Each card is broken into the parts it asks
 * for (Pungs, Chows, a Run, one of each Wind...). The plan then finds the way of
 * using the player's tiles that gets closest to the whole card. This is coaching
 * only: it never decides legality or scoring.
 */
const SUITS = ["bamboo", "character", "dot"] as const;
const WINDS = ["east", "south", "west", "north"] as const;
const DRAGONS = ["red", "green", "white"] as const;
const R9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const tileKey = (tile: Tile): string => tile.kind === "number" ? `${tile.suit}-${tile.rank}` : tile.kind === "wind" ? `wind-${tile.wind}` : tile.kind === "dragon" ? `dragon-${tile.dragon}` : `${tile.kind}-${tile.rank}`;
const nk = (suit: string, rank: number) => `${suit}-${rank}`;
const wk = (wind: string) => `wind-${wind}`;
const dk = (dragon: string) => `dragon-${dragon}`;
const WIND_KEYS = WINDS.map(wk);
const DRAGON_KEYS = DRAGONS.map(dk);
const HONOUR_KEYS = [...WIND_KEYS, ...DRAGON_KEYS];

const SAMPLE = new Map(createTileSet().map((tile) => [tileKey(tile), tile]));
const title = (value: string) => value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
export const keyLabel = (key: string): string => { const tile = SAMPLE.get(key); return tile ? title(rawTileLabel(tile)) : key; };

type Slot = { name: string; templates: string[][]; group?: string };

const numKeys = (suits: readonly string[], ranks: number[] = R9) => suits.flatMap((suit) => ranks.map((rank) => nk(suit, rank)));
const pungs = (keys: string[]) => keys.map((key) => [key, key, key]);
const pairs = (keys: string[]) => keys.map((key) => [key, key]);
const kongs = (keys: string[]) => keys.map((key) => [key, key, key, key]);
const chows = (suits: readonly string[]) => suits.flatMap((suit) => [1, 2, 3, 4, 5, 6, 7].map((rank) => [nk(suit, rank), nk(suit, rank + 1), nk(suit, rank + 2)]));
const run = (suit: string, from: number, to: number) => [Array.from({ length: to - from + 1 }, (_, index) => nk(suit, from + index))];
const runsOf = (suit: string, length: number) => Array.from({ length: 10 - length }, (_, index) => Array.from({ length }, (_, offset) => nk(suit, index + 1 + offset)));
const crochets = () => R9.map((rank) => SUITS.map((suit) => nk(suit, rank)));
const knits = () => R9.flatMap((rank) => [[0, 1], [0, 2], [1, 2]].map(([a, b]) => [nk(SUITS[a], rank), nk(SUITS[b], rank)]));

const S = (name: string, templates: string[][], group?: string): Slot => ({ name, templates, group });
const many = (count: number, make: () => Slot): Slot[] => Array.from({ length: count }, make);
const windSet = (extra: boolean): Slot => S(extra ? "One of each Wind, plus one more Wind" : "One of each Wind", extra ? WINDS.map((wind) => [...WIND_KEYS, wk(wind)]) : [WIND_KEYS]);
const dragonSet = (): Slot => S("One of each Dragon", [DRAGON_KEYS]);
const extraHonour = (): Slot => S("One more Honour", HONOUR_KEYS.map((key) => [key]));
const perSuit = (make: (suit: string) => Slot[]): Slot[][] => SUITS.map(make);
const eachSuit = (name: string, make: (suit: string) => string[][]): Slot[] => SUITS.map((suit) => S(`${name} in ${title(suit)}`, make(suit)));

const VARIANTS: Record<string, () => Slot[][]> = {
  windfall: () => perSuit((s) => [...many(5, () => S("Pair", pairs(numKeys([s])), "p")), windSet(false)]),
  "windy-dragons": () => [[...WINDS.map((w) => S(`Pair of ${title(w)} Winds`, pairs([wk(w)]))), ...many(2, () => S("Dragon Pung", pungs(DRAGON_KEYS), "d"))]],
  "three-sisters": () => [[...eachSuit("Pung of 3s", (s) => pungs([nk(s, 3)])), windSet(true)]],
  "western-command": () => [[...many(3, () => S("Pung", pungs(numKeys(SUITS)), "u")), S("Chow", chows(SUITS)), S("Pair", pairs(numKeys(SUITS)))]],
  "all-honour-hand": () => [[...many(4, () => S("Honour Pung", pungs(HONOUR_KEYS), "h")), S("Honour Pair", pairs(HONOUR_KEYS))]],
  "windy-chow": () => [[...eachSuit("Chow", (s) => chows([s])), windSet(true)]],
  "crazy-chows": () => [[...many(4, () => S("Chow", chows(SUITS))), S("Pair", pairs(numKeys(SUITS)))]],
  "little-arthur": () => [[...eachSuit("Chow", (s) => chows([s])), S("Pung", pungs(numKeys(SUITS))), S("Pair", pairs(numKeys(SUITS)))]],
  "unique-wonder": () => [[S("Crochet of 1s", [SUITS.map((s) => nk(s, 1))]), S("Crochet of 9s", [SUITS.map((s) => nk(s, 9))]), windSet(false), dragonSet(), extraHonour()]],
  "the-moon": () => [[...many(4, () => S("Chow", chows(["dot"]))), S("Pair", pairs(numKeys(["dot"])))]],
  "three-philosophers": () => [[...eachSuit("Chow", (s) => chows([s])), S("Mixed Chow", chows(SUITS)), S("Pair", pairs(numKeys(SUITS)))]],
  "gretas-garden": () => perSuit((s) => [S(`Run 1 to 7 in ${title(s)}`, run(s, 1, 7)), windSet(false), dragonSet()]),
  "wriggly-snake": () => perSuit((s) => [S(`Run 1 to 9 in ${title(s)}`, run(s, 1, 9)), windSet(true)]),
  "big-robert": () => [[...SUITS.map((s) => S(`Run of 4 in ${title(s)}`, runsOf(s, 4))), S("Honour Pair", pairs(HONOUR_KEYS))]],
  "gerties-garter": () => [[0, 1], [0, 2], [1, 2]].map(([a, b]) => [S(`Run 1 to 7 in ${title(SUITS[a])}`, run(SUITS[a], 1, 7)), S(`Run 1 to 7 in ${title(SUITS[b])}`, run(SUITS[b], 1, 7))]),
  "lily-of-the-valley": () => [[S("Green Dragon Pung", pungs([dk("green")])), S("White Dragon Pung", pungs([dk("white")])), ...many(2, () => S("Bamboo Pung", pungs(numKeys(["bamboo"])), "b")), S("Bamboo Pair", pairs(numKeys(["bamboo"])))]],
  "bombay-mix": () => [[...many(2, () => S("Pung", pungs(numKeys(SUITS)), "u")), S("Chow", chows(SUITS)), S("Honour Pung", pungs(HONOUR_KEYS)), S("Honour Pair", pairs(HONOUR_KEYS))]],
  "dragons-run": () => perSuit((s) => [S(`Run 1 to 9 in ${title(s)}`, run(s, 1, 9)), dragonSet(), S("Pair of Winds", pairs(WIND_KEYS))]),
  purity: () => [
    ...perSuit((s) => [...many(3, () => S("Pung", pungs(numKeys([s])), "u")), S("Chow", chows([s])), S("Pair", pairs(numKeys([s])))]),
    ...perSuit((s) => [...many(4, () => S("Kong", kongs(numKeys([s])), "k")), S("Pair", pairs(numKeys([s])))]),
  ],
  betty: () => perSuit((s) => [...many(3, () => S("Pair", pairs(numKeys([s])), "p")), windSet(false), dragonSet(), extraHonour()]),
  "triple-knitting": () => [[...many(4, () => S("Crochet", crochets(), "c")), S("Knit", knits())]],
  "seven-brothers": () => [[...eachSuit("Pung of 7s", (s) => pungs([nk(s, 7)])), windSet(true)]],
  "driven-snow": () => [[...many(3, () => S("Odd Pung", pungs(numKeys(SUITS, [1, 3, 5, 7, 9])), "o")), S("Odd Pair", pairs(numKeys(SUITS, [1, 3, 5, 7, 9]))), S("White Dragon Pung", pungs([dk("white")]))]],
  "all-pairs-in-honours": () => [many(7, () => S("Honour Pair", pairs(HONOUR_KEYS), "h"))],
  "all-pairs": () => perSuit((s) => many(7, () => S("Pair", pairs(numKeys([s])), "p"))),
};

export type PlanSlot = { name: string; size: number; held: Tile[]; missing: string[]; complete: boolean };
export type SouthPlan = { slots: PlanSlot[]; usedIds: Set<string>; spare: Tile[]; offCard: Tile[]; complete: number; tilesAway: number };

type Pick = { slot: Slot; template: string[] | null; heldKeys: string[] };

function solve(slots: Slot[], counts: Map<string, number>): { picks: Pick[]; score: number } {
  const used = new Map<string, number>();
  let best: { picks: Pick[]; score: number } = { picks: [], score: -1 };
  let nodes = 0;
  const heldKeys = (template: string[]) => {
    const need = new Map<string, number>();
    template.forEach((key) => need.set(key, (need.get(key) ?? 0) + 1));
    const held: string[] = [];
    need.forEach((count, key) => { const free = (counts.get(key) ?? 0) - (used.get(key) ?? 0); for (let i = 0; i < Math.min(count, free); i += 1) held.push(key); });
    return held;
  };
  const lastIndex = new Map<string, number>();
  const walk = (index: number, picks: Pick[], score: number, complete: number) => {
    if (nodes > 200000) return;
    nodes += 1;
    if (index === slots.length) {
      const total = score + complete * 0.01;
      if (total > best.score) best = { picks: [...picks], score: total };
      return;
    }
    const slot = slots[index];
    const floor = slot.group ? (lastIndex.get(slot.group) ?? -1) : -1;
    const options = slot.templates.map((template, templateIndex) => ({ template, templateIndex, held: heldKeys(template) })).filter((option) => option.templateIndex > floor);
    const positive = options.filter((option) => option.held.length > 0).sort((a, b) => b.held.length - a.held.length).slice(0, 5);
    const choices = positive.length ? positive : options.slice(0, 1);
    if (!choices.length) { walk(index + 1, [...picks, { slot, template: null, heldKeys: [] }], score, complete); return; }
    for (const option of choices) {
      option.held.forEach((key) => used.set(key, (used.get(key) ?? 0) + 1));
      const previous = slot.group ? lastIndex.get(slot.group) : undefined;
      if (slot.group) lastIndex.set(slot.group, option.templateIndex);
      walk(index + 1, [...picks, { slot, template: option.held.length ? option.template : null, heldKeys: option.held }], score + option.held.length, complete + (option.held.length === option.template.length ? 1 : 0));
      if (slot.group) { if (previous === undefined) lastIndex.delete(slot.group); else lastIndex.set(slot.group, previous); }
      option.held.forEach((key) => used.set(key, (used.get(key) ?? 0) - 1));
    }
  };
  walk(0, [], 0, 0);
  return best;
}

/** `all` is every tile the player owns for this card (hand plus exposed sets); `hand` is the concealed part. */
export function southPlan(card: SouthCard, all: readonly Tile[], hand: readonly Tile[]): SouthPlan | undefined {
  const make = VARIANTS[card.id];
  if (!make) return undefined;
  const counts = new Map<string, number>();
  all.forEach((tile) => counts.set(tileKey(tile), (counts.get(tileKey(tile)) ?? 0) + 1));
  let top: { picks: Pick[]; score: number } | undefined;
  for (const variant of make()) {
    const result = solve(variant, counts);
    if (!top || result.score > top.score) top = result;
  }
  if (!top) return undefined;
  const pool = [...all];
  const usedIds = new Set<string>();
  const slots: PlanSlot[] = top.picks.map(({ slot, template, heldKeys }) => {
    const held: Tile[] = [];
    heldKeys.forEach((key) => { const i = pool.findIndex((tile) => tileKey(tile) === key); if (i >= 0) { held.push(pool[i]); usedIds.add(pool[i].id); pool.splice(i, 1); } });
    const size = template?.length ?? slot.templates[0]?.length ?? 0;
    const remaining = [...heldKeys];
    const missing = (template ?? []).filter((key) => { const i = remaining.indexOf(key); if (i >= 0) { remaining.splice(i, 1); return false; } return true; });
    return { name: slot.name, size, held, missing, complete: !!template && held.length === size };
  });
  const concealed = new Set(hand.map((tile) => tile.id));
  const spare = hand.filter((tile) => !usedIds.has(tile.id) && SAMPLE.has(tileKey(tile)) && allowedAnywhere(card, tile));
  const offCard = hand.filter((tile) => !usedIds.has(tile.id) && !allowedAnywhere(card, tile) && concealed.has(tile.id) && (tile.kind === "number" || tile.kind === "wind" || tile.kind === "dragon"));
  return { slots, usedIds, spare, offCard, complete: slots.filter((slot) => slot.complete).length, tilesAway: slots.reduce((sum, slot) => sum + (slot.complete ? 0 : Math.max(0, slot.size - slot.held.length)), 0) };
}

const ALLOWED = new Map<string, Set<string>>();
/** Whether any part of this card could ever use the tile. */
export function allowedAnywhere(card: SouthCard, tile: Tile): boolean {
  const make = VARIANTS[card.id];
  if (!make) return true;
  let keys = ALLOWED.get(card.id);
  if (!keys) { keys = new Set(make().flatMap((variant) => variant.flatMap((slot) => slot.templates.flat()))); ALLOWED.set(card.id, keys); }
  return keys.has(tileKey(tile));
}
