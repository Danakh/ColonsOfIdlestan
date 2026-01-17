import { HexGrid } from '../hex/HexGrid';
import { Hex } from '../hex/Hex';
import { HexCoord } from '../hex/HexCoord';
import { Edge } from '../hex/Edge';
import { Vertex } from '../hex/Vertex';
import { HexType } from './HexType';
import { CivilizationId } from './CivilizationId';

/**
 * Carte de jeu construite sur une grille hexagonale.
 * 
 * Gère les types d'hexagones, les villes sur les sommets,
 * et les routes sur les arêtes. Détermine la visibilité des hexagones
 * en fonction de la présence de routes adjacentes.
 * 
 * Gère également la propriété des villes et routes par différentes civilisations.
 */
export class GameMap {
  private readonly hexTypeMap: Map<string, HexType>;
  private readonly cities: Set<string>;
  private readonly roads: Set<string>;
  private readonly registeredCivilizations: Set<string>;
  private readonly cityOwner: Map<string, CivilizationId>;
  private readonly roadOwner: Map<string, CivilizationId>;

  /**
   * Crée une nouvelle carte de jeu à partir d'une grille hexagonale.
   * @param grid - La grille hexagonale sous-jacente
   */
  constructor(private readonly grid: HexGrid) {
    this.hexTypeMap = new Map();
    this.cities = new Set();
    this.roads = new Set();
    this.registeredCivilizations = new Set();
    this.cityOwner = new Map();
    this.roadOwner = new Map();

    // Initialiser tous les hexagones à Desert par défaut
    for (const hex of grid.getAllHexes()) {
      this.hexTypeMap.set(hex.coord.hashCode(), HexType.Desert);
    }
  }

  /**
   * Retourne la grille hexagonale sous-jacente.
   */
  getGrid(): HexGrid {
    return this.grid;
  }

  /**
   * Définit le type d'hexagone pour un hexagone.
   * @param hex - L'hexagone ou sa coordonnée
   * @param hexType - Le type d'hexagone
   * @throws Error si l'hexagone n'existe pas dans la grille
   */
  setHexType(hex: Hex | HexCoord, hexType: HexType): void {
    const coord = hex instanceof Hex ? hex.coord : hex;
    if (!this.grid.hasHex(coord)) {
      throw new Error(`L'hexagone à la coordonnée ${coord.toString()} n'existe pas dans la grille.`);
    }
    this.hexTypeMap.set(coord.hashCode(), hexType);
  }

  /**
   * Retourne le type d'hexagone d'un hexagone.
   * @param hex - L'hexagone ou sa coordonnée
   * @returns Le type d'hexagone, ou undefined si l'hexagone n'existe pas
   */
  getHexType(hex: Hex | HexCoord): HexType | undefined {
    const coord = hex instanceof Hex ? hex.coord : hex;
    if (!this.grid.hasHex(coord)) {
      return undefined;
    }
    return this.hexTypeMap.get(coord.hashCode());
  }

  /**
   * Enregistre une civilisation dans la carte.
   * @param civId - L'identifiant de la civilisation
   */
  registerCivilization(civId: CivilizationId): void {
    this.registeredCivilizations.add(civId.hashCode());
  }

  /**
   * Vérifie si une civilisation est enregistrée.
   * @param civId - L'identifiant de la civilisation
   * @returns true si la civilisation est enregistrée
   */
  isCivilizationRegistered(civId: CivilizationId): boolean {
    return this.registeredCivilizations.has(civId.hashCode());
  }

