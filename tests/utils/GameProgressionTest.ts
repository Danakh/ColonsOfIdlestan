import { HexCoord } from '../../src/model/hex/HexCoord';
import { HexDirection } from '../../src/model/hex/HexDirection';
import { Vertex } from '../../src/model/hex/Vertex';
import { Edge } from '../../src/model/hex/Edge';
import { GameMap } from '../../src/model/map/GameMap';
import { HexType } from '../../src/model/map/HexType';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { CityLevel } from '../../src/model/city/CityLevel';
import { BuildingType } from '../../src/model/city/BuildingType';
import { ResourceType } from '../../src/model/map/ResourceType';
import { GameState } from '../../src/model/game/GameState';
import { ResourceHarvestController } from '../../src/controller/ResourceHarvestController';
import { OutpostController } from '../../src/controller/OutpostController';
import { RoadConstruction } from '../../src/model/game/RoadConstruction';
import { GameAutoPlayer } from './GameAutoPlayer';
import { Make7HexesMap, saveGameState } from './GameStateGenerator';
import { SecondaryHexDirection } from '../../src/model/hex';

/**
 * Crée une carte 7Hexes avec des routes et une ville niveau 3 au bord de l'eau avec un port spécialisé en argile.
 * Simule une partie complète en utilisant les nouvelles méthodes utilitaires de GameAutoPlayer.
 * Part d'un outpost, construit des bâtiments de production et progresse jusqu'au port niveau 3.
 * 
 * @returns Un GameState avec une carte 7Hexes, des routes, et une ville Metropolis (niveau 3) avec un port niveau 3 spécialisé en Brick
 */
