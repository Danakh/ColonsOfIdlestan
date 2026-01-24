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

const center = new HexCoord(0, 0);
const cityVertex = Vertex.create(
  center,
  center.neighborMain(MainHexDirection.SW),
  center.neighborMain(MainHexDirection.W)
);
const outpostVertex = Vertex.create(
  center,
  center.neighborMain(MainHexDirection.E),
  center.neighborMain(MainHexDirection.SE)
);

function advanceAndHarvest(hex: HexCoord, n: number, gs: GameState): void {
  const map = gs.getGameMap()!;
  const civId = gs.getPlayerCivilizationId();
  const resources = gs.getPlayerResources();
  const clock = gs.getGameClock();
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      clock.updateTime(clock.getCurrentTime() + ResourceHarvestController.getHarvestIntervalSeconds());
    }
    const result = ResourceHarvestController.harvest(hex, civId, map, resources, {
      gameClock: clock,
    });
    expect(result.success).toBe(true);
  }
}

describe('Map7HexesScenario', () => {
  beforeEach(() => {
    ResourceHarvestController.resetCooldowns();
  });

  it('récolte sur hex adjacents, construit Market+Sawmill+Brickworks, 2 routes, outpost au SE (model+controller, GameClock)', () => {
    const gs = Make7HexesMap();
    
    // Enregistrer l'état initial
    //saveGameState(gs, 'Map7HexesScenario-start');
    
    const map = gs.getGameMap()!;
    const civId = gs.getPlayerCivilizationId();
    const resources = gs.getPlayerResources();
    const city = map.getCity(cityVertex)!;

    // 1. Récoltes pour bâtiments : 9 Brick (center), 8 Wood (N), 1 Ore (NW) → Market (5 Wood), Sawmill (3 Wood + 4 Brick), Brickworks (1 Ore + 5 Brick)
    advanceAndHarvest(center, 9, gs);
    advanceAndHarvest(center.neighborMain(MainHexDirection.SW), 8, gs);
    advanceAndHarvest(center.neighborMain(MainHexDirection.W), 1, gs);

    // 2. Construire Market, Sawmill, Brickworks (TownHall déjà présent)
    BuildingController.buildBuilding(BuildingType.Market, city, map, cityVertex, resources);
    BuildingController.buildBuilding(BuildingType.Sawmill, city, map, cityVertex, resources);
    BuildingController.buildBuilding(BuildingType.Brickworks, city, map, cityVertex, resources);

    // 3. Récoltes pour 2 routes : 6 Brick, 6 Wood (route 1: 2+2, route 2: 4+4)
    advanceAndHarvest(center, 6, gs);
    advanceAndHarvest(center.neighborMain(MainHexDirection.SW), 6, gs);

    // 4. Construire 2 routes : center–N, center–NE (SE devient visible, S non)
    RoadController.buildRoad(
      Edge.create(center, center.neighborMain(MainHexDirection.SW)),
      civId,
      map,
      resources
    );
    RoadController.buildRoad(
      Edge.create(center, center.neighborMain(MainHexDirection.SE)),
      civId,
      map,
      resources
    );

    // 5. Récoltes pour avant-poste : 10 Brick, 10 Wood ; 10 Wheat et 10 Sheep en test (SE et S non adjacents à la ville)
    advanceAndHarvest(center, 10, gs);
    advanceAndHarvest(center.neighborMain(MainHexDirection.SW), 10, gs);
    resources.addResource(ResourceType.Wheat, 10);
    resources.addResource(ResourceType.Sheep, 10);

    // 6. Construire avant-poste au SE du centre (vertex center, SE, NE ; touche route 2, distance 2)
    OutpostController.buildOutpost(outpostVertex, civId, map, resources);

    // 7. Assertions finales
    expect(map.hasCity(outpostVertex)).toBe(true);
    expect(map.getCity(outpostVertex)?.level).toBe(CityLevel.Outpost);
    expect(map.getRoadsForCivilization(civId).length).toBe(2);
    expect(city.hasBuilding(BuildingType.Market)).toBe(true);
    expect(city.hasBuilding(BuildingType.Sawmill)).toBe(true);
    expect(city.hasBuilding(BuildingType.Brickworks)).toBe(true);
    
    // Enregistrer l'état final
    //saveGameState(gs, 'Map7HexesScenario-end');
  });
});
