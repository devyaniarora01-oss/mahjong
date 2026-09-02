import type { SouthCard } from "./south-cards";
import type { Tile } from "./tiles";

type Numbered = Extract<Tile, { kind: "number" }>;
const same = (a: Tile, b: Tile) => a.kind === b.kind && (a.kind === "number" && b.kind === "number" ? a.suit === b.suit && a.rank === b.rank : a.kind === "wind" && b.kind === "wind" ? a.wind === b.wind : a.kind === "dragon" && b.kind === "dragon" ? a.dragon === b.dragon : a.kind === "flower" && b.kind === "flower" ? a.rank === b.rank : a.kind === "season" && b.kind === "season" ? a.rank === b.rank : false);
const number = (tile: Tile): tile is Numbered => tile.kind === "number";
const honour = (tile: Tile) => tile.kind === "wind" || tile.kind === "dragon";
const sameKind = (tiles: Tile[], size: number) => tiles.length === size && tiles.every((tile) => same(tile, tiles[0]));
const pung = (tiles: Tile[]) => sameKind(tiles, 3);
const pair = (tiles: Tile[]) => sameKind(tiles, 2);
const chow = (tiles: Tile[]) => tiles.length === 3 && tiles.every(number) && new Set(tiles.map((tile) => tile.suit)).size === 1 && (() => { const ranks = tiles.map((tile) => tile.rank).sort((a,b) => a-b); return ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1; })();
/** Illustrated on the supplied South cards: consecutive numbers, one from each suit. */
const mixedChow = (tiles: Tile[]) => tiles.length === 3 && tiles.every(number) && new Set(tiles.map((tile) => tile.suit)).size === 3 && (() => { const ranks = tiles.map((tile) => tile.rank).sort((a,b) => a-b); return ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1; })();
const crochet = (tiles: Tile[]) => tiles.length === 3 && tiles.every(number) && new Set(tiles.map((tile) => tile.rank)).size === 1 && new Set(tiles.map((tile) => tile.suit)).size === 3;
const knit = (tiles: Tile[]) => tiles.length === 2 && tiles.every(number) && tiles[0].rank === tiles[1].rank && tiles[0].suit !== tiles[1].suit;
const choose = (tiles: Tile[], size: number, predicate: (picked: Tile[]) => boolean, start = 0, picked: Tile[] = []): Tile[][] => {
  if (picked.length === size) return predicate(picked) ? [picked] : [];
  const out: Tile[][] = [];
  for (let index = start; index <= tiles.length - (size - picked.length); index += 1) out.push(...choose(tiles, size, predicate, index + 1, [...picked, tiles[index]]));
  return out;
};
const remove = (tiles: Tile[], picked: Tile[]) => { const ids = new Set(picked.map((tile) => tile.id)); return tiles.filter((tile) => !ids.has(tile.id)); };
type Pattern = { size: number; matches: (tiles: Tile[]) => boolean };
const partition = (tiles: Tile[], patterns: Pattern[]): boolean => {
  if (!patterns.length) return tiles.length === 0;
  const [first, ...rest] = patterns;
  return choose(tiles, first.size, first.matches).some((picked) => partition(remove(tiles, picked), rest));
};
const P: Pattern = { size: 3, matches: pung }, C: Pattern = { size: 3, matches: chow }, M: Pattern = { size: 3, matches: mixedChow }, R: Pattern = { size: 2, matches: pair }, K: Pattern = { size: 2, matches: knit }, X: Pattern = { size: 3, matches: crochet };
const hasRun = (tiles: Tile[], suit: Numbered["suit"], from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index).every((rank) => tiles.some((tile) => number(tile) && tile.suit === suit && tile.rank === rank));
const windCount = (tiles: Tile[], wind: string) => tiles.filter((tile) => tile.kind === "wind" && tile.wind === wind).length;
const allWinds = (tiles: Tile[]) => ["east", "south", "west", "north"].every((wind) => windCount(tiles, wind) > 0);

