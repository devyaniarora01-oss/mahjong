# Mahjong Coach Rulebook Extract

This document records only rules explicitly stated or illustrated in `docs/rulebook.pdf`. It is not supplemented by outside Mahjong rules.

## Components and cards

- The set contains 144 Mahjong cards, 25 South Round cards, six blank cards, and two dice.
- There are three numbered suits: Bamboos/Boos, Characters/Cracks, and Dots/Circles. Each suit has four cards for each number 1 through 9.
- Honour cards have no numbers. There are four Winds (East, South, West, North), four of each, and three Dragons (Red, Green, White), four of each.
- There are Flower and Season cards. Their numbers map to winds: 1 East, 2 South, 3 West, 4 North. They are bonus cards used for additional scoring.

## Sets

- Chow (Pure Sequence): three consecutive cards of the same suit.
- Run: three or more consecutive cards of the same suit.
- Pung: three identical cards with the same number and suit.
- Kong: four identical cards with the same number and suit. A Kong counts as three cards when declaring a 14-card Mahjong.
- Pure Pair: two identical cards with the same number and suit.
- Crochet: three cards of the same number, each from a different suit.
- Knit: two cards of the same number, each from a different suit. A Knit may be made only when the hand also contains a Crochet.

## Seats, rounds, and East

- There are four seats: East, South, West, North. The highest dice total is East and is also the dealer for the first (East) round.
- The player to East's right is South; then West; then North. East is Player 1, South Player 2, West Player 3, and North Player 4.
- The East position moves counterclockwise each round. The rulebook describes East, South, West, and North rounds in that order.

## Dealing and replacements

- At the start of every round, each player receives 36 cards.
- East rolls both dice, doubles their total, removes that many cards from their 36 cards, and places them beside them as the Flower Wall. The rulebook's example is a dice total of 8, producing 16 Flower Wall cards.
- East deals 13 cards to each player, starting with the player to East's right. If East runs out before all players have 13, South continues dealing from South's deck where East stopped.
- The remaining cards from the original 36-card allocations become the Draw Pile. East then receives a 14th card.
- Flower or Season cards are placed face up in front of their holder for later scoring and replaced with a card from the Flower Wall. This replacement behavior applies throughout the game.
- A player who makes either an exposed or concealed Kong immediately draws an extra card from the Flower Wall.

## Turn flow and calls

- East begins by discarding one card and announcing it. On a normal turn, draw from the Draw Pile, then discard and announce a card.
- If a player picks a Flower or Season card, they place it down and take a replacement card from the Flower Wall.
- Any player may claim a discard only when it is the third card completing a Pung. They display the Pung, discard immediately, and play continues with the player to the right of the caller.
- Only the next player after the discarder may claim that discard to complete a pure Chow. The caller displays the Chow, discards immediately, and play continues with the player to the right of the caller.
- A discarded card cannot be claimed to complete a Mixed Run/Chow, Pair, Knit, or Crochet unless it completes that player's Mahjong hand. When a card is called, the completed set is displayed face up; a hand that calls cards is exposed.
- If a discard can complete Mahjong for one player and a Pung for another, Mahjong has priority. If two players call Mahjong on the same discard, it goes to the player closest next in turn order.

## East Round win and score

- A Mahjong hand has 14 cards: four sets of three and one set of two.
- In the East Round, the rulebook states that the three-card sets may be Pungs, Chows, Mixed Chows, or Crochets. The two-card set may be a Pure Pair or a Knit; a Knit requires a Crochet in the same hand.
- The round ends when a player picks a card, has 14 cards, and declares Mahjong. Everyone reveals cards, totals score, and records it.
- Every player starts at 35,000 points.
- East Round Mahjong payments:
  - Non-East exposed winner: 500 from each non-East opponent and 1,000 from East.
  - East exposed winner: 1,000 from each other player.
  - Non-East concealed winner: 1,000 from each non-East opponent and 2,000 from East.
  - East concealed winner: 2,000 from each other player.
- A concealed hand is declared without calling cards and is revealed at the end.

## Approved MVP interpretations

These are product decisions supplied for the East Round MVP; they are not presented as explicit rulebook rules.

