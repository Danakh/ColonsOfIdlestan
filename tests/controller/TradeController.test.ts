import { describe, it, expect, beforeEach } from 'vitest';
import { TradeController } from '../../src/controller/TradeController';
import { BuildingController } from '../../src/controller/BuildingController';
import { BuildingProductionController } from '../../src/controller/BuildingProductionController';
import { Make7HexesMap } from '../utils/IslandStateGenerator';
import { Make7HexesMapWithPortCity } from '../utils/GameProgressionTest';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { HexDirection } from '../../src/model/hex/HexDirection';
import { SecondaryHexDirection } from '../../src/model/hex/SecondaryHexDirection';
import { Vertex } from '../../src/model/hex/Vertex';
import { BuildingType } from '../../src/model/city/BuildingType';
import { ResourceType } from '../../src/model/map/ResourceType';
import { IslandState } from '../../src/model/game/IslandState';
import { PlayerResources } from '../../src/model/game/PlayerResources';
import { calculateInventoryCapacity } from '../../src/model/game/InventoryCapacity';

describe('TradeController (Map7HexesScenario)', () => {
  let islandState: IslandState;
  let map: ReturnType<IslandState['getIslandMap']>;
  let civId: ReturnType<IslandState['getPlayerCivilizationId']>;
  let resources: PlayerResources;

  const center = new HexCoord(0, 0);
  // Vertex de la ville dans Map7HexesScenario : au nord du centre
  const cityVertex = center.vertex(SecondaryHexDirection.N);

  beforeEach(() => {
    islandState = Make7HexesMap();
    map = islandState.getIslandMap()!;
    civId = islandState.getPlayerCivilizationId();
    resources = islandState.getPlayerResources();
  });

  it('ne doit pas être disponible avant le Market, et doit être disponible après', () => {
    // Avant construction d'un bâtiment de commerce, TradeController ne doit pas être disponible
    expect(TradeController.canTrade(civId, map!)).toBe(false);

    const city = map!.getCity(cityVertex);
    expect(city).toBeTruthy();

    // Construire un Market (coût : 5 Wood) pour débloquer le commerce
    resources.addResource(ResourceType.Wood, 5);
    BuildingController.buildBuilding(BuildingType.Market, city!, map!, cityVertex, resources);

    expect(city!.hasBuilding(BuildingType.Market)).toBe(true);
    expect(TradeController.canTrade(civId, map!)).toBe(true);
    expect(TradeController.getTradeRateForCivilization(civId, map!)).toBe(4);
  });
});

