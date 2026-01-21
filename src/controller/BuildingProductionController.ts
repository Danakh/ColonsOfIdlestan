import { GameMap } from '../model/map/GameMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { PlayerResources } from '../model/game/PlayerResources';
import { GameClock } from '../model/game/GameClock';
import { City } from '../model/city/City';
import { BuildingType, getRequiredHexType } from '../model/city/BuildingType';
import { HexType } from '../model/map/HexType';
import { HexCoord } from '../model/hex/HexCoord';
import { Vertex } from '../model/hex/Vertex';
import { ResourceHarvest } from '../model/game/ResourceHarvest';
import { ResourceType } from '../model/map/ResourceType';

/**
 * Résultat d'une production automatique d'un bâtiment.
 */
export interface BuildingProductionResult {
  /** La ville qui a produit */
  cityVertex: Vertex;
  /** Le type de bâtiment qui a produit */
  buildingType: BuildingType;
  /** L'hexagone récolté */
  hexCoord: HexCoord;
  /** Le type de ressource récoltée */
  resourceType: ResourceType;
}

/**
 * Contrôleur pour gérer la production automatique des bâtiments de ressources.
 * 
 * Les bâtiments de ressources produisent automatiquement des ressources
 * en récoltant les hexagones adjacents du bon type lorsque l'intervalle de production est écoulé.
 * Utilise GameClock pour gérer le temps de manière indépendante de la vitesse d'exécution.
 */
export class BuildingProductionController {
  /**
   * Intervalle de base entre deux productions pour un bâtiment (en secondes).
   */
  private static readonly BASE_PRODUCTION_INTERVAL_SECONDS = 1.0;

  /**
   * Facteur de réduction du temps de production par niveau (0.8 = -20% par niveau).
   */
  private static readonly LEVEL_TIME_REDUCTION_FACTOR = 0.8;

  /**
   * Calcule l'intervalle de production pour un bâtiment en fonction de son niveau.
   * Formule: intervalle_base * 0.8^(niveau-1)
   * @param buildingLevel - Le niveau du bâtiment (1 = niveau de base)
   * @returns L'intervalle de production en secondes
   */
  static getProductionInterval(buildingLevel: number): number {
    return this.BASE_PRODUCTION_INTERVAL_SECONDS * Math.pow(this.LEVEL_TIME_REDUCTION_FACTOR, buildingLevel - 1);
  }

  /**
   * Traite la production automatique pour toutes les villes d'une civilisation.
   * Pour chaque bâtiment de ressource, vérifie les hexagones adjacents et récolte
   * ceux qui sont prêts (intervalle de production écoulé + conditions de récolte).
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param gameClock - L'horloge de jeu pour gérer le temps
   * @returns Liste des productions effectuées (pour notifier la vue)
   */
  static processAutomaticProduction(
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources,
    gameClock: GameClock
  ): BuildingProductionResult[] {
    const results: BuildingProductionResult[] = [];
    
    // Obtenir toutes les villes de la civilisation
    const cities = map.getCitiesByCivilization(civId);
    
    // Pour chaque ville
    for (const city of cities) {
      const cityResults = this.processCityProduction(city, civId, map, resources, gameClock);
      results.push(...cityResults);
    }
    
    return results;
  }

