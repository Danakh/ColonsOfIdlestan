import { describe, it, expect, beforeEach } from 'vitest';
import { TradeController } from '../../src/controller/TradeController';
import { BuildingController } from '../../src/controller/BuildingController';
import { Make7HexesMap } from '../utils/GameStateGenerator';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { HexDirection } from '../../src/model/hex/HexDirection';
import { Vertex } from '../../src/model/hex/Vertex';
import { BuildingType } from '../../src/model/city/BuildingType';
import { ResourceType } from '../../src/model/map/ResourceType';
import { GameState } from '../../src/model/game/GameState';
import { PlayerResources } from '../../src/model/game/PlayerResources';

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

