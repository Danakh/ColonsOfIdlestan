/**
 * Représente les six directions principales dans une grille hexagonale.
 * Ces directions permettent d'explorer le voisinage des hexagones.
 * 
 * Les déplacements en coordonnées (q, r) :
 * - W (Ouest) : (-1, 0)
 * - E (Est) : (+1, 0)
 * - NE (Nord-Est) : (0, +1)
 * - SE (Sud-Est) : (+1, -1)
 * - NW (Nord-Ouest) : (-1, +1)
 * - SW (Sud-Ouest) : (0, -1)
 */
export enum HexDirection {
  /** Ouest */
  W = 0,
  /** Est */
  E = 1,
  /** Nord-Est */
  NE = 2,
  /** Sud-Est */
  SE = 3,
  /** Nord-Ouest */
  NW = 4,
  /** Sud-Ouest */
  SW = 5,
}

/**
 * Tableau de toutes les directions principales dans l'ordre.
 */
export const ALL_HEX_DIRECTIONS: readonly HexDirection[] = [
  HexDirection.W,
  HexDirection.E,
  HexDirection.NE,
  HexDirection.SE,
  HexDirection.NW,
  HexDirection.SW,
] as const;

/**
 * Retourne la direction inverse (opposée) d'une direction principale.
 * W ↔ E, NE ↔ SW, NW ↔ SE
 */
export function inverseHexDirection(direction: HexDirection): HexDirection {
  const inverseMap: Record<HexDirection, HexDirection> = {
    [HexDirection.W]: HexDirection.E,
    [HexDirection.E]: HexDirection.W,
    [HexDirection.NE]: HexDirection.SW,
    [HexDirection.SW]: HexDirection.NE,
    [HexDirection.NW]: HexDirection.SE,
    [HexDirection.SE]: HexDirection.NW,
  };
  return inverseMap[direction];
}
