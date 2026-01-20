import { HexCoord } from './HexCoord';
import { Hex } from './Hex';
import { Edge } from './Edge';
import { Vertex } from './Vertex';
import { HexDirection, ALL_DIRECTIONS } from './HexDirection';

/**
 * Grille hexagonale générique basée sur des coordonnées axiales.
 *
 * Cette grille ne connaît que la topologie hexagonale (cellules, arêtes,
 * sommets, voisinage). Elle peut être utilisée aussi bien pour une carte
 * de jeu que pour un graphe abstrait (par exemple un arbre de technologies)
 * dès lors que ces structures reposent sur une géométrie hexagonale.
 *
 * Dans ce système, chaque hexagone est identifié par deux coordonnées (q, r):
 * - q: coordonnée colonne (axe horizontal)
 * - r: coordonnée ligne (axe diagonal)
 *
 * Les voisins d'un hexagone sont obtenus en ajoutant des déplacements prédéfinis
 * selon la direction choisie. Ce système est plus simple que les coordonnées
 * cubiques (q, r, s) car la troisième coordonnée peut être dérivée: s = -q - r
 *
 *
 * Les arêtes (edges) et sommets (vertices) sont calculés automatiquement
 * et partagés entre les hexagones adjacents pour garantir l'unicité.
 */
export class HexGrid {
  private readonly hexMap: Map<string, Hex>;
  private readonly edgeCache: Map<string, Edge>;
  private readonly vertexCache: Map<string, Vertex>;

  /**
   * Crée une nouvelle grille hexagonale.
   * @param hexes - Tableau d'hexagones à ajouter à la grille
   */
  constructor(hexes: Hex[] = []) {
    this.hexMap = new Map();
    this.edgeCache = new Map();
    this.vertexCache = new Map();

    // Ajouter tous les hexagones
    for (const hex of hexes) {
      this.hexMap.set(hex.coord.hashCode(), hex);
    }

    // Pré-calculer les arêtes et sommets pour tous les hexagones
    this.precomputeEdgesAndVertices();
  }

  /**
   * Retourne l'hexagone à la coordonnée spécifiée, ou undefined s'il n'existe pas.
   */
  getHex(coord: HexCoord): Hex | undefined {
    return this.hexMap.get(coord.hashCode());
  }

  /**
   * Retourne tous les hexagones de la grille.
   */
  getAllHexes(): Hex[] {
    return Array.from(this.hexMap.values());
  }

  /**
   * Retourne les hexagones voisins de l'hexagone à la coordonnée spécifiée.
   * Ne retourne que les voisins qui existent dans la grille.
   */
  getNeighbors(coord: HexCoord): Hex[] {
    const neighbors: Hex[] = [];
    for (const direction of ALL_DIRECTIONS) {
      const neighborCoord = coord.neighbor(direction);
      const neighbor = this.getHex(neighborCoord);
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }
    return neighbors;
  }

  /**
   * Retourne les coordonnées des voisins (même s'ils n'existent pas dans la grille).
   */
  getNeighborCoords(coord: HexCoord): HexCoord[] {
    return coord.neighbors();
  }

  /**
   * Retourne toutes les arêtes adjacentes à un hexagone donné.
   * Une arête est adjacente si elle connecte cet hexagone à un voisin.
   */
  getEdges(coord: HexCoord): Edge[] {
    const edges: Edge[] = [];
    const hex = this.getHex(coord);
    if (!hex) {
      return edges;
    }

    // Pour chaque direction, créer une arête avec le voisin (s'il existe)
    for (const direction of ALL_DIRECTIONS) {
      const neighborCoord = coord.neighbor(direction);
      const neighbor = this.getHex(neighborCoord);
      if (neighbor) {
        const edge = Edge.create(coord, neighborCoord);
        edges.push(edge);
      }
    }

    return edges;
  }

  /**
   * Retourne toutes les arêtes de la grille.
   */
  getAllEdges(): Edge[] {
    return Array.from(this.edgeCache.values());
  }

  /**
   * Retourne toutes les arêtes adjacentes à un hexagone donné.
   * Inclut toutes les arêtes qui touchent cet hexagone, même celles
   * qui ne connectent pas à un autre hexagone de la grille.
   */
  getEdgesForHex(coord: HexCoord): Edge[] {
    const edges: Edge[] = [];
    const hex = this.getHex(coord);
    if (!hex) {
      return edges;
    }

    // Pour chaque direction, créer une arête avec le voisin
    // Même si le voisin n'existe pas dans la grille, l'arête existe
    for (const direction of ALL_DIRECTIONS) {
      const neighborCoord = coord.neighbor(direction);
      const edge = Edge.create(coord, neighborCoord);
      const edgeKey = edge.hashCode();
      
      // Utiliser le cache pour éviter les doublons
      if (!this.edgeCache.has(edgeKey)) {
        this.edgeCache.set(edgeKey, edge);
      }
      edges.push(this.edgeCache.get(edgeKey)!);
    }

    return edges;
  }

