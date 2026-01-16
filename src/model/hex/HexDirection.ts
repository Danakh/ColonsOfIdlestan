/**
 * Représente les six directions possibles dans une grille hexagonale.
 * Utilise le système de coordonnées axiales où chaque direction
 * correspond à un déplacement dans le plan hexagonal.
 */
export enum HexDirection {
  /** Nord */
  N = 0,
  /** Nord-Est */
  NE = 1,
  /** Sud-Est */
  SE = 2,
  /** Sud */
  S = 3,
  /** Sud-Ouest */
  SW = 4,
  /** Nord-Ouest */
  NW = 5,
}

/**
 * Tableau de toutes les directions dans l'ordre.
 */
export const ALL_DIRECTIONS: readonly HexDirection[] = [
  HexDirection.N,
  HexDirection.NE,
  HexDirection.SE,
  HexDirection.S,
  HexDirection.SW,
  HexDirection.NW,
] as const;
