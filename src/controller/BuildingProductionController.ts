import { GameMap } from '../model/map/GameMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { PlayerResources } from '../model/game/PlayerResources';
import { City } from '../model/city/City';
import { BuildingType, getRequiredHexType, getResourceProductionBuildings } from '../model/city/BuildingType';
import { HexType } from '../model/map/HexType';
import { HexCoord } from '../model/hex/HexCoord';
import { Vertex } from '../model/hex/Vertex';
import { ResourceHarvestController, HarvestResult } from './ResourceHarvestController';
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
 * en récoltant les hexagones adjacents du bon type lorsque le cooldown est passé.
 */
export class BuildingProductionController {
  /**
   * Traite la production automatique pour toutes les villes d'une civilisation.
   * Pour chaque bâtiment de ressource, vérifie les hexagones adjacents et récolte
   * ceux qui sont prêts (cooldown passé + conditions de récolte).
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @returns Liste des productions effectuées (pour notifier la vue)
   */
  static processAutomaticProduction(
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources
  ): BuildingProductionResult[] {
    const results: BuildingProductionResult[] = [];
    
    // Obtenir toutes les villes de la civilisation
    const cities = map.getCitiesByCivilization(civId);
    
    // Pour chaque ville
    for (const city of cities) {
      const cityResults = this.processCityProduction(city, civId, map, resources);
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
   * @returns Liste des productions effectuées pour cette ville
   */
  private static processCityProduction(
    city: City,
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources
  ): BuildingProductionResult[] {
    const results: BuildingProductionResult[] = [];
    
    // Obtenir les bâtiments de production de ressources construits dans cette ville
    const resourceBuildings = getResourceProductionBuildings();
    const cityBuildings = city.getBuildings();
    
    for (const buildingType of cityBuildings) {
      // Vérifier si c'est un bâtiment de production de ressources
      if (!resourceBuildings.includes(buildingType)) {
        continue;
      }
      
      // Obtenir le type d'hex requis pour ce bâtiment
      const requiredHexType = getRequiredHexType(buildingType);
      if (requiredHexType === null) {
        continue; // Ne devrait pas arriver pour les bâtiments de ressources
      }
      
      // Trouver les hexagones adjacents du bon type
      const adjacentHexes = this.getAdjacentHexesOfType(city.vertex, requiredHexType, map);
      
      // Pour chaque hex adjacent, vérifier s'il peut être récolté automatiquement
      for (const hexCoord of adjacentHexes) {
        // Vérifier si le cooldown est passé (ou n'existe pas)
        const remainingCooldown = ResourceHarvestController.getRemainingCooldown(hexCoord);
        if (remainingCooldown > 0) {
          // Le cooldown n'est pas encore passé, passer au suivant
          continue;
        }
        
        // Vérifier que la récolte est possible (visible, etc.)
        if (!ResourceHarvest.canHarvest(hexCoord, map, civId)) {
          continue;
        }
        
        // Vérifier que l'hex a bien le type requis (double vérification)
        const hexType = map.getHexType(hexCoord);
        if (hexType !== requiredHexType) {
          continue;
        }
        
        // Effectuer la récolte via le contrôleur (qui gère le cooldown)
        const harvestResult: HarvestResult = ResourceHarvestController.harvest(
          hexCoord,
          civId,
          map,
          resources
        );
        
        if (harvestResult.success && harvestResult.cityVertex) {
          // Convertir le type d'hex en type de ressource
          const resourceType = ResourceHarvest.hexTypeToResourceType(hexType);
          if (resourceType) {
            results.push({
              cityVertex: harvestResult.cityVertex,
              buildingType,
              hexCoord,
              resourceType,
            });
          }
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
}
