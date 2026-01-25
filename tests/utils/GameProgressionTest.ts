import { HexCoord } from '../../src/model/hex/HexCoord';
import { HexDirection } from '../../src/model/hex/HexDirection';
import { Vertex } from '../../src/model/hex/Vertex';
import { Edge } from '../../src/model/hex/Edge';
import { IslandMap } from '../../src/model/map/IslandMap';
import { HexType } from '../../src/model/map/HexType';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { CityLevel } from '../../src/model/city/CityLevel';
import { BuildingType } from '../../src/model/city/BuildingType';
import { ResourceType } from '../../src/model/map/ResourceType';
import { IslandState } from '../../src/model/game/IslandState';
import { ResourceHarvestController } from '../../src/controller/ResourceHarvestController';
import { OutpostController } from '../../src/controller/OutpostController';
import { RoadConstruction } from '../../src/model/game/RoadConstruction';
import { GameAutoPlayer } from './GameAutoPlayer';
import { Make7HexesMap, saveIslandState } from './IslandStateGenerator';
import { SecondaryHexDirection } from '../../src/model/hex';

/**
 * Crée une carte 7Hexes avec des routes et une ville niveau 3 au bord de l'eau avec un port spécialisé en argile.
 * Simule une partie complète en utilisant les nouvelles méthodes utilitaires de GameAutoPlayer.
 * Part d'un outpost, construit des bâtiments de production et progresse jusqu'au port niveau 3.
 * 
 * @returns Un IslandState avec une carte 7Hexes, des routes, et une ville Metropolis (niveau 3) avec un port niveau 3 spécialisé en Brick
 */
export function Make7HexesMapWithPortCity(): IslandState {
  // Partir de la carte de base
  const gs = Make7HexesMap();
  const islandMap = gs.getIslandMap();
  if (!islandMap) throw new Error('Carte non trouvée');
  
  const civId = gs.getPlayerCivilizationId();
  const resources = gs.getPlayerResources();
  const gameClock = gs.getGameClock();
  const center = new HexCoord(0, 0);
  
  // Réinitialiser les cooldowns de récolte pour la simulation
  ResourceHarvestController.resetCooldowns();
  
  // Ville initiale créée par Make7HexesMap (niveau Colony avec TownHall niveau 1)
  const initialCityVertex = center.vertex(SecondaryHexDirection.N);
  const initialCity = islandMap.getCity(initialCityVertex);
  if (!initialCity) throw new Error('Ville initiale non trouvée');
  
  // Étape 1: Construire un marché pour permettre le commerce
  GameAutoPlayer.playUntilBuilding(
    BuildingType.Market,
    initialCityVertex,
    civId,
    islandMap,
    resources,
    gameClock
  );
  
  // Étape 2: Construire des bâtiments de production pour accélérer la récolte
  GameAutoPlayer.playUntilBuilding(
    BuildingType.Brickworks,
    initialCityVertex,
    civId,
    islandMap,
    resources,
    gameClock
  );
  GameAutoPlayer.playUntilBuilding(
    BuildingType.Sawmill,
    initialCityVertex,
    civId,
    islandMap,
    resources,
    gameClock
  );
  
  // Étape 3: Améliorer le TownHall pour passer la ville au niveau 2 (Town)
  GameAutoPlayer.playUntilImproveBuilding(
    BuildingType.TownHall,
    initialCityVertex,
    civId,
    islandMap,
    resources,
    gameClock
  );
  
  // Étape 4: Construire des routes pour étendre le territoire
  // Route 1
  const road1 = center.edge(HexDirection.NE);
  GameAutoPlayer.playUntilBuildingRoad(road1, civId, islandMap, resources, gameClock);
  
  // Route 2
  const road2 = center.outgoingEdge(SecondaryHexDirection.EN);
  GameAutoPlayer.playUntilBuildingRoad(road2, civId, islandMap, resources, gameClock);
  
  // Étape 5: Trouver un vertex au bord de l'eau pour créer la ville portuaire
  const portCityVertex = road2.otherVertex(center.vertex(SecondaryHexDirection.EN));
  const grid = islandMap.getGrid();
  
  // Verifie que portCityVertex est bien au bord de l'eau
  const waterHex = portCityVertex.hex(SecondaryHexDirection.EN);
  if (!waterHex || islandMap.getHexType(waterHex) !== HexType.Water) {
    throw new Error('Le vertex du port n\'est pas au bord de l\'eau comme prévu');
  }

  // Étape 6: Créer un outpost au bord de l'eau (niveau 0)
  // Pour créer un outpost, il faut qu'il touche une route et soit à 2+ routes d'une ville
  GameAutoPlayer.playUntilOutpost(portCityVertex, civId, islandMap, resources, gameClock);
  
  const portCity = islandMap.getCity(portCityVertex);
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
    islandMap,
    resources,
    gameClock
  );
  
  // Étape 8: Améliorer le TownHall au niveau 2 pour passer la ville au niveau 2 (Town)
  GameAutoPlayer.playUntilImproveBuilding(
    BuildingType.TownHall,
    portCityVertex,
    civId,
    islandMap,
    resources,
    gameClock
  );
  
  // Étape 9: Améliorer le TownHall au niveau 3 pour passer la ville au niveau 3 (Metropolis)
  GameAutoPlayer.playUntilImproveBuilding(
    BuildingType.TownHall,
    portCityVertex,
    civId,
    islandMap,
    resources,
    gameClock
  );
  
  // Récupérer la ville mise à jour pour vérifier le niveau
  const portCityAfterUpgrade = islandMap.getCity(portCityVertex);
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
    islandMap,
    resources,
    gameClock
  );
  
  // Étape 11: Améliorer le port au niveau 2
  let currentPortCity = islandMap.getCity(portCityVertex);
  if (!currentPortCity) throw new Error('Ville portuaire non trouvée');
  let seaport = currentPortCity.getBuilding(BuildingType.Seaport);
  if (!seaport) throw new Error('Le port n\'a pas été construit');
  
  if (seaport.level < 2) {
    GameAutoPlayer.playUntilImproveBuilding(
      BuildingType.Seaport,
      portCityVertex,
      civId,
      islandMap,
      resources,
      gameClock
    );
    // Récupérer la ville mise à jour
    currentPortCity = islandMap.getCity(portCityVertex);
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
      islandMap,
      resources,
      gameClock
    );
    // Récupérer la ville mise à jour
    currentPortCity = islandMap.getCity(portCityVertex);
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
  saveIslandState(gs, '7HexesMapWithPortCity');
  
  return gs;
}

