import { HexCoord } from './HexCoord';
import { SecondaryHexDirection } from './SecondaryHexDirection';
import { Vertex } from './Vertex';

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
   * Retourne l'autre hexagone de l'arête donné un hexagone.
   */
  otherHex(hex: HexCoord): HexCoord {
    if (this.hex1.equals(hex)) {
      return this.hex2;
    } else if (this.hex2.equals(hex)) {
      return this.hex1;
    } else {
      throw new Error('L\'hexagone fourni n\'est pas connecté à cette arête.');
    }
  }

  otherVertex(vertex: Vertex): Vertex {
    const [h1, h2] = this.getHexes();
    const verticesH1 = [
      h1.vertex(SecondaryHexDirection.N),
      h1.vertex(SecondaryHexDirection.EN),
      h1.vertex(SecondaryHexDirection.ES),
      h1.vertex(SecondaryHexDirection.S),
      h1.vertex(SecondaryHexDirection.WS),
      h1.vertex(SecondaryHexDirection.WN)
    ];
    const verticesH2 = [
      h2.vertex(SecondaryHexDirection.N),
      h2.vertex(SecondaryHexDirection.EN),
      h2.vertex(SecondaryHexDirection.ES),
      h2.vertex(SecondaryHexDirection.S),
      h2.vertex(SecondaryHexDirection.WS),
      h2.vertex(SecondaryHexDirection.WN)
    ];

    // Trouver les deux vertex communs aux deux hexagones
    const commonVertices = verticesH1.filter(v1 =>
      verticesH2.some(v2 => v1.equals(v2))
    );
    if (commonVertices.length !== 2) {
      throw new Error('Les hexagones ne partagent pas exactement deux vertex.');
    }
    // Retourner l'autre vertex
    if (commonVertices[0].equals(vertex)) {
      return commonVertices[1];
    } else if (commonVertices[1].equals(vertex)) {
      return commonVertices[0];
    } else {
      throw new Error('Le vertex fourni n\'est pas connecté à cette arête.');
    }
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
