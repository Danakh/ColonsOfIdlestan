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
export enum MainHexDirection {
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
export const ALL_MAIN_DIRECTIONS: readonly MainHexDirection[] = [
  MainHexDirection.W,
  MainHexDirection.E,
  MainHexDirection.NE,
  MainHexDirection.SE,
  MainHexDirection.NW,
  MainHexDirection.SW,
] as const;

/**
 * Retourne la direction inverse (opposée) d'une direction principale.
 * W ↔ E, NE ↔ SW, NW ↔ SE
 */
export function inverseMainHexDirection(direction: MainHexDirection): MainHexDirection {
  const inverseMap: Record<MainHexDirection, MainHexDirection> = {
    [MainHexDirection.W]: MainHexDirection.E,
    [MainHexDirection.E]: MainHexDirection.W,
    [MainHexDirection.NE]: MainHexDirection.SW,
    [MainHexDirection.SW]: MainHexDirection.NE,
    [MainHexDirection.NW]: MainHexDirection.SE,
    [MainHexDirection.SE]: MainHexDirection.NW,
  };
  return inverseMap[direction];
}
