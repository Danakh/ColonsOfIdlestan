import { HexGrid } from '../hex/HexGrid';
import { Hex } from '../hex/Hex';
import { HexCoord } from '../hex/HexCoord';
import { Edge } from '../hex/Edge';
import { Vertex } from '../hex/Vertex';
import { ResourceType } from './ResourceType';

/**
 * Carte de jeu construite sur une grille hexagonale.
 * 
 * Gère les ressources par hexagone, les villes sur les sommets,
 * et les routes sur les arêtes. Détermine la visibilité des hexagones
 * en fonction de la présence de routes adjacentes.
 */
export class GameMap {
  private readonly resourceMap: Map<string, ResourceType>;
  private readonly cities: Set<string>;
  private readonly roads: Set<string>;

  /**
   * Crée une nouvelle carte de jeu à partir d'une grille hexagonale.
   * @param grid - La grille hexagonale sous-jacente
   */
  constructor(private readonly grid: HexGrid) {
    this.resourceMap = new Map();
    this.cities = new Set();
    this.roads = new Set();

    // Initialiser toutes les ressources à Desert par défaut
    for (const hex of grid.getAllHexes()) {
      this.resourceMap.set(hex.coord.hashCode(), ResourceType.Desert);
    }
  }

  /**
   * Retourne la grille hexagonale sous-jacente.
   */
  getGrid(): HexGrid {
    return this.grid;
  }

  /**
   * Définit le type de ressource pour un hexagone.
   * @param hex - L'hexagone ou sa coordonnée
   * @param resource - Le type de ressource
   * @throws Error si l'hexagone n'existe pas dans la grille
   */
  setResource(hex: Hex | HexCoord, resource: ResourceType): void {
    const coord = hex instanceof Hex ? hex.coord : hex;
    if (!this.grid.hasHex(coord)) {
      throw new Error(`L'hexagone à la coordonnée ${coord.toString()} n'existe pas dans la grille.`);
    }
    this.resourceMap.set(coord.hashCode(), resource);
  }

  /**
   * Retourne le type de ressource d'un hexagone.
   * @param hex - L'hexagone ou sa coordonnée
   * @returns Le type de ressource, ou undefined si l'hexagone n'existe pas
   */
  getResource(hex: Hex | HexCoord): ResourceType | undefined {
    const coord = hex instanceof Hex ? hex.coord : hex;
    if (!this.grid.hasHex(coord)) {
      return undefined;
    }
    return this.resourceMap.get(coord.hashCode());
  }

  /**
   * Ajoute une ville sur un sommet.
   * @param vertex - Le sommet où placer la ville
   * @throws Error si le sommet n'est pas valide dans la grille
   */
  addCity(vertex: Vertex): void {
    // Vérifier que le sommet est valide (au moins un hexagone doit exister)
    const hexes = vertex.getHexes();
    const hasValidHex = hexes.some(coord => this.grid.hasHex(coord));
    
    if (!hasValidHex) {
      throw new Error(`Le sommet ${vertex.toString()} n'est pas valide dans la grille.`);
    }
    
    this.cities.add(vertex.hashCode());
  }

  /**
   * Vérifie si une ville existe sur un sommet.
   * @param vertex - Le sommet à vérifier
   * @returns true si une ville existe sur ce sommet
   */
  hasCity(vertex: Vertex): boolean {
    return this.cities.has(vertex.hashCode());
  }

  /**
   * Ajoute une route sur une arête.
   * @param edge - L'arête où placer la route
   * @throws Error si l'arête n'est pas valide dans la grille
   */
  addRoad(edge: Edge): void {
    // Vérifier que l'arête est valide (au moins un hexagone doit exister)
    const [hex1, hex2] = edge.getHexes();
    const hasValidHex = this.grid.hasHex(hex1) || this.grid.hasHex(hex2);
    
    if (!hasValidHex) {
      throw new Error(`L'arête ${edge.toString()} n'est pas valide dans la grille.`);
    }
    
    this.roads.add(edge.hashCode());
  }

  /**
   * Vérifie si une route existe sur une arête.
   * @param edge - L'arête à vérifier
   * @returns true si une route existe sur cette arête
   */
  hasRoad(edge: Edge): boolean {
    return this.roads.has(edge.hashCode());
  }

  /**
   * Détermine si un hexagone est visible.
   * 
   * Un hexagone est visible si au moins un de ses sommets a une route connectée.
   * Un hexagone sans route adjacente n'est pas visible.
   * 
   * @param hex - L'hexagone ou sa coordonnée
   * @returns true si l'hexagone est visible, false sinon
   */
  isHexVisible(hex: Hex | HexCoord): boolean {
    const coord = hex instanceof Hex ? hex.coord : hex;
    
    // Si l'hexagone n'existe pas, il n'est pas visible
    if (!this.grid.hasHex(coord)) {
      return false;
    }

    // Obtenir tous les sommets de cet hexagone
    const vertices = this.grid.getVerticesForHex(coord);
    
    // Vérifier si au moins un sommet a une route connectée
    // Un sommet est formé par 3 hexagones, donc il y a 3 arêtes qui se rencontrent à ce sommet
    for (const vertex of vertices) {
      const hexes = vertex.getHexes();
      
      // Vérifier chaque paire d'hexagones pour former une arête
      // Les 3 arêtes possibles: (hex1,hex2), (hex2,hex3), (hex1,hex3)
      for (let i = 0; i < hexes.length; i++) {
        for (let j = i + 1; j < hexes.length; j++) {
          try {
            const edge = Edge.create(hexes[i], hexes[j]);
            if (this.hasRoad(edge)) {
              return true;
            }
          } catch (e) {
            // Ignorer les arêtes invalides (non adjacentes)
          }
        }
      }
    }
    
    return false;
  }
}