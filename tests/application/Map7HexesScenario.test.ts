import { describe, it, expect, beforeEach } from 'vitest';
import { Make7HexesMap, saveGameState } from '../utils/GameStateGenerator';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { MainHexDirection } from '../../src/model/hex/MainHexDirection';
import { Vertex } from '../../src/model/hex/Vertex';
import { Edge } from '../../src/model/hex/Edge';
import { BuildingType } from '../../src/model/city/BuildingType';
import { CityLevel } from '../../src/model/city/CityLevel';
import { ResourceType } from '../../src/model/map/ResourceType';
import { GameState } from '../../src/model/game/GameState';
import { ResourceHarvestController } from '../../src/controller/ResourceHarvestController';
import { BuildingController } from '../../src/controller/BuildingController';
import { RoadController } from '../../src/controller/RoadController';
import { OutpostController } from '../../src/controller/OutpostController';
import { SecondaryHexDirection } from '../../src/model/hex';
import { GameAutoPlayer } from '../utils/GameAutoPlayer';

const center = new HexCoord(0, 0);
const cityVertex = center.vertex(SecondaryHexDirection.N);
const outpostVertex = center.vertex(SecondaryHexDirection.WS);

describe('Map7HexesScenario', () => {
  beforeEach(() => {
    ResourceHarvestController.resetCooldowns();
  });

  it('récolte sur hex adjacents, construit Market+Sawmill+Brickworks, 2 routes, outpost au SE (model+controller, GameClock)', () => {
    const gs = Make7HexesMap();
    
    // Enregistrer l'état initial
    saveGameState(gs, 'Map7HexesScenario-start');
    
    const map = gs.getGameMap()!;
    const civId = gs.getPlayerCivilizationId();
    const resources = gs.getPlayerResources();
    const city = map.getCity(cityVertex)!;

    // 2. Construire Market, Sawmill, Brickworks (TownHall déjà présent)
    GameAutoPlayer.playUntilBuilding(BuildingType.Market, cityVertex, civId, map, resources, gs.getGameClock());
    GameAutoPlayer.playUntilBuilding(BuildingType.Sawmill, cityVertex, civId, map, resources, gs.getGameClock());
    GameAutoPlayer.playUntilBuilding(BuildingType.Brickworks, cityVertex, civId, map, resources, gs.getGameClock());

    // 4. Construire 2 routes : center–N, center–NE (SE devient visible, S non)
    GameAutoPlayer.playUntilBuildingRoad(center.edge(MainHexDirection.NW), civId, map, resources, gs.getGameClock());
    GameAutoPlayer.playUntilBuildingRoad(center.edge(MainHexDirection.W), civId, map, resources, gs.getGameClock());

    // 5. Construire avant-poste
    GameAutoPlayer.playUntilOutpost(outpostVertex, civId, map, resources, gs.getGameClock());

    // 6. Assertions finales
    expect(map.hasCity(outpostVertex)).toBe(true);
    expect(map.getCity(outpostVertex)?.level).toBe(CityLevel.Outpost);
    expect(map.getRoadsForCivilization(civId).length).toBe(2);
    expect(city.hasBuilding(BuildingType.Market)).toBe(true);
    expect(city.hasBuilding(BuildingType.Sawmill)).toBe(true);
    expect(city.hasBuilding(BuildingType.Brickworks)).toBe(true);
    
    // Enregistrer l'état final
    saveGameState(gs, 'Map7HexesScenario-end');
  });
});
