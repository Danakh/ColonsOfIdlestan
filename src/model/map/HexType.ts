/**
 * Types d'hexagones disponibles sur la carte.
 * Représente le type géographique/biomique d'un hexagone (terrestre, eau, etc.).
 */
export enum HexType {
  /** Bois */
  Wood = 'Wood',
  /** Brique */
  Brick = 'Brick',
  /** Blé */
  Wheat = 'Wheat',
  /** Mouton */
  Sheep = 'Sheep',
  /** Minerai */
  Ore = 'Ore',
  /** Désert (pas de ressource) */
  Desert = 'Desert',
  /** Eau */
  Water = 'Water',
}
