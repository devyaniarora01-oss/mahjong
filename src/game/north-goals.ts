import { matchesSouthCard } from "./south-goals";
import { isWestMahjongHand, westHandKind, type WestHandKind } from "./west-goals";
import type { SouthCard } from "./south-cards";
import type { Meld } from "./state";
import type { Tile } from "./tiles";

const canonicalTiles = (): Tile[] => [
  ...(["bamboo", "character", "dot"] as const).flatMap((suit) => Array.from({ length: 9 }, (_, index) => ({ id: `north-${suit}-${index + 1}`, kind: "number" as const, suit, rank: index + 1 }))),
  ...(["east", "south", "west", "north"] as const).map((wind) => ({ id: `north-wind-${wind}`, kind: "wind" as const, wind })),
  ...(["red", "green", "white"] as const).map((dragon) => ({ id: `north-dragon-${dragon}`, kind: "dragon" as const, dragon })),
];

const identity = (tile: Tile) => tile.kind === "number" ? `${tile.suit}-${tile.rank}` : tile.kind === "wind" ? `wind-${tile.wind}` : tile.kind === "dragon" ? `dragon-${tile.dragon}` : `${tile.kind}-${tile.rank}`;

/**
 * North joker evaluation tries concrete legal tile identities while retaining
 * the physical joker in state. The evaluator is private to validation; no
 * hidden tile information is used.
 */
function resolveWithJokers(tiles: readonly Tile[], isJoker: (tile: Tile) => boolean, matcher: (resolved: Tile[]) => boolean, forbidJoiningSingle = false): Tile[] | undefined {
  const jokerIndexes = tiles.flatMap((tile, index) => isJoker(tile) ? [index] : []);
  if (!jokerIndexes.length) return matcher([...tiles]) ? [...tiles] : undefined;
  const fixed = tiles.filter((tile) => !isJoker(tile));
  const counts = fixed.reduce<Record<string, number>>((result, tile) => ({ ...result, [identity(tile)]: (result[identity(tile)] ?? 0) + 1 }), {});
  const candidates = canonicalTiles().sort((left, right) => (counts[identity(right)] ?? 0) - (counts[identity(left)] ?? 0));
  const resolved = [...tiles];
  const visit = (index: number): boolean => {
    if (index === jokerIndexes.length) return matcher(resolved);
    for (const candidate of candidates) {
      const key = identity(candidate);
      if ((counts[key] ?? 0) >= 4) continue;
      // A South-as-North joker may not make the second half of a Pair. This
      // conservative guard still allows it to fill a missing Chow tile or a
      // third/fourth matching tile in a declared group.
      if (forbidJoiningSingle && (counts[key] ?? 0) === 1) continue;
      counts[key] = (counts[key] ?? 0) + 1;
      resolved[jokerIndexes[index]] = { ...candidate, id: `north-joker-${index}-${key}` } as Tile;
      if (visit(index + 1)) return true;
      resolved[jokerIndexes[index]] = tiles[jokerIndexes[index]];
      counts[key] -= 1;
    }
    return false;
  };
  return visit(0) ? resolved : undefined;
}

export const isSouthNorthJoker = (tile: Tile) => tile.kind === "flower" || tile.kind === "season";
export const isWestNorthJoker = (tile: Tile, jokerRank?: number) => tile.kind === "number" && tile.rank === jokerRank;

/** Flowers/Seasons are concealed South-as-North jokers and can never resolve as a Pair. */
export function matchesSouthNorthCard(card: SouthCard, hand: readonly Tile[], melds: readonly Meld[]): boolean {
  const all = [...hand, ...melds.flatMap((meld) => meld.tiles)];
  return !!resolveWithJokers(all, isSouthNorthJoker, (resolved) => matchesSouthCard(card, resolved), true);
}

/** Selected numbered cards are West-as-North jokers; West's normal checker remains the authority for final structure. */
export function isWestNorthMahjongHand(hand: readonly Tile[], melds: readonly Meld[], jokerRank?: number): boolean {
  const all = [...hand, ...melds.flatMap((meld) => meld.tiles)];
  return !!resolveWithJokers(all, (tile) => isWestNorthJoker(tile, jokerRank), (resolved) => isWestMahjongHand(resolved));
}

/** Resolves a legal West-as-North hand only for applying the supplied West scoring table. */
export function westNorthHandKind(hand: readonly Tile[], melds: readonly Meld[], jokerRank?: number): WestHandKind | undefined {
  const all = [...hand, ...melds.flatMap((meld) => meld.tiles)];
  const resolved = resolveWithJokers(all, (tile) => isWestNorthJoker(tile, jokerRank), (tiles) => isWestMahjongHand(tiles));
  if (!resolved) return undefined;
  const resolvedHand = resolved.slice(0, hand.length);
  let offset = hand.length;
  const resolvedMelds = melds.map((meld) => ({ ...meld, tiles: resolved.slice(offset, offset += meld.tiles.length) }));
  return westHandKind(resolvedHand, resolvedMelds) ?? westHandKind(resolved);
}