export function Make7HexesMapWithPortCity(): GameState {
  // Partir de la carte de base
  const gs = Make7HexesMap();
  const gameMap = gs.getGameMap();
  if (!gameMap) throw new Error('Carte non trouvée');
  
  const civId = gs.getPlayerCivilizationId();
  const resources = gs.getPlayerResources();
  const gameClock = gs.getGameClock();
  const center = new HexCoord(0, 0);
  
  // Réinitialiser les cooldowns de récolte pour la simulation
  ResourceHarvestController.resetCooldowns();
  
  // Ville initiale créée par Make7HexesMap (niveau Colony avec TownHall niveau 1)
  const initialCityVertex = center.vertex(SecondaryHexDirection.N);
  const initialCity = gameMap.getCity(initialCityVertex);
  if (!initialCity) throw new Error('Ville initiale non trouvée');
  
  // Étape 1: Construire un marché pour permettre le commerce
  GameAutoPlayer.playUntilBuilding(
    BuildingType.Market,
    initialCityVertex,
    civId,
    gameMap,
    resources,
    gameClock
  );
  
  // Étape 2: Construire des bâtiments de production pour accélérer la récolte
  GameAutoPlayer.playUntilBuilding(
    BuildingType.Brickworks,
    initialCityVertex,
    civId,
    gameMap,
    resources,
    gameClock
  );
  GameAutoPlayer.playUntilBuilding(
    BuildingType.Sawmill,
    initialCityVertex,
    civId,
    gameMap,
    resources,
    gameClock
  );
  
  // Étape 3: Améliorer le TownHall pour passer la ville au niveau 2 (Town)
  GameAutoPlayer.playUntilImproveBuilding(
    BuildingType.TownHall,
    initialCityVertex,
    civId,
    gameMap,
    resources,
    gameClock
  );
  
  // Étape 4: Construire des routes pour étendre le territoire
  // Route 1
  const road1 = center.edge(HexDirection.NE);
  GameAutoPlayer.playUntilBuildingRoad(road1, civId, gameMap, resources, gameClock);
  
  // Route 2
  const road2 = center.outgoingEdge(SecondaryHexDirection.EN);
  GameAutoPlayer.playUntilBuildingRoad(road2, civId, gameMap, resources, gameClock);
  
  // Étape 5: Trouver un vertex au bord de l'eau pour créer la ville portuaire
  const portCityVertex = road2.otherVertex(center.vertex(SecondaryHexDirection.EN));
  const grid = gameMap.getGrid();
  
  // Verifie que portCityVertex est bien au bord de l'eau
  const waterHex = portCityVertex.hex(SecondaryHexDirection.EN);
  if (!waterHex || gameMap.getHexType(waterHex) !== HexType.Water) {
    throw new Error('Le vertex du port n\'est pas au bord de l\'eau comme prévu');
  }

  // Étape 6: Créer un outpost au bord de l'eau (niveau 0)
  // Pour créer un outpost, il faut qu'il touche une route et soit à 2+ routes d'une ville
  GameAutoPlayer.playUntilOutpost(portCityVertex, civId, gameMap, resources, gameClock);
  
  const portCity = gameMap.getCity(portCityVertex);
  if (!portCity) throw new Error('Ville portuaire non trouvée après addCity');
  
  // Vérifier qu'on part bien d'un outpost (niveau 0, pas de TownHall)
  if (portCity.level !== CityLevel.Outpost) {
    throw new Error(`La ville portuaire devrait être un outpost (niveau 0), mais elle est au niveau ${portCity.level}`);
  }
  
  // Étape 7: Construire un TownHall pour passer de Outpost à Colony (niveau 1)
  // Un outpost peut construire un TownHall niveau 1
  GameAutoPlayer.playUntilBuilding(
    BuildingType.TownHall,
    portCityVertex,
    civId,
    gameMap,
    resources,
    gameClock
  );
  
  // Étape 8: Améliorer le TownHall au niveau 2 pour passer la ville au niveau 2 (Town)
  GameAutoPlayer.playUntilImproveBuilding(
    BuildingType.TownHall,
    portCityVertex,
    civId,
    gameMap,
    resources,
    gameClock
  );
  
  // Étape 9: Améliorer le TownHall au niveau 3 pour passer la ville au niveau 3 (Metropolis)
  GameAutoPlayer.playUntilImproveBuilding(
    BuildingType.TownHall,
    portCityVertex,
    civId,
    gameMap,
    resources,
    gameClock
  );
  
  // Récupérer la ville mise à jour pour vérifier le niveau
  const portCityAfterUpgrade = gameMap.getCity(portCityVertex);
  if (!portCityAfterUpgrade) throw new Error('Ville portuaire non trouvée après amélioration');
  
  // Vérifier que la ville est bien au niveau 3
  if (portCityAfterUpgrade.level !== CityLevel.Metropolis) {
    throw new Error(`La ville portuaire devrait être au niveau Metropolis (3), mais elle est au niveau ${portCityAfterUpgrade.level}`);
  }
  
  // Étape 10: Construire le port niveau 1
  GameAutoPlayer.playUntilBuilding(
    BuildingType.Seaport,
    portCityVertex,
    civId,
    gameMap,
    resources,
    gameClock
  );
  
  // Étape 11: Améliorer le port au niveau 2
  let currentPortCity = gameMap.getCity(portCityVertex);
  if (!currentPortCity) throw new Error('Ville portuaire non trouvée');
  let seaport = currentPortCity.getBuilding(BuildingType.Seaport);
  if (!seaport) throw new Error('Le port n\'a pas été construit');
  
  if (seaport.level < 2) {
    GameAutoPlayer.playUntilImproveBuilding(
      BuildingType.Seaport,
      portCityVertex,
      civId,
      gameMap,
      resources,
      gameClock
    );
    // Récupérer la ville mise à jour
    currentPortCity = gameMap.getCity(portCityVertex);
    if (!currentPortCity) throw new Error('Ville portuaire non trouvée après amélioration du port');
    seaport = currentPortCity.getBuilding(BuildingType.Seaport);
    if (!seaport) throw new Error('Le port n\'existe pas après amélioration');
  }
  
  // Étape 12: Spécialiser le port niveau 2 en Brick
  if (seaport.level === 2) {
    seaport.setSpecialization(ResourceType.Brick);
  }
  
  // Étape 13: Améliorer le port au niveau 3
  if (seaport.level < 3) {
    GameAutoPlayer.playUntilImproveBuilding(
      BuildingType.Seaport,
      portCityVertex,
      civId,
      gameMap,
      resources,
      gameClock
    );
    // Récupérer la ville mise à jour
    currentPortCity = gameMap.getCity(portCityVertex);
    if (!currentPortCity) throw new Error('Ville portuaire non trouvée après amélioration finale du port');
    seaport = currentPortCity.getBuilding(BuildingType.Seaport);
    if (!seaport) throw new Error('Le port n\'existe pas après amélioration finale');
  }
  
  // Vérifications finales
  if (seaport.level !== 3) {
    throw new Error(`Le port devrait être au niveau 3, mais il est au niveau ${seaport.level}`);
  }
  if (seaport.getSpecialization() !== ResourceType.Brick) {
    throw new Error(`Le port devrait être spécialisé en Brick, mais il est spécialisé en ${seaport.getSpecialization()}`);
  }
  
  // Sauvegarder le scénario
  saveGameState(gs, '7HexesMapWithPortCity');
  
  return gs;
}

