import { type EastRoundState } from "./state";
import { type Seat, type Tile, tileLabel as rawTileLabel } from "./tiles";

export type CoachingOption = { tileId: string; title: string; reason: string; preserves: string; lookingFor: string; alternative?: string };
export type HandAnalysis = { pairs: string[]; pungs: string[]; chows: string[]; developingChows: { tiles: string; needs: string }[]; weakTiles: string[]; summary: string };
export type HandSummary = { overview: string; progress: string; built: string[]; developing: string[]; weak: string[]; scoring: string[]; focus: string };

const identity = (tile: Tile): string => {
  if (tile.kind === "number") return `${tile.suit}-${tile.rank}`;
  if (tile.kind === "wind") return `wind-${tile.wind}`;
  if (tile.kind === "dragon") return `dragon-${tile.dragon}`;
  return `${tile.kind}-${tile.rank}`;
};

/** Player-facing tile names use the same title case throughout Coach surfaces. */
const titleCase = (value: string): string => value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
const tileLabel = (tile: Tile): string => titleCase(rawTileLabel(tile));
const suitLabel = (suit: string): string => titleCase(suit);

const countGroups = (hand: readonly Tile[]): Tile[][] => Object.values(hand.reduce<Record<string, Tile[]>>((groups, tile) => ({ ...groups, [identity(tile)]: [...(groups[identity(tile)] ?? []), tile] }), {}));

const connectedPairs = (hand: readonly Tile[]): string[] => {
  const seen = new Set<string>();
  for (const tile of hand) {
    if (tile.kind !== "number") continue;
    for (const other of hand) {
      if (other.kind !== "number" || other.suit !== tile.suit || other.rank !== tile.rank + 1) continue;
      seen.add(`${tileLabel(tile)}–${tileLabel(other)}`);
    }
  }
  return [...seen];
};

const chowConnections = (tile: Tile, hand: readonly Tile[]): number => {
  if (tile.kind !== "number") return 0;
  let connections = 0;
  for (const other of hand) {
    if (other.id === tile.id || other.kind !== "number" || other.suit !== tile.suit) continue;
    if (Math.abs(other.rank - tile.rank) <= 2) connections += 1;
  }
  return connections;
};

const isInCompletePureChow = (tile: Tile, hand: readonly Tile[]): boolean => {
  if (tile.kind !== "number") return false;
  return hand.some((first) => hand.some((second) => {
    if (first.id === tile.id || second.id === tile.id || first.id === second.id || first.kind !== "number" || second.kind !== "number") return false;
    if (first.suit !== tile.suit || second.suit !== tile.suit) return false;
    const ranks = [tile.rank, first.rank, second.rank].sort((left, right) => left - right);
    return ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
  }));
};

