import type { SouthCard } from "./south-cards";
import { allowedAnywhere } from "./south-plan";
import type { Tile } from "./tiles";

/** Whether a tile can ever be part of this South Card (coaching only; never decides legality). */
export const southCardAllows = (card: SouthCard, tile: Tile): boolean => allowedAnywhere(card, tile);