/**
 * Crée une carte 7Hexes avec une ville portuaire niveau 3 et une capitale (niveau 4) sur la ville initiale.
 * Part de Make7HexesMapWithPortCity() et améliore la ville initiale jusqu'au niveau Capital.
 * 
 * @returns Un IslandState avec une carte 7Hexes, une ville portuaire Metropolis (niveau 3) avec un port niveau 3,
 *          et la ville initiale au niveau Capital (niveau 4)
 */
export function Make7HexesMapWithPortAndCapital(): IslandState {
  // Partir de la carte avec port
  const gs = Make7HexesMapWithPortCity();
  const islandMap = gs.getIslandMap();
  if (!islandMap) throw new Error('Carte non trouvée');
  
  const civId = gs.getPlayerCivilizationId();
  const resources = gs.getPlayerResources();
  const gameClock = gs.getGameClock();
  const center = new HexCoord(0, 0);
  
  // Réinitialiser les cooldowns de récolte pour la simulation
  ResourceHarvestController.resetCooldowns();
  
  // Ville initiale créée par Make7HexesMap (niveau Colony avec TownHall niveau 1)
  // Après Make7HexesMapWithPortCity(), elle devrait être au niveau Town (2) avec TownHall niveau 2
  const initialCityVertex = center.vertex(SecondaryHexDirection.N);
  const initialCity = islandMap.getCity(initialCityVertex);
  if (!initialCity) throw new Error('Ville initiale non trouvée');
  
  // Vérifier le niveau actuel de la ville initiale
  let currentCity = islandMap.getCity(initialCityVertex);
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
      islandMap,
      resources,
      gameClock
    );
    // Récupérer la ville mise à jour
    currentCity = islandMap.getCity(initialCityVertex);
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
      islandMap,
      resources,
      gameClock
    );
    // Récupérer la ville mise à jour
    currentCity = islandMap.getCity(initialCityVertex);
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
  saveIslandState(gs, '7HexesMapWithPortAndCapital');
  
  return gs;
}