  /**
   * Retourne tous les sommets adjacents à un hexagone donné.
   * Un sommet est adjacent s'il est formé par cet hexagone et deux de ses voisins.
   */
  getVertices(coord: HexCoord): Vertex[] {
    const vertices: Vertex[] = [];
    const hex = this.getHex(coord);
    if (!hex) {
      return vertices;
    }

    // Pour chaque paire de directions consécutives, créer un sommet
    // Un sommet est formé par trois hexagones qui se rencontrent
    const directions = ALL_DIRECTIONS;
    for (let i = 0; i < directions.length; i++) {
      const dir1 = directions[i];
      const dir2 = directions[(i + 1) % directions.length];
      
      const neighbor1 = coord.neighbor(dir1);
      const neighbor2 = coord.neighbor(dir2);
      
      // Vérifier si les deux voisins existent dans la grille
      const hex1 = this.getHex(neighbor1);
      const hex2 = this.getHex(neighbor2);
      
      if (hex1 && hex2) {
        // Les trois hexagones forment un sommet
        try {
          const vertex = Vertex.create(coord, neighbor1, neighbor2);
          const vertexKey = vertex.hashCode();
          
          if (!this.vertexCache.has(vertexKey)) {
            this.vertexCache.set(vertexKey, vertex);
          }
          vertices.push(this.vertexCache.get(vertexKey)!);
        } catch (e) {
          // Ignorer si le sommet n'est pas valide
        }
      }
    }

    return vertices;
  }

  /**
   * Retourne tous les sommets de la grille.
   */
  getAllVertices(): Vertex[] {
    return Array.from(this.vertexCache.values());
  }

  /**
   * Retourne tous les sommets qui touchent un hexagone donné.
   * Inclut les sommets même si certains voisins n'existent pas dans la grille.
   */
  getVerticesForHex(coord: HexCoord): Vertex[] {
    const vertices: Vertex[] = [];
    const hex = this.getHex(coord);
    if (!hex) {
      return vertices;
    }

    // Pour chaque paire de directions consécutives, créer un sommet
    const directions = ALL_DIRECTIONS;
    for (let i = 0; i < directions.length; i++) {
      const dir1 = directions[i];
      const dir2 = directions[(i + 1) % directions.length];
      
      const neighbor1 = coord.neighbor(dir1);
      const neighbor2 = coord.neighbor(dir2);
      
      // Créer le sommet même si les voisins n'existent pas dans la grille
      try {
        const vertex = Vertex.create(coord, neighbor1, neighbor2);
        const vertexKey = vertex.hashCode();
        
        if (!this.vertexCache.has(vertexKey)) {
          this.vertexCache.set(vertexKey, vertex);
        }
        vertices.push(this.vertexCache.get(vertexKey)!);
      } catch (e) {
        // Ignorer si le sommet n'est pas valide
      }
    }

    return vertices;
  }

  /**
   * Pré-calcule toutes les arêtes et sommets pour optimiser les recherches.
   */
  private precomputeEdgesAndVertices(): void {
    // Calculer toutes les arêtes
    for (const hex of this.hexMap.values()) {
      this.getEdgesForHex(hex.coord);
    }

    // Calculer tous les sommets
    for (const hex of this.hexMap.values()) {
      this.getVerticesForHex(hex.coord);
    }
  }

  /**
   * Retourne le nombre d'hexagones dans la grille.
   */
  size(): number {
    return this.hexMap.size;
  }

  /**
   * Vérifie si un hexagone existe à la coordonnée spécifiée.
   */
  hasHex(coord: HexCoord): boolean {
    return this.hexMap.has(coord.hashCode());
  }

  /** Sérialise la grille en { hexes: [coord, ...] }. */
  serialize(): { hexes: [number, number][] } {
    return { hexes: this.getAllHexes().map((h) => h.serialize()) };
  }

  /** Désérialise depuis { hexes }. */
  static deserialize(data: { hexes: [number, number][] }): HexGrid {
    return new HexGrid(data.hexes.map((h) => Hex.deserialize(h)));
  }
}