  /**
   * Traite la production automatique pour une ville donnée.
   * 
   * @param city - La ville à traiter
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param gameClock - L'horloge de jeu pour gérer le temps
   * @returns Liste des productions effectuées pour cette ville
   */
  private static processCityProduction(
    city: City,
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources,
    gameClock: GameClock
  ): BuildingProductionResult[] {
    const results: BuildingProductionResult[] = [];
    
    // Obtenir les bâtiments de production de ressources construits dans cette ville
    const productionBuildings = city.getProductionBuildings();
    
    for (const building of productionBuildings) {
      const buildingType = building.type;
      
      // Obtenir le type d'hex requis pour ce bâtiment
      const requiredHexType = getRequiredHexType(buildingType);
      if (requiredHexType === null) {
        continue; // Ne devrait pas arriver pour les bâtiments de ressources
      }
      
      // Vérifier si le temps de production est écoulé
      const currentTime = gameClock.getCurrentTime();
      const lastProductionTime = building.getProductionTimeSeconds();
      
      // Si le bâtiment n'a jamais produit, initialiser son temps de production au temps actuel
      if (lastProductionTime === undefined) {
        building.setProductionTimeSeconds(currentTime);
        continue; // Ne pas produire immédiatement à la construction
      }
      
      // Calculer le temps écoulé depuis la dernière production
      const timeElapsed = currentTime - lastProductionTime;
      
      // Calculer l'intervalle de production basé sur le niveau du bâtiment
      const productionInterval = this.getProductionInterval(building.level);
      
      // Vérifier si l'intervalle de production est écoulé
      if (timeElapsed < productionInterval) {
        // Pas encore le temps de produire
        continue;
      }
      
      // Trouver les hexagones adjacents du bon type
      const adjacentHexes = this.getAdjacentHexesOfType(city.vertex, requiredHexType, map);
      
      // Pour chaque hex adjacent, vérifier s'il peut être récolté automatiquement
      for (const hexCoord of adjacentHexes) {
        // Vérifier que la récolte est possible (visible, etc.)
        if (!ResourceHarvest.canHarvest(hexCoord, map, civId)) {
          continue;
        }
        
        // Vérifier que l'hex a bien le type requis (double vérification)
        const hexType = map.getHexType(hexCoord);
        if (hexType !== requiredHexType) {
          continue;
        }
        
        // Effectuer la récolte directement (sans passer par ResourceHarvestController pour éviter le cooldown)
        // Passer le vertex de la ville pour permettre à plusieurs villes de récolter le même hex
        try {
          const harvestResult = ResourceHarvest.harvest(hexCoord, map, civId, resources, city.vertex);
          
          // Convertir le type d'hex en type de ressource
          const resourceType = ResourceHarvest.hexTypeToResourceType(hexType);
          if (resourceType) {
            // Calculer le nouveau temps de production : ancien temps + intervalle (basé sur le niveau)
            // Cela garantit que la production respecte l'intervalle calculé selon le niveau
            const newProductionTime = lastProductionTime + productionInterval;
            building.updateProductionTimeSeconds(newProductionTime);
            
            results.push({
              cityVertex: city.vertex,
              buildingType,
              hexCoord,
              resourceType,
            });
          }
        } catch (error) {
          // Si la récolte échoue (par exemple hex non visible), continuer avec le suivant
          continue;
        }
        
        // On arrête après la première récolte réussie pour ce bâtiment
        // (un bâtiment ne peut produire qu'à partir d'un hex à la fois)
        break;
      }
    }
    
    return results;
  }

  /**
   * Retourne les hexagones adjacents à un vertex qui ont le type requis.
   * Un hexagone est adjacent à un vertex s'il fait partie des 3 hexagones qui forment le vertex.
   * 
   * @param vertex - Le vertex (ville)
   * @param hexType - Le type d'hex recherché
   * @param map - La carte de jeu
   * @returns Liste des hexagones adjacents du type requis
   */
  private static getAdjacentHexesOfType(
    vertex: Vertex,
    hexType: HexType,
    map: GameMap
  ): HexCoord[] {
    const matchingHexes: HexCoord[] = [];
    
    // Obtenir les 3 hexagones qui forment le vertex
    const hexes = vertex.getHexes();
    
    // Vérifier chaque hexagone
    for (const hexCoord of hexes) {
      // Vérifier que l'hex existe dans la grille
      if (!map.getGrid().hasHex(hexCoord)) {
        continue;
      }
      
      // Vérifier le type
      const hexTypeInMap = map.getHexType(hexCoord);
      if (hexTypeInMap === hexType) {
        matchingHexes.push(hexCoord);
      }
    }
    
    return matchingHexes;
  }

  /**
   * Vérifie si un hexagone est automatiquement récolté par un bâtiment.
   * Un hex est automatiquement récolté s'il est adjacent à une ville qui a un bâtiment
   * de production de ressources capable de récolter ce type d'hex.
   * 
   * @param hexCoord - L'hexagone à vérifier
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns true si l'hex est automatiquement récolté
   */
  static isHexAutoHarvested(hexCoord: HexCoord, civId: CivilizationId, map: GameMap): boolean {
    // Obtenir le type de l'hex
    const hexType = map.getHexType(hexCoord);
    if (!hexType) {
      return false;
    }

    // Obtenir les vertices adjacents à cet hex
    const grid = map.getGrid();
    const vertices = grid.getVertices(hexCoord);
    
    // Vérifier chaque vertex adjacent
    for (const vertex of vertices) {
      // Vérifier si une ville existe sur ce vertex
      const city = map.getCity(vertex);
      if (!city || !city.owner.equals(civId)) {
        continue;
      }

      // Obtenir les bâtiments de production de ressources de cette ville
      const productionBuildings = city.getProductionBuildings();
      
      // Vérifier si un bâtiment peut récolter cet hex
      for (const building of productionBuildings) {
        // Vérifier si ce bâtiment récolte ce type d'hex
        const requiredHexType = getRequiredHexType(building.type);
        if (requiredHexType === hexType) {
          // Vérifier que l'hex est bien adjacent au vertex de la ville
          const vertexHexes = vertex.getHexes();
          if (vertexHexes.some(h => h.equals(hexCoord))) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
}
