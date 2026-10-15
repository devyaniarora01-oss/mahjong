import type { SouthCard } from "./south-cards";
import type { Tile } from "./tiles";

type Dragon = "red" | "green" | "white";
type Spec = { n?: (suit: string, rank: number) => boolean; w?: boolean; d?: boolean | Dragon[] };

const any = () => true;
const none = () => false;
const rank = (...r: number[]) => (_: string, x: number) => r.includes(x);

/**
 * Which tiles can ever be part of each South Card. This is a coaching
 * classification only (it never decides legality): a tile outside this list is
 * a loose tile for that card, however neatly it pairs up.
 */
const SPEC: Record<string, Spec> = {
  windfall: { n: any, w: true },
  "windy-dragons": { n: none, w: true, d: true },
  "three-sisters": { n: rank(3), w: true },
  "western-command": { n: any },
  "all-honour-hand": { n: none, w: true, d: true },
  "windy-chow": { n: any, w: true },
  "crazy-chows": { n: any },
  "little-arthur": { n: any },
  "unique-wonder": { n: rank(1, 9), w: true, d: true },
  "the-moon": { n: (suit) => suit === "dot" },
  "three-philosophers": { n: any },
  "gretas-garden": { n: (_, x) => x <= 7, w: true, d: true },
  "wriggly-snake": { n: any, w: true },
  "big-robert": { n: any, w: true, d: true },
  "gerties-garter": { n: (_, x) => x <= 7 },
  "lily-of-the-valley": { n: (suit) => suit === "bamboo", d: ["green", "white"] },
  "bombay-mix": { n: any, w: true, d: true },
  "dragons-run": { n: any, w: true, d: true },
  purity: { n: any },
  betty: { n: any, w: true, d: true },
  "triple-knitting": { n: any },
  "seven-brothers": { n: rank(7), w: true },
  "driven-snow": { n: (_, x) => x % 2 === 1, d: ["white"] },
  "all-pairs-in-honours": { n: none, w: true, d: true },
  "all-pairs": { n: any },
};

export function southCardAllows(card: SouthCard, tile: Tile): boolean {
  const spec = SPEC[card.id];
  if (!spec) return true;
  if (tile.kind === "number") return (spec.n ?? any)(tile.suit, tile.rank);
  if (tile.kind === "wind") return !!spec.w;
  if (tile.kind === "dragon") return Array.isArray(spec.d) ? spec.d.includes(tile.dragon) : !!spec.d;
  return false;
}
