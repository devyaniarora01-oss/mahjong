# First Playable MVP

## Included

- A publicly deployable Next.js/TypeScript site with no account requirement.
- One complete **East Round** hand: seating, deal, Flower Wall replacements, player/bot turns, legal discard/Pung/Chow/Mahjong actions, claim priority, end state, and East Round score breakdown.
- Flowers and Seasons, but not Winds, receive Flower Wall replacements. This resolves an internal rulebook inconsistency as an MVP interpretation.
- If the Draw Pile or a required Flower Wall replacement is exhausted before Mahjong, end the hand as a draw with no winner. This is an MVP product decision.
- Flower/Season awards are cumulative when a player qualifies for more than one award. This is an MVP interpretation.
- Crochet is an allowed East Round three-card set; Knit requires a Crochet in the same hand.
- A Kong may be declared only as a concealed four-of-a-kind from the declaring player's own hand during their turn. Discard-based Kong claims are unavailable. This is the approved conservative MVP policy for a rulebook gap.
- Human at the bottom of a functional four-sided table; three simple deterministic bots.
- An interactive first-hand overlay that teaches the table, seats, East, current round, hand, piles, and available action using the live table.
- `Explain My Hand` on the human's first turn and `Best Move` thereafter, limited to concise engine-legal suggestions.
- End-of-hand outcome, score/payment breakdown, and brief deterministic Game Review based on recorded events.
- Rule-engine tests covering the entire supported loop.

## Deliberately deferred

- South, West, and North round gameplay, because required South Card goal/score definitions are not completely present in the supplied rulebook.
- Accounts, multiplayer, leaderboards, payments, sophisticated bot strategy, animations, and advanced visual polish.
- Live AI-provider dependence: a deterministic fallback keeps the MVP playable.

## Documented engine boundary

The rules engine implements only hand patterns defined in the supplied rulebook. It deliberately rejects Mixed Chows because the rulebook names but does not define their pattern; no conventional definition is substituted.

For a discard, the reducer deterministically resolves Mahjong first and uses the stated closest-next-player tie-break. It suppresses Pung and Pure Chow calls when Mahjong is available. The browser MVP gives the human an opportunity to take a non-Mahjong claim; after they pass, bots choose the first clockwise legal Pung, then the next player's legal Pure Chow. This is a UI scheduling decision for the rulebook's unspecified competing non-Mahjong calls, not an additional Mahjong rule.

## Acceptance check

A new visitor can open the site, follow the table tutorial, finish an East Round against three bots, see only legal actions, ask for concise coaching, and receive an explainable score and review without installing software or configuring an API key.
