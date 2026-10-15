import { type EastRoundState } from "./state";
import type { SouthCard } from "./south-cards";
import { southCardAllows } from "./south-fit";
import { type Seat, type Tile, tileLabel as rawTileLabel } from "./tiles";

export type CoachingOption = { tileId: string; title: string; reason: string; preserves: string; lookingFor: string; tableWatch?: string; alternative?: string };
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

/** Whether a tile directly belongs to the active South Card target. This is a
 * coaching classification, not a new game rule: it prevents required singleton
 * Winds/Dragons from being described as weak merely because they have no pair. */
function servesSouthCard(tile: Tile, card: SouthCard): boolean {
  return southCardAllows(card, tile);
}

function southMeldCardCheck(kind: "pung" | "pureChow" | "crochet" | "knit" | "kong", goalText: string): string {
  const goal = goalText.toLowerCase();
  const supports = kind === "pureChow" ? /chow|run/.test(goal)
    : kind === "pung" ? goal.includes("pung")
      : kind === "kong" ? goal.includes("kong")
        : kind === "crochet" ? goal.includes("crochet")
          : goal.includes("knit");
  return supports ? "This is one of the structures named by your South Card." : `This is visible on the table, but it does not count toward the specific structure ${goalText} asks you to make.`;
}

const meldTitle = (kind: "pung" | "pureChow" | "crochet" | "knit" | "kong"): string => ({ pung: "Pung", pureChow: "Pure Chow", crochet: "Crochet", knit: "Knit", kong: "Kong" })[kind];

/** A visible, card-specific checklist. South cards—not the East hand shape—are
 * the source of every item in this summary and every South recommendation. */
function southCardChecklist(card: SouthCard, tiles: readonly Tile[]): string[] {
  const goal = card.goal.toLowerCase();
  const groups = countGroups(tiles);
  const pairs = groups.filter((group) => group.length === 2).length;
  const pungs = groups.filter((group) => group.length >= 3).length;
  const kongs = groups.filter((group) => group.length >= 4).length;
  const chows = completePureChows(tiles);
  const winds = new Set(tiles.filter((tile): tile is Extract<Tile, { kind: "wind" }> => tile.kind === "wind").map((tile) => tile.wind));
  const dragons = new Set(tiles.filter((tile): tile is Extract<Tile, { kind: "dragon" }> => tile.kind === "dragon").map((tile) => tile.dragon));
  const numberedBySuit = (["bamboo", "character", "dot"] as const).map((suit) => ({ suit, count: tiles.filter((tile) => tile.kind === "number" && tile.suit === suit).length }));
  const strongestSuit = [...numberedBySuit].sort((left, right) => right.count - left.count)[0];
  const checklist: string[] = [];
  if (/1 of each wind/.test(goal)) checklist.push(`Winds: ${winds.size}/4 different Winds collected${winds.size < 4 ? `; still need ${(["east", "south", "west", "north"] as const).filter((wind) => !winds.has(wind)).map(titleCase).join(", ")}` : "; all four are present"}.`);
  if (/1 of each dragon/.test(goal)) checklist.push(`Dragons: ${dragons.size}/3 different Dragons collected${dragons.size < 3 ? `; still need ${(["red", "green", "white"] as const).filter((dragon) => !dragons.has(dragon)).map(titleCase).join(", ")}` : "; all three are present"}.`);
  const pairMatch = goal.match(/(?:all )?(\d|seven) pairs?/);
  if (pairMatch) {
    const needed = pairMatch[1] === "seven" ? 7 : Number(pairMatch[1]);
    checklist.push(`Pairs: ${pairs}/${needed} matching pairs currently visible.`);
  }
  const pungMatch = goal.match(/(\d) pungs?/);
  if (pungMatch) checklist.push(`Pungs: ${pungs}/${Number(pungMatch[1])} matching triples currently visible.`);
  const kongMatch = goal.match(/(\d) kongs?/);
  if (kongMatch) checklist.push(`Kongs: ${kongs}/${Number(kongMatch[1])} four-of-a-kind groups currently visible.`);
  if (goal.includes("chow") || goal.includes("run")) checklist.push(`Sequences: ${chows.length} complete Chow${chows.length === 1 ? "" : "s"} currently visible${chows.length ? ` (${chows.join(", ")})` : ""}.`);
  if (goal.includes("same suit")) checklist.push(`Suit direction: ${titleCase(strongestSuit.suit)} currently has ${strongestSuit.count} numbered tiles, your strongest starting suit for this card.`);
  if (goal.includes("no honour")) checklist.push(`Honours: ${tiles.filter((tile) => tile.kind === "wind" || tile.kind === "dragon").length} currently held; this card needs no Winds or Dragons.`);
  if (goal.includes("crochet")) checklist.push("Crochets: look for the same number in Bamboo, Character, and Dot; each completed three-suit match is one Crochet.");
  if (goal.includes("knit")) checklist.push("Knit: look for the same number in two suits, alongside the Crochet relationship named on your card.");
  return checklist;
}

