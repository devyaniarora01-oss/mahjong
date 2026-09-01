export const SEATS = ["east", "south", "west", "north"] as const;
export type Seat = (typeof SEATS)[number];

export const SUITS = ["bamboo", "character", "dot"] as const;
export type Suit = (typeof SUITS)[number];

export const WINDS = ["east", "south", "west", "north"] as const;
export type Wind = (typeof WINDS)[number];

export const DRAGONS = ["red", "green", "white"] as const;
export type Dragon = (typeof DRAGONS)[number];

export type NumberTile = {
  id: string;
  kind: "number";
  suit: Suit;
  rank: number;
};

export type WindTile = { id: string; kind: "wind"; wind: Wind };
export type DragonTile = { id: string; kind: "dragon"; dragon: Dragon };
export type FlowerTile = { id: string; kind: "flower"; rank: number };
export type SeasonTile = { id: string; kind: "season"; rank: number };

export type Tile = NumberTile | WindTile | DragonTile | FlowerTile | SeasonTile;

const copies = (create: (copy: number) => Tile): Tile[] =>
  Array.from({ length: 4 }, (_, copy) => create(copy + 1));

export function createTileSet(): Tile[] {
  const tiles: Tile[] = [];

  for (const suit of SUITS) {
    for (let rank = 1; rank <= 9; rank += 1) {
      tiles.push(...copies((copy) => ({ id: `${suit}-${rank}-${copy}`, kind: "number", suit, rank })));
    }
  }

  for (const wind of WINDS) {
    tiles.push(...copies((copy) => ({ id: `wind-${wind}-${copy}`, kind: "wind", wind })));
  }

  for (const dragon of DRAGONS) {
    tiles.push(...copies((copy) => ({ id: `dragon-${dragon}-${copy}`, kind: "dragon", dragon })));
  }

  for (let rank = 1; rank <= 4; rank += 1) {
    tiles.push({ id: `flower-${rank}`, kind: "flower", rank });
    tiles.push({ id: `season-${rank}`, kind: "season", rank });
  }

  return tiles;
}

/** MVP interpretation of the rulebook's conflicting replacement wording. */
export function needsFlowerWallReplacement(tile: Tile): boolean {
  return tile.kind === "flower" || tile.kind === "season";
}

export function tileLabel(tile: Tile): string {
  if (tile.kind === "number") return `${tile.rank} ${tile.suit}`;
  if (tile.kind === "wind") return `${tile.wind} wind`;
  if (tile.kind === "dragon") return `${tile.dragon} dragon`;
  return `${tile.kind} ${tile.rank}`;
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
