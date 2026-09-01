import type { Seat, Tile } from "./tiles";

export type ScorePlayer = { seat: Seat; bonusTiles: Tile[] };
export type EastRoundWinner = { seat: Seat; concealed: boolean };
export type ScoreTransfer = { from: Seat; to: Seat; amount: number; reason: string };
export type EastRoundSettlement = { transfers: ScoreTransfer[]; changes: Record<Seat, number> };

const seats: Seat[] = ["east", "south", "west", "north"];
const windNumber: Record<Seat, number> = { east: 1, south: 2, west: 3, north: 4 };

function addAward(transfers: ScoreTransfer[], recipient: Seat, base: number, reason: string) {
  for (const payer of seats) {
    if (payer === recipient) continue;
    const amount = recipient === "east" || payer === "east" ? base * 2 : base;
    transfers.push({ from: payer, to: recipient, amount, reason });
  }
}

function flowerAwards(player: ScorePlayer, transfers: ScoreTransfer[]) {
  const ranks = player.bonusTiles.filter((tile) => tile.kind === "flower" || tile.kind === "season").map((tile) => tile.rank);
  const count = (rank: number) => ranks.filter((item) => item === rank).length;
  if (count(windNumber[player.seat]) >= 2) addAward(transfers, player.seat, 500, "Seating-wind Flower/Season pair");
  if (count(1) >= 2) addAward(transfers, player.seat, 500, "East round-wind Flower/Season pair");
  const flowers = new Set(player.bonusTiles.filter((tile) => tile.kind === "flower").map((tile) => tile.rank));
  const seasons = new Set(player.bonusTiles.filter((tile) => tile.kind === "season").map((tile) => tile.rank));
  if ([1, 2, 3, 4].every((rank) => flowers.has(rank)) || [1, 2, 3, 4].every((rank) => seasons.has(rank))) addAward(transfers, player.seat, 1000, "Pure bouquet");
  if ([1, 2, 3, 4].every((rank) => ranks.includes(rank))) addAward(transfers, player.seat, 500, "Mixed bouquet");
}

/** Exact East Round payments and documented Flower/Season awards. */
export function settleEastRound(players: Record<Seat, ScorePlayer>, winner?: EastRoundWinner): EastRoundSettlement {
  const transfers: ScoreTransfer[] = [];
  if (winner) addAward(transfers, winner.seat, winner.concealed ? 1000 : 500, `${winner.concealed ? "Concealed" : "Exposed"} Mahjong`);
  for (const seat of seats) flowerAwards(players[seat], transfers);
  const changes = Object.fromEntries(seats.map((seat) => [seat, 0])) as Record<Seat, number>;
  for (const transfer of transfers) { changes[transfer.from] -= transfer.amount; changes[transfer.to] += transfer.amount; }
  return { transfers, changes };
}
