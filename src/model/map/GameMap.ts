import { HexGrid } from '../hex/HexGrid';
import { Hex } from '../hex/Hex';
import { HexCoord } from '../hex/HexCoord';
import { Edge } from '../hex/Edge';
import { Vertex } from '../hex/Vertex';
import { HexType } from './HexType';
import { CivilizationId } from './CivilizationId';
import { City, CitySerialized } from '../city/City';
import { CityLevel } from '../city/CityLevel';
import { BuildingType } from '../city/BuildingType';
import { ResourceType } from './ResourceType';

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
  private readonly cityMap: Map<string, City>;
  private readonly roads: Set<string>;
  private readonly registeredCivilizations: Set<string>;
  private readonly roadOwner: Map<string, CivilizationId>;
  private readonly roadDistanceToCity: Map<string, number>; // Map<edgeKey, distance>

  /**
   * Crée une nouvelle carte de jeu à partir d'une grille hexagonale.
   * @param grid - La grille hexagonale sous-jacente
   */
  constructor(private readonly grid: HexGrid) {
    this.hexTypeMap = new Map();
    this.cityMap = new Map();
    this.roads = new Set();
    this.registeredCivilizations = new Set();
    this.roadOwner = new Map();
    this.roadDistanceToCity = new Map();

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
   * Retourne les valeurs (getValue) des civilisations enregistrées.
   * Utilisé pour la sérialisation.
   */
  getRegisteredCivilizationValues(): string[] {
    return Array.from(this.registeredCivilizations);
  }

  /**
   * Ajoute une ville sur un sommet pour une civilisation donnée.
   * La ville est créée au niveau Outpost (0) par défaut.
   * @param vertex - Le sommet où placer la ville
   * @param civId - L'identifiant de la civilisation propriétaire
   * @param level - Le niveau initial de la ville (par défaut: Outpost)
   * @throws Error si le sommet n'est pas valide dans la grille
   * @throws Error si une ville existe déjà sur ce sommet
   * @throws Error si la civilisation n'est pas enregistrée
   */
  addCity(vertex: Vertex, civId: CivilizationId, level: CityLevel = CityLevel.Outpost): void {
    // Vérifier que la civilisation est enregistrée
    if (!this.isCivilizationRegistered(civId)) {
      throw new Error(`La civilisation ${civId.toString()} n'est pas enregistrée.`);
    }

    const vertexKey = vertex.hashCode();

    // Vérifier qu'il n'y a pas déjà une ville sur ce sommet
    if (this.cityMap.has(vertexKey)) {
      throw new Error(`Une ville existe déjà sur le sommet ${vertex.toString()}.`);
    }

    // Vérifier que le sommet est valide (au moins un hexagone doit exister)
    const hexes = vertex.getHexes();
    const hasValidHex = hexes.some(coord => this.grid.hasHex(coord));
    
    if (!hasValidHex) {
      throw new Error(`Le sommet ${vertex.toString()} n'est pas valide dans la grille.`);
    }
    
    // Créer la ville
    const city = new City(vertex, civId, level);
    this.cityMap.set(vertexKey, city);
    
    // Recalculer les distances des routes après l'ajout d'une ville
    // Cela permet de mettre à jour les distances pour tenir compte de la nouvelle ville
    this.updateRoadDistances(civId);
  }

  /**
   * Vérifie si une ville existe sur un sommet.
   * @param vertex - Le sommet à vérifier
   * @returns true si une ville existe sur ce sommet
   */
  hasCity(vertex: Vertex): boolean {
    return this.cityMap.has(vertex.hashCode());
  }

  /**
   * Retourne la ville sur un sommet donné.
   * @param vertex - Le sommet à vérifier
   * @returns La ville, ou undefined s'il n'y a pas de ville sur ce sommet
   */
  getCity(vertex: Vertex): City | undefined {
    return this.cityMap.get(vertex.hashCode());
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
    
    // Calculer et mettre à jour les distances depuis les villes pour toutes les routes
    this.updateRoadDistances(civId);
  }

  /**
   * Retourne le propriétaire d'une ville sur un sommet.
   * @param vertex - Le sommet à vérifier
   * @returns L'identifiant de la civilisation propriétaire, ou undefined s'il n'y a pas de ville
   */
  getCityOwner(vertex: Vertex): CivilizationId | undefined {
    const city = this.cityMap.get(vertex.hashCode());
    return city ? city.owner : undefined;
  }

  /**
   * Retourne toutes les villes appartenant à une civilisation donnée.
   * @param civId - L'identifiant de la civilisation
   * @returns Un tableau des villes appartenant à cette civilisation
   */
  getCitiesByCivilization(civId: CivilizationId): City[] {
    const cities: City[] = [];
    for (const city of this.cityMap.values()) {
      if (city.owner.equals(civId)) {
        cities.push(city);
      }
    }
    return cities;
  }

  /**
   * Retourne le nombre total de villes sur la carte.
   * @returns Le nombre de villes
   */
  getCityCount(): number {
    return this.cityMap.size;
  }

  /**
   * Vérifie s'il existe une capitale sur cette carte (île).
   * @returns true s'il existe au moins une capitale
   */
  hasCapital(): boolean {
    for (const city of this.cityMap.values()) {
      if (city.level === CityLevel.Capital) {
        return true;
      }
    }
    return false;
  }

  /**
   * Retourne le sommet où se trouve la capitale, s'il y en a une.
   * @returns Le sommet de la capitale, ou undefined s'il n'y a pas de capitale
   */
  getCapital(): Vertex | undefined {
    for (const city of this.cityMap.values()) {
      if (city.level === CityLevel.Capital) {
        return city.vertex;
      }
    }
    return undefined;
  }

  /**
   * Vérifie si une capitale peut être créée sur cette carte (île).
   * @returns true si aucune capitale n'existe déjà
   */
  isCapitalAllowed(): boolean {
    return !this.hasCapital();
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
   * @returns Un tableau des villes de cette civilisation
   */
  getCitiesForCivilization(civId: CivilizationId): City[] {
    const cities: City[] = [];
    const civKey = civId.hashCode();

    // Parcourir toutes les villes pour trouver celles appartenant à cette civilisation
    for (const city of this.cityMap.values()) {
      if (city.owner.hashCode() === civKey) {
        cities.push(city);
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
   * Retourne toutes les routes constructibles pour une civilisation donnée.
   * Une route est constructible si elle touche une ville de la civilisation
   * ou si elle touche une route existante de la civilisation.
   * @param civId - L'identifiant de la civilisation
   * @returns Un tableau des arêtes constructibles pour cette civilisation
   */
  getBuildableRoadsForCivilization(civId: CivilizationId): Edge[] {
    const buildableRoads: Edge[] = [];
    const civKey = civId.hashCode();

    // Vérifier que la civilisation est enregistrée
    if (!this.isCivilizationRegistered(civId)) {
      return buildableRoads;
    }

    // Parcourir toutes les arêtes de la grille
    const allEdges = this.grid.getAllEdges();
    
    for (const edge of allEdges) {
      // Vérifier que les deux hexagones de l'edge existent dans la grille
      const [hex1, hex2] = edge.getHexes();
      if (!this.grid.hasHex(hex1) || !this.grid.hasHex(hex2)) {
        continue; // Ignorer les edges vers des hexagones inexistants
      }

      // Ignorer les edges entre deux hexagones d'eau (mais autoriser terre-eau)
      const hex1Type = this.getHexType(hex1);
      const hex2Type = this.getHexType(hex2);
      if (hex1Type === HexType.Water && hex2Type === HexType.Water) {
        continue; // Ignorer les edges entre deux hexagones d'eau
      }

      // Ignorer les routes déjà construites
      if (this.hasRoad(edge)) {
        continue;
      }

      // Vérifier si l'edge touche une ville de la civilisation
      const vertices = this.getVerticesForEdge(edge);
      let touchesCity = false;
      for (const vertex of vertices) {
        // Vérifier que tous les hexagones du vertex existent
        const vertexHexes = vertex.getHexes();
        const allVertexHexesExist = vertexHexes.every(h => this.grid.hasHex(h));
        if (!allVertexHexesExist) {
          continue; // Ignorer les vertices avec des hexagones inexistants
        }
        
        if (this.hasCity(vertex)) {
          const owner = this.getCityOwner(vertex);
          if (owner && owner.hashCode() === civKey) {
            touchesCity = true;
            break;
          }
        }
      }

      if (touchesCity) {
        buildableRoads.push(edge);
        continue;
      }

      // Vérifier si l'edge touche une route de la civilisation
      // Un edge touche une route s'ils partagent un vertex
      const adjacentEdges = this.getAdjacentEdges(edge);
      for (const adjacentEdge of adjacentEdges) {
        // Vérifier que l'edge adjacent existe vraiment dans la grille
        const [adjHex1, adjHex2] = adjacentEdge.getHexes();
        if (!this.grid.hasHex(adjHex1) || !this.grid.hasHex(adjHex2)) {
          continue;
        }
        
        // Ignorer les edges adjacents entre deux hexagones d'eau (mais autoriser terre-eau)
        const adjHex1Type = this.getHexType(adjHex1);
        const adjHex2Type = this.getHexType(adjHex2);
        if (adjHex1Type === HexType.Water && adjHex2Type === HexType.Water) {
          continue; // Ignorer les edges adjacents entre deux hexagones d'eau
        }
        
        if (this.hasRoad(adjacentEdge)) {
          const owner = this.getRoadOwner(adjacentEdge);
          if (owner && owner.hashCode() === civKey) {
            buildableRoads.push(edge);
            break;
          }
        }
      }
    }

    return buildableRoads;
  }

  /**
   * Retourne les edges adjacents à un edge donné.
   * Deux edges sont adjacents s'ils partagent un vertex et que tous les hexagones existent dans la grille.
   * @param edge - L'arête pour laquelle trouver les edges adjacents
   * @returns Un tableau des edges adjacents à cette arête
   */
  private getAdjacentEdges(edge: Edge): Edge[] {
    const adjacentEdges: Edge[] = [];
    const vertices = this.getVerticesForEdge(edge);

    // Pour chaque vertex adjacent à l'edge, obtenir tous les edges qui touchent ce vertex
    for (const vertex of vertices) {
      const hexes = vertex.getHexes();
      
      // Vérifier que tous les hexagones du vertex existent dans la grille
      const allHexesExist = hexes.every(h => this.grid.hasHex(h));
      if (!allHexesExist) {
        continue; // Ignorer les vertices avec des hexagones inexistants
      }
      
      // Un vertex est formé de 3 hexagones, donc il y a 3 edges possibles entre ces hexagones
      for (let i = 0; i < hexes.length; i++) {
        for (let j = i + 1; j < hexes.length; j++) {
          try {
            const adjacentEdge = Edge.create(hexes[i], hexes[j]);
            
            // Vérifier que les deux hexagones de l'edge existent dans la grille
            const [adjHex1, adjHex2] = adjacentEdge.getHexes();
            if (!this.grid.hasHex(adjHex1) || !this.grid.hasHex(adjHex2)) {
              continue; // Ignorer les edges avec des hexagones inexistants
            }
            
            // Ignorer les edges adjacents entre deux hexagones d'eau (mais autoriser terre-eau)
            const adjHex1Type = this.getHexType(adjHex1);
            const adjHex2Type = this.getHexType(adjHex2);
            if (adjHex1Type === HexType.Water && adjHex2Type === HexType.Water) {
              continue; // Ignorer les edges entre deux hexagones d'eau
            }
            
            // Ne pas inclure l'edge original
            if (!adjacentEdge.equals(edge)) {
              // Éviter les doublons
              if (!adjacentEdges.some(e => e.equals(adjacentEdge))) {
                adjacentEdges.push(adjacentEdge);
              }
            }
          } catch (e) {
            // Ignorer les edges invalides
          }
        }
      }
    }

    return adjacentEdges;
  }

  /**
   * Retourne les edges qui touchent un vertex donné.
   * Un edge touche un vertex s'il contient deux des trois hexagones qui forment le vertex.
   * @param vertex - Le vertex pour lequel trouver les edges
   * @returns Un tableau des edges qui touchent ce vertex
   */
  getEdgesForVertex(vertex: Vertex): Edge[] {
    const edges: Edge[] = [];
    const hexes = vertex.getHexes();
    
    // Vérifier que tous les hexagones du vertex existent dans la grille
    const allHexesExist = hexes.every(h => this.grid.hasHex(h));
    if (!allHexesExist) {
      return edges; // Retourner vide si les hexagones n'existent pas
    }
    
    // Un vertex est formé de 3 hexagones, donc il y a 3 edges possibles entre ces hexagones
    for (let i = 0; i < hexes.length; i++) {
      for (let j = i + 1; j < hexes.length; j++) {
        try {
          const edge = Edge.create(hexes[i], hexes[j]);
          
          // Vérifier que les deux hexagones de l'edge existent dans la grille
          const [edgeHex1, edgeHex2] = edge.getHexes();
          if (!this.grid.hasHex(edgeHex1) || !this.grid.hasHex(edgeHex2)) {
            continue;
          }
          
          // Ignorer les edges entre deux hexagones d'eau
          const hex1Type = this.getHexType(edgeHex1);
          const hex2Type = this.getHexType(edgeHex2);
          if (hex1Type === HexType.Water && hex2Type === HexType.Water) {
            continue;
          }
          
          // Éviter les doublons
          if (!edges.some(e => e.equals(edge))) {
            edges.push(edge);
          }
        } catch (e) {
          // Ignorer les edges invalides
        }
      }
    }
    
    return edges;
  }

  /**
   * Retourne les vertices adjacents à une arête donnée.
   * Un vertex est adjacent à un edge s'il contient les deux hexagones de l'edge.
   * @param edge - L'arête pour laquelle trouver les vertices adjacents
   * @returns Un tableau des vertices adjacents à cette arête
   */
  getVerticesForEdge(edge: Edge): Vertex[] {
    const vertices: Vertex[] = [];
    const [hex1, hex2] = edge.getHexes();

    // Obtenir tous les vertices de la grille et filtrer ceux qui contiennent les deux hexagones de l'edge
    // Un vertex est formé de 3 hexagones, donc on cherche ceux qui contiennent hex1 et hex2
    for (const vertex of this.grid.getAllVertices()) {
      const hexes = vertex.getHexes();
      // Un vertex adjacent à un edge doit contenir les deux hexagones de l'edge
      // et tous les 3 hexagones du vertex doivent exister dans la grille
      const containsHex1 = hexes.some(h => h.equals(hex1));
      const containsHex2 = hexes.some(h => h.equals(hex2));
      const allHexesExist = hexes.every(h => this.grid.hasHex(h));

      if (containsHex1 && containsHex2 && allHexesExist) {
        // Éviter les doublons
        if (!vertices.some(v => v.equals(vertex))) {
          vertices.push(vertex);
        }
      }
    }

    return vertices;
  }

  /**
   * Détermine si un hexagone est visible.
   * 
   * Un hexagone terrestre est visible si au moins un de ses sommets a une ville ou une route connectée.
   * Un hexagone d'eau est visible s'il touche au moins un hexagone terrestre visible.
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

    const hexType = this.getHexType(coord);
    
    // Si c'est un hexagone d'eau, vérifier si un voisin terrestre est visible
    if (hexType === HexType.Water) {
      // Obtenir tous les voisins de cet hexagone
      const neighbors = this.grid.getNeighbors(coord);
      
      // Vérifier si au moins un voisin terrestre (non-Water) est visible
      for (const neighbor of neighbors) {
        const neighborType = this.getHexType(neighbor.coord);
        // Ignorer les hexagones d'eau
        if (neighborType !== HexType.Water && neighborType !== undefined) {
          // Vérifier récursivement si ce voisin terrestre est visible
          // Mais éviter la récursion infinie en vérifiant directement
          if (this.isTerrestrialHexVisible(neighbor.coord)) {
            return true;
          }
        }
      }
      return false;
    }

    // Pour les hexagones terrestres, utiliser la logique classique
    return this.isTerrestrialHexVisible(coord);
  }

  /**
   * Détermine si un hexagone terrestre est visible.
   * Un hexagone terrestre est visible si au moins un de ses sommets a une ville ou une route connectée.
   * 
   * @param coord - La coordonnée de l'hexagone
   * @returns true si l'hexagone terrestre est visible, false sinon
   */
  private isTerrestrialHexVisible(coord: HexCoord): boolean {
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

  /**
   * Retourne la distance d'une route à la ville la plus proche de la même civilisation.
   * @param edge - L'arête de la route
   * @returns La distance (1 si elle touche une ville, D+1 si elle touche une route de distance D), ou undefined si la route n'existe pas
   */
  getRoadDistanceToCity(edge: Edge): number | undefined {
    return this.roadDistanceToCity.get(edge.hashCode());
  }

  /**
   * Calcule la distance d'une route constructible à la ville la plus proche.
   * Cette méthode simule la construction de la route et calcule sa distance basée sur les routes existantes.
   * @param edge - L'arête constructible à vérifier
   * @param civId - L'identifiant de la civilisation
   * @returns La distance calculée (distance minimale + 1), ou undefined si la route ne peut pas être construite
   */
  calculateBuildableRoadDistance(edge: Edge, civId: CivilizationId): number | undefined {
    const civKey = civId.hashCode();
    
    // Si l'edge touche directement une ville, la distance est 1
    const vertices = this.getVerticesForEdge(edge);
    for (const vertex of vertices) {
      const vertexHexes = vertex.getHexes();
      const allVertexHexesExist = vertexHexes.every(h => this.grid.hasHex(h));
      if (!allVertexHexesExist) {
        continue;
      }
      
      if (this.hasCity(vertex)) {
        const owner = this.getCityOwner(vertex);
        if (owner && owner.hashCode() === civKey) {
          return 1; // Distance = 1 si la route touche directement une ville
        }
      }
    }
    
    // Si l'edge touche une route existante, calculer la distance minimale + 1
    const adjacentEdges = this.getAdjacentEdges(edge);
    let minDistance: number | undefined = undefined;
    
    for (const adjacentEdge of adjacentEdges) {
      const [adjHex1, adjHex2] = adjacentEdge.getHexes();
      if (!this.grid.hasHex(adjHex1) || !this.grid.hasHex(adjHex2)) {
        continue;
      }
      
      // Ignorer les edges entre deux hexagones d'eau
      const adjHex1Type = this.getHexType(adjHex1);
      const adjHex2Type = this.getHexType(adjHex2);
      if (adjHex1Type === HexType.Water && adjHex2Type === HexType.Water) {
        continue;
      }
      
      if (this.hasRoad(adjacentEdge)) {
        const owner = this.getRoadOwner(adjacentEdge);
        if (owner && owner.hashCode() === civKey) {
          const adjacentDistance = this.getRoadDistanceToCity(adjacentEdge);
          if (adjacentDistance !== undefined) {
            const newDistance = adjacentDistance + 1;
            if (minDistance === undefined || newDistance < minDistance) {
              minDistance = newDistance;
            }
          }
        }
      }
    }
    
    return minDistance;
  }

  /**
   * Calcule la distance minimale d'un vertex à une ville de la civilisation (en nombre de routes).
   * Utilise un algorithme BFS depuis les villes.
   * Un vertex qui touche une route de distance D a lui-même une distance de D.
   * @param vertex - Le vertex pour lequel calculer la distance
   * @param civId - L'identifiant de la civilisation
   * @returns La distance minimale, ou undefined si aucune ville de la civilisation n'est accessible
   */
  calculateVertexDistanceToCity(vertex: Vertex, civId: CivilizationId): number | undefined {
    const civKey = civId.hashCode();
    
    // Vérifier que tous les hexagones du vertex existent
    const vertexHexes = vertex.getHexes();
    const allVertexHexesExist = vertexHexes.every(h => this.grid.hasHex(h));
    if (!allVertexHexesExist) {
      return undefined;
    }
    
    // Si le vertex a directement une ville de la civilisation, distance = 0
    if (this.hasCity(vertex)) {
      const owner = this.getCityOwner(vertex);
      if (owner && owner.hashCode() === civKey) {
        return 0;
      }
    }
    
    // Trouver la distance minimale en vérifiant toutes les routes qui touchent ce vertex
    // Un vertex qui touche une route de distance D a lui-même distance D
    const edgesForVertex = this.getEdgesForVertex(vertex);
    let minDistance: number | undefined = undefined;
    
    for (const edge of edgesForVertex) {
      // Vérifier que la route appartient à la civilisation
      if (!this.hasRoad(edge)) {
        continue;
      }
      
      const owner = this.getRoadOwner(edge);
      if (!owner || owner.hashCode() !== civKey) {
        continue;
      }
      
      // Obtenir la distance de cette route
      const roadDistance = this.getRoadDistanceToCity(edge);
      if (roadDistance !== undefined) {
        // Le vertex a la même distance que la route qu'il touche
        if (minDistance === undefined || roadDistance < minDistance) {
          minDistance = roadDistance;
        }
      }
    }
    
    return minDistance;
  }

  /**
   * Retourne tous les vertices où un avant-poste peut être construit pour une civilisation.
   * @param civId - L'identifiant de la civilisation
   * @returns Un tableau des vertices constructibles
   */
  getBuildableOutpostVertices(civId: CivilizationId): Vertex[] {
    const buildableVertices: Vertex[] = [];
    const civKey = civId.hashCode();
    
    // Vérifier que la civilisation est enregistrée
    if (!this.isCivilizationRegistered(civId)) {
      return buildableVertices;
    }
    
    // Parcourir tous les vertices de la grille
    const allVertices = this.grid.getAllVertices();
    
    for (const vertex of allVertices) {
      // Vérifier que tous les hexagones du vertex existent
      const vertexHexes = vertex.getHexes();
      const allVertexHexesExist = vertexHexes.every(h => this.grid.hasHex(h));
      if (!allVertexHexesExist) {
        continue;
      }
      
      // Vérifier qu'il n'y a pas déjà une ville sur ce vertex
      if (this.hasCity(vertex)) {
        continue;
      }
      
      // Vérifier que le vertex touche au moins une route de la civilisation
      const edgesForVertex = this.getEdgesForVertex(vertex);
      let touchesRoad = false;
      for (const edge of edgesForVertex) {
        if (this.hasRoad(edge)) {
          const owner = this.getRoadOwner(edge);
          if (owner && owner.hashCode() === civKey) {
            touchesRoad = true;
            break;
          }
        }
      }
      
      if (!touchesRoad) {
        continue;
      }
      
      // Vérifier que le vertex est à au moins 2 routes de distance d'une ville
      const distance = this.calculateVertexDistanceToCity(vertex, civId);
      if (distance !== undefined && distance >= 2) {
        buildableVertices.push(vertex);
      }
    }
    
    return buildableVertices;
  }

  /**
   * Met à jour les distances de toutes les routes à la ville la plus proche pour une civilisation donnée.
   * Utilise un algorithme BFS pour calculer les distances depuis les villes.
   * @param civId - L'identifiant de la civilisation
   */
  private updateRoadDistances(civId: CivilizationId): void {
    const civKey = civId.hashCode();
    
    // Réinitialiser les distances pour toutes les routes de cette civilisation
    const civRoads = this.getRoadsForCivilization(civId);
    for (const road of civRoads) {
      this.roadDistanceToCity.delete(road.hashCode());
    }

    // Étape 1: Trouver toutes les routes qui touchent directement une ville de la civilisation (distance = 1)
    const queue: Array<{ edge: Edge; distance: number }> = [];
    const processed = new Set<string>();

    for (const road of civRoads) {
      const vertices = this.getVerticesForEdge(road);
      let touchesCity = false;
      
      for (const vertex of vertices) {
        // Vérifier que tous les hexagones du vertex existent
        const vertexHexes = vertex.getHexes();
        const allVertexHexesExist = vertexHexes.every(h => this.grid.hasHex(h));
        if (!allVertexHexesExist) {
          continue;
        }
        
        if (this.hasCity(vertex)) {
          const owner = this.getCityOwner(vertex);
          if (owner && owner.hashCode() === civKey) {
            touchesCity = true;
            break;
          }
        }
      }
      
      if (touchesCity) {
        const roadKey = road.hashCode();
        this.roadDistanceToCity.set(roadKey, 1);
        queue.push({ edge: road, distance: 1 });
        processed.add(roadKey);
      }
    }

    // Étape 2: Propager les distances avec BFS
    while (queue.length > 0) {
      const { edge: currentRoad, distance: currentDistance } = queue.shift()!;
      const adjacentEdges = this.getAdjacentEdges(currentRoad);
      
      for (const adjacentEdge of adjacentEdges) {
        const adjRoadKey = adjacentEdge.hashCode();
        const adjOwner = this.getRoadOwner(adjacentEdge);
        
        // Ignorer les routes qui ne sont pas de la même civilisation ou déjà traitées
        if (!adjOwner || adjOwner.hashCode() !== civKey || processed.has(adjRoadKey)) {
          continue;
        }
        
        // Vérifier que l'edge adjacent existe vraiment dans la grille
        const [adjHex1, adjHex2] = adjacentEdge.getHexes();
        if (!this.grid.hasHex(adjHex1) || !this.grid.hasHex(adjHex2)) {
          continue;
        }
        
        // Ignorer les edges adjacents entre deux hexagones d'eau (mais autoriser terre-eau)
        const adjHex1Type = this.getHexType(adjHex1);
        const adjHex2Type = this.getHexType(adjHex2);
        if (adjHex1Type === HexType.Water && adjHex2Type === HexType.Water) {
          continue;
        }
        
        const newDistance = currentDistance + 1;
        const existingDistance = this.roadDistanceToCity.get(adjRoadKey);
        
        // Mettre à jour seulement si la nouvelle distance est meilleure (plus petite)
        if (existingDistance === undefined || newDistance < existingDistance) {
          this.roadDistanceToCity.set(adjRoadKey, newDistance);
          queue.push({ edge: adjacentEdge, distance: newDistance });
        }
        processed.add(adjRoadKey);
      }
    }
  }

  /** Format sérialisé de la carte (pour GameMap.serialize). */
  serialize(): {
    grid: { hexes: [number, number][] };
    hexTypes: Record<string, string>;
    civilizations: string[];
    cities: CitySerialized[];
    roads: { edge: [[number, number], [number, number]]; owner: string }[];
  } {
    const roads: { edge: [[number, number], [number, number]]; owner: string }[] = [];
    for (const s of this.getRegisteredCivilizationValues()) {
      const civId = CivilizationId.create(s);
      for (const edge of this.getRoadsForCivilization(civId)) {
        roads.push({ edge: edge.serialize(), owner: s });
      }
    }
    return {
      grid: this.grid.serialize(),
      hexTypes: Object.fromEntries(this.hexTypeMap),
      civilizations: this.getRegisteredCivilizationValues(),
      cities: [...this.cityMap.values()].map((c) => c.serialize()),
      roads,
    };
  }

  /** Désérialise depuis l'objet produit par serialize. */
  static deserialize(
    data: {
      grid: { hexes: [number, number][] };
      hexTypes: Record<string, string>;
      civilizations: string[];
      cities: CitySerialized[];
      roads: { edge: [[number, number], [number, number]]; owner: string }[];
    }
  ): GameMap {
    const grid = HexGrid.deserialize(data.grid);
    const map = new GameMap(grid);
    for (const [key, type] of Object.entries(data.hexTypes)) {
      const [q, r] = key.split(',').map(Number);
      map.setHexType(HexCoord.deserialize([q, r]), type as HexType);
    }
    for (const s of data.civilizations) {
      map.registerCivilization(CivilizationId.deserialize(s));
    }
    for (const c of data.cities) {
      const v = Vertex.deserialize(c.vertex);
      const owner = CivilizationId.deserialize(c.owner);
      // Le niveau est dérivé du TownHall dans la liste de bâtiments
      map.addCity(v, owner, CityLevel.Outpost);
      const city = map.getCity(v)!;
      for (const b of c.buildings) {
        // Nouveau format uniquement: BuildingSerialized
        const specialization = b.specialization ? (b.specialization as ResourceType) : undefined;
        city.addBuildingWithLevel(b.type as BuildingType, b.level, specialization);
        if (b.productionTimeSeconds !== undefined) {
          city.getBuilding(b.type as BuildingType)?.setProductionTimeSeconds(b.productionTimeSeconds);
        }
      }
    }
    for (const r of data.roads) {
      map.addRoad(Edge.deserialize(r.edge), CivilizationId.deserialize(r.owner));
    }
    return map;
  }
}