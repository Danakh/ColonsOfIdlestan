import { HexCoord } from './HexCoord';

/**
 * Représente une arête (edge) entre deux hexagones adjacents.
 *
 * Cette entité est purement géométrique et modélise une connexion
 * entre deux cellules voisines, quelle que soit la couche métier
 * (carte, arbre de technologies, etc.).
 *
 * Une arête est identifiée de manière unique par deux hexagones adjacents.
 * L'ordre des hexagones est normalisé pour garantir l'unicité.
 */
export class Edge {
  private constructor(
    public readonly hex1: HexCoord,
    public readonly hex2: HexCoord
  ) {
    // Validation: les hexagones doivent être adjacents
    const distance = hex1.distanceTo(hex2);
    if (distance !== 1) {
      throw new Error(
        `Les hexagones doivent être adjacents pour former une arête. Distance: ${distance}`
      );
    }
  }

  /**
   * Crée une arête entre deux hexagones adjacents.
   * Normalise l'ordre pour garantir l'unicité.
   */
  static create(hex1: HexCoord, hex2: HexCoord): Edge {
    // Normaliser l'ordre pour garantir l'unicité
    const normalized = Edge.normalize(hex1, hex2);
    return new Edge(normalized[0], normalized[1]);
  }

  /**
   * Normalise l'ordre de deux coordonnées pour garantir l'unicité.
   * Ordre: q d'abord, puis r si égalité.
   */
  private static normalize(
    hex1: HexCoord,
    hex2: HexCoord
  ): [HexCoord, HexCoord] {
    if (
      hex1.q < hex2.q ||
      (hex1.q === hex2.q && hex1.r < hex2.r)
    ) {
      return [hex1, hex2];
    }
    return [hex2, hex1];
  }

  /**
   * Vérifie si cette arête est égale à une autre.
   */
  equals(other: Edge): boolean {
    return (
      (this.hex1.equals(other.hex1) && this.hex2.equals(other.hex2)) ||
      (this.hex1.equals(other.hex2) && this.hex2.equals(other.hex1))
    );
  }

  /**
   * Retourne les deux hexagones de cette arête.
   */
  getHexes(): [HexCoord, HexCoord] {
    return [this.hex1, this.hex2];
  }

  /**
   * Vérifie si cette arête est adjacente à un hexagone donné.
   */
  isAdjacentTo(hex: HexCoord): boolean {
    return this.hex1.equals(hex) || this.hex2.equals(hex);
  }

  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString(): string {
    return `Edge(${this.hex1.toString()} - ${this.hex2.toString()})`;
  }

  /**
   * Génère un hash pour utiliser comme clé dans des Maps/Sets.
   */
  hashCode(): string {
    const normalized = Edge.normalize(this.hex1, this.hex2);
    return `${normalized[0].hashCode()}-${normalized[1].hashCode()}`;
  }

  /** Sérialise l'arête en [h1, h2] (chaque hi = [q, r]). */
  serialize(): [[number, number], [number, number]] {
    const [a, b] = this.getHexes();
    return [a.serialize(), b.serialize()];
  }

  /** Désérialise depuis [[q1,r1],[q2,r2]]. */
  static deserialize(data: [[number, number], [number, number]]): Edge {
    return Edge.create(HexCoord.deserialize(data[0]), HexCoord.deserialize(data[1]));
  }
}
