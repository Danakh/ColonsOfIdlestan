import { GameMap } from '../../src/model/map/GameMap';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { PlayerResources } from '../../src/model/game/PlayerResources';
import { GameClock } from '../../src/model/game/GameClock';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { Edge } from '../../src/model/hex/Edge';
import { Vertex } from '../../src/model/hex/Vertex';
import { ResourceType } from '../../src/model/map/ResourceType';
import { ResourceHarvestController } from '../../src/controller/ResourceHarvestController';
import { TradeController } from '../../src/controller/TradeController';
import { BuildingProductionController } from '../../src/controller/BuildingProductionController';
import { RoadController } from '../../src/controller/RoadController';
import { RoadConstruction } from '../../src/model/game/RoadConstruction';
import { OutpostController } from '../../src/controller/OutpostController';
import { BuildingController } from '../../src/controller/BuildingController';
import { BuildingType, getBuildingCost, getRequiredHexType } from '../../src/model/city/BuildingType';
import { calculateInventoryCapacity } from '../../src/model/game/InventoryCapacity';
import { HexType } from '../../src/model/map/HexType';

/**
 * Utilitaires pour automatiser certaines actions de jeu lors des simulations.
 * Permet de récolter automatiquement les hexagones autour des villes et d'utiliser
 * le commerce de manière intelligente.
 */
export class GameAutoPlayer {
  /**
   * Récolte manuellement tous les hexagones adjacents aux villes d'une civilisation.
   * Un hexagone est adjacent à une ville s'il fait partie des 3 hexagones qui forment le vertex de la ville.
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param gameClock - L'horloge de jeu (optionnel, pour gérer le temps)
   * @returns Le nombre d'hexagones récoltés avec succès
   */
  static harvestAllHexesAroundCities(
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources,
    gameClock?: GameClock
  ): number {
    const cities = map.getCitiesByCivilization(civId);
    const harvestedHexes = new Set<string>(); // Pour éviter de récolter deux fois le même hex
    let successCount = 0;

    for (const city of cities) {
      // Obtenir les 3 hexagones qui forment le vertex de la ville
      const hexes = city.vertex.getHexes();

      for (const hexCoord of hexes) {
        const hexKey = hexCoord.hashCode();

        // Éviter de récolter deux fois le même hex
        if (harvestedHexes.has(hexKey)) {
          continue;
        }

        // Vérifier que l'hex existe dans la grille
        if (!map.getGrid().hasHex(hexCoord)) {
          continue;
        }

        // Vérifier que l'hex a un type de ressource (pas Water, Desert, etc.)
        const hexType = map.getHexType(hexCoord);
        if (!hexType || hexType === HexType.Water || hexType === HexType.Desert) {
          continue;
        }

        // Essayer de récolter
        try {
          const result = ResourceHarvestController.harvest(
            hexCoord,
            civId,
            map,
            resources,
            gameClock ? { gameClock } : undefined
          );

          if (result.success) {
            harvestedHexes.add(hexKey);
            successCount++;
          }
        } catch (e) {
          // Ignorer les erreurs (cooldown, etc.)
        }
      }
    }

    return successCount;
  }