/**
 * The first Coach option is always the weakest current candidate. Extra options
 * appear only when they are genuinely close alternatives, rather than padding
 * every answer to three rows.
 */
function closeAlternatives<T>(sorted: readonly T[], value: (item: T) => number): T[] {
  const first = sorted[0];
  if (!first) return [];
  const threshold = value(first) + 22;
  return sorted.filter((item, index) => index === 0 || value(item) <= threshold).slice(0, 3);
}

/**
 * Opponent concealed hands stay private. This only considers tiles that are
 * visibly declared on the table, which are genuinely no longer drawable.
 */
function visibleTableWatch(state: EastRoundState, seat: Seat, wanted: ReadonlySet<string>): string | undefined {
  const exposed = Object.values(state.players).flatMap((player) => player.seat === seat
    ? []
    : player.melds.filter((meld) => meld.exposed).flatMap((meld) => meld.tiles.map((tile) => ({ seat: player.seat, tile }))));
  const blocked = exposed.filter(({ tile }) => wanted.has(identity(tile)));
  if (!blocked.length) return undefined;
  const groups = new Map<string, { seat: Seat; tile: Tile; count: number }>();
  for (const item of blocked) {
    const key = `${item.seat}:${identity(item.tile)}`;
    const existing = groups.get(key);
    groups.set(key, existing ? { ...existing, count: existing.count + 1 } : { seat: item.seat, tile: item.tile, count: 1 });
  }
  const details = [...groups.values()].slice(0, 2).map(({ seat: owner, tile, count }) => `${titleCase(owner)} has exposed ${count} ${count === 1 ? "copy" : "copies"} of ${tileLabel(tile)}`).join("; ");
  return `${details}. Those visible copies are no longer in the Draw Wall, so that route has fewer remaining copies.`;
}

function potentialDrawKeys(hand: readonly Tile[]): Set<string> {
  const wanted = new Set<string>();
  const groups = countGroups(hand);
  for (const group of groups) if (group.length >= 2) wanted.add(identity(group[0]));
  for (const tile of hand) {
    if (tile.kind !== "number") continue;
    for (const other of hand) {
      if (other.kind !== "number" || other.suit !== tile.suit || other.rank !== tile.rank + 1) continue;
      if (tile.rank > 1) wanted.add(`${tile.suit}-${tile.rank - 1}`);
      if (other.rank < 9) wanted.add(`${tile.suit}-${other.rank + 1}`);
    }
    const otherSuits = new Set(hand.filter((other): other is Extract<Tile, { kind: "number" }> => other.kind === "number" && other.rank === tile.rank && other.suit !== tile.suit).map((other) => other.suit));
    if (otherSuits.size === 1) for (const suit of ["bamboo", "character", "dot"] as const) if (!otherSuits.has(suit) && suit !== tile.suit) wanted.add(`${suit}-${tile.rank}`);
  }
  return wanted;
}

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

