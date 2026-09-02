import type { Meld } from "./state";
import type { Tile } from "./tiles";

const same = (left: Tile, right: Tile) => {
  if (left.kind !== right.kind) return false;
  if (left.kind === "number" && right.kind === "number") return left.suit === right.suit && left.rank === right.rank;
  if (left.kind === "wind" && right.kind === "wind") return left.wind === right.wind;
  if (left.kind === "dragon" && right.kind === "dragon") return left.dragon === right.dragon;
  return false;
};
const remove = (tiles: readonly Tile[], indices: readonly number[]) => tiles.filter((_, index) => !indices.includes(index));
const isPung = (tiles: readonly Tile[]) => tiles.length === 3 && tiles.every((tile) => same(tile, tiles[0]));
const isKong = (tiles: readonly Tile[]) => tiles.length === 4 && tiles.every((tile) => same(tile, tiles[0]));
const isPair = (tiles: readonly Tile[]) => tiles.length === 2 && same(tiles[0], tiles[1]);
const isHonour = (tile: Tile) => tile.kind === "wind" || tile.kind === "dragon";

export type WestHandKind = "sameSuit" | "honours" | "fourExposedKongs" | "threeConcealedKongs" | "concealedCleanMix" | "exposedCleanMix" | "major";

/**
 * West/Goulash uses only Pungs, Kongs, and one Pair; every valid hand needs a Kong.
 * The selected kind mirrors the explicit West Round paths in the supplied rulebook.
 */
export function westHandKind(hand: readonly Tile[], melds: readonly Meld[] = []): WestHandKind | undefined {
  if (!melds.every((meld) => (meld.kind === "pung" && isPung(meld.tiles)) || (meld.kind === "kong" && isKong(meld.tiles)))) return undefined;
  const allTiles = [...hand, ...melds.flatMap((meld) => meld.tiles)];
  const numbered = allTiles.filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number");
  const clean = new Set(numbered.map((tile) => tile.suit)).size <= 1;
  const sameSuit = numbered.length === allTiles.length && new Set(numbered.map((tile) => tile.suit)).size === 1;
  const honours = allTiles.every(isHonour);
  const declaredKongs = melds.filter((meld) => meld.kind === "kong");
  const exposedKongs = declaredKongs.filter((meld) => meld.exposed).length;
  const declaredConcealedKongs = declaredKongs.filter((meld) => !meld.exposed).length;
  const anyExposed = melds.some((meld) => meld.exposed);

  const partition = (tiles: readonly Tile[], sets: number, pairNeeded: boolean, concealedKongsFound: number): number | undefined => {
    if (!tiles.length) return sets === 0 && !pairNeeded ? concealedKongsFound : undefined;
    const first = tiles[0];
    if (pairNeeded) for (let second = 1; second < tiles.length; second += 1) if (isPair([first, tiles[second]])) {
      const result = partition(remove(tiles, [0, second]), sets, false, concealedKongsFound);
      if (result !== undefined) return result;
    }
    if (!sets) return undefined;
    for (let second = 1; second < tiles.length; second += 1) for (let third = second + 1; third < tiles.length; third += 1) {
      const pung = [first, tiles[second], tiles[third]];
      if (isPung(pung)) {
        const result = partition(remove(tiles, [0, second, third]), sets - 1, pairNeeded, concealedKongsFound);
        if (result !== undefined) return result;
      }
      for (let fourth = third + 1; fourth < tiles.length; fourth += 1) {
        const kong = [first, tiles[second], tiles[third], tiles[fourth]];
        if (!isKong(kong)) continue;
        const result = partition(remove(tiles, [0, second, third, fourth]), sets - 1, pairNeeded, concealedKongsFound + 1);
        if (result !== undefined) return result;
      }
    }
    return undefined;
  };

  const concealedKongs = partition(hand, 4 - melds.length, true, 0);
  if (concealedKongs === undefined || concealedKongs + declaredKongs.length < 1) return undefined;
  // Specific West table paths take precedence over the broad same-suit/honour
  // rows, so the result screen can name the actual completed path.
  if (clean && exposedKongs === 4) return "fourExposedKongs";
  if (clean && concealedKongs + declaredConcealedKongs >= 3) return "threeConcealedKongs";
  const major = numbered.every((tile) => tile.rank === 1 || tile.rank === 9);
  if (clean && major) return "major";
  if (sameSuit) return "sameSuit";
  if (honours) return "honours";
  if (!clean) return undefined;
  return anyExposed ? "exposedCleanMix" : "concealedCleanMix";
}

export const isWestMahjongHand = (hand: readonly Tile[], melds: readonly Meld[] = []) => westHandKind(hand, melds) !== undefined;
