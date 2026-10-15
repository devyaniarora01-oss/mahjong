import type { Tile } from "../game/tiles";
import { tileKey } from "./Tile";

/**
 * Presentation-only grouping of a concealed hand, used by "Explain my hand" to
 * lay the tiles out as a form. It reads the tiles; it never decides legality.
 */
export type HandGroup = {
  kind: "set" | "pair" | "need" | "loose";
  /** Short caption shown above the group. */
  label: string;
  tiles: Tile[];
  /** For "need": the tile keys that would complete it, e.g. ["d4", "d7"]. */
  needs?: string[];
};

const suitCode = (tile: Tile) => (tile.kind === "number" ? ({ character: "c", dot: "d", bamboo: "b" }[tile.suit]) : "");
const suitWord = (code: string) => ({ c: "characters", d: "dots", b: "bamboo" }[code] ?? "");

export function groupHand(hand: readonly Tile[], opts: { chows: boolean } = { chows: true }): HandGroup[] {
  const pool = [...hand];
  const take = (tile: Tile) => { const i = pool.findIndex((t) => t.id === tile.id); if (i >= 0) pool.splice(i, 1); };
  const groups: HandGroup[] = [];

  // identical tiles: sets of three or four
  const byKey = new Map<string, Tile[]>();
  pool.forEach((t) => byKey.set(tileKey(t), [...(byKey.get(tileKey(t)) ?? []), t]));
  byKey.forEach((tiles) => {
    if (tiles.length >= 3) { groups.push({ kind: "set", label: tiles.length >= 4 ? "Kong ✓" : "Pung ✓", tiles }); tiles.forEach(take); }
  });

  // complete chows
  if (opts.chows) {
    let found = true;
    while (found) {
      found = false;
      const nums = pool.filter((t): t is Extract<Tile, { kind: "number" }> => t.kind === "number");
      for (const a of nums) {
        const b = nums.find((t) => t.suit === a.suit && t.rank === a.rank + 1);
        const c = b && nums.find((t) => t.suit === a.suit && t.rank === a.rank + 2);
        if (b && c) { groups.push({ kind: "set", label: "Chow ✓", tiles: [a, b, c] }); [a, b, c].forEach(take); found = true; break; }
      }
    }
  }

  // pairs
  const left = new Map<string, Tile[]>();
  pool.forEach((t) => left.set(tileKey(t), [...(left.get(tileKey(t)) ?? []), t]));
  let pairCount = 0;
  left.forEach((tiles) => {
    if (tiles.length === 2) { groups.push({ kind: "pair", label: pairCount === 0 ? "Pair ✓" : "Pair", tiles }); pairCount += 1; tiles.forEach(take); }
  });

  // two tiles that are one away from a chow
  if (opts.chows) {
    let found = true;
    while (found) {
      found = false;
      const nums = pool.filter((t): t is Extract<Tile, { kind: "number" }> => t.kind === "number");
      for (const a of nums) {
        const b = nums.find((t) => t.suit === a.suit && (t.rank === a.rank + 1 || t.rank === a.rank + 2));
        if (!b) continue;
        const code = suitCode(a);
        const wants = b.rank === a.rank + 1 ? [a.rank - 1, b.rank + 1] : [a.rank + 1];
        const needs = wants.filter((r) => r >= 1 && r <= 9).map((r) => `${code}${r}`);
        const ranks = needs.map((k) => k.slice(1)).join(" or ");
        groups.push({ kind: "need", label: `Chow · needs ${ranks}`, tiles: [a, b], needs });
        [a, b].forEach(take); found = true; break;
      }
    }
  }

  if (pool.length) groups.push({ kind: "loose", label: `Loose · ${pool.length}`, tiles: [...pool] });
  return groups;
}

export { suitWord };
