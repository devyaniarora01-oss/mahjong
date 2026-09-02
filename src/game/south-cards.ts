/**
 * South Round cards transcribed from docs/South Round cards.pdf.
 * The cards define each player's individual South Round objective and score.
 */
export type SouthCard = {
  id: string;
  title: string;
  goal: string;
  score: number;
  bonus?: string;
};

export const SOUTH_CHARLESTON_PAIRS = [
  [["east", "south"], ["north", "west"]],
  [["east", "west"], ["north", "south"]],
  [["east", "north"], ["south", "west"]],
] as const;

export const SOUTH_CARDS: readonly SouthCard[] = [
  { id: "windfall", title: "Windfall", goal: "5 Pairs in the same suit, and 1 of each Wind Card.", score: 2000 },
  { id: "windy-dragons", title: "Windy Dragons", goal: "1 Pair of each Wind, and 2 Pungs of Dragons.", score: 2000 },
  { id: "three-sisters", title: "Three Sisters", goal: "1 Pung of 3s in each suit, 1 of each Wind Card, and any 1 additional Wind Card.", score: 500, bonus: "Pair of your own Wind Cards: 1,000 points." },
  { id: "western-command", title: "Western Command", goal: "3 Pungs, 1 Chow, and 1 Pair in any suit. No Honour Cards.", score: 500 },
  { id: "all-honour-hand", title: "All Honour Hand", goal: "4 Pungs or 4 Kongs, and 1 Pair made entirely of Honour Cards. No suits.", score: 2000, bonus: "Pair of your own Wind Cards: 1,000 points." },
  { id: "windy-chow", title: "Windy Chow", goal: "1 Chow in each suit, 1 of each Wind Card, and any 1 additional Wind Card.", score: 500, bonus: "Pair of your own Wind Cards: 1,000 points." },
  { id: "crazy-chows", title: "Crazy Chows", goal: "4 Mixed Chows and 1 Mixed Pair.", score: 1000 },
  { id: "little-arthur", title: "Little Arthur", goal: "1 Chow in each suit, 1 Pung and 1 Pair in any suit. No Honour Cards.", score: 1000 },
  { id: "unique-wonder", title: "Unique Wonder", goal: "1 Crochet of 1s, 1 Crochet of 9s, 1 of each Wind Card, 1 of each Dragon Card, and any 1 additional Honour Card.", score: 2000 },
  { id: "the-moon", title: "The Moon", goal: "4 Chows and 1 Pair, all in the Dots suit.", score: 2000 },
  { id: "three-philosophers", title: "Three Philosophers", goal: "1 Chow in each suit, 1 Mixed Chow, and 1 Pair in any suit.", score: 1000 },
  { id: "gretas-garden", title: "Greta's Garden", goal: "A Run from 1 to 7 in the same suit, 1 of each Wind Card, and 1 of each Dragon Card.", score: 1000 },
  { id: "wriggly-snake", title: "Wriggly Snake", goal: "A complete Run from 1 to 9 in the same suit, 1 of each Wind Card, and any 1 additional Wind Card.", score: 1000 },
  { id: "big-robert", title: "Big Robert", goal: "A Run of any 4 consecutive numbers in each suit, and any 1 Pair of Honour Cards.", score: 1000 },
  { id: "gerties-garter", title: "Gertie's Garter", goal: "A Run from 1 to 7 in two different suits.", score: 1000 },
  { id: "lily-of-the-valley", title: "Lily of the Valley", goal: "1 Pung of Green Dragons, 1 Pung of White Dragons, and 2 Pungs and 1 Pair of Bamboos.", score: 2000 },
  { id: "bombay-mix", title: "Bombay Mix", goal: "2 Pungs and 1 Chow in any suits, and 1 Pung and 1 Pair of Honour Cards.", score: 500, bonus: "Pair of your own Wind Cards: 1,000 points." },
  { id: "dragons-run", title: "Dragon's Run", goal: "A complete Run from 1 to 9 in the same suit, 1 of each Dragon Card, and 1 Pair of Wind Cards.", score: 1000, bonus: "Pair of your own Wind Cards: 2,000 points." },
  { id: "purity", title: "Purity", goal: "4 Kongs and 1 Pair in the same suit, or 3 Pungs, 1 Chow and 1 Pair in the same suit. No Honour Cards.", score: 2000 },
  { id: "betty", title: "Betty", goal: "3 Pairs in the same suit, 1 of each Wind Card, 1 of each Dragon Card, and any 1 additional Honour Card.", score: 2000 },
  { id: "triple-knitting", title: "Triple Knitting", goal: "4 Crochets and 1 Knit.", score: 500 },
  { id: "seven-brothers", title: "Seven Brothers", goal: "A Pung of 7s in each suit, 1 of each Wind Card, and any 1 additional Wind Card.", score: 2000 },
  { id: "driven-snow", title: "Driven Snow", goal: "3 Pungs and 1 Pair made only from odd-numbered Cards (1, 3, 5, 7, 9) in any suit, and 1 Pung of White Dragons.", score: 1000 },
  { id: "all-pairs-in-honours", title: "All Pairs in Honours", goal: "All 7 Pairs made of Honour Cards.", score: 1000 },
  { id: "all-pairs", title: "All Pairs", goal: "All 7 Pairs in the same suit. No Honour Cards.", score: 500 },
];
