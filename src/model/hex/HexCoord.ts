import { MainHexDirection, ALL_MAIN_DIRECTIONS } from './MainHexDirection';

/**
 * Système de coordonnées axiales pour les grilles hexagonales.
 * 
 * Dans ce système, chaque hexagone est identifié par deux coordonnées (q, r):
 * - q: coordonnée colonne (axe horizontal)
 * - r: coordonnée ligne (axe diagonal)
 * 
 * Les voisins d'un hexagone sont obtenus en ajoutant des déplacements prédéfinis
 * selon la direction choisie. Ce système est plus simple que les coordonnées
 * cubiques (q, r, s) car la troisième coordonnée peut être dérivée: s = -q - r
 *
 */
export class HexCoord {
  constructor(
    public readonly q: number,
    public readonly r: number
  ) {}

  /**
   * Retourne la coordonnée s (dérivée) pour compatibilité avec système cubique.
   * Dans le système axial, s = -q - r
   */
  get s(): number {
    return -this.q - this.r;
  }

  /**
   * Retourne les coordonnées du voisin dans la direction principale spécifiée.
   * Les déplacements sont définis pour le système de coordonnées axiales.
   */
  neighborMain(direction: MainHexDirection): HexCoord {
    const deltas: Record<MainHexDirection, [number, number]> = {
      [MainHexDirection.W]: [-1, 0],
      [MainHexDirection.E]: [1, 0],
      [MainHexDirection.NE]: [0, 1],
      [MainHexDirection.SE]: [1, -1],
      [MainHexDirection.NW]: [-1, 1],
      [MainHexDirection.SW]: [0, -1],
    };

    const [dq, dr] = deltas[direction];
    return new HexCoord(this.q + dq, this.r + dr);
  }

  /**
   * Retourne tous les voisins de cet hexagone en utilisant les directions principales.
   */
  neighborsMain(): HexCoord[] {
    return ALL_MAIN_DIRECTIONS.map((dir) => this.neighborMain(dir));
  }

  /**
   * Calcule la distance entre deux hexagones.
   */
  distanceTo(other: HexCoord): number {
    return (
      (Math.abs(this.q - other.q) +
        Math.abs(this.q + this.r - other.q - other.r) +
        Math.abs(this.r - other.r)) /
      2
    );
  }

  /**
   * Vérifie l'égalité avec un autre HexCoord.
   */
  equals(other: HexCoord): boolean {
    return this.q === other.q && this.r === other.r;
  }

  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString(): string {
    return `(${this.q}, ${this.r})`;
  }

  /**
   * Génère un hash pour utiliser comme clé dans des Maps/Sets.
   */
  hashCode(): string {
    return `${this.q},${this.r}`;
  }

  /** Sérialise la coordonnée en [q, r]. */
  serialize(): [number, number] {
    return [this.q, this.r];
  }

  /** Désérialise depuis [q, r]. */
  static deserialize(data: [number, number]): HexCoord {
    return new HexCoord(data[0], data[1]);
  }
}
