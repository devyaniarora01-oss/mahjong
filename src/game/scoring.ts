import type { Seat, Tile } from "./tiles";
import type { Meld } from "./state";
import { westHandKind } from "./west-goals";

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

export function addFlowerAwards(player: ScorePlayer, transfers: ScoreTransfer[]) {
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
  for (const seat of seats) addFlowerAwards(players[seat], transfers);
  const changes = Object.fromEntries(seats.map((seat) => [seat, 0])) as Record<Seat, number>;
  for (const transfer of transfers) { changes[transfer.from] -= transfer.amount; changes[transfer.to] += transfer.amount; }
  return { transfers, changes };
}

/** South Card score: the winner receives their printed card value from each opponent, doubled where East is involved. */
export function settleSouthRound(players: Record<Seat, ScorePlayer>, winner: { seat: Seat; cardScore: number }, pot = 0): EastRoundSettlement {
  const transfers: ScoreTransfer[] = [];
  addAward(transfers, winner.seat, winner.cardScore, "South Card Mahjong");
  for (const seat of seats) addFlowerAwards(players[seat], transfers);
  if (pot > 0) transfers.push({ from: winner.seat, to: winner.seat, amount: pot, reason: "South Round buy pot" });
  const changes = Object.fromEntries(seats.map((seat) => [seat, 0])) as Record<Seat, number>;
  for (const transfer of transfers) { if (transfer.from !== transfer.to) changes[transfer.from] -= transfer.amount; changes[transfer.to] += transfer.amount; }
  return { transfers, changes };
}

type WestScorePlayer = ScorePlayer & { hand: Tile[]; melds: Meld[] };

/** West table amounts are received from each player, doubled where East is involved. */
export function settleWestRound(players: Record<Seat, WestScorePlayer>, winner?: EastRoundWinner): EastRoundSettlement {
  const transfers: ScoreTransfer[] = [];
  if (winner) {
    const kind = westHandKind(players[winner.seat].hand, players[winner.seat].melds);
    const base: Record<NonNullable<typeof kind>, number> = {
      sameSuit: winner.concealed ? 2_000 : 1_000,
      honours: winner.concealed ? 2_500 : 1_500,
      fourExposedKongs: 1_500,
      threeConcealedKongs: 2_000,
      concealedCleanMix: 2_000,
      exposedCleanMix: 1_500,
      major: 1_500,
    };
    const labels: Record<NonNullable<typeof kind>, string> = {
      sameSuit: "West same-suit Pungs/Kongs/Pairs",
      honours: "West honours-only Pungs/Kongs/Pairs",
      fourExposedKongs: "West four exposed Kongs with a Pair",
      threeConcealedKongs: "West three concealed Kongs path",
      concealedCleanMix: "West concealed clean Pung/Kong/Pair path",
      exposedCleanMix: "West exposed clean Pung/Kong/Pair path",
      major: "West Major Hand",
    };
    if (kind) addAward(transfers, winner.seat, base[kind], labels[kind]);
  }
  for (const seat of seats) addFlowerAwards(players[seat], transfers);
  const changes = Object.fromEntries(seats.map((seat) => [seat, 0])) as Record<Seat, number>;
  for (const transfer of transfers) { changes[transfer.from] -= transfer.amount; changes[transfer.to] += transfer.amount; }
  return { transfers, changes };
}
