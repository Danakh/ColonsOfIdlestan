import { HexCoord } from './HexCoord';
import { MainHexDirection } from './MainHexDirection';
import { SecondaryHexDirection } from './SecondaryHexDirection';
import { Edge } from './Edge';
import { Vertex } from './Vertex';

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

  /** Sérialise l'hexagone (délègue à la coordonnée). */
  serialize(): [number, number] {
    return this.coord.serialize();
  }

  /** Désérialise depuis [q, r]. */
  static deserialize(data: [number, number]): Hex {
    return new Hex(HexCoord.deserialize(data));
  }

  /**
   * Retourne les coordonnées du voisin dans la direction principale spécifiée.
   */
  neighborMain(direction: MainHexDirection): HexCoord {
    return this.coord.neighborMain(direction);
  }

  /**
   * Retourne tous les voisins de cet hexagone en utilisant les directions principales.
   */
  neighborsMain(): HexCoord[] {
    return this.coord.neighborsMain();
  }

  /**
   * Retourne l'edge correspondant à une direction principale.
   * L'edge est formé par cet hexagone et son voisin dans la direction principale spécifiée.
   */
  getEdgeByMainDirection(direction: MainHexDirection): Edge {
    const neighborCoord = this.neighborMain(direction);
    return Edge.create(this.coord, neighborCoord);
  }

  /**
   * Retourne le vertex correspondant à une direction secondaire.
   * Un vertex est formé par cet hexagone et deux de ses voisins selon les directions principales.
   * 
   * Correspondance des directions secondaires aux paires de directions principales :
   * - N : entre NW et NE
   * - EN : entre NE et E
   * - ES : entre E et SE
   * - S : entre SE et SW
   * - WS : entre SW et W
   * - WN : entre W et NW
   */
  getVertexBySecondaryDirection(direction: SecondaryHexDirection): Vertex {
    // Mapping des directions secondaires vers les paires de directions principales
    const directionPairs: Record<SecondaryHexDirection, [MainHexDirection, MainHexDirection]> = {
      [SecondaryHexDirection.N]: [MainHexDirection.NW, MainHexDirection.NE],
      [SecondaryHexDirection.EN]: [MainHexDirection.NE, MainHexDirection.E],
      [SecondaryHexDirection.ES]: [MainHexDirection.E, MainHexDirection.SE],
      [SecondaryHexDirection.S]: [MainHexDirection.SE, MainHexDirection.SW],
      [SecondaryHexDirection.WS]: [MainHexDirection.SW, MainHexDirection.W],
      [SecondaryHexDirection.WN]: [MainHexDirection.W, MainHexDirection.NW],
    };

    const [dir1, dir2] = directionPairs[direction];
    const neighbor1 = this.neighborMain(dir1);
    const neighbor2 = this.neighborMain(dir2);

    return Vertex.create(this.coord, neighbor1, neighbor2);
  }
}