describe('TradeController (Map7HexesWithPortCity)', () => {
  let islandState: IslandState;
  let map: ReturnType<IslandState['getIslandMap']>;
  let civId: ReturnType<IslandState['getPlayerCivilizationId']>;
  let resources: PlayerResources;

  const center = new HexCoord(0, 0);
  
  beforeEach(() => {
    islandState = Make7HexesMapWithPortCity();
    map = islandState.getIslandMap()!;
    civId = islandState.getPlayerCivilizationId();
    resources = islandState.getPlayerResources();
  });

  it('devrait avoir un port niveau 3 spécialisé en Brick avec auto-trade désactivé par défaut', () => {
    // Trouver la ville avec le port au bord de l'eau
    const cities = map!.getCitiesByCivilization(civId);
    const portCity = cities.find(city => city.hasBuilding(BuildingType.Seaport));
    
    expect(portCity).toBeTruthy();
    
    const seaport = portCity!.getBuilding(BuildingType.Seaport);
    expect(seaport).toBeTruthy();
    expect(seaport!.level).toBe(3);
    expect(seaport!.getSpecialization()).toBe(ResourceType.Brick);
    expect(seaport!.isAutoTradeEnabled()).toBe(false);
  });

  it('ne devrait pas effectuer de commerce automatique quand auto-trade est désactivé', () => {
    // Trouver la ville avec le port
    const cities = map!.getCitiesByCivilization(civId);
    const portCity = cities.find(city => city.hasBuilding(BuildingType.Seaport));
    const seaport = portCity!.getBuilding(BuildingType.Seaport)!;
    
    // Vérifier que auto-trade est désactivé
    expect(seaport.isAutoTradeEnabled()).toBe(false);
    
    // Ajouter des ressources jusqu'à la capacité max pour déclencher le commerce auto
    const capacity = calculateInventoryCapacity(map!, civId);
    const initialBrick = resources.getResource(ResourceType.Brick);
    const initialWood = resources.getResource(ResourceType.Wood);
    
    // Ajouter assez de Brick pour atteindre la capacité max
    resources.addResource(ResourceType.Brick, capacity - initialBrick);
    resources.removeResource(ResourceType.Wood, initialWood);
    
    expect(resources.getResource(ResourceType.Brick)).toBe(capacity);
    expect(resources.getResource(ResourceType.Wood)).toBe(0);

    // Tenter le commerce automatique
    TradeController.handleAutoTrade(ResourceType.Brick, civId, map!, resources);
    
    // Vérifier qu'aucun commerce n'a été effectué (auto-trade désactivé)
    expect(resources.getResource(ResourceType.Brick)).toBe(capacity);
    expect(resources.getResource(ResourceType.Wood)).toBe(0);
  });

  it('devrait effectuer un commerce automatique quand auto-trade est activé', () => {
    // Trouver la ville avec le port
    const cities = map!.getCitiesByCivilization(civId);
    const portCity = cities.find(city => city.hasBuilding(BuildingType.Seaport));
    const seaport = portCity!.getBuilding(BuildingType.Seaport)!;
    
    // Activer l'auto-trade
    seaport.setAutoTradeEnabled(true);
    expect(seaport.isAutoTradeEnabled()).toBe(true);
    
    // Le port est spécialisé en Brick, donc il échange Brick vers la ressource la plus faible
    // Préparer les ressources : avoir peu d'une ressource (ex: Wood) et beaucoup de Brick
    const initialBrick = resources.getResource(ResourceType.Brick);
    const initialWood = resources.getResource(ResourceType.Wood);
    
    // S'assurer qu'on a peu de Wood (la ressource la plus faible)
    const capacity = calculateInventoryCapacity(map!, civId);
    resources.addResource(ResourceType.Brick, capacity - initialBrick);
    resources.removeResource(ResourceType.Wood, initialWood); // Réduire Wood à 0
        
    // Vérifier qu'on a atteint la capacité avec Brick
    expect(resources.getResource(ResourceType.Brick)).toBe(capacity);
    
    // Tenter le commerce automatique avec Brick (la ressource spécialisée du port)
    // Le port devrait échanger Brick vers la ressource la plus faible (Wood = 0)
    TradeController.handleAutoTrade(ResourceType.Brick, civId, map!, resources);
    
    // Vérifier qu'un commerce a été effectué : 2 Brick -> 1 Wood (port spécialisé en Brick, taux 2:1)
    // Le port échange DE la brique VERS la ressource la plus faible
    const brickAfterTrade = resources.getResource(ResourceType.Brick);
    const woodAfterTrade = resources.getResource(ResourceType.Wood);
    
    expect(brickAfterTrade).toBe(capacity - 2); // 2 Brick échangés
    expect(woodAfterTrade).toBe(1); // 1 Wood reçu
  });

  it('ne devrait pas effectuer de commerce automatique si la ressource récoltée n\'est pas la spécialisation', () => {
    // Trouver la ville avec le port
    const cities = map!.getCitiesByCivilization(civId);
    const portCity = cities.find(city => city.hasBuilding(BuildingType.Seaport));
    const seaport = portCity!.getBuilding(BuildingType.Seaport)!;
    
    // Activer l'auto-trade
    seaport.setAutoTradeEnabled(true);
    
    // Le port est spécialisé en Brick, donc il échange seulement quand on récolte Brick
    // Ajouter des ressources jusqu'à la capacité max avec Wood (pas Brick)
    const capacity = calculateInventoryCapacity(map!, civId);
    const initialWood = resources.getResource(ResourceType.Wood);
    const initialBrick = resources.getResource(ResourceType.Brick);
    
    // Ajouter assez de Wood pour atteindre la capacité max
    resources.addResource(ResourceType.Wood, capacity - initialWood);
    resources.removeResource(ResourceType.Brick, initialBrick); // Réduire Brick à 0
    
    // Tenter le commerce automatique avec Wood (pas la spécialisation)
    TradeController.handleAutoTrade(ResourceType.Wood, civId, map!, resources);
    
    // Vérifier qu'aucun commerce n'a été effectué (Wood n'est pas la spécialisation)
    expect(resources.getResource(ResourceType.Wood)).toBe(capacity);
    expect(resources.getResource(ResourceType.Brick)).toBe(0);
  });

  it('devrait effectuer un commerce automatique via auto-harvest quand la capacité est atteinte', () => {
    // Trouver la ville avec le port
    const cities = map!.getCitiesByCivilization(civId);
    const portCity = cities.find(city => city.hasBuilding(BuildingType.Seaport));
    const seaport = portCity!.getBuilding(BuildingType.Seaport)!;
    
    // Activer l'auto-trade
    seaport.setAutoTradeEnabled(true);
    expect(seaport.isAutoTradeEnabled()).toBe(true);
    
    // Trouver la ville avec Brickworks (la ville initiale devrait en avoir une)
    const brickworksCity = cities.find(city => city.hasBuilding(BuildingType.Brickworks));
    expect(brickworksCity).toBeTruthy();
    
    // Le port est spécialisé en Brick, donc il échange Brick vers la ressource la plus faible
    // Réduire Wood à 0 pour qu'elle soit la ressource la plus faible
    const initialWood = resources.getResource(ResourceType.Wood);
    resources.removeResource(ResourceType.Wood, initialWood);
    expect(resources.getResource(ResourceType.Wood)).toBe(0);
    
    const capacity = calculateInventoryCapacity(map!, civId);
    const initialBrick = resources.getResource(ResourceType.Brick);
    resources.addResource(ResourceType.Brick, capacity - initialBrick);
    expect(resources.getResource(ResourceType.Brick)).toBe(capacity);

    // Obtenir la GameClock
    const gameClock = islandState.getGameClock();
    const brickBeforeProduction = resources.getResource(ResourceType.Brick);
    
    // Faire avancer le temps et produire automatiquement jusqu'à ce qu'une production se fasse
    // Le commerce automatique sera déclenché automatiquement si la capacité est atteinte
    let iterations = 0;
    const maxIterations = 100; // Limite de sécurité
    let productionOccurred = false;
    
    while (!productionOccurred && iterations < maxIterations) {
      // Avancer le temps de 0.1 seconde pour permettre la production automatique
      const currentTime = gameClock.getCurrentTime();
      gameClock.updateTime(currentTime + 0.1);
      
      // Traiter la production automatique (cela déclenchera handleAutoTrade si la capacité est atteinte)
      const productionResults = BuildingProductionController.processAutomaticProduction(civId, map!, resources, gameClock);

      // Vérifier si une production de Brick a eu lieu
      if (productionResults.some(result => result.buildingType === BuildingType.Brickworks && result.resourceType === ResourceType.Brick)) {
        productionOccurred = true;
        // Attendre un peu pour que le commerce automatique se déclenche si nécessaire
        break;
      }

      iterations++;
    }
    
    // Vérifier qu'une production a eu lieu
    expect(productionOccurred).toBe(true);
    
    // Vérifier les résultats finaux
    const brickAfterProduction = resources.getResource(ResourceType.Brick);
    const woodAfterProduction = resources.getResource(ResourceType.Wood);
    
    // Si la capacité était déjà atteinte, le commerce automatique devrait avoir été déclenché
    // et avoir réduit Brick de 2 et ajouté 1 Wood
    if (brickBeforeProduction >= capacity) {
      // Le commerce devrait avoir réduit Brick de 2 et ajouté 1 Wood
      expect(brickAfterProduction).toBeLessThan(capacity);
      expect(woodAfterProduction).toBeGreaterThan(0);
      
      // Vérifier les valeurs exactes : 2 Brick -> 1 Wood (port spécialisé en Brick, taux 2:1)
      expect(brickAfterProduction).toBeLessThanOrEqual(capacity - 2);
      expect(woodAfterProduction).toBeGreaterThanOrEqual(1);
    } else {
      // Si la capacité n'était pas atteinte, la production devrait avoir augmenté Brick
      // (mais le commerce peut avoir été déclenché si on a atteint la capacité pendant la production)
      if (brickAfterProduction >= capacity) {
        // Si on a atteint la capacité, le commerce devrait avoir été déclenché
        expect(brickAfterProduction).toBeLessThanOrEqual(capacity - 2);
        expect(woodAfterProduction).toBeGreaterThanOrEqual(1);
      } else {
        // Si on n'a pas atteint la capacité, la production devrait avoir augmenté Brick
        expect(brickAfterProduction).toBeGreaterThan(brickBeforeProduction);
      }
    }
  });
});

