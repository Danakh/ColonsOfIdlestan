import { HexCoord } from './HexCoord';

/**
 * Représente une cellule hexagonale dans une grille.
 *
 * Cette classe est volontairement générique et ne contient que des
 * informations géométriques (la coordonnée). Toute donnée métier
 * (ressource, technologie, biome, etc.) doit être portée par des
 * structures de niveau supérieur qui référencent cette cellule.
 */
export class Hex {
  constructor(public readonly coord: HexCoord) {}

  /**
   * Vérifie l'égalité avec un autre Hex (égalité structurelle sur la coordonnée).
   */
  equals(other: Hex): boolean {
    return this.coord.equals(other.coord);
  }

  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString(): string {
    return `Hex(${this.coord.toString()})`;
  }
}