  /**
   * Détermine si une ressource est produite automatiquement par des bâtiments.
   * Une ressource est produite automatiquement si au moins une ville a un bâtiment
   * de production qui peut récolter cette ressource et qu'au moins un hex adjacent
   * de ce type existe et est récolté automatiquement.
   * 
   * @param resourceType - Le type de ressource à vérifier
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns true si la ressource est produite automatiquement
   */
  private static isResourceAutoProduced(
    resourceType: ResourceType,
    civId: CivilizationId,
    map: GameMap
  ): boolean {
    // Convertir ResourceType en HexType
    const hexTypeMap: Record<ResourceType, HexType> = {
      [ResourceType.Wood]: HexType.Wood,
      [ResourceType.Brick]: HexType.Brick,
      [ResourceType.Wheat]: HexType.Wheat,
      [ResourceType.Sheep]: HexType.Sheep,
      [ResourceType.Ore]: HexType.Ore,
    };

    const hexType = hexTypeMap[resourceType];
    if (!hexType) {
      return false;
    }

    // Obtenir toutes les villes de la civilisation
    const cities = map.getCitiesByCivilization(civId);

    // Pour chaque ville, vérifier si elle a un bâtiment qui produit cette ressource
    for (const city of cities) {
      const productionBuildings = city.getProductionBuildings();

      for (const building of productionBuildings) {
        const requiredHexType = getRequiredHexType(building.type);
        if (requiredHexType === hexType) {
          // Vérifier si au moins un hex adjacent de ce type existe et est récolté automatiquement
          const cityHexes = city.vertex.getHexes();
          for (const hexCoord of cityHexes) {
            const hexTypeInMap = map.getHexType(hexCoord);
            if (hexTypeInMap === hexType && BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * Essaie d'utiliser le commerce pour obtenir un jeu de ressources donné.
   * 
   * Règles :
   * - Ne commerce que depuis des ressources qui sont à plus de 50% de la capacité maximale
   * - Ne commerce que vers des ressources qui ne sont pas du tout produites automatiquement
   * - Ne commerce pas depuis des ressources qui sont dans le jeu de ressources cible
   * 
   * @param targetResources - Map des ressources cibles avec les quantités souhaitées
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @returns Le nombre d'échanges effectués avec succès
   */
  static tryTradeForResourceSet(
    targetResources: Map<ResourceType, number>,
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources
  ): number {
    // Vérifier que le commerce est disponible
    if (!TradeController.canTrade(civId, map)) {
      return 0;
    }

    const capacity = calculateInventoryCapacity(map, civId);
    const capacityThreshold = capacity * 0.5; // 50% de la capacité
    let tradeCount = 0;

    // Pour chaque ressource cible
    for (const [targetResource, targetAmount] of targetResources.entries()) {
      const currentAmount = resources.getResource(targetResource);

      // Si on a déjà assez de cette ressource, passer à la suivante
      if (currentAmount >= targetAmount) {
        continue;
      }

      // Vérifier que cette ressource n'est pas produite automatiquement
      if (this.isResourceAutoProduced(targetResource, civId, map)) {
        continue;
      }

      const needed = targetAmount - currentAmount;

      // Essayer d'obtenir cette ressource en échangeant d'autres ressources
      const allResources = Object.values(ResourceType);

      for (const fromResource of allResources) {
        // Ne pas échanger depuis la ressource cible
        if (fromResource === targetResource) {
          continue;
        }

        // Ne pas échanger depuis des ressources qui sont dans le jeu cible
        if (targetResources.has(fromResource)) {
          continue;
        }

        // Vérifier que la ressource source est à plus de 50% de capacité
        const fromAmount = resources.getResource(fromResource);
        if (fromAmount <= capacityThreshold) {
          continue;
        }

        // Essayer de faire autant d'échanges que nécessaire (ou possible)
        let remainingNeeded = needed;
        while (remainingNeeded > 0) {
          // Vérifier si on peut faire un échange
          if (!TradeController.canPerformTrade(fromResource, targetResource, civId, map, resources)) {
            break; // Plus assez de ressources pour échanger
          }

          try {
            TradeController.performTrade(fromResource, targetResource, civId, map, resources);
            tradeCount++;
            remainingNeeded--;

            // Vérifier si on a maintenant assez
            if (resources.getResource(targetResource) >= targetAmount) {
              break;
            }
          } catch (e) {
            // Erreur lors de l'échange, arrêter pour cette ressource source
            break;
          }
        }

        // Si on a obtenu assez de cette ressource cible, passer à la suivante
        if (resources.getResource(targetResource) >= targetAmount) {
          break;
        }
      }
    }

    return tradeCount;
  }

  /**
   * Fait avancer le temps, récolte manuellement et automatiquement, et utilise le commerce si nécessaire.
   * Méthode privée factorisée pour éviter la duplication de code.
   * 
   * La production automatique est traitée toutes les 0.1s pendant 2 secondes (20 fois),
   * tandis que la récolte manuelle et le commerce sont effectués une seule fois à la fin.
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param gameClock - L'horloge de jeu
   * @param targetResources - Map optionnelle des ressources cibles pour le commerce
   * @returns Le temps actuel après avancement
   */
  public static advanceTimeAndHarvest(
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources,
    gameClock: GameClock,
    targetResources?: Map<ResourceType, number>
  ): void {
    const startTime = gameClock.getCurrentTime();
    const timeIncrement = 0.1; // Production automatique toutes les 0.1s
    const totalTime = 2.0; // Total de 2 secondes
    const iterations = Math.floor(totalTime / timeIncrement); // 20 itérations

    // Traiter la production automatique toutes les 0.1s
    for (let i = 0; i < iterations; i++) {
      const currentTime = startTime + (i + 1) * timeIncrement;
      gameClock.updateTime(currentTime);
      BuildingProductionController.processAutomaticProduction(civId, map, resources, gameClock);
    }

    // Récolter manuellement tous les hexagones autour des villes (une fois toutes les 2s)
    this.harvestAllHexesAroundCities(civId, map, resources, gameClock);

    // Utiliser le commerce si nécessaire pour obtenir les ressources manquantes (une fois toutes les 2s)
    if (targetResources && targetResources.size > 0) {
      this.tryTradeForResourceSet(targetResources, civId, map, resources);
    }
  }

  /**
   * Joue jusqu'à pouvoir construire une route, en récoltant manuellement et automatiquement,
   * et en utilisant le commerce si nécessaire.
   * 
   * @param edge - L'arête où construire la route
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param gameClock - L'horloge de jeu
   * @param maxIterations - Nombre maximum d'itérations (défaut: 1000)
   * @returns true si la route a été construite avec succès
   * @throws Error si la route ne peut pas être construite après maxIterations
   */
  static playUntilBuildingRoad(
    edge: Edge,
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources,
    gameClock: GameClock,
    maxIterations: number = 1000
  ): boolean {
    let iterations = 0;

    while (iterations < maxIterations) {
      // Vérifier si on peut construire la route
      if (RoadConstruction.canBuildRoad(edge, civId, map)) {
        const distance = map.calculateBuildableRoadDistance(edge, civId);
        if (distance !== undefined && RoadConstruction.canAfford(resources, distance)) {
          try {
            RoadController.buildRoad(edge, civId, map, resources);
            return true;
          } catch (e) {
            // Erreur lors de la construction, continuer
          }
        }
      }

      // Calculer les ressources cibles pour le commerce
      let targetResources: Map<ResourceType, number> | undefined;
      if (RoadConstruction.canBuildRoad(edge, civId, map)) {
        const distance = map.calculateBuildableRoadDistance(edge, civId);
        if (distance !== undefined) {
          const cost = RoadConstruction.getCost(distance);
          targetResources = new Map<ResourceType, number>();
          for (const [resourceType, amount] of cost.entries()) {
            const current = resources.getResource(resourceType);
            if (current < amount) {
              targetResources.set(resourceType, amount);
            }
          }
          if (targetResources.size === 0) {
            targetResources = undefined;
          }
        }
      }

      // Avancer le temps, récolter et trader
      this.advanceTimeAndHarvest(civId, map, resources, gameClock, targetResources);

      iterations++;
    }

    throw new Error(
      `Impossible de construire la route après ${maxIterations} itérations. ` +
      `Vérifiez que la route peut être construite (touche une ville ou route) et que vous avez assez de ressources.`
    );
  }

  /**
   * Joue jusqu'à pouvoir construire un avant-poste, en récoltant manuellement et automatiquement,
   * et en utilisant le commerce si nécessaire.
   * 
   * @param vertex - Le vertex où construire l'avant-poste
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param gameClock - L'horloge de jeu
   * @param maxIterations - Nombre maximum d'itérations (défaut: 1000)
   * @returns true si l'avant-poste a été construit avec succès
   * @throws Error si l'avant-poste ne peut pas être construit après maxIterations
   */
  static playUntilOutpost(
    vertex: Vertex,
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources,
    gameClock: GameClock,
    maxIterations: number = 1000
  ): boolean {
    let iterations = 0;

    while (iterations < maxIterations) {
      // Vérifier si on peut construire l'avant-poste
      if (OutpostController.canBuildOutpost(vertex, civId, map)) {
        const cityCount = map.getCityCount();
        if (OutpostController.canAfford(resources, cityCount)) {
          try {
            OutpostController.buildOutpost(vertex, civId, map, resources);
            return true;
          } catch (e) {
            // Erreur lors de la construction, continuer
          }
        }
      }

      // Calculer les ressources cibles pour le commerce
      let targetResources: Map<ResourceType, number> | undefined;
      if (OutpostController.canBuildOutpost(vertex, civId, map)) {
        const cityCount = map.getCityCount();
        const cost = OutpostController.getBuildableOutpostCost(cityCount);
        targetResources = new Map<ResourceType, number>();
        for (const [resourceType, amount] of cost.entries()) {
          const current = resources.getResource(resourceType);
          if (current < amount) {
            targetResources.set(resourceType, amount);
          }
        }
        if (targetResources.size === 0) {
          targetResources = undefined;
        }
      }

      // Avancer le temps, récolter et trader
      this.advanceTimeAndHarvest(civId, map, resources, gameClock, targetResources);

      iterations++;
    }

    throw new Error(
      `Impossible de construire l'avant-poste après ${maxIterations} itérations. ` +
      `Vérifiez que l'avant-poste peut être construit (touche une route, à 2+ routes d'une ville) et que vous avez assez de ressources.`
    );
  }

  /**
   * Joue jusqu'à pouvoir construire un bâtiment, en récoltant manuellement et automatiquement,
   * et en utilisant le commerce si nécessaire.
   * 
   * @param buildingType - Le type de bâtiment à construire
   * @param vertex - Le vertex de la ville où construire
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param gameClock - L'horloge de jeu
   * @param maxIterations - Nombre maximum d'itérations (défaut: 1000)
   * @returns true si le bâtiment a été construit avec succès
   * @throws Error si le bâtiment ne peut pas être construit après maxIterations
   */
  static playUntilBuilding(
    buildingType: BuildingType,
    vertex: Vertex,
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources,
    gameClock: GameClock,
    maxIterations: number = 1000
  ): boolean {
    const city = map.getCity(vertex);
    if (!city) {
      throw new Error(`Aucune ville trouvée au vertex ${vertex.toString()}`);
    }

    if (!city.owner.equals(civId)) {
      throw new Error(`La ville au vertex ${vertex.toString()} n'appartient pas à la civilisation ${civId.toString()}`);
    }

    let iterations = 0;

    while (iterations < maxIterations) {
      // Vérifier si on peut construire le bâtiment
      if (BuildingController.canBuild(buildingType, city, map, vertex, resources)) {
        try {
          BuildingController.buildBuilding(buildingType, city, map, vertex, resources);
          return true;
        } catch (e) {
          // Erreur lors de la construction, continuer
        }
      }

      // Calculer les ressources cibles pour le commerce
      let targetResources: Map<ResourceType, number> | undefined;
      if (city.canBuildBuildingType(buildingType)) {
        const cost = getBuildingCost(buildingType);
        targetResources = new Map<ResourceType, number>();
        for (const [resourceType, amount] of cost.entries()) {
          const current = resources.getResource(resourceType);
          if (current < amount) {
            targetResources.set(resourceType, amount);
          }
        }
        if (targetResources.size === 0) {
          targetResources = undefined;
        }
      }

      // Avancer le temps, récolter et trader
      this.advanceTimeAndHarvest(civId, map, resources, gameClock, targetResources);

      iterations++;
    }

    throw new Error(
      `Impossible de construire le bâtiment ${buildingType} après ${maxIterations} itérations. ` +
      `Vérifiez que le bâtiment peut être construit (niveau de ville suffisant, hex requis présent, etc.) et que vous avez assez de ressources.`
    );
  }

  /**
   * Joue jusqu'à pouvoir améliorer un bâtiment, en récoltant manuellement et automatiquement,
   * et en utilisant le commerce si nécessaire.
   * 
   * @param buildingType - Le type de bâtiment à améliorer
   * @param vertex - Le vertex de la ville où se trouve le bâtiment
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param gameClock - L'horloge de jeu
   * @param maxIterations - Nombre maximum d'itérations (défaut: 1000)
   * @returns true si le bâtiment a été amélioré avec succès
   * @throws Error si le bâtiment ne peut pas être amélioré après maxIterations
   */
  static playUntilImproveBuilding(
    buildingType: BuildingType,
    vertex: Vertex,
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources,
    gameClock: GameClock,
    maxIterations: number = 1000
  ): boolean {
    const city = map.getCity(vertex);
    if (!city) {
      throw new Error(`Aucune ville trouvée au vertex ${vertex.toString()}`);
    }

    if (!city.owner.equals(civId)) {
      throw new Error(`La ville au vertex ${vertex.toString()} n'appartient pas à la civilisation ${civId.toString()}`);
    }

    const building = city.getBuilding(buildingType);
    if (!building) {
      throw new Error(`Le bâtiment ${buildingType} n'existe pas dans la ville au vertex ${vertex.toString()}`);
    }

    if (!building.canUpgrade()) {
      throw new Error(`Le bâtiment ${buildingType} est déjà au niveau maximum (${building.getMaxLevel()})`);
    }

    let iterations = 0;

    while (iterations < maxIterations) {
      // Vérifier si on peut améliorer le bâtiment
      if (BuildingController.canUpgrade(buildingType, city, map, resources)) {
        try {
          BuildingController.upgradeBuilding(buildingType, city, map, resources);
          return true;
        } catch (e) {
          // Erreur lors de l'amélioration, continuer
        }
      }

      // Calculer les ressources cibles pour le commerce
      let targetResources: Map<ResourceType, number> | undefined;
      if (building.canUpgrade()) {
        const cost = building.getUpgradeCost();
        targetResources = new Map<ResourceType, number>();
        for (const [resourceType, amount] of cost.entries()) {
          const current = resources.getResource(resourceType);
          if (current < amount) {
            targetResources.set(resourceType, amount);
          }
        }
        if (targetResources.size === 0) {
          targetResources = undefined;
        }
      }

      // Avancer le temps, récolter et trader
      this.advanceTimeAndHarvest(civId, map, resources, gameClock, targetResources);

      iterations++;
    }

    throw new Error(
      `Impossible d'améliorer le bâtiment ${buildingType} après ${maxIterations} itérations. ` +
      `Vérifiez que le bâtiment peut être amélioré (pas au niveau maximum) et que vous avez assez de ressources.`
    );
  }
}