/**
 * Crée une carte 7Hexes avec 5 villes niveau 3 (Metropolis), chacune avec une bibliothèque, et un port niveau 4.
 * Part de Make7HexesMapWithPortAndCapital() et développe le territoire avec 3 nouvelles villes.
 * 
 * @returns Un IslandState avec une carte 7Hexes, 5 villes Metropolis avec bibliothèques, et un port niveau 4
 */
export function Make7HexesMapWith5CitiesAndLibraries(): IslandState {
  // Partir de la carte avec port et capitale
  const gs = Make7HexesMapWithPortAndCapital();
  const islandMap = gs.getIslandMap();
  if (!islandMap) throw new Error('Carte non trouvée');
  
  const civId = gs.getPlayerCivilizationId();
  const resources = gs.getPlayerResources();
  const gameClock = gs.getGameClock();
  const center = new HexCoord(0, 0);
  
  // Réinitialiser les cooldowns de récolte pour la simulation
  ResourceHarvestController.resetCooldowns();
  
  // À ce stade, on a 2 villes:
  // - Ville initiale au centre (niveau Capital/4) au vertex N
  // - Ville portuaire (niveau Metropolis/3) au vertex EN
  
  const initialCityVertex = center.vertex(SecondaryHexDirection.N);
  const portCityVertex = center.outgoingEdge(SecondaryHexDirection.EN).otherVertex(center.vertex(SecondaryHexDirection.EN));
  
  // On va créer 3 nouvelles villes pour arriver à 5 villes
  // Construire des routes pour étendre le territoire
  
  // Routes depuis l'hex centre pour étendre le réseau
  // Construire d'abord NW (touche la ville au vertex N), puis étendre W et SW
  const roadNW = center.edge(HexDirection.NW);
  GameAutoPlayer.playUntilBuildingRoad(roadNW, civId, islandMap, resources, gameClock);
  
  const roadW = center.edge(HexDirection.W);
  GameAutoPlayer.playUntilBuildingRoad(roadW, civId, islandMap, resources, gameClock);
  
  const roadSW = center.edge(HexDirection.SW);
  GameAutoPlayer.playUntilBuildingRoad(roadSW, civId, islandMap, resources, gameClock);
  
  // Étendre également vers SE pour débloquer davantage de vertices constructibles
  const roadSE = center.edge(HexDirection.SE);
  GameAutoPlayer.playUntilBuildingRoad(roadSE, civId, islandMap, resources, gameClock);
  
  // Créer 3 nouveaux outposts sur des vertices valides (calculés par la carte)
  const buildableVertices = islandMap.getBuildableOutpostVertices(civId);
  if (buildableVertices.length < 3) {
    throw new Error(`Pas assez de vertices constructibles pour des avant-postes (trouvés: ${buildableVertices.length})`);
  }
  const city3Vertex = buildableVertices[0];
  const city4Vertex = buildableVertices[1];
  const city5Vertex = buildableVertices[2];
  
  // Booster temporairement les ressources pour accélérer la création des avant-postes dans le scénario
  resources.addResource(ResourceType.Wood, 200);
  resources.addResource(ResourceType.Brick, 200);
  resources.addResource(ResourceType.Wheat, 200);
  resources.addResource(ResourceType.Sheep, 200);

  // Ajouter directement des avant-postes (niveau 0) pour ce scénario d'intégration
  islandMap.addCity(city3Vertex, civId, CityLevel.Outpost);
  islandMap.addCity(city4Vertex, civId, CityLevel.Outpost);
  islandMap.addCity(city5Vertex, civId, CityLevel.Outpost);
  
  // Liste des villes à développer (toutes sauf la capitale qui est déjà au niveau 4)
  const citiesToDevelop = [
    { vertex: portCityVertex, name: 'Ville portuaire' },
    { vertex: city3Vertex, name: 'Ville 3' },
    { vertex: city4Vertex, name: 'Ville 4' },
    { vertex: city5Vertex, name: 'Ville 5' }
  ];
  
  // Améliorer toutes les nouvelles villes jusqu'au niveau 3 (Metropolis)
  for (const cityInfo of citiesToDevelop) {
    const city = islandMap.getCity(cityInfo.vertex);
    if (!city) throw new Error(`${cityInfo.name} non trouvée`);
    
    // Si c'est un outpost, construire le TownHall niveau 1 pour passer à Colony
    if (city.level === CityLevel.Outpost) {
      GameAutoPlayer.playUntilBuilding(
        BuildingType.TownHall,
        cityInfo.vertex,
        civId,
        islandMap,
        resources,
        gameClock
      );
    }
    
    // Améliorer le TownHall au niveau 2 pour passer à Town
    let currentCity = islandMap.getCity(cityInfo.vertex);
    if (!currentCity) throw new Error(`${cityInfo.name} non trouvée après construction TownHall`);
    if (currentCity.level < CityLevel.Town) {
      GameAutoPlayer.playUntilImproveBuilding(
        BuildingType.TownHall,
        cityInfo.vertex,
        civId,
        islandMap,
        resources,
        gameClock
      );
    }
    
    // Améliorer le TownHall au niveau 3 pour passer à Metropolis
    currentCity = islandMap.getCity(cityInfo.vertex);
    if (!currentCity) throw new Error(`${cityInfo.name} non trouvée`);
    if (currentCity.level < CityLevel.Metropolis) {
      GameAutoPlayer.playUntilImproveBuilding(
        BuildingType.TownHall,
        cityInfo.vertex,
        civId,
        islandMap,
        resources,
        gameClock
      );
    }
  }
  
  // Vérifier que la ville portuaire est bien au niveau 3 (normalement déjà le cas)
  const portCity = islandMap.getCity(portCityVertex);
  if (!portCity) throw new Error('Ville portuaire non trouvée');
  if (portCity.level !== CityLevel.Metropolis) {
    throw new Error(`La ville portuaire devrait être au niveau Metropolis (3), mais elle est au niveau ${portCity.level}`);
  }
  
  // Améliorer le port de niveau 3 à niveau 4
  const seaport = portCity.getBuilding(BuildingType.Seaport);
  if (!seaport) throw new Error('Le port n\'existe pas dans la ville portuaire');
  if (seaport.level === 3) {
    GameAutoPlayer.playUntilImproveBuilding(
      BuildingType.Seaport,
      portCityVertex,
      civId,
      islandMap,
      resources,
      gameClock
    );
  }
  
  // Vérifier que le port est au niveau 4
  const finalPortCity = islandMap.getCity(portCityVertex);
  if (!finalPortCity) throw new Error('Ville portuaire non trouvée après amélioration du port');
  const finalSeaport = finalPortCity.getBuilding(BuildingType.Seaport);
  if (!finalSeaport) throw new Error('Le port n\'existe pas après amélioration');
  if (finalSeaport.level !== 4) {
    throw new Error(`Le port devrait être au niveau 4, mais il est au niveau ${finalSeaport.level}`);
  }
  
  // Construire une bibliothèque dans chaque ville
  // Liste de toutes les 5 villes (y compris la capitale)
  const allCities = [
    { vertex: initialCityVertex, name: 'Capitale' },
    { vertex: portCityVertex, name: 'Ville portuaire' },
    { vertex: city3Vertex, name: 'Ville 3' },
    { vertex: city4Vertex, name: 'Ville 4' },
    { vertex: city5Vertex, name: 'Ville 5' }
  ];
  
  for (const cityInfo of allCities) {
    GameAutoPlayer.playUntilBuilding(
      BuildingType.Library,
      cityInfo.vertex,
      civId,
      islandMap,
      resources,
      gameClock
    );
  }
  
  // Vérifications finales
  const cities = islandMap.getCitiesByCivilization(civId);
  if (cities.length !== 5) {
    throw new Error(`Devrait avoir 5 villes, mais il y en a ${cities.length}`);
  }
  
  // Vérifier que toutes les villes (sauf la capitale) sont au niveau 3
  for (const cityInfo of citiesToDevelop) {
    const city = islandMap.getCity(cityInfo.vertex);
    if (!city) throw new Error(`${cityInfo.name} non trouvée`);
    if (city.level !== CityLevel.Metropolis) {
      throw new Error(`${cityInfo.name} devrait être au niveau Metropolis (3), mais elle est au niveau ${city.level}`);
    }
  }
  
  // Vérifier que toutes les villes ont une bibliothèque
  for (const cityInfo of allCities) {
    const city = islandMap.getCity(cityInfo.vertex);
    if (!city) throw new Error(`${cityInfo.name} non trouvée`);
    const library = city.getBuilding(BuildingType.Library);
    if (!library) {
      throw new Error(`${cityInfo.name} n'a pas de bibliothèque`);
    }
  }
  
  // Sauvegarder le scénario
  saveIslandState(gs, '7HexesMapWith5CitiesAndLibraries');
  
  return gs;
}
