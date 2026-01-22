import { describe, it, expect, beforeEach } from 'vitest';
import { TradeController } from '../../src/controller/TradeController';
import { BuildingController } from '../../src/controller/BuildingController';
import { Make7HexesMap, Make7HexesMapWithPortCity } from '../utils/GameStateGenerator';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { HexDirection } from '../../src/model/hex/HexDirection';
import { Vertex } from '../../src/model/hex/Vertex';
import { BuildingType } from '../../src/model/city/BuildingType';
import { ResourceType } from '../../src/model/map/ResourceType';
import { GameState } from '../../src/model/game/GameState';
import { PlayerResources } from '../../src/model/game/PlayerResources';
import { calculateInventoryCapacity } from '../../src/model/game/InventoryCapacity';

describe('TradeController (Map7HexesScenario)', () => {
  let gameState: GameState;
  let map: ReturnType<GameState['getGameMap']>;
  let civId: ReturnType<GameState['getPlayerCivilizationId']>;
  let resources: PlayerResources;

  const center = new HexCoord(0, 0);
  // Vertex de la ville dans Map7HexesScenario : (center, N, NW)
  const cityVertex = Vertex.create(
    center,
    center.neighbor(HexDirection.N),
    center.neighbor(HexDirection.NW)
  );

  beforeEach(() => {
    gameState = Make7HexesMap();
    map = gameState.getGameMap()!;
    civId = gameState.getPlayerCivilizationId();
    resources = gameState.getPlayerResources();
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
  let gameState: GameState;
  let map: ReturnType<GameState['getGameMap']>;
  let civId: ReturnType<GameState['getPlayerCivilizationId']>;
  let resources: PlayerResources;

  const center = new HexCoord(0, 0);
  
  beforeEach(() => {
    gameState = Make7HexesMapWithPortCity();
    map = gameState.getGameMap()!;
    civId = gameState.getPlayerCivilizationId();
    resources = gameState.getPlayerResources();
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
    
    // Ajouter assez de Wood pour atteindre la capacité max
    resources.addResource(ResourceType.Brick, capacity - initialWood);
    
    // Tenter le commerce automatique
    TradeController.handleAutoTrade(ResourceType.Brick, civId, map!, resources);
    
    // Vérifier qu'aucun commerce n'a été effectué (auto-trade désactivé)
    expect(resources.getResource(ResourceType.Brick)).toBe(capacity);
    expect(resources.getResource(ResourceType.Wood)).toBe(initialWood);
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
    // Et beaucoup de Brick pour pouvoir échanger
    resources.addResource(ResourceType.Brick, 10); // Ajouter beaucoup de Brick
    if (initialWood > 0) {
      resources.removeResource(ResourceType.Wood, initialWood); // Réduire Wood à 0
    }
    
    // Ajouter de la Brick jusqu'à la capacité max pour déclencher le commerce auto
    const capacity = calculateInventoryCapacity(map!, civId);
    const brickBeforeTrade = resources.getResource(ResourceType.Brick);
    const brickToAdd = capacity - brickBeforeTrade;
    resources.addResource(ResourceType.Brick, brickToAdd);
    
    // Vérifier qu'on a atteint la capacité avec Brick
    expect(resources.getResource(ResourceType.Brick)).toBe(capacity);
    
    // Tenter le commerce automatique avec Brick (la ressource spécialisée du port)
    // Le port devrait échanger Brick vers la ressource la plus faible (Wood = 0)
    TradeController.handleAutoTrade(ResourceType.Brick, civId, map!, resources);
    
    // Vérifier qu'un commerce a été effectué : 2 Brick -> 1 Wood (port spécialisé en Brick, taux 2:1)
    // Le port échange DE la brique VERS la ressource la plus faible
    const brickAfterTrade = resources.getResource(ResourceType.Brick);
    const woodAfterTrade = resources.getResource(ResourceType.Wood);
    
    // Si on a assez de Brick (au moins 2), le commerce devrait avoir été effectué
    if (capacity >= 2) {
      expect(brickAfterTrade).toBe(capacity - 2); // 2 Brick échangés
      expect(woodAfterTrade).toBe(1); // 1 Wood reçu
    } else {
      // Si on n'a pas assez, aucun commerce ne devrait avoir été effectué
      expect(brickAfterTrade).toBe(capacity);
      expect(woodAfterTrade).toBe(0);
    }
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
    
    // Tenter le commerce automatique avec Wood (pas la spécialisation)
    TradeController.handleAutoTrade(ResourceType.Wood, civId, map!, resources);
    
    // Vérifier qu'aucun commerce n'a été effectué (Wood n'est pas la spécialisation)
    expect(resources.getResource(ResourceType.Wood)).toBe(capacity);
    expect(resources.getResource(ResourceType.Brick)).toBe(initialBrick);
  });
});

