import { BuildingType, getBuildingCost, getRequiredHexType } from '../model/city/BuildingType';
import { City } from '../model/city/City';
import { CityLevel } from '../model/city/CityLevel';
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
  /** true si le bâtiment est bloqué uniquement par la limite de bâtiments */
  blockedByBuildingLimit: boolean;
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
   * Vérifie si un bâtiment peut être amélioré ET si le joueur a les ressources.
   * @param buildingType - Le type de bâtiment
   * @param city - La ville
   * @param resources - Les ressources du joueur
   * @returns true si l'amélioration est possible
   */
  static canUpgrade(
    buildingType: BuildingType,
    city: City,
    resources: PlayerResources
  ): boolean {
    const building = city.getBuilding(buildingType);
    if (!building) {
      return false;
    }
    if (!building.canUpgrade()) {
      return false;
    }
    const cost = building.getUpgradeCost();
    return resources.canAfford(cost);
  }

  /**
   * Améliore un bâtiment en consommant les ressources nécessaires.
   * @param buildingType - Le type de bâtiment à améliorer
   * @param city - La ville
   * @param resources - Les ressources du joueur
   * @throws Error si l'amélioration est impossible ou si les ressources sont insuffisantes
   */
  static upgradeBuilding(
    buildingType: BuildingType,
    city: City,
    resources: PlayerResources
  ): void {
    const building = city.getBuilding(buildingType);
    if (!building) {
      throw new Error(`Le bâtiment ${buildingType} n'est pas construit dans cette ville.`);
    }
    if (!building.canUpgrade()) {
      throw new Error(`Le bâtiment ${buildingType} est déjà au niveau maximum (${building.getMaxLevel()}).`);
    }

    const cost = building.getUpgradeCost();
    if (!resources.canAfford(cost)) {
      throw new Error(`Ressources insuffisantes. Coût requis: ${this.formatCost(cost)}.`);
    }

    resources.payCost(cost);
    city.upgradeBuilding(buildingType);
  }

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
    // Obtenir tous les types de bâtiments (pas seulement ceux dans getBuildableBuildings)
    // pour inclure ceux qui sont bloqués par la limite
    const allBuildingTypes = BuildingType;
    const allTypes = Object.values(allBuildingTypes) as BuildingType[];
    const statusList: BuildableBuildingStatus[] = [];

    for (const buildingType of allTypes) {
      // Ne pas inclure les bâtiments déjà construits
      if (city.hasBuilding(buildingType)) {
        continue;
      }

      // Vérifier si le bâtiment peut être construit du point de vue de la ville (niveau suffisant)
      // Note: Cette vérification n'inclut pas la limite, qui sera vérifiée séparément
      const cityCanBuildType = city.canBuildBuildingType(buildingType);
      
      // Vérifier si le bâtiment a un hex requis et si la ville en a un adjacent
      const requiredHexType = getRequiredHexType(buildingType);
      if (requiredHexType !== null) {
        if (!this.hasAdjacentHexOfType(vertex, requiredHexType, map)) {
          // Ne pas inclure ce bâtiment dans la liste s'il n'a pas l'hex requis
          continue;
        }
      }

      // Vérifier le niveau requis séparément (sans tenir compte de la limite)
      const levelIsSufficient = this.checkBuildingLevelRequirement(buildingType, city);
      if (!levelIsSufficient) {
        // Niveau insuffisant, ne pas afficher
        continue;
      }

      const cost = getBuildingCost(buildingType);
      const canBuild = this.canBuild(buildingType, city, map, vertex, resources);
      
      // Déterminer si le blocage est uniquement dû à la limite de bâtiments
      // Pour cela, vérifier si toutes les autres conditions sont remplies
      const cityCanBuildAny = city.canBuildBuilding();
      const hasResources = resources.canAfford(cost);
      const hasHex = requiredHexType === null || this.hasAdjacentHexOfType(vertex, requiredHexType, map);
      
      // Le bâtiment est bloqué par la limite si :
      // - Le niveau est suffisant (déjà vérifié ci-dessus)
      // - L'hex requis est présent (ou pas d'hex requis)
      // - Les ressources sont suffisantes
      // - Mais la ville ne peut pas construire (limite atteinte)
      const blockedByBuildingLimit = hasHex && hasResources && !cityCanBuildAny && !canBuild;

      statusList.push({
        buildingType,
        canBuild,
        blockedByBuildingLimit,
        cost,
      });
    }

    return statusList;
  }

  /**
   * Vérifie si le niveau de la ville est suffisant pour construire un bâtiment.
   * @param buildingType - Le type de bâtiment
   * @param city - La ville
   * @returns true si le niveau est suffisant
   */
  private static checkBuildingLevelRequirement(buildingType: BuildingType, city: City): boolean {
    // Vérifier le niveau requis sans tenir compte de la limite ou du fait qu'il est déjà construit
    switch (buildingType) {
      case BuildingType.Seaport:
      case BuildingType.Warehouse:
      case BuildingType.Forge:
      case BuildingType.Library:
        return city.level >= CityLevel.Town;
      case BuildingType.Temple:
        return city.level >= CityLevel.Metropolis;
      case BuildingType.Market:
      case BuildingType.TownHall:
        return city.level >= CityLevel.Outpost;
      case BuildingType.Sawmill:
      case BuildingType.Brickworks:
      case BuildingType.Mill:
      case BuildingType.Sheepfold:
      case BuildingType.Mine:
        return city.level >= CityLevel.Colony;
      default:
        return false;
    }
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
