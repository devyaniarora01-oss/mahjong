# Proposed Architecture

## Deployment shape

A TypeScript Next.js application deployable to Vercel or any Node-compatible host. The browser runs the table and a deterministic local game session; server routes are the only place an AI provider may be called. No user account or persistent database is required for the first release.

## Boundaries

| Concern | Location | Responsibility |
| --- | --- | --- |
| Tile definitions | `src/game/tiles` | Immutable tile identities, deck construction, display metadata. |
| Rules engine | `src/game/rules` | Pure legal-action generation, claims, win validation, Kong handling, turn transitions, and invariants. It implements only rulebook rules plus clearly labelled MVP interpretations. |
| Game state | `src/game/state` | Serializable game snapshot and action/event history. |
| Scoring | `src/game/scoring` | Pure score breakdown and payments, driven only by validated state. |
| Bots | `src/game/bots` | Simple legal-action selection; never bypasses the rules engine. |
| Tutorial | `src/tutorial` | Step state and contextual callouts over the real table. |
| Coach | `src/coach` + `app/api/coach` | Builds a minimal state summary from legal moves; server adapter returns concise teaching copy. |
| UI | `src/components` + `app` | Top-down table, player controls, event log, score/review panels. |

## East Round MVP interpretations

- Flowers and Seasons trigger Flower Wall replacement; Winds do not, due to an identified rulebook inconsistency.
- Draw Pile or required Flower Wall exhaustion ends the hand as a draw with no winner.
- Flower/Season awards are cumulative when their qualification overlaps.
- The engine retains a separate `mvpInterpretations` record in completed-hand results so UI scoring and later rules changes remain auditable.

## Game protocol

1. UI dispatches an intent such as `discard(tileId)` or `claimPung(discardId)`.
2. The rules engine checks the intent against `getLegalActions(state)` and either returns a new state plus event or a typed rejection.
3. Bots receive the same legal action list and choose one deterministically.
4. Scoring runs only after a rule-validated end state and returns a line-item breakdown.
5. The Coach receives a redacted, serializable snapshot plus legal actions. It can rank and explain legal choices but cannot create, approve, or apply an action.

## UI layout

- Bottom: human hand, primary action controls, and short Coach panel.
- Top, left, right: three bot seats, exposed sets, discard areas, and turn indicator.
- Center: Draw Pile, Flower Wall, current round/East marker, and latest discard.
- Tutorial overlays attach to the same elements players will use in a real hand.

## Testing

- Unit tests for deck construction, set recognition, legal actions, claim priority, turn order, wins, and every supported scoring payment.
- Scenario tests replay action sequences through the pure reducer.
- Component tests assert that the UI only offers engine-provided actions.
- API tests ensure the Coach prompt includes only permitted state and legal options, and that no API key reaches the client.

## AI safety and fallback

`POST /api/coach` validates a compact game-state schema, provides only legal actions, and returns structured short recommendations. If no API key/provider is configured, the app uses deterministic template coaching so the game remains playable.