const completePureChows = (hand: readonly Tile[]): string[] => {
  const complete: string[] = [];
  for (const suit of ["bamboo", "character", "dot"] as const) {
    const ranks = new Set(hand.filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number" && tile.suit === suit).map((tile) => tile.rank));
    for (let rank = 1; rank <= 7; rank += 1) {
      if (ranks.has(rank) && ranks.has(rank + 1) && ranks.has(rank + 2)) complete.push(`${rank}–${rank + 1}–${rank + 2} ${suitLabel(suit)}`);
    }
  }
  return complete;
};

export function explainHand(state: EastRoundState, seat: Seat, firstTurn: boolean): string {
  const player = state.players[seat];
  const northEastFormat = state.round === "north" && state.north?.format === "east";
  const southFormat = state.round === "south" || (state.round === "north" && state.north?.format === "south");
  const westFormat = state.round === "west" || (state.round === "north" && state.north?.format === "west");
  if (southFormat && state.south) {
    const card = state.south.cards[seat];
    const goal = card.goal;
    const phase = state.phase === "charleston" ? "You are still in the Charleston exchange, so choose three tiles that look less useful for this specific goal." : state.phase === "discard" && state.turn === seat ? "You now need to discard one tile while protecting the parts of your hand that serve this goal." : "Keep comparing each draw to this specific South Card, rather than to the East Round four-groups-plus-a-pair shape.";
    const concealedPatternNote = /crochet|knit/i.test(goal)
      ? "Crochets and Knits are built privately in your hand: they are not separate discard calls. In South, the only way to take an otherwise useful visible discard before Mahjong is the buy option from the player on your left."
      : "";
    return `Your South Card is ${card.title}. Your personal Mahjong goal this round is: ${goal} It is worth ${card.score.toLocaleString()} points if you complete it. ${state.round === "north" ? "Flowers and Seasons are concealed jokers in South-as-North. They can help complete a group but cannot make a Pair; buying is not allowed." : ""} ${concealedPatternNote} ${phase}`;
  }
  if (westFormat) {
    const groups = countGroups(player.hand);
    const pairs = groups.filter((group) => group.length === 2).map((group) => tileLabel(group[0]));
    const pungs = groups.filter((group) => group.length === 3).map((group) => tileLabel(group[0]));
    const kongs = groups.filter((group) => group.length >= 4).map((group) => tileLabel(group[0]));
    return `West Round uses only Pungs, Kongs, and one Pair—Pure Chows do not count here. You currently have ${pairs.length ? `pair${pairs.length === 1 ? "" : "s"} of ${pairs.join(", ")}` : "no visible Pair"}${pungs.length ? `, Pung${pungs.length === 1 ? "" : "s"} of ${pungs.join(", ")}` : ""}${kongs.length ? `, and Kong${kongs.length === 1 ? "" : "s"} of ${kongs.join(", ")}` : ""}. A legal West hand must include at least one Kong and follow one of the West scoring directions: one numbered suit, Honour tiles only, or a Clean Mix of one suit with Honour tiles.${state.round === "north" ? ` Every ${state.north?.jokerRank} Bamboo, Character, and Dot is a joker in this North format; buying is not allowed.` : ""}`;
  }
  const numbered = player.hand.filter((tile) => tile.kind === "number").length;
  const honours = player.hand.length - numbered;
  const groups = countGroups(player.hand);
  const pairs = groups.filter((group) => group.length === 2).map((group) => tileLabel(group[0]));
  const triples = groups.filter((group) => group.length >= 3).map((group) => tileLabel(group[0]));
  const runs = connectedPairs(player.hand);
  const crochetStarts = Object.values(player.hand.filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number").reduce<Record<number, Set<string>>>((acc, tile) => ({ ...acc, [tile.rank]: new Set([...(acc[tile.rank] ?? []), tile.suit]) }), {})).filter((suits) => suits.size === 2).length;
  const shape = `${pairs.length ? ` You have ${pairs.length} pair${pairs.length === 1 ? "" : "s"}: ${pairs.join(", ")}. A Pure Pair is two identical tiles.` : " You do not currently have a visible pair."}${triples.length ? ` You already hold ${triples.length} three-of-a-kind group${triples.length === 1 ? "" : "s"}: ${triples.join(", ")}. Three identical tiles make a Pung.` : ""}${runs.length ? ` Your connected tiles include ${runs.slice(0, 2).join(" and ")}; a Pure Chow needs three consecutive tiles of one suit.` : ""}${crochetStarts ? ` You also have ${crochetStarts} two-suit same-number start that could grow into a Crochet; a Crochet uses the same number in all three suits.` : ""}`;
  if (firstTurn) return northEastFormat
    ? `East begins North Round with 14 tiles, so you start with ${player.hand.length}. Your visible hand has ${numbered} numbered tiles and ${honours} honour tiles.${shape} East-as-North uses the East hand shape: four three-tile sets plus one two-tile set. Flowers and Seasons do not add North Round score awards.`
    : `You have ${player.hand.length} tiles because East begins the round with 14. Your visible hand has ${numbered} numbered tiles and ${honours} honour tiles.${shape} Your East Round goal is four three-tile sets plus one two-tile set.`;
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
  const chows = completePureChows(hand);
  const developingChows: HandAnalysis["developingChows"] = [];
  for (const tile of hand) if (tile.kind === "number") for (const other of hand) if (other.kind === "number" && other.suit === tile.suit && other.rank === tile.rank + 1) {
    const pairAlreadyCompletesChow = hand.some((third) => {
      if (third.id === tile.id || third.id === other.id || third.kind !== "number" || third.suit !== tile.suit) return false;
      const ranks = [tile.rank, other.rank, third.rank].sort((left, right) => left - right);
      return ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
    });
    if (pairAlreadyCompletesChow) continue;
    const label = `${tileLabel(tile)} + ${tileLabel(other)}`;
    if (!developingChows.some((item) => item.tiles === label)) developingChows.push({ tiles: label, needs: `${tile.rank > 1 ? tile.rank - 1 : ""}${tile.rank > 1 ? " or " : ""}${other.rank < 9 ? other.rank + 1 : ""} ${suitLabel(tile.suit)}`.trim() });
  }
  const weakTiles = hand.filter((tile) => !isInCompletePureChow(tile, hand) && chowConnections(tile, hand) === 0 && !groups.some((group) => group.length >= 2 && group.some((item) => item.id === tile.id))).map(tileLabel);
  return { pairs, pungs, chows, developingChows, weakTiles, summary: `You have ${pairs.length} pair${pairs.length === 1 ? "" : "s"}, ${pungs.length} Pung${pungs.length === 1 ? "" : "s"}, and ${developingChows.length} developing Pure Chow opportunity${developingChows.length === 1 ? "" : "ies"}.` };
}

/** A factual snapshot of the visible hand; it deliberately does not invent a strategic score. */
export function handSummary(state: EastRoundState, seat: Seat): HandSummary {
  const player = state.players[seat];
  const hand = state.players[seat].hand;
  const southFormat = state.round === "south" || (state.round === "north" && state.north?.format === "south");
  const westFormat = state.round === "west" || (state.round === "north" && state.north?.format === "west");
  if (southFormat && state.south) {
    const card = state.south.cards[seat];
    // Only tiles this card can ever use count as progress; the rest are loose.
    const fitHand = hand.filter((tile) => southCardAllows(card, tile));
    const offHand = hand.filter((tile) => !southCardAllows(card, tile) && tile.kind !== "flower" && tile.kind !== "season");
    const analysis = analyseHand({ ...state, players: { ...state.players, [seat]: { ...player, hand: fitHand } } }, seat);
    const allSouthTiles = [...hand, ...player.melds.flatMap((meld) => meld.tiles)];
    const cardChecklist = southCardChecklist(card, allSouthTiles);
    const requiresEveryWind = /1 of each wind/i.test(card.goal);
    const heldWinds = new Set(hand.filter((tile): tile is Extract<Tile, { kind: "wind" }> => tile.kind === "wind").map((tile) => tile.wind));
    const missingWinds = (["east", "south", "west", "north"] as const).filter((wind) => !heldWinds.has(wind));
    const pairs = countGroups(fitHand)
      .filter((group) => group.length === 2)
      .map((group) => {
        const tile = group[0];
        if (tile.kind === "wind" && /additional wind/i.test(card.goal)) {
          return `Extra Wind: ${tileLabel(tile)} ×2 — one copy fulfils the “one of each Wind” requirement and the second is the additional Wind your South Card asks for.`;
        }
        if (/pair/i.test(card.goal)) return `Pair: ${tileLabel(tile)} ×2 — two matching tiles, which directly contributes to the Pair named on your South Card.`;
        return `Pair: ${tileLabel(tile)} ×2 — two matching tiles. The Coach compares it with the other structures your South Card requires when suggesting your next move.`;
      });
    const pungs = analysis.pungs.map((item) => `Pung: ${item} ×3 — three matching tiles; useful when your South Card asks for Pungs.`);
    const cardUsesSequences = /chow|run/i.test(card.goal);
    const completeChows = analysis.chows.map((chow) => cardUsesSequences
      ? `Complete Chow: ${chow} — three consecutive tiles already complete a Chow, which ${card.title} uses.`
      : `Complete Chow: ${chow} — this is a complete consecutive group, although ${card.title} is built toward different named structures.`);
    const developing = analysis.developingChows.map((item) => cardUsesSequences
      ? `${item.tiles} — these consecutive tiles can become a Chow if you draw ${item.needs}. ${card.title} includes a Chow or Run, so this is a useful path.`
      : `${item.tiles} — these are consecutive tiles, but ${card.title} is not built from Chows or Runs. Your card instead asks for: ${card.goal}`);
    const weak = countGroups(offHand)
      .sort((left, right) => right.length - left.length)
      .slice(0, 4)
      .map((group) => `${tileLabel(group[0])}${group.length > 1 ? ` ×${group.length}` : ""} — ${card.title} can't use this tile${group.length > 1 ? ", even though it pairs up" : ""}. It is a loose tile for your card.`);
    const requiredSingletons = requiresEveryWind
      ? [`Wind requirement: you have ${heldWinds.size} of the 4 different Winds (${[...heldWinds].map(titleCase).join(", ") || "none"}). ${missingWinds.length ? `Still look for ${missingWinds.map(titleCase).join(", ")}.` : "You already have every required Wind—keep each one."}`]
      : [];
    const exposedSets = player.melds.map((meld) => `Exposed ${meldTitle(meld.kind)}: ${meld.tiles.map(tileLabel).join(" · ")} — ${southMeldCardCheck(meld.kind, card.goal)}`);
    const concealedPatternNote = /crochet|knit/i.test(card.goal)
      ? "Crochets and Knits stay concealed while you build them. They cannot be called as their own discard action; in South only a buy from the player on your left can add a non-completing discard to your hand."
      : "";
    return { overview: `Your South Card is ${card.title}: ${card.goal} This is your personal Mahjong target for this round.`, progress: `Card check — ${cardChecklist.join(" ")} ${state.round === "north" ? "Flowers and Seasons are concealed jokers here, but cannot form a Pair." : ""}`, built: [...requiredSingletons, ...exposedSets, ...pairs, ...pungs, ...completeChows], developing, weak, scoring: [`Completing ${card.title} records ${card.score.toLocaleString()} points.${card.bonus ? ` ${card.bonus}` : ""}${state.round === "north" ? " North does not add Flower/Season awards." : ""}`, "Score focus: build toward your own card’s printed value; an attractive East-style group is only worth keeping if it helps that card."], focus: `${concealedPatternNote} Your immediate focus is ${card.goal} Keep tiles that directly help this requirement; a useful-looking East Round Chow is not automatically useful in South.` };
  }
  if (westFormat) {
    const groups = countGroups(hand);
    const pairs = groups.filter((group) => group.length === 2).map((group) => `Pair: ${tileLabel(group[0])} ×2 — two matching tiles; a West hand needs one Pair.`);
    const pungs = groups.filter((group) => group.length === 3).map((group) => `Pung: ${tileLabel(group[0])} ×3 — three matching tiles; this is a valid West group.`);
    const kongs = groups.filter((group) => group.length >= 4).map((group) => `Kong: ${tileLabel(group[0])} ×4 — four matching tiles; West requires at least one Kong.`);
    const weak = hand.filter((tile) => !groups.some((group) => group.length >= 2 && group.some((item) => item.id === tile.id))).slice(0, 3).map((tile) => `${tileLabel(tile)} — it has no matching copy yet. In West, it cannot become a Chow; its immediate route is another matching tile for a Pair, then a third or fourth for a Pung or Kong.`);
    const numberedSuits = new Set(hand.filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number").map((tile) => tile.suit));
    const cleanNote = numberedSuits.size <= 1 ? "Your numbered tiles are currently in one suit, so you can still build either a one-suit hand or a Clean Mix by adding Honour tiles." : "Your numbered tiles currently use more than one suit. A Clean Mix can use Winds and Dragons, but its numbered tiles must all be from one suit.";
    return {
      overview: `West Round requires four Pungs/Kongs plus one Pair, with at least one Kong. Pure Chows and Crochet/Knit patterns are not West groups.${state.round === "north" ? ` Every ${state.north?.jokerRank} Bamboo, Character, and Dot is a joker in this hand.` : ""}`,
      progress: `You have ${hand.length} concealed tiles and ${player.melds.length} declared group${player.melds.length === 1 ? "" : "s"}. ${cleanNote}`,
      built: [...pairs, ...pungs, ...kongs],
      developing: groups.filter((group) => group.length === 2).map((group) => `${tileLabel(group[0])} ×2 — one more matching tile makes a Pung; two matching tiles make a Kong.`),
      weak,
      scoring: ["West scoring rewards the direction you finish: one suit, Honour tiles only, or a Clean Mix of one numbered suit with Honour tiles."],
      focus: kongs.length || player.melds.some((meld) => meld.kind === "kong") ? "You have met the West Kong requirement. Preserve matching tiles while keeping a legal one-suit or honours path." : "Your immediate West requirement is to grow a matching group into a Kong while avoiding unrelated suits.",
    };
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
  const scoring = [state.round === "north"
    ? "East-as-North uses the East Mahjong award. An East-involved payment is doubled. Flower/Season tiles do not add North Round awards."
    : "East Mahjong awards are recorded when a legal hand is completed. Any payment involving East is doubled."];
  if (player.bonusTiles.length) scoring.push(state.round === "north" ? `Flower/Season bonus tiles: ${player.bonusTiles.length}. They stay outside your hand and are replaced normally, but do not add North Round score awards.` : `Flower/Season bonus tiles: ${player.bonusTiles.length}. They stay outside your hand and are recorded separately when the round is scored.`);
  const seatRank: Record<Seat, number> = { east: 1, south: 2, west: 3, north: 4 };
  if (state.round !== "north" && bonusRanks.filter((rank) => rank === seatRank[seat]).length >= 2) scoring.push("You have the two Flowers/Seasons matching your seat wind. That is a seating-wind bonus award when the round is scored.");
  if (state.round !== "north" && bonusRanks.filter((rank) => rank === 1).length >= 2) scoring.push("You have the East-numbered Flower/Season pair. That is an East round-wind bonus award when the round is scored.");
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
  const melds = state.players[seat].melds;
  const card = state.south!.cards[seat];
  const goal = card.goal.toLowerCase();
  const cardChecklist = southCardChecklist(card, [...hand, ...melds.flatMap((meld) => meld.tiles)]);
  const copyCount = (tile: Tile) => hand.filter((other) => identity(other) === identity(tile)).length;
  const suitedNeighbours = (tile: Tile) => tile.kind === "number"
    ? hand.filter((other) => other.id !== tile.id && other.kind === "number" && other.suit === tile.suit && Math.abs(other.rank - tile.rank) <= 2).length
    : 0;
  const namedOnCard = (tile: Tile) => servesSouthCard(tile, card);
  const usefulValue = (tile: Tile) => {
    const isJoker = state.round === "north" && state.north?.format === "south" && (tile.kind === "flower" || tile.kind === "season");
    // A tile this card can never use is loose, however neatly it pairs up.
    if (!namedOnCard(tile) && !isJoker) return 0;
    let value = copyCount(tile) * 26;
    if (state.round === "north" && state.north?.format === "south" && (tile.kind === "flower" || tile.kind === "season")) value += 120;
    if (namedOnCard(tile)) value += 55;
    if (tile.kind === "number" && (goal.includes("chow") || goal.includes("run"))) value += suitedNeighbours(tile) * 15;
    if (tile.kind === "number" && goal.includes("crochet")) value += hand.filter((other) => other.kind === "number" && other.rank === tile.rank && other.suit !== tile.suit).length * 22;
    if (tile.kind === "number" && goal.includes("knit")) value += hand.filter((other) => other.kind === "number" && other.rank === tile.rank && other.suit !== tile.suit).length * 16;
    if (tile.kind !== "number" && goal.includes("no honour")) value = 0;
    if (tile.kind === "number" && goal.includes("odd-numbered") && tile.rank % 2 === 1) value += 55;
    return value;
  };
  const sortedCandidates = [...hand].sort((a, b) => usefulValue(a) - usefulValue(b) || tileLabel(a).localeCompare(tileLabel(b)));
  // Charleston genuinely needs three selected tiles. A normal South discard
  // recommendation should not invent extra alternatives.
  const candidates = state.phase === "charleston"
    ? sortedCandidates.slice(0, 3)
    : closeAlternatives(sortedCandidates, usefulValue);
  const strongerTiles = [...hand].filter((tile) => !candidates.some((candidate) => candidate.id === tile.id)).sort((a, b) => usefulValue(b) - usefulValue(a)).slice(0, 3);
  const keep = strongerTiles.length
    ? strongerTiles.map(tileLabel).join(", ")
    : "the tiles that match your South Card most closely";
  return candidates.map((tile, index) => {
    const copies = copyCount(tile);
    const neighbours = suitedNeighbours(tile);
    const exactMatch = namedOnCard(tile);
    const why = state.round === "north" && state.north?.format === "south" && (tile.kind === "flower" || tile.kind === "season")
      ? `${tileLabel(tile)} is a concealed joker in South-as-North, so it can stand in for a needed card. Keep it unless your South Card already has a stronger completed route.`
      : !exactMatch && copies === 1 && neighbours === 0
      ? `${tileLabel(tile)} does not appear in your card’s requirement and it has no matching copy or nearby numbered tile in your hand to develop. It is one of the safest tiles to give away during this exchange.`
      : !exactMatch
        ? `${tileLabel(tile)} is not named by your card. It has ${copies > 1 ? "a matching copy" : neighbours ? "some nearby numbered tiles" : "only a limited route"}, but it supports your goal less directly than the tiles you are keeping.`
        : `${tileLabel(tile)} has a small connection to your card, but it is currently the least developed of your card-related tiles. Passing it protects the stronger pieces already working together.`;
    return {
      tileId: tile.id,
      title: state.phase === "charleston" ? `Pass ${tileLabel(tile)}` : `Discard ${tileLabel(tile)}`,
      reason: why,
      preserves: `Keep ${keep}. They support ${card.title}: ${cardChecklist[0] ?? card.goal}`,
      lookingFor: `Next card target: ${cardChecklist.slice(1, 3).join(" ") || card.goal}`,
      tableWatch: visibleTableWatch(state, seat, potentialDrawKeys(hand.filter((item) => item.id !== tile.id))),
      alternative: index === 0 && candidates[1] ? `${tileLabel(candidates[1])} and ${tileLabel(candidates[2] ?? candidates[1])} are the other two tiles I would pass in this Charleston step.` : undefined,
    };
  });
}

/** West deliberately values matching tiles and a clean suit path, never Chow potential. */
function westBestMoveOptions(state: EastRoundState, seat: Seat): CoachingOption[] {
  const hand = state.players[seat].hand;
  const copies = (tile: Tile) => hand.filter((other) => identity(other) === identity(tile)).length;
  const numberedTiles = hand.filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number");
  const numberedSuits = new Set(numberedTiles.map((tile) => tile.suit));
  /** Choose the suit the current hand already supports most strongly, rather than deck order. */
  const preferredSuit = (["bamboo", "character", "dot"] as const)
    .map((suit) => ({
      suit,
      count: numberedTiles.filter((tile) => tile.suit === suit).length,
      matching: numberedTiles.filter((tile) => tile.suit === suit).reduce((total, tile) => total + Math.max(0, copies(tile) - 1), 0),
    }))
    .sort((left, right) => right.count - left.count || right.matching - left.matching)[0]?.suit;
  const value = (tile: Tile) => {
    const matching = copies(tile);
    let result = matching * 50;
    if (state.round === "north" && state.north?.format === "west" && tile.kind === "number" && tile.rank === state.north.jokerRank) result += 120;
    if (tile.kind === "number" && preferredSuit && tile.suit === preferredSuit) result += 28;
    // During Charleston, remove extra numbered suits first. This commits the
    // hand to one suit while still leaving Winds/Dragons available for Clean Mix.
    if (tile.kind === "number" && numberedSuits.size > 1 && tile.suit !== preferredSuit) result -= 120;
    return result;
  };
  const sortedCandidates = [...hand]
    .filter((tile, index, all) => all.findIndex((other) => identity(other) === identity(tile)) === index)
    .sort((left, right) => value(left) - value(right) || tileLabel(left).localeCompare(tileLabel(right)));
  const candidates = closeAlternatives(sortedCandidates, value);
  return candidates.map((tile, index) => {
    const matching = copies(tile);
    const next = candidates[index + 1];
    const mixedSuit = tile.kind === "number" && !!preferredSuit && tile.suit !== preferredSuit;
    const reason = state.round === "north" && state.north?.format === "west" && tile.kind === "number" && tile.rank === state.north.jokerRank
      ? `${tileLabel(tile)} is a selected North joker. It can stand in for a card needed by a permitted West group, so this Coach keeps it below ordinary weak discard candidates.`
      : mixedSuit
        ? `${tileLabel(tile)} is from ${tile.suit}, but your stronger numbered suit is ${preferredSuit}. Passing this during Charleston helps you commit to one suit, while still allowing Winds and Dragons for a Clean Mix.`
      : matching === 1
        ? `${tileLabel(tile)} has no matching copy yet. In West it cannot form a Chow, so its next useful step would be another matching tile for a Pair.`
      : `${tileLabel(tile)} already has a matching copy, so it has a real Pung/Kong path. It is only ranked here when other choices would break that path more severely.`;
    const keep = [...hand].filter((other) => other.id !== tile.id && copies(other) >= 2).slice(0, 3);
    return {
      tileId: tile.id,
      title: state.phase === "charleston" ? `Pass ${tileLabel(tile)}` : `Discard ${tileLabel(tile)}`,
      reason,
      preserves: keep.length ? `Keep ${keep.map(tileLabel).join(", ")}; matching tiles can grow into West Pungs and Kongs while preserving a one-suit or Clean Mix scoring direction.` : "Keep your strongest matching tiles and stay with one numbered suit; that preserves a one-suit or Clean Mix scoring direction.",
      lookingFor: state.phase === "charleston" && mixedSuit ? `Use Charleston to pass tiles from the other numbered suits. Keep ${preferredSuit} tiles and any useful Winds or Dragons, then look for matching tiles to make Pungs and Kongs.` : matching === 1 ? `Look for another ${tileLabel(tile)} only if you decide to build it into a Pair, Pung, or Kong. Your required West milestone is at least one Kong.` : `A third matching ${tileLabel(tile)} makes a Pung; a fourth makes a Kong.`,
      tableWatch: visibleTableWatch(state, seat, potentialDrawKeys(hand.filter((item) => item.id !== tile.id))),
      alternative: next ? `${tileLabel(next)} is the next alternative because it has a similarly limited matching-tile path.` : undefined,
    };
  });
}

/** A transparent teaching heuristic, not an optimal-play or hidden-information claim. */
export function bestMoveOptions(state: EastRoundState, seat: Seat): CoachingOption[] {
  if ((state.round === "south" || (state.round === "north" && state.north?.format === "south")) && state.south) return southBestMoveOptions(state, seat);
  if (state.round === "west" || (state.round === "north" && state.north?.format === "west")) return westBestMoveOptions(state, seat);
  const hand = state.players[seat].hand;
  const copies = (tile: Tile) => hand.filter((other) => identity(other) === identity(tile)).length;
  const alreadyInExposedMatchingGroup = (tile: Tile) => state.players[seat].melds.some((meld) =>
    meld.exposed && (meld.kind === "pung" || meld.kind === "kong") && meld.tiles.some((meldTile) => identity(meldTile) === identity(tile)),
  );
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
    // A later matching draw does not enlarge an exposed Pung under the current
    // Kong policy. Treat it as weaker unless it has another visible use.
    if (alreadyInExposedMatchingGroup(tile) && matching === 1) value -= 35;
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
    // A completed matching group must take precedence over the smaller pattern
    // it contains. Three 2 Bamboos are a Pung, not a "pair that can grow".
    if (matching >= 4) return `your ${tileLabel(strongest)} Kong, a completed four-tile matching group`;
    if (matching === 3) return `your ${tileLabel(strongest)} Pung, a completed three-tile matching group`;
    if (matching === 2) return `your ${tileLabel(strongest)} pair, which can stay as the pair your winning hand needs or grow into a Pung`;
    if (strongest.kind === "number") {
      const path = chowPaths(strongest).find((item) => item.held.length > 0);
      if (path) return `${tileLabel(strongest)} with ${path.held.map((rank) => `${rank} ${suitLabel(strongest.suit)}`).join(" and ")}, which is developing toward a Pure Chow`;
    }
    return `your remaining ${tileLabel(strongest)} structure`;
  };
  const whyWeak = (tile: Tile) => {
    const matching = copies(tile);
    if (matching >= 2) return `You already have ${matching} copies, so this tile is supporting a ${matching === 2 ? "Pair" : "Pung"}; it is not a natural early discard.`;
    if (alreadyInExposedMatchingGroup(tile)) return `You already have an exposed Pung of ${tileLabel(tile)}. This extra ${tileLabel(tile)} cannot be added to that declared Pung as a Kong, so it has limited value unless it helps a different concealed pattern.`;
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
  const ranked = closeAlternatives(
    uniqueTiles.sort((left, right) => score(left) - score(right) || tileLabel(left).localeCompare(tileLabel(right))),
    score,
  );
  return ranked.map((tile, index) => {
    const next = ranked[index + 1];
    const path = tile.kind === "number" ? chowPaths(tile).sort((left, right) => right.held.length - left.held.length)[0] : undefined;
    let lookingFor = `Prioritize draws that improve the groups you are keeping rather than replacing this tile.`;
    if (alreadyInExposedMatchingGroup(tile) && copies(tile) === 1) lookingFor = `This tile does not extend your exposed Pung. Keep your Pair and other developing groups instead.`;
    else if (copies(tile) === 1) lookingFor = `Another ${tileLabel(tile)} would make a Pair; a third matching tile would make a Pung.`;
    else if (tile.kind === "number" && path?.held.length === 1) lookingFor = `${path.missing[0]} ${suitLabel(tile.suit)} would complete the Pure Chow path with ${path.held[0]} ${suitLabel(tile.suit)} and ${tileLabel(tile)}.`;
    return {
      tileId: tile.id,
      title: `Discard ${tileLabel(tile)}`,
      reason: whyWeak(tile),
      preserves: `${strongestThingToKeep(tile)}. Flower/Season bonus tiles are already exposed and scored separately, so this discard does not affect them.`,
      lookingFor,
      tableWatch: visibleTableWatch(state, seat, potentialDrawKeys(hand.filter((item) => item.id !== tile.id))),
      alternative: next ? `${tileLabel(next)} is the next alternative. It has more current value because it helps preserve ${strongestThingToKeep(next)}.` : undefined,
    };
  });
}
