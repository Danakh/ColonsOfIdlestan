import { HexCoord } from './HexCoord';
import { SecondaryHexDirection } from './SecondaryHexDirection';
import { inverseSecondaryHexDirection } from './SecondaryHexDirection';

/**
 * Représente un sommet (vertex) partagé par plusieurs hexagones.
 *
 * Un sommet est un point d'intersection géométrique entre trois cellules
 * hexagonales mutuellement adjacentes. Cette abstraction est indépendante
 * de tout usage métier (bâtiments, nœuds de technologies, etc.).
 *
 * Un sommet est identifié de manière unique par trois hexagones adjacents
 * qui se rencontrent à ce point. L'ordre des hexagones est normalisé pour
 * garantir l'unicité.
 */
export class Vertex {
  private constructor(
    public readonly hex1: HexCoord,
    public readonly hex2: HexCoord,
    public readonly hex3: HexCoord
  ) {
    // Validation: les hexagones doivent former un triangle valide
    if (!Vertex.isValidTriangle(hex1, hex2, hex3)) {
      throw new Error(
        'Les trois hexagones doivent former un triangle valide pour créer un sommet.'
      );
    }
  }

  /**
   * Crée un sommet à partir de trois hexagones adjacents.
   * Normalise l'ordre pour garantir l'unicité.
   */
  static create(
    hex1: HexCoord,
    hex2: HexCoord,
    hex3: HexCoord
  ): Vertex {
    const normalized = Vertex.normalize(hex1, hex2, hex3);
    return new Vertex(normalized[0], normalized[1], normalized[2]);
  }

  /**
   * Vérifie si trois hexagones forment un triangle valide (se rencontrent à un sommet).
   * Dans une grille hexagonale, trois hexagones se rencontrent à un sommet si et seulement si
   * ils sont tous mutuellement adjacents (distance 1 entre chaque paire).
   */
  private static isValidTriangle(
    hex1: HexCoord,
    hex2: HexCoord,
    hex3: HexCoord
  ): boolean {
    const d12 = hex1.distanceTo(hex2);
    const d13 = hex1.distanceTo(hex3);
    const d23 = hex2.distanceTo(hex3);

    // Les trois hexagones doivent être mutuellement adjacents
    return d12 === 1 && d13 === 1 && d23 === 1;
  }

  /**
   * Normalise l'ordre de trois coordonnées pour garantir l'unicité.
   * Trie par q puis r.
   */
  private static normalize(
    hex1: HexCoord,
    hex2: HexCoord,
    hex3: HexCoord
  ): [HexCoord, HexCoord, HexCoord] {
    const hexes = [hex1, hex2, hex3];
    hexes.sort((a, b) => {
      if (a.q !== b.q) return a.q - b.q;
      return a.r - b.r;
    });
    return [hexes[0], hexes[1], hexes[2]];
  }

  /**
   * Vérifie si ce sommet est égal à un autre.
   */
  equals(other: Vertex): boolean {
    const thisHexes = Vertex.normalize(this.hex1, this.hex2, this.hex3);
    const otherHexes = Vertex.normalize(other.hex1, other.hex2, other.hex3);

    return (
      thisHexes[0].equals(otherHexes[0]) &&
      thisHexes[1].equals(otherHexes[1]) &&
      thisHexes[2].equals(otherHexes[2])
    );
  }

  /**
   * Retourne les trois hexagones de ce sommet.
   */
  getHexes(): [HexCoord, HexCoord, HexCoord] {
    return [this.hex1, this.hex2, this.hex3];
  }

  /**
   * Vérifie si ce sommet est adjacent à un hexagone donné.
   */
  isAdjacentTo(hex: HexCoord): boolean {
    return (
      this.hex1.equals(hex) ||
      this.hex2.equals(hex) ||
      this.hex3.equals(hex)
    );
  }

  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString(): string {
    return `Vertex(${this.hex1.toString()}, ${this.hex2.toString()}, ${this.hex3.toString()})`;
  }

  /**
   * Génère un hash pour utiliser comme clé dans des Maps/Sets.
   */
  hashCode(): string {
    const normalized = Vertex.normalize(this.hex1, this.hex2, this.hex3);
    return `${normalized[0].hashCode()}-${normalized[1].hashCode()}-${normalized[2].hashCode()}`;
  }

  /**
   * Retourne l'hexagone présent dans cette direction, s'il existe.
   * 
   * Si direction = N (Nord), retourne l'hexagone qui a ce vertex dans sa direction S (Sud).
   * 
   * Cet hexagone doit être l'un des trois hexagones du vertex et doit avoir ce vertex
   * comme l'un de ses sommets dans la direction opposée (direction inverse).
   * 
   * @param direction - La direction secondaire
   * @returns L'hexagone dans cette direction, ou null s'il n'existe pas
   */
  hex(direction: SecondaryHexDirection): HexCoord | null {
    // Déterminer la direction inverse
    const oppositeDirection = inverseSecondaryHexDirection(direction);

    // Chercher lequel des 3 hexagones a ce vertex dans la direction inverse
    const hexes = this.getHexes();
    for (const hexCoord of hexes) {
      // Créer le vertex depuis cet hex dans la direction inverse
      // et vérifier si c'est ce vertex
      try {
        const vertexInOppositeDir = hexCoord.vertex(oppositeDirection);
        if (vertexInOppositeDir.equals(this)) {
          return hexCoord;
        }
      } catch (e) {
        // Ignorer les erreurs de création de vertex (hex invalides)
        continue;
      }
    }

    return null;
  }

  /** Sérialise le sommet en [h1, h2, h3] (chaque hi = [q, r]). */
  serialize(): [number, number][] {
    return this.getHexes().map((h) => h.serialize());
  }

  /** Désérialise depuis [[q1,r1],[q2,r2],[q3,r3]]. */
  static deserialize(data: [number, number][]): Vertex {
    return Vertex.create(
      HexCoord.deserialize(data[0] as [number, number]),
      HexCoord.deserialize(data[1] as [number, number]),
      HexCoord.deserialize(data[2] as [number, number])
    );
  }
}
