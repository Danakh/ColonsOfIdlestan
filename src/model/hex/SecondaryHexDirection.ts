/**
 * Représente les six directions secondaires dans une grille hexagonale.
 * Ces directions permettent d'indiquer les vertexs et edges autour d'un hexagone.
 * 
 * Les directions secondaires s'intercalent entre les directions principales
 * pour former un total de 12 directions espacées comme les heures d'une horloge :
 * - N (Nord) : 12h
 * - EN (Est-Nord) : 1h
 * - ES (Est-Sud) : 4h
 * - S (Sud) : 6h
 * - WS (Ouest-Sud) : 7h
 * - WN (Ouest-Nord) : 10h
 */
export enum SecondaryHexDirection {
  /** Nord */
  N = 0,
  /** Est-Nord */
  EN = 1,
  /** Est-Sud */
  ES = 2,
  /** Sud */
  S = 3,
  /** Ouest-Sud */
  WS = 4,
  /** Ouest-Nord */
  WN = 5,
}

/**
 * Tableau de toutes les directions secondaires dans l'ordre.
 */
export const ALL_SECONDARY_DIRECTIONS: readonly SecondaryHexDirection[] = [
  SecondaryHexDirection.N,
  SecondaryHexDirection.EN,
  SecondaryHexDirection.ES,
  SecondaryHexDirection.S,
  SecondaryHexDirection.WS,
  SecondaryHexDirection.WN,
] as const;

/**
 * Retourne la direction inverse (opposée) d'une direction secondaire.
 * N ↔ S, EN ↔ WS, ES ↔ WN
 */
export function inverseSecondaryHexDirection(direction: SecondaryHexDirection): SecondaryHexDirection {
  const inverseMap: Record<SecondaryHexDirection, SecondaryHexDirection> = {
    [SecondaryHexDirection.N]: SecondaryHexDirection.S,
    [SecondaryHexDirection.S]: SecondaryHexDirection.N,
    [SecondaryHexDirection.EN]: SecondaryHexDirection.WS,
    [SecondaryHexDirection.WS]: SecondaryHexDirection.EN,
    [SecondaryHexDirection.ES]: SecondaryHexDirection.WN,
    [SecondaryHexDirection.WN]: SecondaryHexDirection.ES,
  };
  return inverseMap[direction];
}
