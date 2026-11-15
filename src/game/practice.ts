import { applyBotAction, type BotAction } from "./bots";
import { canClaimPung, canClaimPureChow, canDeclareMahjong, createEastRound, type EastRoundState } from "./state";
import { createTileSet, type Tile } from "./tiles";

/**
 * The scripted practice hand.
 *
 * The deck is arranged so every important moment is guaranteed: a Flower in the opening deal, a Pung from South's
 * discard, a Chow tile West cannot give you, a Chow from North (on your left), and a winning draw. The bots never
 * claim; they draw and discard the tile they drew, in the order set out below.
 */

/** Your 14 dealt tiles (the Flower is swapped for the first Flower Wall tile). */
const HUMAN_HAND = [
  "flower-1",
  "bamboo-5-1", "bamboo-5-2", // a pair that South's discard turns into a Pung
  "dot-4-1", "dot-5-1", // two in a row that North's discard turns into a Chow
  "character-2-1", "character-3-1", "character-4-1", // a Chow you already hold
  "dragon-red-1", "dragon-red-2", "dragon-red-3", // a Pung you already hold
  "dragon-green-1", // half of the final pair
  "character-9-1", "bamboo-1-1", // spare tiles to discard
];
/** The tile the Flower Wall hands you in place of the Flower. */
const FLOWER_REPLACEMENT = "wind-south-1";
/** Tiles that do nothing for your hand: the only legal discards in the practice. */
export const PRACTICE_SPARES = [FLOWER_REPLACEMENT, "character-9-1", "bamboo-1-1"];
/**
 * What the Draw Pile hands out, in order: South, South, West, North, then South, West, North again, then you.
 * South discards its first draw (a third 5 Bamboo), West its second, and so on.
 */
const PILE_SCRIPT = [
  "bamboo-5-3", // South: you can Pung it
  "wind-east-2", // South: nothing for anyone
  "dot-3-1", // West: would be your Chow tile, but West is not on your left
  "dot-6-1", // North: your Chow tile, and North is on your left
  "wind-north-2", "wind-west-2", "wind-south-2", // South, West, North: nothing for anyone
  "dragon-green-2", // you: completes your pair
];

export const PRACTICE_FLAGS = { pungTile: "bamboo-5-3", westTile: "dot-3-1", chowTile: "dot-6-1" } as const;

/** Builds the rigged practice deal: the engine deals it exactly like a real hand. */
export function createPracticeRound(): EastRoundState {
  const all = createTileSet();
  const byId = new Map(all.map((tile) => [tile.id, tile]));
  const take = (id: string) => { const tile = byId.get(id); if (!tile) throw new Error(`Unknown tile ${id}`); byId.delete(id); return tile; };
  const human = HUMAN_HAND.map(take);
  const replacement = take(FLOWER_REPLACEMENT);
  const script = PILE_SCRIPT.map(take);
  const isBonus = (tile: Tile) => tile.kind === "flower" || tile.kind === "season";
  const bonus = [...byId.values()].filter(isBonus);
  const plain = [...byId.values()].filter((tile) => !isBonus(tile));
  // Fixed, scattered hands for the three opponents: the same every time, and never an accidental set that matters.
  const spread = plain.filter((_, index) => index % 2 === 0).concat(plain.filter((_, index) => index % 2 === 1));
  const bots = { south: spread.splice(0, 13), west: spread.splice(0, 13), north: spread.splice(0, 13) };
  const flowerWall = [replacement, ...bonus, ...spread.splice(0, 16 - 1 - bonus.length)];
  const queue: Tile[] = new Array(128);
  for (let card = 0; card < 13; card += 1) {
    queue[card * 4] = bots.south[card];
    queue[card * 4 + 1] = bots.west[card];
    queue[card * 4 + 2] = bots.north[card];
    queue[card * 4 + 3] = human[card];
  }
  queue[52] = human[13];
  [...script, ...spread].forEach((tile, index) => { queue[53 + index] = tile; });
  return createEastRound([...flowerWall, ...queue], 8);
}

/** The bots in the practice never claim; they draw, then discard the tile they just drew. */
export function practiceBotAction(state: EastRoundState): BotAction {
  if (state.phase === "claim") return { type: "pass" };
  const seat = state.turn;
  if (state.phase === "draw") return { type: "draw", seat };
  const hand = state.players[seat].hand;
  return { type: "discard", seat, tileId: hand[hand.length - 1].id };
}
export const applyPracticeBot = (state: EastRoundState) => applyBotAction(state, practiceBotAction(state));

/* ------------------------------------------------------------------ */
/* The guide: which explanation to show for the current moment. */

export type GuideCard = {
  id: string;
  title: string;
  body: string;
  /** Tile keys drawn under the text. */
  tiles?: string[];
  /** Show the seat labels around the table. */
  compass?: boolean;
  /** Show a Got it / Next button, and hold the bots until it is pressed. */
  next?: string;
  /** The only claim button to offer right now. */
  claim?: "pung" | "chow";
  /** Outline the spare tiles / the action button. */
  hint?: "spares" | "act";
  /** The final card. */
  finish?: boolean;
};