/** Exact card goals from South Round cards.pdf. Patterns use the examples printed on the cards. */
export function matchesSouthCard(card: SouthCard, tiles: readonly Tile[]): boolean {
  const hand = [...tiles];
  const suits: Numbered["suit"][] = ["bamboo", "character", "dot"];
  if (card.id === "windfall") return allWinds(hand) && suits.some((suit) => { const suitTiles = hand.filter((tile) => number(tile) && tile.suit === suit); return suitTiles.length === 10 && suitTiles.every((tile) => suitTiles.filter((other) => same(tile, other)).length === 2); });
  if (card.id === "windy-dragons") return ["east","south","west","north"].every((wind) => windCount(hand, wind) === 2) && partition(hand.filter((tile) => tile.kind === "dragon"), [P, P]);
  if (card.id === "three-sisters") return suits.every((suit) => hand.filter((tile) => number(tile) && tile.suit === suit && tile.rank === 3).length >= 3) && allWinds(hand) && hand.filter((tile) => tile.kind === "wind").length === 5;
  if (card.id === "western-command") return hand.every(number) && partition(hand, [P,P,P,C,R]);
  if (card.id === "all-honour-hand") return hand.every(honour) && partition(hand, [P,P,P,P,R]);
  if (card.id === "windy-chow") return allWinds(hand) && hand.filter((tile) => tile.kind === "wind").length === 5 && partition(hand.filter((tile) => number(tile)), [C,C,C]);
  if (card.id === "crazy-chows") return partition(hand, [M,M,M,M,K]);
  if (card.id === "little-arthur") return hand.every(number) && partition(hand, [C,C,C,P,R]);
  if (card.id === "unique-wonder") return hand.filter((tile) => number(tile) && tile.rank === 1).length === 3 && hand.filter((tile) => number(tile) && tile.rank === 9).length === 3 && allWinds(hand) && ["red","green","white"].every((dragon) => hand.some((tile) => tile.kind === "dragon" && tile.dragon === dragon));
  if (card.id === "the-moon") return hand.every((tile) => number(tile) && tile.suit === "dot") && partition(hand, [C,C,C,C,R]);
  if (card.id === "three-philosophers") return partition(hand, [C,C,C,M,R]);
  if (card.id === "gretas-garden") return suits.some((suit) => hasRun(hand, suit, 1, 7)) && allWinds(hand) && ["red","green","white"].every((dragon) => hand.some((tile) => tile.kind === "dragon" && tile.dragon === dragon));
  if (card.id === "wriggly-snake") return suits.some((suit) => hasRun(hand, suit, 1, 9)) && allWinds(hand) && hand.filter((tile) => tile.kind === "wind").length === 5;
  if (card.id === "big-robert") return suits.every((suit) => [1,2,3,4,5,6].some((start) => hasRun(hand, suit, start, start + 3))) && hand.filter(honour).some((tile) => hand.filter((other) => same(tile, other)).length >= 2);
  if (card.id === "gerties-garter") return suits.filter((suit) => hasRun(hand, suit, 1, 7)).length >= 2;
  if (card.id === "lily-of-the-valley") return hand.filter((tile) => tile.kind === "dragon" && tile.dragon === "green").length >= 3 && hand.filter((tile) => tile.kind === "dragon" && tile.dragon === "white").length >= 3 && partition(hand.filter((tile) => number(tile) && tile.suit === "bamboo"), [P,P,R]);
  if (card.id === "bombay-mix") return partition(hand, [P,P,C,P,R]);
  if (card.id === "dragons-run") return suits.some((suit) => hasRun(hand, suit, 1, 9)) && ["red","green","white"].every((dragon) => hand.some((tile) => tile.kind === "dragon" && tile.dragon === dragon)) && hand.filter((tile) => tile.kind === "wind").some((tile) => hand.filter((other) => same(tile,other)).length >= 2);
  if (card.id === "purity") return suits.some((suit) => hand.every((tile) => number(tile) && tile.suit === suit) && partition(hand, [P,P,P,C,R]));
  if (card.id === "betty") return allWinds(hand) && ["red","green","white"].every((dragon) => hand.some((tile) => tile.kind === "dragon" && tile.dragon === dragon)) && suits.some((suit) => hand.filter((tile) => number(tile) && tile.suit === suit).filter((tile) => hand.filter((other) => same(tile,other)).length >= 2).length >= 6);
  if (card.id === "triple-knitting") return partition(hand, [X,X,X,X,K]);
  if (card.id === "seven-brothers") return suits.every((suit) => hand.filter((tile) => number(tile) && tile.suit === suit && tile.rank === 7).length >= 3) && allWinds(hand) && hand.filter((tile) => tile.kind === "wind").length === 5;
  if (card.id === "driven-snow") return partition(hand, [P,P,P,R,P]) && hand.filter((tile) => tile.kind === "dragon" && tile.dragon === "white").length >= 3 && hand.filter(number).every((tile) => [1,3,5,7,9].includes(tile.rank));
  if (card.id === "all-pairs-in-honours") return hand.every(honour) && partition(hand, [R,R,R,R,R,R,R]);
  if (card.id === "all-pairs") return suits.some((suit) => hand.every((tile) => number(tile) && tile.suit === suit) && partition(hand, [R,R,R,R,R,R,R]));
  return false;
}
