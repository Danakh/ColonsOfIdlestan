import { HexCoord } from '../hex/HexCoord';
import { Vertex } from '../hex/Vertex';
import { ResourceType } from '../map/ResourceType';
import { HexType } from '../map/HexType';
import { IslandMap } from '../map/IslandMap';
import { CivilizationId } from '../map/CivilizationId';
import { PlayerResources } from './PlayerResources';
import { calculateInventoryCapacity } from './InventoryCapacity';
import { localize } from '../../i18n';

/**
 * Gère la logique de récolte de ressources par clic sur les hexagones.
 * 
 * Un hexagone est récoltable si :
 * - Il est adjacent à une ville du joueur (la ville est sur un vertex qui contient cet hexagone)
 * - Il est visible (déterminé par IslandMap.isHexVisible)
 * - Il contient une ressource récoltable (pas Desert ni Water)
 */
export class ResourceHarvest {
  /**
   * Convertit un HexType en ResourceType si c'est une ressource récoltable.
   * @param hexType - Le type d'hexagone
   * @returns Le ResourceType correspondant, ou null si non récoltable
   */
  static hexTypeToResourceType(hexType: HexType): ResourceType | null {
    switch (hexType) {
      case HexType.Wood:
        return ResourceType.Wood;
      case HexType.Brick:
        return ResourceType.Brick;
      case HexType.Wheat:
        return ResourceType.Wheat;
      case HexType.Sheep:
        return ResourceType.Sheep;
      case HexType.Ore:
        return ResourceType.Ore;
      default:
        return null;
    }
  }

  /**
   * Calcule le gain de ressource pour un hexagone donné.
   * Le gain de base est de 1 par hexagone, mais peut être modifié par des bonus futurs.
   * @param hexType - Le type d'hexagone
   * @returns La quantité de ressource gagnée (0 si non récoltable)
   */
  static calculateGain(hexType: HexType): number {
    // Pour l'instant, gain de base de 1 par hexagone
    // Peut être étendu avec des bonus de bâtiments plus tard
    return this.hexTypeToResourceType(hexType) !== null ? 1 : 0;
  }

  /**
   * Vérifie si un hexagone est adjacent à une ville du joueur.
   * Un hexagone est adjacent à une ville si la ville est sur un vertex qui contient cet hexagone.
   * @param hexCoord - La coordonnée de l'hexagone
   * @param islandMap - La carte de jeu
   * @param civId - L'identifiant de la civilisation du joueur
   * @returns true si l'hexagone est adjacent à au moins une ville du joueur
   */
  static isAdjacentToPlayerCity(
    hexCoord: HexCoord,
    islandMap: IslandMap,
    civId: CivilizationId
  ): boolean {
    return this.getAdjacentPlayerCity(hexCoord, islandMap, civId) !== null;
  }

  /**
   * Retourne la première ville du joueur adjacente à un hexagone.
   * Un hexagone est adjacent à une ville si la ville est sur un vertex qui contient cet hexagone.
   * @param hexCoord - La coordonnée de l'hexagone
   * @param islandMap - La carte de jeu
   * @param civId - L'identifiant de la civilisation du joueur
   * @returns Le vertex avec la ville adjacente, ou null si aucune ville adjacente
   */
  static getAdjacentPlayerCity(
    hexCoord: HexCoord,
    islandMap: IslandMap,
    civId: CivilizationId
  ): Vertex | null {
    const grid = islandMap.getGrid();
    
    // Obtenir tous les vertices qui touchent cet hexagone
    const vertices = grid.getVerticesForHex(hexCoord);
    
    // Retourner la première ville appartenant au joueur
    for (const vertex of vertices) {
      if (islandMap.hasCity(vertex)) {
        const owner = islandMap.getCityOwner(vertex);
        if (owner && owner.equals(civId)) {
          return vertex;
        }
      }
    }
    
    return null;
  }

  /**
   * Vérifie si un hexagone peut être récolté par le joueur.
   * @param hexCoord - La coordonnée de l'hexagone
   * @param islandMap - La carte de jeu
   * @param civId - L'identifiant de la civilisation du joueur
   * @returns true si l'hexagone est récoltable
   */
  static canHarvest(
    hexCoord: HexCoord,
    islandMap: IslandMap,
    civId: CivilizationId
  ): boolean {
    // Vérifier que l'hexagone existe dans la grille
    const grid = islandMap.getGrid();
    if (!grid.hasHex(hexCoord)) {
      return false;
    }

    // Vérifier que l'hexagone est visible
    if (!islandMap.isHexVisible(hexCoord)) {
      return false;
    }

    // Vérifier que l'hexagone est adjacent à une ville du joueur
    if (!this.isAdjacentToPlayerCity(hexCoord, islandMap, civId)) {
      return false;
    }

    // Vérifier que l'hexagone contient une ressource récoltable
    const hexType = islandMap.getHexType(hexCoord);
    if (!hexType) {
      return false;
    }

    // Vérifier si le type d'hexagone est une ressource récoltable
    return this.hexTypeToResourceType(hexType) !== null;
  }