export const PRACTICE_INTRO: GuideCard[] = [
  {
    id: "welcome",
    title: "Your practice hand",
    body: "This hand is arranged so you will see every key moment. Just follow the highlights.\nYou are East, at the bottom. Play moves counterclockwise: you, then South (on your right), West (across) and North (on your left).",
    compass: true,
    next: "Next",
  },
  {
    id: "goal",
    title: "The goal",
    body: "A winning hand is **four sets and one pair**.\n• **Pung:** three identical tiles.\n• **Kong:** four identical tiles, which counts as one set.\n• **Chow:** three in a row from one suit, like 4-5-6 of Dots.\n• **Pair:** two identical tiles.",
    tiles: ["b5", "b5", "b5", "d4", "d5", "d6"],
    next: "Next",
  },
  {
    id: "tiles",
    title: "Winds, Dragons and bonus tiles",
    body: "**Winds** and **Dragons** have no numbers, so they only make Pungs, Kongs or a Pair, never a Chow.\n**Flowers and Seasons** are bonus tiles. They are not part of your hand: each goes to the side and the Flower Wall gives you a replacement.",
    tiles: ["E", "S", "R", "G", "H", "F1", "T1"],
    next: "Next",
  },
  {
    id: "hand",
    title: "Look at your hand",
    body: "You were dealt a Flower. It moved to the side of your hand and the Flower Wall gave you a replacement tile.\nYou already hold a Chow (2-3-4 Characters) and a Pung (three Red Dragons). Next, throw away a tile that you do not need.",
    tiles: ["c2", "c3", "c4", "R", "R", "R"],
    next: "Start",
  },
];

const done = (game: EastRoundState) => game.status !== "active";

/** The card for the current moment, or undefined while the bots are simply playing. */
export function practiceCard(game: EastRoundState, acks: readonly string[]): GuideCard {
  const east = game.players.east;
  const discards = game.history.filter((event) => event.type === "discarded" && event.seat === "east").length;
  const last = game.lastDiscard?.tile.id;
  if (done(game)) {
    return {
      id: "finish",
      title: "That's Mahjong!",
      body: "You won with four sets and a pair: a Pung of 5 Bamboo you claimed from South, a Chow of 4-5-6 Dots you claimed from North on your left, a Chow of Characters, and a Pung of Red Dragons, plus the Green Dragon pair.\nYou are ready for a real hand.",
      finish: true,
    };
  }
  if (game.phase === "claim") {
    if (last === PRACTICE_FLAGS.pungTile && canClaimPung(game, "east")) {
      return {
        id: "pung",
        title: "South discarded a 5 Bamboo",
        body: "You may take another player's discard when it completes a set. You hold two 5 Bamboo, so this tile makes a **Pung**.\nA Pung can be claimed from **any** player. Press Claim Pung.",
        tiles: ["b5", "b5", "b5"],
        claim: "pung",
        hint: "act",
      };
    }
    if (last === PRACTICE_FLAGS.westTile && !acks.includes("west")) {
      return {
        id: "west",
        title: "West discarded a 3 Dots",
        body: "With your 4 and 5 Dots, a 3 would make a Chow (3-4-5). But you cannot take it: **a Chow can only come from the player on your left**, and that is North. West is across from you.\nOnly a Pung could be taken from West, so you let this one go.",
        tiles: ["d3", "d4", "d5"],
        next: "Got it",
      };
    }
    if (last === PRACTICE_FLAGS.chowTile && canClaimPureChow(game, "east")) {
      return {
        id: "chow",
        title: "North discarded a 6 Dots",
        body: "North is on your left, so you may take this tile for a **Chow**: your 4 and 5 Dots plus this 6 Dots make 4-5-6.\nPress Claim 4–5–6 dots.",
        tiles: ["d4", "d5", "d6"],
        claim: "chow",
        hint: "act",
      };
    }
    return { id: "watch", title: "Waiting for claims", body: "After every discard, anyone may claim it before the next player draws. Nobody can use this one." };
  }
  if (game.turn === "east" && game.phase === "discard") {
    if (canDeclareMahjong(game, "east")) {
      return {
        id: "win",
        title: "You drew the Green Dragon",
        body: "That completes your pair of Green Dragons. You now have four sets (a Chow, a Pung, another Chow and another Pung) and one pair.\nPress Declare Mahjong.",
        tiles: ["G", "G"],
        hint: "act",
      };
    }
    if (discards === 0) {
      return {
        id: "discard1",
        title: "Discard a tile",
        body: "East starts with 14 tiles, so you discard first. Throw away a tile that does not help your hand.\nThe glowing tiles do not fit any set. Click one, then press Discard.",
        hint: "spares",
      };
    }
    if (east.melds.length === 1) {
      return {
        id: "afterPung",
        title: "Pung made",
        body: "Your three 5 Bamboo now sit face-up beside your hand, so everyone can see them. They are locked in.\nAfter claiming a discard you must discard a tile, and you do not draw this turn. Discard another glowing tile.",
        tiles: ["b5", "b5", "b5"],
        hint: "spares",
      };
    }
    return {
      id: "afterChow",
      title: "Chow made",
      body: "You now have two face-up sets. You are one Green Dragon away from winning: you hold one, and need a second for the pair.\nDiscard your last glowing tile.",
      hint: "spares",
    };
  }
  if (game.turn === "east" && game.phase === "draw") {
    return {
      id: "draw",
      title: "Your turn to draw",
      body: "On a normal turn you draw one tile from the wall, then discard one. Press Pick tile.",
      hint: "act",
    };
  }
  return {
    id: "watch",
    title: "The other players take their turns",
    body: "Each player draws one tile, then discards one. After every discard, you get a chance to claim it.",
  };
}

/** True while the bots must wait for the player to read the card. */
export const cardHoldsBots = (card: GuideCard) => !!card.next;