/**
 * Crée une carte 7Hexes avec une ville portuaire niveau 3 et une capitale (niveau 4) sur la ville initiale.
 * Part de Make7HexesMapWithPortCity() et améliore la ville initiale jusqu'au niveau Capital.
 * 
 * @returns Un GameState avec une carte 7Hexes, une ville portuaire Metropolis (niveau 3) avec un port niveau 3,
 *          et la ville initiale au niveau Capital (niveau 4)
 */
export function Make7HexesMapWithPortAndCapital(): GameState {
  // Partir de la carte avec port
  const gs = Make7HexesMapWithPortCity();
  const gameMap = gs.getGameMap();
  if (!gameMap) throw new Error('Carte non trouvée');
  
  const civId = gs.getPlayerCivilizationId();
  const resources = gs.getPlayerResources();
  const gameClock = gs.getGameClock();
  const center = new HexCoord(0, 0);
  
  // Réinitialiser les cooldowns de récolte pour la simulation
  ResourceHarvestController.resetCooldowns();
  
  // Ville initiale créée par Make7HexesMap (niveau Colony avec TownHall niveau 1)
  // Après Make7HexesMapWithPortCity(), elle devrait être au niveau Town (2) avec TownHall niveau 2
  const initialCityVertex = center.vertex(SecondaryHexDirection.N);
  const initialCity = gameMap.getCity(initialCityVertex);
  if (!initialCity) throw new Error('Ville initiale non trouvée');
  
  // Vérifier le niveau actuel de la ville initiale
  let currentCity = gameMap.getCity(initialCityVertex);
  if (!currentCity) throw new Error('Ville initiale non trouvée');
  const townHall = currentCity.getBuilding(BuildingType.TownHall);
  if (!townHall) throw new Error('Le TownHall de la ville initiale n\'existe pas');
  
  // Améliorer le TownHall jusqu'au niveau 4 pour passer la ville au niveau Capital
  // La ville initiale devrait être au niveau Town (2) après Make7HexesMapWithPortCity()
  // Il faut donc améliorer de niveau 2 à 3, puis de niveau 3 à 4
  
  // Améliorer le TownHall au niveau 3 pour passer la ville au niveau 3 (Metropolis)
  if (townHall.level < 3) {
    GameAutoPlayer.playUntilImproveBuilding(
      BuildingType.TownHall,
      initialCityVertex,
      civId,
      gameMap,
      resources,
      gameClock
    );
    // Récupérer la ville mise à jour
    currentCity = gameMap.getCity(initialCityVertex);
    if (!currentCity) throw new Error('Ville initiale non trouvée après amélioration');
  }
  
  // Vérifier que la ville est maintenant au niveau 3
  if (currentCity.level !== CityLevel.Metropolis) {
    throw new Error(`La ville initiale devrait être au niveau Metropolis (3), mais elle est au niveau ${currentCity.level}`);
  }
  
  // Améliorer le TownHall au niveau 4 pour passer la ville au niveau 4 (Capital)
  const townHallLevel3 = currentCity.getBuilding(BuildingType.TownHall);
  if (!townHallLevel3) throw new Error('Le TownHall de la ville initiale n\'existe pas');
  if (townHallLevel3.level < 4) {
    GameAutoPlayer.playUntilImproveBuilding(
      BuildingType.TownHall,
      initialCityVertex,
      civId,
      gameMap,
      resources,
      gameClock
    );
    // Récupérer la ville mise à jour
    currentCity = gameMap.getCity(initialCityVertex);
    if (!currentCity) throw new Error('Ville initiale non trouvée après amélioration finale');
  }
  
  // Vérifier que la ville est maintenant au niveau Capital
  if (currentCity.level !== CityLevel.Capital) {
    throw new Error(`La ville initiale devrait être au niveau Capital (4), mais elle est au niveau ${currentCity.level}`);
  }
  
  // Vérifier que le TownHall est au niveau 4
  const finalTownHall = currentCity.getBuilding(BuildingType.TownHall);
  if (!finalTownHall) throw new Error('Le TownHall de la ville initiale n\'existe pas après amélioration');
  if (finalTownHall.level !== 4) {
    throw new Error(`Le TownHall devrait être au niveau 4, mais il est au niveau ${finalTownHall.level}`);
  }
  
  // Sauvegarder le scénario
  saveGameState(gs, '7HexesMapWithPortAndCapital');
  
  return gs;
}