  /**
   * Ajoute une ville sur un sommet pour une civilisation donnée.
   * @param vertex - Le sommet où placer la ville
   * @param civId - L'identifiant de la civilisation propriétaire
   * @throws Error si le sommet n'est pas valide dans la grille
   * @throws Error si une ville existe déjà sur ce sommet
   * @throws Error si la civilisation n'est pas enregistrée
   */
  addCity(vertex: Vertex, civId: CivilizationId): void {
    // Vérifier que la civilisation est enregistrée
    if (!this.isCivilizationRegistered(civId)) {
      throw new Error(`La civilisation ${civId.toString()} n'est pas enregistrée.`);
    }

    const vertexKey = vertex.hashCode();

    // Vérifier qu'il n'y a pas déjà une ville sur ce sommet
    if (this.cities.has(vertexKey)) {
      throw new Error(`Une ville existe déjà sur le sommet ${vertex.toString()}.`);
    }

    // Vérifier que le sommet est valide (au moins un hexagone doit exister)
    const hexes = vertex.getHexes();
    const hasValidHex = hexes.some(coord => this.grid.hasHex(coord));
    
    if (!hasValidHex) {
      throw new Error(`Le sommet ${vertex.toString()} n'est pas valide dans la grille.`);
    }
    
    this.cities.add(vertexKey);
    this.cityOwner.set(vertexKey, civId);
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
   * Ajoute une route sur une arête pour une civilisation donnée.
   * @param edge - L'arête où placer la route
   * @param civId - L'identifiant de la civilisation propriétaire
   * @throws Error si l'arête n'est pas valide dans la grille
   * @throws Error si une route existe déjà sur cette arête
   * @throws Error si la civilisation n'est pas enregistrée
   */
  addRoad(edge: Edge, civId: CivilizationId): void {
    // Vérifier que la civilisation est enregistrée
    if (!this.isCivilizationRegistered(civId)) {
      throw new Error(`La civilisation ${civId.toString()} n'est pas enregistrée.`);
    }

    const edgeKey = edge.hashCode();

    // Vérifier qu'il n'y a pas déjà une route sur cette arête
    if (this.roads.has(edgeKey)) {
      throw new Error(`Une route existe déjà sur l'arête ${edge.toString()}.`);
    }

    // Vérifier que l'arête est valide (au moins un hexagone doit exister)
    const [hex1, hex2] = edge.getHexes();
    const hasValidHex = this.grid.hasHex(hex1) || this.grid.hasHex(hex2);
    
    if (!hasValidHex) {
      throw new Error(`L'arête ${edge.toString()} n'est pas valide dans la grille.`);
    }
    
    this.roads.add(edgeKey);
    this.roadOwner.set(edgeKey, civId);
  }

  /**
   * Retourne le propriétaire d'une ville sur un sommet.
   * @param vertex - Le sommet à vérifier
   * @returns L'identifiant de la civilisation propriétaire, ou undefined s'il n'y a pas de ville
   */
  getCityOwner(vertex: Vertex): CivilizationId | undefined {
    return this.cityOwner.get(vertex.hashCode());
  }

  /**
   * Retourne le propriétaire d'une route sur une arête.
   * @param edge - L'arête à vérifier
   * @returns L'identifiant de la civilisation propriétaire, ou undefined s'il n'y a pas de route
   */
  getRoadOwner(edge: Edge): CivilizationId | undefined {
    return this.roadOwner.get(edge.hashCode());
  }

  /**
   * Retourne toutes les villes appartenant à une civilisation donnée.
   * @param civId - L'identifiant de la civilisation
   * @returns Un tableau des sommets contenant des villes de cette civilisation
   */
  getCitiesForCivilization(civId: CivilizationId): Vertex[] {
    const cities: Vertex[] = [];
    const civKey = civId.hashCode();

    // Parcourir tous les sommets de la grille pour trouver ceux possédés par cette civilisation
    for (const vertex of this.grid.getAllVertices()) {
      const owner = this.cityOwner.get(vertex.hashCode());
      if (owner && owner.hashCode() === civKey) {
        cities.push(vertex);
      }
    }

    return cities;
  }

  /**
   * Retourne toutes les routes appartenant à une civilisation donnée.
   * @param civId - L'identifiant de la civilisation
   * @returns Un tableau des arêtes contenant des routes de cette civilisation
   */
  getRoadsForCivilization(civId: CivilizationId): Edge[] {
    const roads: Edge[] = [];
    const civKey = civId.hashCode();

    // Parcourir tous les hexagones pour obtenir leurs arêtes
    for (const hex of this.grid.getAllHexes()) {
      const edges = this.grid.getEdgesForHex(hex.coord);
      for (const edge of edges) {
        const owner = this.roadOwner.get(edge.hashCode());
        if (owner && owner.hashCode() === civKey && !roads.some(e => e.equals(edge))) {
          roads.push(edge);
        }
      }
    }

    return roads;
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
   * Un hexagone est visible si au moins un de ses sommets a une ville ou une route connectée.
   * Un hexagone sans ville ni route adjacente n'est pas visible.
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
    
    // Vérifier si au moins un sommet a une ville ou une route connectée
    for (const vertex of vertices) {
      // Vérifier si ce vertex a une ville
      if (this.hasCity(vertex)) {
        return true;
      }
      
      // Vérifier si ce vertex a une route connectée
      // Un sommet est formé par 3 hexagones, donc il y a 3 arêtes qui se rencontrent à ce sommet
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