import { BuildingType, getBuildingCost, getRequiredHexType } from '../model/city/BuildingType';
import { City } from '../model/city/City';
import { GameMap } from '../model/map/GameMap';
import { Vertex } from '../model/hex/Vertex';
import { PlayerResources } from '../model/game/PlayerResources';
import { ResourceType } from '../model/map/ResourceType';
import { HexType } from '../model/map/HexType';

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
   * Vérifie à la fois les conditions de la ville, les ressources disponibles
   * et la présence d'un hex adjacent du type requis (pour les bâtiments de ressources).
   * 
   * @param buildingType - Le type de bâtiment à construire
   * @param city - La ville où construire
   * @param map - La carte de jeu (requis pour vérifier les hex adjacents)
   * @param vertex - Le sommet de la ville (requis pour vérifier les hex adjacents)
   * @param resources - Les ressources du joueur
   * @returns true si le bâtiment peut être construit
   */
  static canBuild(
    buildingType: BuildingType,
    city: City,
    map: GameMap,
    vertex: Vertex,
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

    // Vérifier la présence d'un hex adjacent du type requis (pour les bâtiments de ressources)
    const requiredHexType = getRequiredHexType(buildingType);
    if (requiredHexType !== null) {
      if (!this.hasAdjacentHexOfType(vertex, requiredHexType, map)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Vérifie si au moins un hexagone adjacent au vertex (formant la ville) a le type requis.
   * @param vertex - Le sommet de la ville
   * @param hexType - Le type d'hex requis
   * @param map - La carte de jeu
   * @returns true si au moins un hex adjacent a le type requis
   */
  private static hasAdjacentHexOfType(vertex: Vertex, hexType: HexType, map: GameMap): boolean {
    // Obtenir les 3 hexagones qui forment le vertex
    const hexes = vertex.getHexes();

    // Vérifier si au moins un de ces hexagones a le type requis
    for (const hexCoord of hexes) {
      // Vérifier que l'hex existe dans la grille
      if (!map.getGrid().hasHex(hexCoord)) {
        continue;
      }

      // Vérifier le type de l'hex
      const hexTypeInMap = map.getHexType(hexCoord);
      if (hexTypeInMap === hexType) {
        return true;
      }
    }

    return false;
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
    // Vérifier que le bâtiment peut être construit (inclut toutes les vérifications)
    if (!this.canBuild(buildingType, city, map, vertex, resources)) {
      // Construire un message d'erreur détaillé
      let errorMessage = `Le bâtiment ${buildingType} ne peut pas être construit dans cette ville. `;

      if (!city.canBuildBuildingType(buildingType)) {
        errorMessage += `La ville n'a peut-être pas le niveau requis ou a déjà atteint sa limite de bâtiments.`;
      } else {
        const buildingCost = getBuildingCost(buildingType);
        if (!resources.canAfford(buildingCost)) {
          errorMessage += `Coût requis: ${this.formatCost(buildingCost)}.`;
        } else {
          const requiredHexType = getRequiredHexType(buildingType);
          if (requiredHexType !== null && !this.hasAdjacentHexOfType(vertex, requiredHexType, map)) {
            errorMessage += `La ville doit avoir un hex adjacent de type ${requiredHexType}.`;
          }
        }
      }

      throw new Error(errorMessage);
    }

    // Retirer les ressources
    const buildingCost = getBuildingCost(buildingType);
    resources.payCost(buildingCost);

    // Ajouter le bâtiment à la ville
    city.addBuilding(buildingType);
  }

  /**
   * Retourne la liste des bâtiments constructibles avec leur statut (affordable ou non).
   * 
   * @param city - La ville
   * @param map - La carte de jeu (requis pour vérifier les hex adjacents)
   * @param vertex - Le sommet de la ville (requis pour vérifier les hex adjacents)
   * @param resources - Les ressources du joueur
   * @returns Un tableau des bâtiments constructibles avec leur statut
   */
  static getBuildableBuildingsWithStatus(
    city: City,
    map: GameMap,
    vertex: Vertex,
    resources: PlayerResources
  ): BuildableBuildingStatus[] {
    const buildableBuildings = city.getBuildableBuildings();
    const statusList: BuildableBuildingStatus[] = [];

    for (const buildingType of buildableBuildings) {
      // Vérifier si le bâtiment a un hex requis et si la ville en a un adjacent
      const requiredHexType = getRequiredHexType(buildingType);
      if (requiredHexType !== null) {
        // Pour les bâtiments de ressources, vérifier la présence de l'hex requis
        if (!this.hasAdjacentHexOfType(vertex, requiredHexType, map)) {
          // Ne pas inclure ce bâtiment dans la liste s'il n'a pas l'hex requis
          continue;
        }
      }

      const cost = getBuildingCost(buildingType);
      const canBuild = this.canBuild(buildingType, city, map, vertex, resources);

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
