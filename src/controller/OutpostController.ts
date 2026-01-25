import { Vertex } from '../model/hex/Vertex';
import { IslandMap } from '../model/map/IslandMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { ResourceType } from '../model/map/ResourceType';
import { PlayerResources } from '../model/game/PlayerResources';
import { CityLevel } from '../model/city/CityLevel';

/**
 * Contrôleur pour gérer la construction d'avant-postes.
 * 
 * Un avant-poste peut être construit si :
 * - Le vertex n'a pas déjà de ville
 * - Le vertex touche une route de la civilisation
 * - Le vertex est à au moins 2 routes de distance d'une ville existante de la même civilisation
 */
export class OutpostController {
  /**
   * Coût de base pour construire un avant-poste (multiplié par le nombre de villes).
   */
  private static readonly BASE_COST = new Map<ResourceType, number>([
    [ResourceType.Wood, 10],
    [ResourceType.Brick, 10],
    [ResourceType.Wheat, 10],
    [ResourceType.Sheep, 10],
  ]);

  /**
   * Vérifie si un avant-poste peut être construit sur un vertex.
   * @param vertex - Le vertex où construire l'avant-poste
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns true si l'avant-poste peut être construit
   */
  static canBuildOutpost(
    vertex: Vertex,
    civId: CivilizationId,
    map: IslandMap
  ): boolean {
    // Vérifier que la civilisation est enregistrée
    if (!map.isCivilizationRegistered(civId)) {
      return false;
    }

    // Vérifier qu'il n'y a pas déjà une ville sur ce vertex
    if (map.hasCity(vertex)) {
      return false;
    }

    // Vérifier que le vertex touche au moins une route de la civilisation
    const edgesForVertex = map.getEdgesForVertex(vertex);
    let touchesRoad = false;
    for (const edge of edgesForVertex) {
      if (map.hasRoad(edge)) {
        const owner = map.getRoadOwner(edge);
        if (owner && owner.equals(civId)) {
          touchesRoad = true;
          break;
        }
      }
    }

    if (!touchesRoad) {
      return false;
    }

    // Vérifier que le vertex est à au moins 2 routes de distance d'une ville
    const distance = map.calculateVertexDistanceToCity(vertex, civId);
    if (distance === undefined || distance < 2) {
      return false;
    }

    return true;
  }

  /**
   * Calcule le coût de construction d'un avant-poste en fonction du nombre de villes.
   * @param cityCount - Le nombre de villes existantes sur la carte
   * @returns Le coût sous forme de Map
   */
  static getBuildableOutpostCost(cityCount: number): Map<ResourceType, number> {
    const cost = new Map<ResourceType, number>();
    
    for (const [resourceType, baseAmount] of this.BASE_COST.entries()) {
      cost.set(resourceType, baseAmount * cityCount);
    }
    
    return cost;
  }

  /**
   * Vérifie si le joueur a assez de ressources pour construire un avant-poste.
   * @param resources - Les ressources du joueur
   * @param cityCount - Le nombre de villes existantes sur la carte
   * @returns true si le joueur a assez de ressources
   */
  static canAfford(resources: PlayerResources, cityCount: number): boolean {
    const cost = this.getBuildableOutpostCost(cityCount);
    return resources.canAfford(cost);
  }

  /**
   * Construit un avant-poste sur un vertex.
   * @param vertex - Le vertex où construire l'avant-poste
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @throws Error si la construction n'est pas possible ou si les ressources sont insuffisantes
   */
  static buildOutpost(
    vertex: Vertex,
    civId: CivilizationId,
    map: IslandMap,
    resources: PlayerResources
  ): void {
    // Vérifier que la construction est possible
    if (!this.canBuildOutpost(vertex, civId, map)) {
      throw new Error(
        `L'avant-poste ne peut pas être construit sur le vertex ${vertex.toString()}. ` +
        `Le vertex doit toucher une route de la civilisation et être à au moins 2 routes de distance d'une ville.`
      );
    }

    // Calculer le coût en fonction du nombre de villes
    const cityCount = map.getCityCount();
    const cost = this.getBuildableOutpostCost(cityCount);

    // Vérifier que le joueur a assez de ressources
    if (!this.canAfford(resources, cityCount)) {
      const woodCost = cost.get(ResourceType.Wood) || 0;
      const brickCost = cost.get(ResourceType.Brick) || 0;
      const wheatCost = cost.get(ResourceType.Wheat) || 0;
      const sheepCost = cost.get(ResourceType.Sheep) || 0;
      throw new Error(
        `Pas assez de ressources pour construire un avant-poste. ` +
        `Requis: ${woodCost} Bois, ${brickCost} Brique, ${wheatCost} Blé, ${sheepCost} Mouton (${cityCount} ville${cityCount > 1 ? 's' : ''}).`
      );
    }

    // Retirer les ressources
    resources.payCost(cost);

    // Construire la ville de niveau Outpost
    map.addCity(vertex, civId, CityLevel.Outpost);
  }
}