- **Replacement-card inconsistency:** the rulebook's dealing and ongoing instructions say Flower/Season cards receive a Flower Wall replacement, while one turn-flow line says Flower/Wind. The MVP treats Flowers and Seasons as replacement cards; Winds do not receive a replacement.
- **Flower/Season award overlap:** all applicable Flower/Season awards are cumulative, including overlapping seating-wind and round-wind awards.
- **Draw Pile exhaustion:** if the Draw Pile ends before Mahjong, the hand is a draw with no winner; the player can start another game.
- **Flower Wall exhaustion:** if a required replacement cannot be drawn because the Flower Wall is empty, the hand is a draw with no winner.
- **Crochet:** Crochet is a valid East Round three-card set. Knit is valid only if the same hand also contains a Crochet.
- **Conservative Kong policy:** on their own turn, a player may declare a concealed four-of-a-kind Kong from their hand. Discard-based Kong claims are not permitted. The player then draws the rulebook-required Flower Wall replacement. No additional Kong conventions are used.
- **Digital claim resolution:** when a discard is evaluated, the reducer first finds every player for whom it completes Mahjong and selects the player closest next in turn order. A Pung or Pure Chow cannot be called when any Mahjong claim exists. This deterministic resolution supplies the local pass-window behavior that the rulebook does not define.
- **Mixed Chow:** the rulebook names Mixed Chows but does not define their pattern. The MVP does not validate or permit a Mixed Chow until a rulebook-based definition is available; it does not substitute a conventional Mahjong pattern.

## Still unspecified for the MVP

- The rulebook does not define priority between simultaneous non-Mahjong Pung claims. The current reducer exposes each legal Pung claimant; a future local interaction layer must choose a product policy before presenting competing calls.

## Flower and Season scoring

Flower/Season awards are additional to Mahjong scoring and may be collected by every player, including a non-winner. They are not part of a Mahjong hand.

- Pair of seating-wind Flowers/Seasons: non-East receives 500 from each non-East opponent and 1,000 from East; East receives 1,000 from each other player.
- Pair of round-wind Flowers/Seasons: same payment schedule as a seating-wind pair.
- Pure bouquet: Flowers 1,2,3,4 or Seasons 1,2,3,4. Non-East receives 1,000 from each non-East opponent and 2,000 from East; East receives 2,000 from each other player.
- Mixed bouquet: any Flowers/Seasons combination numbered 1,2,3,4. Non-East receives 500 from each non-East opponent and 1,000 from East; East receives 1,000 from each other player.

## South, West, and North rounds

- South: after a Charleston (Right, Across, Left) exchange, each player secretly takes a South Card that defines that player's goal and score. The round otherwise follows East Round play, with the described differences: players exchange cards and may buy the discard of the player to their left for 100 points. The payment enters a pot for that round's Mahjong winner. A buyer discards immediately; bought cards stay concealed and need not complete a set.
- West (Goulash): only Kongs, Pungs, and Pairs may be made, and at least one Kong is required. A winning hand must satisfy one of the listed clean-hand/combination requirements. A Charleston exchange is required; buying is not allowed. If the Draw Pile ends before Mahjong, the round is a draw; the table may restart it, and only Flower/Wind-set points are awarded on a draw.
- North: East chooses whether North uses the East, South, or West round. East-as-North adds no rules. South-as-North treats Flowers/Seasons as concealed jokers in the 14-card hand; they cannot form a pair. West-as-North uses a number selected by East as the joker number across all three suits. One or more non-identical jokers may be used. A claimed discard used with a joker must be exposed; a joker in an exposed set may be replaced by a subsequently drawn matching card, except when taking a discard. Buying is not allowed. North scoring follows the selected round except Flowers/Seasons award no extra points.

## West Round scoring table

The rulebook says these amounts are received from each player, doubled from East; an East winner receives double from every player. Flower/Season awards are also added according to East Round rules.

| Winning hand | Points from each player |
| --- | ---: |
| All Pungs, Kongs, and Pairs in the same suit - exposed | 1,000 |
| All Pungs, Kongs, and Pairs in the same suit - concealed | 2,000 |
| All Pungs, Kongs, and Pairs made only with Honour cards - exposed | 1,500 |
| All Pungs, Kongs, and Pairs made only with Honour cards - concealed | 2,500 |
| Four exposed Kongs and a Pair, with only Honour cards and/or one suit | 1,500 |
| Three concealed Kongs, a Pair, and any Pung/Kong, with Honour cards and/or one suit | 2,000 |
| Concealed mix of Pungs, Kongs, and a Pair with only Honour cards and/or one suit | 2,000 |
| Concealed mix of Pungs, Kongs, and a Pair with Honour cards and/or one suit | 1,500 |
| Major Hand | 1,500 |
| Bouquet with a clean hand | 2,000 |
