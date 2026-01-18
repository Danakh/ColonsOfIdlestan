import { BuildingType, getBuildingCost } from '../model/city/BuildingType';
import { City } from '../model/city/City';
import { GameMap } from '../model/map/GameMap';
import { Vertex } from '../model/hex/Vertex';
import { PlayerResources } from '../model/game/PlayerResources';
import { ResourceType } from '../model/map/ResourceType';

/**
 * Statut d'un bâtiment constructible avec vérification des ressources.
 */
export interface BuildableBuildingStatus {
  /** Le type de bâtiment */
  buildingType: BuildingType;
  /** true si la ville peut construire ET le joueur a les ressources */
  canBuild: boolean;
  /** Le coût de construction */
  cost: Map<ResourceType, number>;
}

/**
 * Contrôleur pour gérer la construction de bâtiments avec consommation de ressources.
 * 
 * Cette classe orchestre la logique de construction de bâtiments en coordonnant
 * les vérifications métier (City.canBuildBuildingType) avec la consommation de ressources.
 */
export class BuildingController {
  /**
   * Vérifie si un bâtiment peut être construit dans une ville donnée.
   * Vérifie à la fois les conditions de la ville et les ressources disponibles.
   * 
   * @param buildingType - Le type de bâtiment à construire
   * @param city - La ville où construire
   * @param resources - Les ressources du joueur
   * @returns true si le bâtiment peut être construit
   */
  static canBuild(
    buildingType: BuildingType,
    city: City,
    resources: PlayerResources
  ): boolean {
    // Vérifier que la ville peut construire ce type de bâtiment
    if (!city.canBuildBuildingType(buildingType)) {
      return false;
    }

    // Vérifier que le joueur a assez de ressources
    const cost = getBuildingCost(buildingType);
    if (!resources.canAfford(cost)) {
      return false;
    }

    return true;
  }

  /**
   * Construit un bâtiment dans une ville.
   * Vérifie les conditions de construction et consomme les ressources nécessaires.
   * 
   * @param buildingType - Le type de bâtiment à construire
   * @param city - La ville où construire
   * @param map - La carte de jeu
   * @param vertex - Le sommet de la ville
   * @param resources - Les ressources du joueur
   * @throws Error si la construction n'est pas possible ou si les ressources sont insuffisantes
   */
  static buildBuilding(
    buildingType: BuildingType,
    city: City,
    map: GameMap,
    vertex: Vertex,
    resources: PlayerResources
  ): void {
    // Vérifier que la ville peut construire ce type de bâtiment
    if (!city.canBuildBuildingType(buildingType)) {
      throw new Error(
        `Le bâtiment ${buildingType} ne peut pas être construit dans cette ville. ` +
        `La ville n'a peut-être pas le niveau requis ou a déjà atteint sa limite de bâtiments.`
      );
    }

    // Vérifier que le joueur a assez de ressources
    const cost = getBuildingCost(buildingType);
    if (!resources.canAfford(cost)) {
      throw new Error(
        `Pas assez de ressources pour construire ${buildingType}. ` +
        `Coût requis: ${this.formatCost(cost)}`
      );
    }

    // Retirer les ressources
    resources.payCost(cost);

    // Ajouter le bâtiment à la ville
    city.addBuilding(buildingType);
  }

  /**
   * Retourne la liste des bâtiments constructibles avec leur statut (affordable ou non).
   * 
   * @param city - La ville
   * @param resources - Les ressources du joueur
   * @returns Un tableau des bâtiments constructibles avec leur statut
   */
  static getBuildableBuildingsWithStatus(
    city: City,
    resources: PlayerResources
  ): BuildableBuildingStatus[] {
    const buildableBuildings = city.getBuildableBuildings();
    const statusList: BuildableBuildingStatus[] = [];

    for (const buildingType of buildableBuildings) {
      const cost = getBuildingCost(buildingType);
      const canBuild = this.canBuild(buildingType, city, resources);

      statusList.push({
        buildingType,
        canBuild,
        cost,
      });
    }

    return statusList;
  }

  /**
   * Formate un coût en chaîne de caractères pour l'affichage.
   * @param cost - Le coût à formater
   * @returns Une chaîne formatée (ex: "3 Bois, 2 Brique")
   */
  private static formatCost(cost: Map<ResourceType, number>): string {
    const resourceNames: Record<ResourceType, string> = {
      [ResourceType.Wood]: 'Bois',
      [ResourceType.Brick]: 'Brique',
      [ResourceType.Wheat]: 'Blé',
      [ResourceType.Sheep]: 'Mouton',
      [ResourceType.Ore]: 'Minerai',
    };

    const parts: string[] = [];
    for (const [resource, amount] of cost.entries()) {
      parts.push(`${amount} ${resourceNames[resource]}`);
    }
    return parts.join(', ');
  }
}