export function explainHand(state: EastRoundState, seat: Seat, firstTurn: boolean): string {
  const player = state.players[seat];
  if (state.round === "south" && state.south) {
    const card = state.south.cards[seat];
    const goal = card.goal;
    const phase = state.phase === "charleston" ? "You are still in the Charleston exchange, so choose three tiles that look less useful for this specific goal." : state.phase === "discard" && state.turn === seat ? "You now need to discard one tile while protecting the parts of your hand that serve this goal." : "Keep comparing each draw to this specific South Card, rather than to the East Round four-groups-plus-a-pair shape.";
    return `Your South Card is ${card.title}. Your personal Mahjong goal this round is: ${goal} It is worth ${card.score.toLocaleString()} points if you complete it. ${phase}`;
  }
  const numbered = player.hand.filter((tile) => tile.kind === "number").length;
  const honours = player.hand.length - numbered;
  const groups = countGroups(player.hand);
  const pairs = groups.filter((group) => group.length === 2).map((group) => tileLabel(group[0]));
  const triples = groups.filter((group) => group.length >= 3).map((group) => tileLabel(group[0]));
  const runs = connectedPairs(player.hand);
  const crochetStarts = Object.values(player.hand.filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number").reduce<Record<number, Set<string>>>((acc, tile) => ({ ...acc, [tile.rank]: new Set([...(acc[tile.rank] ?? []), tile.suit]) }), {})).filter((suits) => suits.size === 2).length;
  const shape = `${pairs.length ? ` You have ${pairs.length} pair${pairs.length === 1 ? "" : "s"}: ${pairs.join(", ")}. A Pure Pair is two identical tiles.` : " You do not currently have a visible pair."}${triples.length ? ` You already hold ${triples.length} three-of-a-kind group${triples.length === 1 ? "" : "s"}: ${triples.join(", ")}. Three identical tiles make a Pung.` : ""}${runs.length ? ` Your connected tiles include ${runs.slice(0, 2).join(" and ")}; a Pure Chow needs three consecutive tiles of one suit.` : ""}${crochetStarts ? ` You also have ${crochetStarts} two-suit same-number start that could grow into a Crochet; a Crochet uses the same number in all three suits.` : ""}`;
  if (firstTurn) return `You have ${player.hand.length} tiles because East begins the round with 14. Your visible hand has ${numbered} numbered tiles and ${honours} honour tiles.${shape} Your East Round goal is four three-tile sets plus one two-tile set.`;
  if (state.phase === "draw" && state.turn === seat) return `It is your turn to draw. After drawing from the Draw Pile, you will choose one tile to discard.`;
  if (state.phase === "discard" && state.turn === seat) {
    const isolated = [...player.hand].sort((left, right) => chowConnections(left, player.hand) - chowConnections(right, player.hand))[0];
    return isolated ? `It is your discard turn. ${tileLabel(isolated)} is currently among your least connected numbered tiles; nearby ranks in the same suit can help form a future Pure Chow. This is a coaching heuristic, not a rule.` : "It is your discard turn. This coach looks only at your visible tiles, never at bot hands.";
  }
  return `Your hand currently has ${player.hand.length} concealed tiles, ${player.melds.length} exposed set${player.melds.length === 1 ? "" : "s"}, and ${player.bonusTiles.length} Flower/Season bonus tile${player.bonusTiles.length === 1 ? "" : "s"}.${shape}`;
}

/** Rule-aware facts for the teaching UI; recommendations remain a stated heuristic. */
export function analyseHand(state: EastRoundState, seat: Seat): HandAnalysis {
  const hand = state.players[seat].hand;
  const groups = countGroups(hand);
  const pairs = groups.filter((group) => group.length === 2).map((group) => tileLabel(group[0]));
  const pungs = groups.filter((group) => group.length >= 3).map((group) => tileLabel(group[0]));
  const chows: string[] = [];
  const developingChows: HandAnalysis["developingChows"] = [];
  for (const tile of hand) if (tile.kind === "number") for (const other of hand) if (other.kind === "number" && other.suit === tile.suit && other.rank === tile.rank + 1) {
    const label = `${tileLabel(tile)} + ${tileLabel(other)}`;
    if (!developingChows.some((item) => item.tiles === label)) developingChows.push({ tiles: label, needs: `${tile.rank > 1 ? tile.rank - 1 : ""}${tile.rank > 1 ? " or " : ""}${other.rank < 9 ? other.rank + 1 : ""} ${suitLabel(tile.suit)}`.trim() });
  }
  for (const tile of hand) if (tile.kind === "number" && isInCompletePureChow(tile, hand) && !chows.includes(tile.suit)) chows.push(tile.suit);
  const weakTiles = hand.filter((tile) => !isInCompletePureChow(tile, hand) && chowConnections(tile, hand) === 0 && !groups.some((group) => group.length >= 2 && group.some((item) => item.id === tile.id))).map(tileLabel);
  return { pairs, pungs, chows, developingChows, weakTiles, summary: `You have ${pairs.length} pair${pairs.length === 1 ? "" : "s"}, ${pungs.length} Pung${pungs.length === 1 ? "" : "s"}, and ${developingChows.length} developing Pure Chow opportunity${developingChows.length === 1 ? "" : "ies"}.` };
}

/** A factual snapshot of the visible hand; it deliberately does not invent a strategic score. */
export function handSummary(state: EastRoundState, seat: Seat): HandSummary {
  const player = state.players[seat];
  const hand = state.players[seat].hand;
  if (state.round === "south" && state.south) {
    const card = state.south.cards[seat];
    const analysis = analyseHand(state, seat);
    const pairs = analysis.pairs.map((item) => `Pair: ${item} ×2 — this may help only if your South Card calls for a Pair.`);
    const pungs = analysis.pungs.map((item) => `Pung: ${item} ×3 — three matching tiles; useful when your South Card asks for Pungs.`);
    const developing = analysis.developingChows.map((item) => `${item.tiles} — a possible sequence; keep it only if it helps the goal on your South Card.`);
    const weak = analysis.weakTiles.slice(0, 3).map((item) => `${item} — it does not currently match a pair, Pung, or sequence in your visible hand. Check whether it serves your South Card before keeping it.`);
    return { overview: `Your South Card is ${card.title}: ${card.goal} This is your personal Mahjong target for this round.`, progress: `You have ${hand.length} concealed tiles. Compare every group you build against ${card.title}, not against the East Round target.`, built: [...pairs, ...pungs], developing, weak, scoring: [`Completing ${card.title} records ${card.score.toLocaleString()} points.${card.bonus ? ` ${card.bonus}` : ""}`], focus: `Your immediate focus is ${card.goal} Keep tiles that directly help this requirement; a useful-looking East Round Chow is not automatically useful in South.` };
  }
  const groups = countGroups(hand);
  const pairs = groups.filter((group) => group.length === 2).map((group) => `Pair: ${tileLabel(group[0])} ×2 — two identical tiles; a winning hand needs one pair.`);
  const pungs = groups.filter((group) => group.length === 3).map((group) => `Pung: ${tileLabel(group[0])} ×3 — three identical tiles.`);
  const kongs = groups.filter((group) => group.length >= 4).map((group) => `Kong: ${tileLabel(group[0])} ×4 — four identical tiles.`);
  const chows: string[] = [];
  for (const suit of ["bamboo", "character", "dot"] as const) for (let start = 1; start <= 7; start += 1) {
    if ([start, start + 1, start + 2].every((rank) => hand.some((tile) => tile.kind === "number" && tile.suit === suit && tile.rank === rank))) chows.push(`Pure Chow: ${start}–${start + 1}–${start + 2} ${suitLabel(suit)} — three consecutive tiles in one suit.`);
  }
  const developing: string[] = [];
  for (const tile of hand) if (tile.kind === "number") for (const other of hand) if (other.kind === "number" && other.suit === tile.suit && other.rank === tile.rank + 1) {
    const needs = [tile.rank > 1 ? tile.rank - 1 : undefined, other.rank < 9 ? other.rank + 1 : undefined].filter((rank): rank is number => rank !== undefined);
    const item = `${tileLabel(tile)} + ${tileLabel(other)} — a developing Pure Chow; draw ${needs.map((rank) => `${rank} ${suitLabel(tile.suit)}`).join(" or ")} to complete it.`;
    if (!developing.includes(item)) developing.push(item);
  }
  const crochetStarts = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((rank) => {
    const suits = hand.filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number" && tile.rank === rank).map((tile) => tile.suit);
    return new Set(suits).size === 2 ? [`Potential Crochet: ${rank} ${[...new Set(suits)].map(suitLabel).join(" + ")} — the same rank in two suits; the third suit would complete the Crochet pattern.`] : [];
  });
  const analysis = analyseHand(state, seat);
  const weak = analysis.weakTiles.slice(0, 3).map((label) => `${label} — it is not currently in a pair, Pung, or consecutive numbered sequence.`);
  const built = [...pairs, ...pungs, ...kongs, ...chows];
  const bonusRanks = player.bonusTiles.filter((tile) => tile.kind === "flower" || tile.kind === "season").map((tile) => tile.rank);
  const scoring = player.bonusTiles.length ? [`Flower/Season bonus tiles: ${player.bonusTiles.length}. They stay outside your hand and are recorded separately when the round is scored.`] : [];
  const seatRank: Record<Seat, number> = { east: 1, south: 2, west: 3, north: 4 };
  if (bonusRanks.filter((rank) => rank === seatRank[seat]).length >= 2) scoring.push("You have the two Flowers/Seasons matching your seat wind. That is a seating-wind bonus award when the round is scored.");
  if (bonusRanks.filter((rank) => rank === 1).length >= 2) scoring.push("You have the East-numbered Flower/Season pair. That is an East round-wind bonus award when the round is scored.");
  const target = `Your target is four three-tile groups plus one two-tile pair. You currently have ${hand.length} concealed tiles${state.players[seat].melds.length ? ` and ${state.players[seat].melds.length} exposed group${state.players[seat].melds.length === 1 ? "" : "s"}` : ""}.`;
  const focus = developing[0]
    ? `Focus on ${developing[0].split(" — ")[0]}. It already has a direct route to a Pure Chow, so avoid breaking it without a reason.`
    : pairs[0]
      ? `Your clearest existing structure is ${pairs[0].split(" — ")[0]}. Keep the pair in mind while you look for a three-tile group.`
      : weak[0]
        ? `Your hand is still fragmented. A sensible first decision is to let go of a weak tile such as ${weak[0].split(" — ")[0]} while keeping any new pair or consecutive numbered tiles.`
        : "Look for a pair, three matching tiles for a Pung, or consecutive numbered tiles in one suit for a Pure Chow.";
  return {
    overview: target,
    progress: `Visible hand progress: ${built.length} completed pattern${built.length === 1 ? "" : "s"} and ${developing.length + crochetStarts.length} developing pattern${developing.length + crochetStarts.length === 1 ? "" : "s"}.`,
    built,
    developing: [...developing, ...crochetStarts],
    weak,
    scoring,
    focus,
  };
}

function southBestMoveOptions(state: EastRoundState, seat: Seat): CoachingOption[] {
  const hand = state.players[seat].hand;
  const card = state.south!.cards[seat];
  const goal = card.goal.toLowerCase();
  const copyCount = (tile: Tile) => hand.filter((other) => identity(other) === identity(tile)).length;
  const suitedNeighbours = (tile: Tile) => tile.kind === "number"
    ? hand.filter((other) => other.id !== tile.id && other.kind === "number" && other.suit === tile.suit && Math.abs(other.rank - tile.rank) <= 2).length
    : 0;
  const namedOnCard = (tile: Tile) => {
    const label = tileLabel(tile).toLowerCase();
    if (tile.kind === "number") return goal.includes(tile.suit) || goal.includes(`${tile.rank}s`) || goal.includes(` ${tile.rank} `) || goal.includes(label);
    if (tile.kind === "wind") return goal.includes("wind") || goal.includes(tile.wind);
    if (tile.kind === "dragon") return goal.includes("dragon") || goal.includes(tile.dragon);
    return false;
  };
  const usefulValue = (tile: Tile) => {
    let value = copyCount(tile) * 26;
    if (namedOnCard(tile)) value += 55;
    if (tile.kind === "number" && (goal.includes("chow") || goal.includes("run"))) value += suitedNeighbours(tile) * 15;
    if (tile.kind === "number" && goal.includes("crochet")) value += hand.filter((other) => other.kind === "number" && other.rank === tile.rank && other.suit !== tile.suit).length * 22;
    if (tile.kind === "number" && goal.includes("knit")) value += hand.filter((other) => other.kind === "number" && other.rank === tile.rank && other.suit !== tile.suit).length * 16;
    if (tile.kind !== "number" && goal.includes("no honour")) value = 0;
    if (tile.kind === "number" && goal.includes("odd-numbered") && tile.rank % 2 === 1) value += 55;
    return value;
  };
  const candidates = [...hand].sort((a, b) => usefulValue(a) - usefulValue(b) || tileLabel(a).localeCompare(tileLabel(b))).slice(0, 3);
  const strongerTiles = [...hand].filter((tile) => !candidates.some((candidate) => candidate.id === tile.id)).sort((a, b) => usefulValue(b) - usefulValue(a)).slice(0, 3);
  const keep = strongerTiles.length
    ? strongerTiles.map(tileLabel).join(", ")
    : "the tiles that match your South Card most closely";
  return candidates.map((tile, index) => {
    const copies = copyCount(tile);
    const neighbours = suitedNeighbours(tile);
    const exactMatch = namedOnCard(tile);
    const why = !exactMatch && copies === 1 && neighbours === 0
      ? `${tileLabel(tile)} does not appear in your card’s requirement and it has no matching copy or nearby numbered tile in your hand to develop. It is one of the safest tiles to give away during this exchange.`
      : !exactMatch
        ? `${tileLabel(tile)} is not named by your card. It has ${copies > 1 ? "a matching copy" : neighbours ? "some nearby numbered tiles" : "only a limited route"}, but it supports your goal less directly than the tiles you are keeping.`
        : `${tileLabel(tile)} has a small connection to your card, but it is currently the least developed of your card-related tiles. Passing it protects the stronger pieces already working together.`;
    return {
      tileId: tile.id,
      title: state.phase === "charleston" ? `Pass ${tileLabel(tile)}` : `Discard ${tileLabel(tile)}`,
      reason: why,
      preserves: `Keep ${keep}. Those tiles currently have the clearest connection to ${card.title}.`,
      lookingFor: `Your card asks for: ${card.goal}`,
      alternative: index === 0 && candidates[1] ? `${tileLabel(candidates[1])} and ${tileLabel(candidates[2] ?? candidates[1])} are the other two tiles I would pass in this Charleston step.` : undefined,
    };
  });
}

/** A transparent teaching heuristic, not an optimal-play or hidden-information claim. */
export function bestMoveOptions(state: EastRoundState, seat: Seat): CoachingOption[] {
  if (state.round === "south" && state.south) return southBestMoveOptions(state, seat);
  const hand = state.players[seat].hand;
  const copies = (tile: Tile) => hand.filter((other) => identity(other) === identity(tile)).length;
  const sameRankOtherSuits = (tile: Tile) => tile.kind !== "number" ? [] : hand.filter((other): other is Extract<Tile, { kind: "number" }> => other.kind === "number" && other.id !== tile.id && other.rank === tile.rank && other.suit !== tile.suit);
  const chowPaths = (tile: Tile) => {
    if (tile.kind !== "number") return [] as { held: number[]; missing: number[] }[];
    return [tile.rank - 2, tile.rank - 1, tile.rank].filter((start) => start >= 1 && start <= 7).map((start) => {
      const ranks = [start, start + 1, start + 2].filter((rank) => rank !== tile.rank);
      return { held: ranks.filter((rank) => hand.some((other) => other.kind === "number" && other.suit === tile.suit && other.rank === rank)), missing: ranks.filter((rank) => !hand.some((other) => other.kind === "number" && other.suit === tile.suit && other.rank === rank)) };
    });
  };
  const score = (tile: Tile) => {
    const matching = copies(tile);
    let value = matching >= 3 ? 90 : matching === 2 ? 60 : 0;
    if (tile.kind === "number") {
      if (isInCompletePureChow(tile, hand)) value += 100;
      for (const path of chowPaths(tile)) value += path.held.length === 2 ? 45 : path.held.length === 1 ? 22 : 0;
      value += sameRankOtherSuits(tile).length * 14;
    }
    return value;
  };
  const strongestThingToKeep = (excluding: Tile) => {
    const candidates = hand.filter((tile) => tile.id !== excluding.id).sort((left, right) => score(right) - score(left));
    const strongest = candidates[0];
    if (!strongest) return "the rest of your hand open for a new useful draw";
    const matching = copies(strongest);
    if (matching >= 2) return `your ${tileLabel(strongest)} pair, which can stay as the pair your winning hand needs${matching >= 3 ? " or grow into a Pung" : ""}`;
    if (strongest.kind === "number") {
      const path = chowPaths(strongest).find((item) => item.held.length > 0);
      if (path) return `${tileLabel(strongest)} with ${path.held.map((rank) => `${rank} ${suitLabel(strongest.suit)}`).join(" and ")}, which is developing toward a Pure Chow`;
    }
    return `your remaining ${tileLabel(strongest)} structure`;
  };
  const whyWeak = (tile: Tile) => {
    const matching = copies(tile);
    if (matching >= 2) return `You already have ${matching} copies, so this tile is supporting a ${matching === 2 ? "Pair" : "Pung"}; it is not a natural early discard.`;
    if (tile.kind !== "number") return `${tileLabel(tile)} cannot make a Pure Chow because Winds and Dragons are not numbered suit tiles. You have no matching ${tileLabel(tile)} yet, so its only current route is drawing another copy for a Pair, then a third for a Pung.`;
    const paths = chowPaths(tile);
    const bestPath = paths.sort((left, right) => right.held.length - left.held.length)[0];
    if (bestPath?.held.length === 0) {
      const nearby = [...new Set(paths.flatMap((path) => path.missing))].sort((left, right) => left - right);
      return `You have no nearby ${suitLabel(tile.suit)} tiles that begin a Pure Chow with it. ${tileLabel(tile)} could join ${paths.map((path) => path.held.length === 0 ? path.missing.concat(tile.rank).sort((left, right) => left - right).join("–") : "").filter(Boolean).map((ranks) => `${ranks} ${suitLabel(tile.suit)}`).join(" or ")}, but none of the companion tiles are in your hand. Its remaining route is another ${tileLabel(tile)} for a Pair.`;
    }
    if (bestPath.held.length === 1) return `It has one possible Pure Chow start with ${bestPath.held[0]} ${suitLabel(tile.suit)}, but it is still waiting for ${bestPath.missing[0]} ${suitLabel(tile.suit)}. That is a real possibility, but weaker than a completed group or Pair already in your hand.`;
    return `It is already part of a strong Pure Chow path, so it is only an alternative if you deliberately choose to break that structure.`;
  };
  const uniqueTiles = [...hand].filter((tile, index, all) => all.findIndex((other) => identity(other) === identity(tile)) === index);
  const ranked = uniqueTiles.sort((left, right) => score(left) - score(right) || tileLabel(left).localeCompare(tileLabel(right))).slice(0, 3);
  return ranked.map((tile, index) => {
    const next = ranked[index + 1];
    const path = tile.kind === "number" ? chowPaths(tile).sort((left, right) => right.held.length - left.held.length)[0] : undefined;
    let lookingFor = `Prioritize draws that improve the groups you are keeping rather than replacing this tile.`;
    if (copies(tile) === 1) lookingFor = `Another ${tileLabel(tile)} would make a Pair; a third matching tile would make a Pung.`;
    else if (tile.kind === "number" && path?.held.length === 1) lookingFor = `${path.missing[0]} ${suitLabel(tile.suit)} would complete the Pure Chow path with ${path.held[0]} ${suitLabel(tile.suit)} and ${tileLabel(tile)}.`;
    return {
      tileId: tile.id,
      title: `Discard ${tileLabel(tile)}`,
      reason: whyWeak(tile),
      preserves: `${strongestThingToKeep(tile)}. Flower/Season bonus tiles are already exposed and scored separately, so this discard does not affect them.`,
      lookingFor,
      alternative: next ? `${tileLabel(next)} is the next alternative. It has more current value because it helps preserve ${strongestThingToKeep(next)}.` : undefined,
    };
  });
}