  /**
   * Récolte les ressources d'un hexagone et les ajoute à l'inventaire du joueur.
   * @param hexCoord - La coordonnée de l'hexagone à récolter
   * @param islandMap - La carte de jeu
   * @param civId - L'identifiant de la civilisation du joueur
   * @param playerResources - L'inventaire du joueur
   * @param cityVertex - Optionnel: le vertex de la ville qui récolte. Si fourni, cette ville sera utilisée au lieu de chercher automatiquement.
   * @returns Un objet contenant la quantité récoltée, la ville qui a permis la récolte, la ressource récoltée et si la capacité max a été atteinte
   * @throws Error si l'hexagone ne peut pas être récolté
   */
  static harvest(
    hexCoord: HexCoord,
    islandMap: IslandMap,
    civId: CivilizationId,
    playerResources: PlayerResources,
    cityVertex?: Vertex,
    resourceMultiplier?: number
  ): { gain: number; cityVertex: Vertex; resourceType: ResourceType | null; capacityReached: boolean } {
    // Si un vertex est fourni, vérifier qu'il est valide et adjacent à l'hex
    let actualCityVertex: Vertex | null = null;
    
    if (cityVertex !== undefined) {
      // Vérifier que le vertex fourni est bien adjacent à l'hex
      const vertexHexes = cityVertex.getHexes();
      const isAdjacent = vertexHexes.some(h => h.equals(hexCoord));
      
      if (!isAdjacent) {
        throw new Error(localize('resourceHarvest.vertexNotAdjacent', { coord: hexCoord.toString() }));
      }
      
      // Vérifier que le vertex a une ville appartenant à la civilisation
      if (!islandMap.hasCity(cityVertex)) {
        throw new Error(localize('resourceHarvest.noCityOnVertex', { coord: hexCoord.toString() }));
      }
      
      const owner = islandMap.getCityOwner(cityVertex);
      if (!owner || !owner.equals(civId)) {
        throw new Error(localize('resourceHarvest.cityNotOwned', { coord: hexCoord.toString() }));
      }
      
      actualCityVertex = cityVertex;
    } else {
      // Comportement par défaut: chercher la première ville adjacente
      // Vérifier que la récolte est possible
      if (!this.canHarvest(hexCoord, islandMap, civId)) {
        throw new Error(localize('resourceHarvest.cannotHarvest', { coord: hexCoord.toString() }));
      }

      // Obtenir la ville adjacente qui permet la récolte
      actualCityVertex = this.getAdjacentPlayerCity(hexCoord, islandMap, civId);
      if (!actualCityVertex) {
        throw new Error(localize('resourceHarvest.noAdjacentCity', { coord: hexCoord.toString() }));
      }
    }
    
    // Vérifier que l'hex est visible et récoltable
    const grid = islandMap.getGrid();
    if (!grid.hasHex(hexCoord)) {
      throw new Error(localize('resourceHarvest.hexNotExist', { coord: hexCoord.toString() }));
    }

    if (!islandMap.isHexVisible(hexCoord)) {
      throw new Error(localize('resourceHarvest.hexNotVisible', { coord: hexCoord.toString() }));
    }

    // Obtenir le type d'hexagone
    const hexType = islandMap.getHexType(hexCoord);
    if (!hexType) {
      throw new Error(localize('resourceHarvest.noHexType', { coord: hexCoord.toString() }));
    }

    // Convertir en ResourceType
    const resourceType = this.hexTypeToResourceType(hexType);
    if (!resourceType) {
      throw new Error(localize('resourceHarvest.notResource', { coord: hexCoord.toString() }));
    }

    // Calculer le gain de base
    const baseGain = this.calculateGain(hexType);
    const multiplier = resourceMultiplier ?? 1;
    const gain = Math.floor(baseGain * multiplier);

    if (gain > 0) {
      // Calculer la capacité d'inventaire maximale
      const maxCapacity = calculateInventoryCapacity(islandMap, civId);
      
      // Ajouter la ressource à l'inventaire avec limitation de capacité
      const actualGain = playerResources.addResourceCapped(resourceType, gain, maxCapacity);
      const capacityReached = actualGain < gain;
      
      return {
        gain: actualGain,
        cityVertex: actualCityVertex,
        resourceType,
        capacityReached,
      };
    }

    return {
      gain: 0,
      cityVertex: actualCityVertex,
      resourceType: null,
      capacityReached: false,
    };
  }
}
